const {
    userGet,
    login,
    sginUp,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
} = require("../controllers/userControllers");
const { protected } = require("../middlewares/authMiddilewares");

const userRouter = require("express").Router();

userRouter.get("/", protected, userGet)
userRouter.put("/profile", protected, updateProfile)
userRouter.put("/change-password", protected, changePassword)
userRouter.post("/login", login)
userRouter.post("/signup", sginUp)
userRouter.post("/forgot-password", forgotPassword)
userRouter.post("/reset-password", resetPassword)

module.exports = userRouter