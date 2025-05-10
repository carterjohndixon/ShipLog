import express from "express";
import axios from "axios";
import {
    getCodeCommit,
    getUsersRepos,
    githubCallback,
    githubWebhook,
    verifyGithub,
} from "../controllers/github";

const router = express.Router();

router.get("/verify", verifyGithub);
router.get("/callback", githubCallback);
router.get("/repos", getUsersRepos);
router.get("/test/commit", getCodeCommit);
router.post("/api/webhook", githubWebhook);

export default router;
