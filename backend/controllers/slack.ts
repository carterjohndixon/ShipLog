import { Request, Response } from "express";
import axios from "axios";
import supabase from "../db/db";

export const slackOAuthCallback = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const code = req.query.code as string;
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!code) {
        return res.status(400).json({ error: "Missing code in query string" });
    }

    try {
        const response = await axios.post(
            "https://slack.com/api/oauth.v2.access",
            null,
            {
                params: {
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: redirectUri,
                },
            },
        );

        const data = response.data;

        if (!data.ok) {
            return res.status(500).json({
                error: data.error || "Slack OAuth failed",
            });
        }

        const slackToken = data.access_token;
        const userId = data.authed_user.id;

        return res.redirect(`/dashboard?slackToken=${slackToken}`);
    } catch (err) {
        console.error("OAuth Callback Error", err);
        return res.status(500).json({
            error: "Failed to exchange Slack code for token",
        });
    }
};

export const getAccessToken = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const { code } = req.body;

    try {
        const response = await axios.post(
            "https://slack.com/api/oauth.v2.access",
            {
                client_id: process.env.SLACK_CLIENT_ID,
                client_secret: process.env.SLACK_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.SLACK_CALLBACK,
            },
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        const data = response.data;

        if (!data.ok) {
            return res.status(500).json({
                error: data.error || "Slack OAuth failed",
            });
        }

        const accessToken = data.access_token;
        const userId = data.authed_user.id;

        // const { error } = await supabase
        //     .from("users")
        //     .upsert({
        //         slack_user_id: userId,
        //         access_token: accessToken,
        //     })
        //     .eq("id", userId);

        // if (error) {
        //     return res.status(500).json({ error: "Failed to store user data" });
        // }

        console.log(response.data);

        await supabase
            .from("users")
            .update({ slack_user_id: userId });

        return res.status(200).json({
            access_token: accessToken,
            user_id: userId,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err });
    }
};

export const getChannels = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    // const accessToken = req.body;
    console.log("SLACK TOKEN BACKEND:", accessToken);

    const { error } = await supabase
        .from("user")
        .update({ access_token: accessToken });

    if (!accessToken) {
        return res.status(401).json({ error: "Missing access token" });
    }

    try {
        const response = await axios.get(
            "https://slack.com/api/conversations.list",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        );

        console.log("SLACK response BACKEND:", response.data);
        const channels = response.data.channels;
        return res.status(200).json({ channels });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Failed to fetch Slack channels",
        });
    }
};

export const connectBot = async (req: Request, res: Response): Promise<any> => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    // const { channel, repoId } = req.body;
    const { channel } = req.body;

    const repo_id = "981309467";

    console.log("AccessToken:", accessToken);
    console.log("channel:", channel);
    // console.log("repoId:", repoId);

    // if (!accessToken || !channel || !repoId) {
    //     return res.status(400).json({ error: "Missing necessary data" });
    // }

    try {
        const response = await axios.post(
            "https://slack.com/api/conversations.join",
            {
                token: accessToken,
                channel: channel,
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (response.data.ok) {
            return res.status(200).json({
                message: "Bot successfully configured!",
            });
        } else {
            return res.status(500).json({ message: response.data.error });
        }
    } catch (error) {
        console.error("Error configuring bot:", error);
        return res.status(500).json({ message: "Failed to configure bot" });
    }
};
