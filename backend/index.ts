import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import githubRoutes from "./routes/github";
import dbRoutes from "./routes/test";
import userRouter from "./routes/user";
import slackRouter from "./routes/slack";
import { invalidPath } from "./utils/helper";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/slack", slackRouter);

app.use("/github", githubRoutes);
app.use("/test", dbRoutes);
app.use("/api/user", userRouter);

app.use("/{*any}", invalidPath);

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(
        `Slack commands endpoint: http://localhost:${PORT}/slack/events`,
    );
});
