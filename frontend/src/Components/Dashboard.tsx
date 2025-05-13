import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog } from "@headlessui/react";
import { supabase } from "../api/auth";
import { githubClient } from "../api/client";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [slackToken, setSlackToken] = useState<string | null>(null);
  const [slackCode, setSlackCode] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);

  // When user is on dashboard without any repos showing and not connected to github make sure no repo id is in url!

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log(user?.id);
      if (!user) {
        navigate("/login", { replace: true });
      } else {
        setUser(user);
      }
    };
  
    getUser();
  }, []);

  const handleGitHubLogin = async () => {
    const response = await githubClient.get("/verify");
    const githubOAuthUrl = `${response.data.verifyGithubURL}&state=github`;
    window.location.href = githubOAuthUrl;
  };

  useEffect(() => {
    const fetchFromCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      console.log("code:", code, "state:", state);
      if (code && state == "github") {
        try {
          const res = await githubClient.get(`/callback?code=${code}`);
          setRepos(res.data.repos);
        } catch (err) {
          console.error("Callback failed", err);
        }
      }
    };
    fetchFromCallback();
  }, []);

  const handleSlackLogin = async () => {
    const clientId = process.env.REACT_APP_SLACK_CLIENT_ID;
    const redirectUri = process.env.REACT_APP_SLACK_CALLBACK;
    const scopes = [
      "app_mentions:read",
      "channels:history",
      "chat:write",
      "chat:write.public",
      "commands",
      "users:read",
    ].join(",");
    const repo = selectedRepo;

    await supabase
              .from("users")
              .update({selected_github_repo: repo})
              .eq("id", user.id);

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${encodeURIComponent(repo!)}&code=${slackCode}`;
    window.location.href = slackAuthUrl;
  };

  useEffect(() => {
    const fetchSlackToken = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      console.log("code:", code, "state:", state);
      if (code && state !== "github") {
        try {
          const res = await axios.post("https://slack.com/api/oauth.v2.access", {
            client_id: process.env.REACT_APP_SLACK_CLIENT_ID,
            client_secret: process.env.REACT_APP_SLACK_CLIENT_SECRET,
            code: code,
            redirect_uri: process.env.REACT_APP_SLACK_CALLBACK,
          });

          setSlackCode(code);
  
          if (res.data.ok && user) {
            const token = res.data.access_token;
            setSlackToken(token);
          } else {
            console.error("Slack OAuth error", res.data.error);
          }
        } catch (err) {
          console.error("Slack OAuth failed", err);
        }
      }
    };
    fetchSlackToken();
  }, []);

  const openModal = (repo: any) => {
    setSelectedRepo(repo);
    console.log(typeof(repo));
    console.log(selectedRepo);
    setShowModal(true);
    navigate(`?repo=${encodeURIComponent(repo!)}`, { replace: true });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRepo(null);
    setChannels([]);
    navigate("/dashboard?", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white px-6 py-8">
      <h1 className="text-4xl font-bold text-center mb-6">Welcome to your Dashboard</h1>
      <p className="text-center text-lg mb-6">
        Click the button below to connect your GitHub account and select a repository.
      </p>

      <div className="flex justify-center mb-8">
        <button
          className="bg-white text-blue-800 px-6 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition"
          onClick={handleGitHubLogin}
        >
          Connect GitHub
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="bg-white text-blue-900 p-6 rounded-xl shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300"
            onClick={() => openModal(repo.id)}
          >
            <h2 className="text-xl font-semibold mb-2">{repo.name}</h2>
            <p className="text-sm text-gray-600">{repo.description || "No description"}</p>
          </div>
        ))}
      </div>

      <Dialog open={showModal} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 pointer-events-none" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <Dialog.Panel className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-xl">
            <Dialog.Title className="text-2xl font-bold text-blue-900 mb-6">Connect to Slack</Dialog.Title>
              <button
                className="bg-blue-800 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition w-full mb-6"
                onClick={handleSlackLogin}
              >
                Connect Slack
              </button>
            <div className="mt-4 text-right">
              <button
                className="text-blue-800 hover:underline"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Dashboard;
