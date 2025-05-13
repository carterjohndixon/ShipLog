import React, { useState } from 'react';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './index.css';
import Login from './Components/Login';
import Signup from './Components/Signup';
import Home from './Components/Home';
import NotFound from './Components/NotFound';
import ForgotPassword from './Components/ForgotPassword';
import VerifyEmail from './Components/VerifyEmail';
import SetUsername from './Components/SetUsername'
import OAuthCallback from './Components/OAuthCallback';
import ResetPassword from './Components/ResetPassword';
import Dashboard from './Components/Dashboard';
import GitHubVerify from './Components/GitHubVerify';
import SlackBot from './Components/SlackBot';
import AuthProvider from './context/ProtectedRoute';

function App() {
  const [userInput, setUserInput] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit button clicked!");
    
    // curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ant' \
    // --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    // --header 'Content-Type: application/json' \
    // --data '{"prompt": "What is the capital of France?"}'
  
    try {
      const res = await fetch('http://127.0.0.1:54321/functions/v1/ant', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({prompt: userInput}),
      });

      const result = await res.json();
      console.log(result);
    } catch (error) {
      console.log('Error:', error);
    }
  };

  return (
    // <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/set-username" element={<SetUsername />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/github/verify" element={<GitHubVerify />} />
          <Route path="/dashboard" element={
            <AuthProvider>
              <Dashboard />
            </AuthProvider>
          } />
          <Route path="/slack/repo" element={<SlackBot />} />
          <Route path="/*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    // </AuthProvider>
  );
}

export default App;