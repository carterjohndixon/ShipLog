import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { githubClient } from "../api/client";

const GitHubVerify: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyGitHub = async () => {
      try {
        const response = await githubClient.get("/verify");
        const githubOAuthUrl = response.data.verifyGithubURL;

        console.log("Redirecting to GitHub:", githubOAuthUrl);

        window.location.href = githubOAuthUrl;

        // navigate("/dashboard");
      } catch (err) {
        console.error("GitHub login failed", err);
      }
    };

    verifyGitHub();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-900 text-white">
      <h1 className="text-3xl">Redirecting to GitHub for verification...</h1>
    </div>
  );
};

export default GitHubVerify;