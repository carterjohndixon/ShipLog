import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShipWheel } from "lucide-react";
import { githubClient, slackClient } from '../api/client';
import { supabase } from '../api/auth';

const SlackBot = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const repo = queryParams.get("state");
  const code = queryParams.get("code");
  const navigate = useNavigate();

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [slackToken, setSlackToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // const localSlackToken = localStorage.getItem("slack_token");
        // setSlackToken(localSlackToken);
        // if (!localSlackToken) {
        //   throw new Error("Slack token not found in localStorage");
        // }
        
        const response = await slackClient.post('/api/get-token', {
          code
        });
        
        const accessToken = response.data.access_token;
        setSlackToken(accessToken);

        console.log("FRONT END TOKEN:", accessToken);

        const getChannels = await slackClient.get('/api/channels', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        console.log("Channels", getChannels);

        const allChannels = getChannels.data.channels;
      
        setChannels(allChannels);
        setLoading(false)
      } catch (error) {
        console.error('Error fetching Slack channels:', error);
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        // if (!slackToken || !selectedChannel || !repoId) {
        //   console.log("No token found");
        //   return;
        // }

        // setSuccessMsg("Bot succesfully configured!");

        if (!slackToken) {
          console.log("No slack token found");
          setErrorMsg("Authentication error: No slack token found.");
          setIsSubmitting(false);
          return;
        }

        if (!selectedChannel) {
          console.log("No selected channel found");
          setErrorMsg("Please select a channel.");
          setIsSubmitting(false);
          return;
        }

        if (!repo) {
          console.log("No repo Id found");
          setErrorMsg("Repository information missing.");
          setIsSubmitting(false);
          return;
        }

        console.log("Selected channel:", selectedChannel);

        const slackRes = await slackClient.post(`/api/bot/configure`, {
          channel: selectedChannel,
          // repo,
          }, {
          headers: {
            Authorization: `Bearer ${slackToken}`,
          },
        });

        const gitRes = await githubClient.post(`/api/track-commits`, {
          repo,
          owner: "carterjohndixon",
          channel: selectedChannel,
        }, {
          headers: {
            Authorization: `Bearer ${slackToken}`,
          },
        });

        setSuccessMsg("Bot succesfully configured!");
        setErrorMsg("");
        console.log("Bot succesfully configured!");
        setTimeout(() => {
          navigate(`/slack/repo/${repo}`);
        }, 3000);
    } catch (error: any) {
      if (error.response) {
      console.error('Error configuring Slack bot:', error);
      setErrorMsg(`Failed to configure bot: ${error.response.data.message || "Server error"}`);
      }
      else if (error.request) {
        setErrorMsg("Network error: Please check your connection and try again.");
      } else {
        setErrorMsg(`Failed to configure bot: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white px-6 py-12">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <ShipWheel className="w-12 h-12 text-blue-800" />
          <h1 className="text-3xl font-bold text-blue-800">Configure ShipLogBot</h1>
        </div>

        <p className="text-lg mb-8 text-gray-600">
          Choose a Slack workspace and channel where ShipLogBot will send commit notifications for your GitHub repository.
        </p>

        {errorMsg && (
            <div className="mb-4 p-2 rounded-md bg-red-100 text-red-700 border border-red-400 text-sm">
                {errorMsg}
            </div>
        )}
        {successMsg && (
            <div className="mb-4 p-2 rounded-md bg-green-100 text-green-700 border border-green-400 text-sm">
                {successMsg}
            </div>
        )}

        <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="channel" className="block text-lg font-medium text-gray-800 mb-2">
                Select a Channel:
              </label>
              <select
                id="channel"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a channel --</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>

          <button
            type="submit"
            disabled={!selectedChannel || isSubmitting}
            className="w-full py-3 mt-6 text-white bg-blue-800 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? "Configuring..." : "Configure Bot"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SlackBot;
