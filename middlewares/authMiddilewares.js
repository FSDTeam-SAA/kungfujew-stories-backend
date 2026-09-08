const jwt = require("jsonwebtoken");
const createError = require("http-errors");

exports.protected = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createError(401, "Not authenticated");
    }

    const token = authHeader.split(" ")[1]; // extract token after "Bearer"

    // Verify token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    // Check admin role
    if (decoded.role !== "admin") {
      throw createError(403, "Access denied. You are not an admin");
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(createError(401, "Invalid token"));
    }
    if (error.name === "TokenExpiredError") {
      return next(createError(401, "Token expired"));
    }
    next(error);
  }
};
