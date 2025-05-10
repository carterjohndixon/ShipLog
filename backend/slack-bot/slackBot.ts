// import { App } from "@slack/bolt";
// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// const app = new App({
//   token: process.env.SLACK_BOT_TOKEN,
//   signingSecret: process.env.SLACK_SIGNING_SECRET,
// });

// const owner = "carterjohndixon";
// const repo = "POOFie";
// const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN;

// app.command("/get_commit_info", async ({ ack, respond }) => {
//   await ack();
//   await respond({
//     response_type: "in_channel",
//     text: "Test command worked!",
//   });
// });

// Handle Slack slash command
// app.command("/get_commit_info", async ({ ack, respond }) => {
//   await ack();

//   try {
//     const { data } = await axios.get(
//       `https://api.github.com/repos/${owner}/${repo}/commits`,
//       {
//         headers: {
//           Authorization: `Bearer ${githubAccessToken}`,
//           Accept: "application/vnd.github+json",
//         },
//         params: {
//           per_page: 1,
//           sha: "main",
//         },
//       },
//     );

//     const commit = data[0];
//     const commitSHA = commit.sha;
//     const commitMessage = commit.commit.message;
//     const author = commit.commit.author.name;

//     const message =
//       `*Latest Commit Info*\n• SHA: ${commitSHA}\n• Message: ${commitMessage}\n• Author: ${author}`;

//     await respond({
//       response_type: "in_channel",
//       text: message,
//     });
//   } catch (error) {
//     console.error("GitHub fetch error:", error);
//     await respond({
//       response_type: "ephemeral",
//       text: "Failed to fetch commit info.",
//     });
//   }
// });

// app.command("/get_commit_info", async ({ ack, respond }) => {
//   await ack();
//   await respond({
//     response_type: "in_channel",
//     text: "Test command worked!",
//   });
// });

// // Start the Slack bot
// (async () => {
//   await app.start();
//   console.log("⚡️ Slack bot is running!");
// })();
