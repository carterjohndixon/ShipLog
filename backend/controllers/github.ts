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
        const MAX_CHARS = 5000;
        const summaries: string[] = [];

        for (const file of files) {
            if (!file.patch) continue;

            const addedLines = file.patch
                .split("\n")
                .filter((line: string) =>
                    line.startsWith("+") && !line.startsWith("+++")
                )
                .map((line: string) => line.slice(1))
                .join("\n");

            if (addedLines.length === 0) continue;

            const prompt =
                `Summarize the changes made in the file "${file.filename}":\n\n${
                    addedLines.slice(0, MAX_CHARS)
                }`;

            const aiRes = await axios.post(
                "http://127.0.0.1:54321/functions/v1/ant",
                { prompt },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.DENO_AI_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            const summary = aiRes.data.msg?.choices?.[0]?.message?.content ??
                "No summary generated";
            summaries.push(`**${file.filename}**:\n${summary}`);
        }

        const aiSummary = summaries.length > 0
            ? summaries.join("\n\n")
            : "No relevant code changes found.";

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
const trackingIntervals = new Map();
const repoCommitCounts = new Map();

export const trackCommits = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const { repo, owner, channel } = req.body;

    console.log("[TRACK-COMMITS] Starting setup for:", {
        repo,
        owner,
        channel,
    });

    const githubAccessToken = userTokenStore.get(owner);
    if (!githubAccessToken) {
        console.log(
            "[TRACK-COMMITS] Authentication error: No GitHub token for user",
            owner,
        );
        return res.status(401).json({
            error: "User not authenticated with GitHub.",
        });
    }

    if (!owner || !repo || !githubAccessToken) {
        console.log("[TRACK-COMMITS] Missing parameters:", {
            owner: !!owner,
            repo: !!repo,
            hasToken: !!githubAccessToken,
        });
        return res.status(400).json({
            error:
                "Missing required parameters: owner, repo, and githubAccessToken are required",
        });
    }

    const trackingId = `${owner}:${repo}:${channel}`;
    console.log("[TRACK-COMMITS] Generated tracking ID:", trackingId);

    if (trackingIntervals.has(trackingId)) {
        console.log(
            "[TRACK-COMMITS] Clearing previous interval for",
            trackingId,
        );
        clearInterval(trackingIntervals.get(trackingId));
        trackingIntervals.delete(trackingId);
    }

    try {
        const isRepoId = !isNaN(Number(repo));
        let repoApiUrl;

        if (isRepoId) {
            console.log("[TRACK-COMMITS] Using repository ID:", repo);
            repoApiUrl = `https://api.github.com/repositories/${repo}`;
        } else {
            console.log("[TRACK-COMMITS] Using repository name:", repo);
            repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        }

        console.log(
            "[TRACK-COMMITS] Testing GitHub API access with URL:",
            repoApiUrl,
        );
        const repoTest = await axios.get(repoApiUrl, {
            headers: {
                Authorization: `Bearer ${githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        console.log(
            "[TRACK-COMMITS] GitHub repo access successful:",
            repoTest.status,
        );
        console.log("[TRACK-COMMITS] Repository info:", {
            name: repoTest.data.name,
            full_name: repoTest.data.full_name,
            id: repoTest.data.id,
        });

        const repoName = repoTest.data.name;
        const repoOwnerLogin = repoTest.data.owner.login;
        const repoId = repoTest.data.id;

        console.log("[TRACK-COMMITS] Getting initial commit count");
        const initialCommitsResponse = await axios.get(
            `https://api.github.com/repos/${repoOwnerLogin}/${repoName}/commits?per_page=1`,
            {
                headers: {
                    Authorization: `Bearer ${githubAccessToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
            },
        );

        let initialCommitCount = 0;
        if (initialCommitsResponse.headers["link"]) {
            const linkHeader = initialCommitsResponse.headers["link"];
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (match && match[1]) {
                initialCommitCount = parseInt(match[1], 10);
                console.log(
                    "[TRACK-COMMITS] Initial commit count from link header:",
                    initialCommitCount,
                );
            }
        }

        repoCommitCounts.set(trackingId, initialCommitCount);
        console.log(
            "[TRACK-COMMITS] Set initial commit count:",
            initialCommitCount,
        );

        console.log(
            "[TRACK-COMMITS] Testing Slack channel access for:",
            channel,
        );
        try {
            await sendSlackTestMessage(
                channel,
                `ShipLogBot is now tracking ${repoOwnerLogin}/${repoName}`,
            );
            console.log("[TRACK-COMMITS] Slack channel access successful");
        } catch (slackError: any) {
            console.error(
                "[TRACK-COMMITS] Slack channel test failed:",
                slackError,
            );
            throw new Error(`Slack channel test failed: ${slackError.message}`);
        }

        console.log("[TRACK-COMMITS] Setting up tracking interval");
        const intervalId = setInterval(async () => {
            try {
                console.log(
                    `[TRACKER-${trackingId}] Checking for new commits...`,
                );

                const commitsResponse = await axios.get(
                    `https://api.github.com/repos/${repoOwnerLogin}/${repoName}/commits?per_page=1`,
                    {
                        headers: {
                            Authorization: `Bearer ${githubAccessToken}`,
                            Accept: "application/vnd.github.v3+json",
                        },
                    },
                );

                let currentCommitCount = 0;
                if (commitsResponse.headers["link"]) {
                    const linkHeader = commitsResponse.headers["link"];
                    const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                    if (match && match[1]) {
                        currentCommitCount = parseInt(match[1], 10);
                    }
                }

                const previousCount = repoCommitCounts.get(trackingId) || 0;
                console.log(
                    `[TRACKER-${trackingId}] Previous count: ${previousCount}, Current count: ${currentCommitCount}`,
                );

                if (currentCommitCount > previousCount) {
                    console.log(
                        `[TRACKER-${trackingId}] New commits detected!`,
                    );

                    const latestCommitSHA = commitsResponse.data[0].sha;
                    console.log(
                        `[TRACKER-${trackingId}] Fetching details for commit: ${latestCommitSHA}`,
                    );

                    const commitResponse = await axios.get(
                        `https://api.github.com/repos/${repoOwnerLogin}/${repoName}/commits/${latestCommitSHA}`,
                        {
                            headers: {
                                Authorization: `Bearer ${githubAccessToken}`,
                                Accept: "application/vnd.github.v3+json",
                            },
                        },
                    );

                    if (
                        !commitResponse.data.files ||
                        !Array.isArray(commitResponse.data.files)
                    ) {
                        console.error(
                            `[TRACKER-${trackingId}] Commit response missing files array`,
                        );
                        throw new Error(
                            "GitHub API response missing files array",
                        );
                    }

                    const files = commitResponse.data.files;
                    const diffCode = files
                        .map((file: any) => {
                            if (!file.patch) return "";
                            return file.patch
                                .split("\n")
                                .filter((line: string) =>
                                    line.startsWith("+") &&
                                    !line.startsWith("+++")
                                )
                                .map((line: string) => line.slice(1))
                                .join("\n");
                        })
                        .join("\n");

                    let aiSummary = "No code changes detected";
                    if (diffCode.trim()) {
                        try {
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

                            aiSummary = aiRes.data.msg?.choices?.[0]?.message
                                ?.content ?? "No summary generated";
                            console.log(
                                `[TRACKER-${trackingId}] Successfully generated AI summary`,
                            );
                        } catch (aiError: any) {
                            console.error(
                                `[TRACKER-${trackingId}] Failed to generate AI summary:`,
                                aiError,
                            );
                            aiSummary = "Failed to generate summary: " +
                                aiError.message;
                        }
                    }

                    console.log(
                        `[TRACKER-${trackingId}] Sending commit info to Slack channel`,
                    );
                    await sendCommitToSlack(
                        latestCommitSHA,
                        commitResponse.data.commit.message,
                        aiSummary,
                        channel,
                    );

                    repoCommitCounts.set(trackingId, currentCommitCount);
                    console.log(
                        `[TRACKER-${trackingId}] Updated commit count to ${currentCommitCount}`,
                    );
                } else {
                    console.log(
                        `[TRACKER-${trackingId}] No new commits detected`,
                    );
                }
            } catch (error: any) {
                console.error(
                    `[TRACKER-${trackingId}] Error tracking commits:`,
                    error,
                );
                if (error.response) {
                    console.error(`[TRACKER-${trackingId}] Server response:`, {
                        status: error.response.status,
                        data: error.response.data,
                        headers: error.response.headers,
                    });
                } else if (error.request) {
                    console.error(
                        `[TRACKER-${trackingId}] No response received:`,
                        error.request,
                    );
                } else {
                    console.error(
                        `[TRACKER-${trackingId}] Error during request setup:`,
                        error.message,
                    );
                }
            }
        }, 300000); // every 5 minutes

        trackingIntervals.set(trackingId, intervalId);
        console.log(
            "[TRACK-COMMITS] Successfully set up tracking with interval ID:",
            intervalId,
        );

        return res.status(200).json({
            success: true,
            message:
                `Now tracking commits for ${repoOwnerLogin}/${repoName} in channel ${channel}`,
            trackingId,
        });
    } catch (error: any) {
        console.error("[TRACK-COMMITS] Failed to set up tracking:", error);
        if (error.response) {
            console.error("[TRACK-COMMITS] Server response:", {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers,
            });
        } else if (error.request) {
            console.error(
                "[TRACK-COMMITS] No response received:",
                error.request,
            );
        } else {
            console.error(
                "[TRACK-COMMITS] Error during request setup:",
                error.message,
            );
        }

        return res.status(500).json({
            error: "Failed to set up commit tracking: " + error.message,
        });
    }
};

const sendSlackTestMessage = async (channel: string, message: string) => {
    return await sendCommitToSlack(
        "test",
        "ShipLogBot Configuration",
        message,
        channel,
    );
};
