import { Request, Response } from "express";
import axios from "axios";

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

export const getChannels = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    console.log("SLACK TOKEN:", accessToken);

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

        console.log("SLACK response:", response.data);
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
    const { channel, repoId } = req.body;

    console.log("AccessToken:", accessToken);

    if (!accessToken || !channel || !repoId) {
        return res.status(400).json({ error: "Missing necessary data" });
    }

    try {
        const response = await axios.post(
            "https://slack.com/api/conversations.join",
            {
                token: process.env.SLACK_BOT_TOKEN,
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
