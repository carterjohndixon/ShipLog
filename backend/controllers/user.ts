import { Request, Response } from "express";
import bcrypt from "bcrypt";
import supabase from "../db/db";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { signJWT } from "../utils/helper";
import { v4 as uuidv4 } from "uuid";
import { sendForgotPasswordEmail, sendVerificationEmail } from "../utils/email";
import { UUID } from "crypto";

export const signIn = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const { data: user } = await supabase.from("users").select("*").eq(
        "username",
        username.trim(),
    ).single();

    if (!user || !(await bcrypt.compare(password, user.password))) {
        res.status(401).json({ error: "Username/Password mismatch!" });
        return;
    }

    if (!process.env.JWT_SECRET) {
        console.error("Undefined JWT_SECRET!");
        res.status(500).json({ error: "Server config error" });
        return;
    }

    const token = signJWT({ username: user.username });

    res.status(200).json({ message: "Login successful", token });
    return;
};

export const signUp = async (req: Request, res: Response) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .or(`email.eq.${email},username.eq.${username}`)
            .maybeSingle();

        if (existingUser) {
            return res.status(400).json({
                error: "Username or email already in use.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationToken = uuidv4();
        const userId = uuidv4();

        const { data: profileData, error: profileError } = await supabase
            .from("users")
            .insert([
                {
                    email,
                    username,
                    password: hashedPassword,
                    id: userId,
                    verifiedEmail: false,
                    isUsernameSet: true,
                    verificationToken,
                },
            ])
            .select()
            .single();

        if (profileError) {
            console.error("Profile insert error:", profileError);
            return res.status(500).json({
                error: "Failed to create user profile.",
            });
        }

        await sendVerificationEmail(email, verificationToken);

        const token = signJWT({
            username: profileData.username,
            email: profileData.email,
        });

        return res.status(201).json({
            message: "User signed up successfully",
            token,
            verificationToken,
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "An unexpected error occurred." });
    }
};

// https://ixsjjzeouxgeyvumfhlm.supabase.co/auth/v1/verify?token=8c99282b0956765784bff58be7d5f479365181b8a773e396ae2e3291&type=signup&redirect_to=http://localhost:3000

export const verifyEmail = async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
        res.status(400).json({ error: "Missing token." });
        return;
    }

    try {
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("verificationToken", token as UUID)
            .single();

        console.log("User data:", user);
        console.log("User error:", userError);

        const { error: updateError } = await supabase
            .from("users")
            .update({ verifiedEmail: true })
            .eq("id", user.id);

        if (updateError) {
            res.status(500).json({ error: "Failed to update user." });
            return;
        }

        res.status(200).json({
            message: "Email successfully verified and user updated!",
        });
    } catch (err: any) {
        return res.status(400).json({ error: "Invalid token." });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ error: "Email is required." });
    }

    try {
        const { data: existingUser, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (userError || !existingUser) {
            res.status(404).json({
                error: "No account with that email was found.",
            });
            return;
        }

        const resetToken = signJWT({
            id: existingUser.id,
            email: existingUser.email,
        });

        await sendForgotPasswordEmail(email, resetToken);

        res.status(200).json({
            message: "Password reset link sent to your email.",
        });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        return res.status(500).json({
            error: "Something went wrong. Please try again later.",
        });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { token, password, confirmPassword } = req.body;

    // if (!newPassword || !confirmPassword) {
    //     return res.status(400).json({ error: "All fields are required." });
    // }

    // if (newPassword !== confirmPassword) {
    //     return res.status(400).json({ error: "Passwords do not match." });
    // }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            id: string;
            email: string;
        };

        // if (!decoded?.id || !decoded?.email) {
        //     return res.status(400).json({ error: "Invalid or expired token." });
        // }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", decoded.id)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: "User not found." });
        }

        const { data: OAuthUser, error: OAuthUserError } = await supabase
            .from("users")
            .select("id, verificationToken")
            .eq("email", decoded.email)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: "User not found." });
        }
        if (!user.verificationToken) {
            return res.status(400).json({
                error:
                    "This account uses a third-party login (like Google). You can't reset the password this way.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { error: updateError } = await supabase
            .from("users")
            .update({ password: hashedPassword })
            .eq("id", decoded.id);

        if (updateError) {
            console.error("Password update error:", updateError);
            return res.status(500).json({ error: "Failed to reset password." });
        }

        return res.status(200).json({ message: "Password reset successful." });
    } catch (err) {
        console.error("JWT verification error:", err);
        return res.status(400).json({ error: "Invalid or expired token." });
    }
};

export const authGoogle = async (req: Request, res: Response) => {
    console.log("GOOGLE OAUTH");
    const url = process.env.SUPA_OAUTH_CALLBACK as string;
    res.redirect(url);
};

export const authGithub = async (req: Request, res: Response) => {
    console.log("GITHUB OAUTH");
    const url = process.env.SUPA_OAUTH_CALLBACK as string;
    res.redirect(url);
};
