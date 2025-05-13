import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {client} from "../api/client";
import { supabase } from "../api/auth";

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const [status, setStatus] = useState<"checking" | "confirmed" | "unconfirmed">("checking");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<null | boolean>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      verifyEmail(token);
    } else {
      setVerified(false)
      setError("");
      setLoading(false);
    }
  }, []);

  const verifyEmail = async (token: string) => {
    setLoading(true);

    try {
      const response = await client.post("/user/verify-email", {
        token,
      });

      if (response.data && response.data.message === "Email successfully verified and user updated!") {
            setVerified(true);
            setError("");
        } 
        // else {
        //     setVerified(false);
        //     setError(response.data.error || "Verification failed.");
        // }
    } catch (error) {
        // console.error("Verification error:", error || error);
        setLoading(true);
        setError("");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white flex flex-col items-center justify-center px-4">
      <div className="bg-white text-blue-900 w-full max-w-md p-8 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-semibold text-center mb-6">Verify Your Email</h2>
        {loading ? (
          <div className="text-center">Verifying...</div>
        ) : error ? (
          <div className="mb-4 p-2 rounded-md bg-red-100 text-red-700 border border-red-400 text-sm">
            {error}
          </div>
        ) : (
          <div className="text-center">
            {verified ? (
              <div>
                Your email has been successfully verified! Please{" "}
                <a href="/login" className="text-blue-600">
                  log in
                </a>
                .
              </div>
            ) : (
              <div>
                Verification email sent. Please check your inbox.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    );
}

export default VerifyEmail;
