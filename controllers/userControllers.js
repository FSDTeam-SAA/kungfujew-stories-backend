const createError = require("http-errors")
const { successResponse } = require("../response/response")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const UserModel = require("../model/useModel")
const { createToken } = require("../helper/jwt")
const { sendPasswordResetEmail } = require("../helper/emailTransporter")

exports.userGet = async (req, res, next) => {
    try {
        if (!req.user) {
            throw createError(401, "login first")
        }
        const user = await UserModel.findById(req.user.id).select("-password")
        if (!user) {
            throw createError(401, "user not found")
        }
        successResponse(res, { statusCode: 200, message: "user found", data: user })
    } catch (error) {
        next(error)
    }
}

exports.sginUp = async (req, res, next) => {
    try {
        const { fullName, email, password, } = req.body
        if (!fullName || !email || !password) {
            throw createError(400, "all fields are required")
        }
        const user = await UserModel.findOne({ email })
        if (user) {
            throw createError(400, "user already exist, please login.")
        }
        const hashPassword = await bcrypt.hash(password, 10)
        const newUser = await UserModel.create({
            fullName,
            email,
            password: hashPassword,
        })
        if (!newUser) {
            throw createError(400, "user not created")
        }
        const safeUser = await UserModel.findById(newUser._id).select("-password")
        successResponse(res, { statusCode: 200, message: "registraion complited", data: safeUser })
    } catch (error) {
        next(error)
    }
}

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            throw createError(400, "all fields are required")
        }
        const user = await UserModel.findOne({ email })
        if (!user) {
            throw createError(400, "user not found, please sign up.")
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            throw createError(400, "email or password not match")
        }
        const token = await createToken({ id: user._id, email: user.email,  role: user.role }, process.env.SECRET_KEY, "1d")
        if (!token) {
            throw createError(400, "token not generated")
        }
        const hidePassword = await UserModel.findOne({ email }).select("-password")
        successResponse(res, { statusCode: 200, message: "login success", data: { token, user: hidePassword } })

    } catch (error) {
        next(error)
    }
}

exports.updateProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            throw createError(401, "login first")
        }
        const { fullName, email } = req.body
        if (!fullName || !email) {
            throw createError(400, "Full name and email are required")
        }

        const existingUser = await UserModel.findOne({
            email: email.trim().toLowerCase(),
            _id: { $ne: req.user.id }
        })
        if (existingUser) {
            throw createError(400, "Email is already in use by another account")
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            req.user.id,
            { fullName: fullName.trim(), email: email.trim().toLowerCase() },
            { new: true, runValidators: true }
        ).select("-password")

        if (!updatedUser) {
            throw createError(404, "User not found")
        }

        successResponse(res, { statusCode: 200, message: "Profile updated successfully", data: updatedUser })
    } catch (error) {
        next(error)
    }
}

exports.changePassword = async (req, res, next) => {
    try {
        if (!req.user) {
            throw createError(401, "login first")
        }
        const { currentPassword, newPassword } = req.body
        if (!currentPassword || !newPassword) {
            throw createError(400, "Current password and new password are required")
        }
        if (newPassword.length < 6) {
            throw createError(400, "New password must be at least 6 characters long")
        }

        const user = await UserModel.findById(req.user.id)
        if (!user) {
            throw createError(404, "User not found")
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) {
            throw createError(400, "Current password does not match")
        }

        const hashPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashPassword
        await user.save()

        successResponse(res, { statusCode: 200, message: "Password updated successfully", data: {} })
    } catch (error) {
        next(error)
    }
}

exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body
        if (!email || !email.trim()) {
            throw createError(400, "Email address is required")
        }

        const normalizedEmail = email.trim().toLowerCase()
        const user = await UserModel.findOne({ email: normalizedEmail })
        if (!user) {
            throw createError(404, "No account found with this email address")
        }

        // Generate a signed JWT reset token valid for 1 hour
        const resetToken = jwt.sign(
            { id: user._id, email: user.email, purpose: "password_reset" },
            process.env.SECRET_KEY,
            { expiresIn: "1h" }
        )

        // Store token & 1-hour expiration date in database
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
        user.resetPasswordToken = resetToken
        user.resetPasswordExpires = expiresAt
        await user.save()

        // Formulate frontend reset link
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`

        // Send email with reset URL
        await sendPasswordResetEmail({
            to: user.email,
            name: user.fullName,
            resetUrl,
        })

        successResponse(res, {
            statusCode: 200,
            message: "A password reset link has been sent to your email address.",
            data: { email: user.email },
        })
    } catch (error) {
        next(error)
    }
}

exports.resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body
        if (!token) {
            throw createError(400, "Reset token is required")
        }
        if (!newPassword || newPassword.length < 6) {
            throw createError(400, "New password must be at least 6 characters long")
        }

        // Verify token signature & expiry
        let decoded
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY)
        } catch (jwtErr) {
            if (jwtErr.name === "TokenExpiredError") {
                throw createError(400, "This password reset link has expired. Please request a new one.")
            }
            throw createError(400, "Invalid reset token. Please request a new password reset link.")
        }

        if (decoded.purpose !== "password_reset") {
            throw createError(400, "Invalid token purpose")
        }

        // Verify against DB storage & expiration
        const user = await UserModel.findOne({
            _id: decoded.id,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() },
        })

        if (!user) {
            throw createError(400, "This reset link is invalid or has already been used. Please request a new one.")
        }

        // Hash new password and save
        const hashPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashPassword
        user.resetPasswordToken = null
        user.resetPasswordExpires = null
        await user.save()

        successResponse(res, {
            statusCode: 200,
            message: "Password reset successfully. You can now sign in with your new password.",
            data: {},
        })
    } catch (error) {
        next(error)
    }
}




