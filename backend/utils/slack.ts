import { ExpressReceiver } from "@slack/bolt";
import dotenv from "dotenv";
import { App } from "@slack/bolt";
import axios from "axios";

dotenv.config();

const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    endpoints: "/slack/events",
});

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
});

export async function sendCommitToSlack(
    commitSHA: string,
    message: string,
    aiSummary: string,
    channelId: string,
) {
    try {
        const botMessage =
            `*New Commit*:\n• SHA: ${commitSHA}\n• Message: ${message}\n• AI Summary: ${aiSummary}`;
        await app.client.chat.postMessage({
            channel: channelId,
            text: botMessage,
        });
    } catch (error) {
        console.error("Error sending message to Slack:", error);
    }
}

export { app, receiver };
