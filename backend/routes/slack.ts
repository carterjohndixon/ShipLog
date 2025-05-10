import { ExpressReceiver } from "@slack/bolt";
import dotenv from "dotenv";
import { App } from "@slack/bolt";
import axios from "axios";
import express from "express";
import {
    connectBot,
    getChannels,
    slackOAuthCallback,
} from "../controllers/slack";
import { sendCommitToSlack } from "../utils/slack";

dotenv.config();
const router = express.Router();

const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    endpoints: "/slack/events",
});

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
});

const owner = "carterjohndixon";
const repo = "rust-voice";

router.get("/oauth/callback", slackOAuthCallback);
router.get("/api/channels", getChannels);
router.post("/api/bot/configure", connectBot);

// router.post("/callback", async (req, res): Promise<any> => {
router.post(
    "/callback",
    async (req, res): Promise<any> => {
        console.log("HELLO FROM /SLACK/CALLBACK");

        const code = req.body.code as string;

        if (!code) {
            return res.status(400).json({ error: "Missing code" });
        }

        try {
            const response = await axios.post(
                "https://slack.com/oauth/v2/authorize",
                null,
                {
                    params: {
                        code,
                        client_id: process.env.SLACK_CLIENT_ID,
                        client_secret: process.env.SLACK_CLIENT_SECRET,
                    },
                },
            );

            if (!response.data.ok) {
                return res.status(400).json({
                    error: "Slack OAuth failed",
                    details: response.data,
                });
            }

            const access_token = response.data.access_token;
            return res.json({ access_token });
        } catch (error) {
            console.error("Slack OAuth error:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    },
);

app.command("/echo", async ({ command, ack, respond }) => {
    await ack();
    await respond(`${command.text || "No input provided"}`);
});

app.command("/get_commit_info", async ({ command, ack, respond, logger }) => {
    await ack();

    logger.info("Processing /get_commit_info command");

    if (!owner || !repo) {
        return respond({
            response_type: "ephemeral",
            text: "Please provide both GitHub owner and repo.",
        });
    }

    const githubAccessToken = process.env.GIT_ACCESS_TOKEN;

    if (!githubAccessToken) {
        return respond({
            response_type: "ephemeral",
            text: "GitHub access token is missing or invalid.",
        });
    }

    try {
        const commitsResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/commits`,
            {
                headers: {
                    Authorization: `Bearer ${githubAccessToken}`,
                },
            },
        );

        const latestCommitSHA = commitsResponse.data[0].sha;
        const commitResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/commits/${latestCommitSHA}`,
            {
                headers: {
                    Authorization: `Bearer ${githubAccessToken}`,
                },
            },
        );

        const files = commitResponse.data.files;
        const diffCode = files
            .map((file: any) => {
                if (!file.patch) return "";
                return file.patch
                    .split("\n")
                    .filter((line: string) =>
                        line.startsWith("+") && !line.startsWith("+++")
                    )
                    .map((line: string) => line.slice(1))
                    .join("\n");
            })
            .join("\n");

        const aiPrompt = `Summarize the following code changes:\n\n${diffCode}`;

        const aiRes = await axios.post(
            "http://127.0.0.1:54321/functions/v1/ant",
            { prompt: aiPrompt },
            {
                headers: {
                    Authorization: `Bearer ${process.env.DENO_AI_TOKEN}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const aiSummary = aiRes.data.msg?.choices?.[0]?.message?.content ??
            "No summary generated";

        // Create a function that formats the ai response to send to slack.
        await sendCommitToSlack(
            latestCommitSHA,
            commitResponse.data.commit.message,
            aiSummary,
            "C08RTEG7JAW",
        );

        // return respond.json({
        //     commitSHA: latestCommitSHA,
        //     filesChanged: files.map((f: any) => ({
        //         filename: f.filename,
        //         status: f.status,
        //         patch: f.patch,
        //     })),
        //     aiSummary,
        // });

        // Respond to the command in Slack
        return respond({
            response_type: "in_channel",
            text: aiSummary,
        });
    } catch (error: any) {
        logger.error("Error fetching commit information:", error);
        return respond({
            response_type: "ephemeral",
            text: "Sorry, an error occurred while processing your request.",
        });
    }
});

// Start the app (if not being imported elsewhere)
if (require.main === module) {
    (async () => {
        await app.start(process.env.PORT || 3005);
        console.log("⚡️ Slack bot is running!");
    })();
}

export default router;

// When request is sent to /github/test/commit take the information sent there and send a slack message instead of making the user do /
// Make it so that the user can do / on a repo to get the latest commit or simply when a new commit is pushed automatically send an update
