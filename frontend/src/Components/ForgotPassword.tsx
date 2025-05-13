import { useState } from "react"

import {client} from "../api/client";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const response = await client.post("/user/forgot-password", {email});
            setSuccessMsg(response.data.message || "Reset link sent! Check your email.");
            setErrorMsg("");
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || "Something went wrong.");
            setSuccessMsg("");
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 flex items-center justify-center px-4 text-white">
          <div className="bg-white text-blue-900 w-full max-w-md p-8 rounded-xl shadow-2xl">
            <h2 className="text-2xl font-semibold text-center mb-6">Forgot Password</h2>
            <p className="text-sm text-center text-gray-600 mb-6">
              Enter your email address and a link to reset your password will be sent.
            </p>
            {successMsg && (
              <div className="mb-4 p-2 rounded-md bg-green-100 text-green-700 border border-green-400 text-sm">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mb-4 p-2 rounded-md bg-red-100 text-red-700 border border-red-400 text-sm">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full mb-4 p-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full bg-blue-800 text-white py-2 rounded-md hover:bg-blue-900 transition"
              >
                Send Reset Link
              </button>
            </form>
          </div>
        </div>
      );
}

export default ForgotPassword