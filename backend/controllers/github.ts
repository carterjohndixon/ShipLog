import express from "express";
import axios from "axios";
import { Request, Response } from "express";
import { sendCommitToSlack } from "../utils/slack";

const userTokenStore = new Map<string, string>();
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;
const SLACK_CHANNEL_ID = "C08QWCS0267";

export const verifyGithub = (req: Request, res: Response): any => {
    const params = new URLSearchParams({
        client_id: process.env.GIT_CLIENT_ID!,
        redirect_uri: process.env.GIT_CALLBACK_URL!,
        scope:
            "repo read:user user:email repo:status public_repo contents:read",
    });

    const githubOAuthUrl =
        `https://github.com/login/oauth/authorize?${params.toString()}`;
    return res.status(200).json({ verifyGithubURL: githubOAuthUrl });
};

export const githubCallback = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const code = req.query.code as string;

    try {
        const tokenRes = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GIT_CLIENT_ID,
                client_secret: process.env.GIT_CLIENT_SECRET,
                code,
            },
            {
                headers: {
                    Accept: "application/json",
                },
            },
        );

        const accessToken = tokenRes.data.access_token;

        const userRes = await axios.get("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
        });

        const username = userRes.data.login;

        userTokenStore.set(username, accessToken);

        const { data: repos } = await axios.get(
            "https://api.github.com/user/repos",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github+json",
                },
            },
        );

        const repoNames = repos.map((repo: any) => repo.name);
        console.log("Repositories:", repoNames);

        // for (const repo of repos) {
        //     await createGithubWebhook(username, repo.name, accessToken);
        // }

        return res.status(200).json({
            username,
            accessToken,
            repos,
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Github OAuth failed");
    }
};

export const getUsersRepos = async (
    req: Request,
    res: Response,
): Promise<any> => {
    // const token = req.headers.authorization?.split(" ")[1];

    // if (!token) return res.status(201).json({ error: "Missing token" });
    const code = req.query.code as string;

    try {
        const tokenRes = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GIT_CLIENT_ID,
                client_secret: process.env.GIT_CLIENT_SECRET,
                code,
            },
            {
                headers: {
                    Accept: "application/json",
                },
            },
        );

        const accessToken = tokenRes.data.access_token;

        const { data: repos } = await axios.get(
            "https://api.github.com/user/repos",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github+json",
                },
            },
        );

        console.log(repos);
        return res.json(repos);
    } catch (err) {
        console.error("Error fetching repos:", err);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
};

// OG GITHUB CALLBACK: https://ixsjjzeouxgeyvumfhlm.supabase.co/auth/v1/callback

export const githubWebhook = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const event = req.headers["x-github-event"];

    if (event !== "push") {
        return res.status(200).send("Ignored non-push event.");
    }

    const payload = req.body;
    const { repository, head_commit } = payload;

    if (!head_commit) {
        return res.status(400).send("No commit info in payload.");
    }

    const { owner } = repository;
    // const repo = repository.name;
    const repo = "ShipLog";
    const latestCommitSHA = head_commit.id;

    const githubAccessToken = userTokenStore.get(owner.name);
    if (!githubAccessToken) {
        return res.status(401).send("GitHub token missing for owner.");
    }

    try {
        const commitResponse = await axios.get(
            `https://api.github.com/repos/${owner.name}/${repo}/commits/${latestCommitSHA}`,
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

        await sendCommitToSlack(
            latestCommitSHA,
            commitResponse.data.commit.message,
            aiSummary,
            process.env.SLACK_CHANNEL_ID!,
        );

        return res.status(200).send("Webhook handled.");
    } catch (error: any) {
        console.error(
            "Error in webhook handler:",
            error.response?.data || error.message,
        );
        return res.status(500).send("Internal server error.");
    }
};

export const createGithubWebhook = async (
    owner: string,
    repo: string,
    token: string,
) => {
    const webhookUrl = "https://localhost:3005/github/api/webhook";
    // const webhookUrl =
    //     "https://a2ed-2600-8804-40a-2000-d0f2-a3f9-858f-9089.ngrok-free.app/github/api/webhook";
    const res = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/hooks`,
        {
            name: "web",
            active: true,
            events: ["push"],
            config: {
                url: webhookUrl,
                content_type: "json",
                insecure_ssl: "0",
            },
        },
    );
};

export const getCodeCommit = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const { owner, repo, channel } = req.body;

    console.log("REPO TO MAKE MESSAGE OF:", repo);

    const githubAccessToken = userTokenStore.get(owner);
    if (!githubAccessToken) {
        return res.status(401).json({
            error: "User not authenticated with GitHub.",
        });
    }

    if (!owner || !repo || !githubAccessToken || !channel) {
        return res.status(400).json({
            error:
                "Missing required parameters: owner, repo, githubAccessToken, channel ID are required",
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

        await sendCommitToSlack(
            latestCommitSHA,
            commitResponse.data.commit.message,
            aiSummary,
            channel,
        );

        return res.status(200).json({
            commitSHA: latestCommitSHA,
            filesChanged: files.map((f: any) => ({
                filename: f.filename,
                status: f.status,
                patch: f.patch,
            })),
            aiSummary,
        });
    } catch (error: any) {
        console.error(
            "Error fetching commit information:",
            error.response?.data || error,
        );
        return res.status(500).json({
            error: "Failed to fetch commit information",
            details: error.response?.data || error.message,
        });
    }
};

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkhlbGxvV29ybGQiLCJpYXQiOjE3NDYyOTgwODJ9.XelSzH8dO8c9VeDfc3WsSlpp2arPeZR4KumxVTmHUF8

// raw_url has the code in files json (https://api.github.com/repos/carterjohndixon/POOFie/commits/7537c2999284fa14f69c724789cc1bc6f0e6610f)

let lastCommitCount = 0;

export const trackCommits = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const { repo, owner, channel } = req.body;

    console.log("repo:", repo);
    console.log("owner:", owner);
    console.log("channel:", channel);

    const githubAccessToken = userTokenStore.get(owner);
    if (!githubAccessToken) {
        return res.status(401).json({
            error: "User not authenticated with GitHub.",
        });
    }

    if (!owner || !repo || !githubAccessToken) {
        return res.status(400).json({
            error:
                "Missing required parameters: owner, repo, and githubAccessToken are required",
        });
    }

    setInterval(async () => {
        try {
            const commitsResponse = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/commits`,
                {
                    headers: {
                        Authorization: `Bearer ${githubAccessToken}`,
                    },
                },
            );

            const currentCommitCount = commitsResponse.data.length;

            if (currentCommitCount > lastCommitCount) {
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

                const aiPrompt =
                    `Summarize the following code changes:\n\n${diffCode}`;

                const aiRes = await axios.post(
                    "http://127.0.0.1:54321/functions/v1/ant",
                    { prompt: aiPrompt },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${process.env.DENO_AI_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                    },
                );

                const aiSummary =
                    aiRes.data.msg?.choices?.[0]?.message?.content ??
                        "No summary generated";

                await sendCommitToSlack(
                    latestCommitSHA,
                    commitResponse.data.commit.message,
                    aiSummary,
                    channel,
                );

                lastCommitCount = currentCommitCount;
            }
        } catch (error: any) {
            console.error(
                "Error tracking commits:",
                error.response?.data || error,
            );
        }
    }, 300000);
};
