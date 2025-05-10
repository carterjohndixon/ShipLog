const { check, validationResult } = require("express-validator");

export const signUpValidator = [
    check("username").trim().not().isEmpty().withMessage("Name is missing!"),
    check("password")
        .trim()
        .not()
        .isEmpty()
        .withMessage("Password is missing!")
        .isLength({ min: 8, max: 20 })
        .withMessage("Password must be 8 to 20 characters long!"),
];

export const signInValidator = [
    check("username").trim().notEmpty().withMessage("Username is required"),
    check("password").trim().notEmpty().withMessage("Password is required"),
];

export const validate = (req: any, res: any, next: any) => {
    const errors = validationResult(req).array();
    if (errors.length) {
        return res.json({ error: errors[0].msg });
    }

    next();
};
