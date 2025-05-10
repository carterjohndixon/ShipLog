import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import supabase from "../db/db";

export const isAuth = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const bearerToken = req.headers?.authorization;
    if (!bearerToken) {
        return res.status(401).json({ error: "Unauthorized access" });
    }

    const token = bearerToken.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized access" });

    const decode = jwt.verify(token, process.env.JWT_SECRET as string);
    // @ts-ignore
    req.user = decode;

    const userConfirm = await supabase.auth.getUser(token);
    if (!userConfirm) {
        return res.status(401).json({ error: "Unauthorized access" });
    }

    // req.user = userConfirm;

    next();
};
