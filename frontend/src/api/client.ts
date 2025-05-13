import axios from "axios";

export const client = axios.create({
    baseURL: "http://localhost:3005/api",
});

export const githubClient = axios.create({
    baseURL: "http://localhost:3005/github",
});

export const slackClient = axios.create({
    baseURL: "http://localhost:3005/slack",
});
