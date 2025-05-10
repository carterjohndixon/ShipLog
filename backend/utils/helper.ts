import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const sendError = (res: Response, error: String, statusCode = 401) => {
    res.status(statusCode).json({ error });
};

export const invalidPath = (req: Request, res: Response) => {
    exports.sendError(res, "Not found", 404);
};

export const signJWT = (payload: object) => {
    if (!process.env.JWT_SECRET) throw new Error("Undefined JWT_SECRET!");
    return jwt.sign(payload, process.env.JWT_SECRET);
};
