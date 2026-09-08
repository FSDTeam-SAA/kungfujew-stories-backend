const { userGet, login, sginUp, updateProfile, changePassword } = require("../controllers/userControllers");
const { protected } = require("../middlewares/authMiddilewares");

const userRouter = require("express").Router();


userRouter.get("/", protected, userGet)
userRouter.put("/profile", protected, updateProfile)
userRouter.put("/change-password", protected, changePassword)
userRouter.post("/login", login)
userRouter.post("/signup", sginUp)


module.exports = userRouter