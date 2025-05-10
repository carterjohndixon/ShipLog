import express from "express";

const {
    signIn,
    signUp,
    verifyEmail,
    authGoogle,
    authGithub,
    forgotPassword,
    resetPassword,
} = require(
    "../controllers/user",
);
const { isAuth } = require("../middleware/auth");
const {
    signInValidator,
    signUpValidator,
    validate,
} = require("../middleware/validator");

const router = express.Router();

router.post("/login", signInValidator, validate, signIn);
router.post("/signup", signUpValidator, validate, signUp);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/auth/google", authGoogle);
router.post("/auth/github", authGithub);

router.get("/protected", isAuth, (req, res) => {
    const user = (req as any).user;
    res.json({
        user: {
            id: user.id,
            username: user.username,
        },
    });
});

export default router;
