import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom";
import {FaEye, FaEyeSlash, FaGithub} from "react-icons/fa";
import {FcGoogle} from "react-icons/fc";
import { supabase } from "../api/auth";

import {client} from "../api/client";


const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [waitingforOAuth, setWaitingforOAuth] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await client.post("/user/login", {username, password});
            const {token} = response.data;

            if (token) {
                localStorage.setItem("token", token);
                navigate('/');
            } else {
                setErrorMsg("Login failed: No token received.");
            }
        } catch (error: any) {
            if (error.response) {
                console.error("Server error:", error.response.data);
                setErrorMsg(error.response.data.message || "Username or password is invalid.")
            } else {
                console.error("Unexpected error:", error);
                setErrorMsg("Something went wrong. Please try again later.");
            }
        }
    }

    const handleIconPassword = () => {
        setShowPassword(!showPassword);
    }

    const OAuthCallback = async (provider: 'google' | 'github') => {
        setWaitingforOAuth(true);

        await supabase.auth.signOut();

        const {error} = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: "http://localhost:3000/auth/callback"
            }
        });

        if (error) {
            console.error("Error during OAuth sign-in:", error);
            setErrorMsg("OAuth sign-in failed. Please try again.");
            setWaitingforOAuth(false);
            return;
        }

        const {data: {session}, error: sessionError} = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error fetching session:", sessionError.message);
            setErrorMsg("Error fetching session. Please try again.");
            return;
        }

        if (session?.user) {
            const {user} = session;

            const {data: existingUser, error: fetchError} = await supabase
                .from('users')
                .select('isUsernameSet')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                console.error("Error fetching user data:", fetchError.message);
                setErrorMsg("Error checking user data. Please try again.");
                setWaitingforOAuth(false);
                return;
            }

            if (existingUser?.isUsernameSet) {
                navigate('/');
            } else {
                navigate('/set-username');
            }
        }
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white flex flex-col items-center justify-center px-4">
  <div className="bg-white text-blue-900 w-full max-w-md p-8 rounded-xl shadow-2xl">
    <h2 className="text-3xl font-semibold text-center mb-6">Log In</h2>

    {errorMsg && (
      <div className="mb-4 p-2 rounded-md bg-red-100 text-red-700 border border-red-400 text-sm">
        {errorMsg}
      </div>
    )}
    

    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="username" className="block text-sm font-medium">Username</label>
        <input
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          id="username"
          name="username"
          placeholder="Enter your username"
          className="w-full mt-1 p-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div className="mb-6 relative">
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input
          onChange={(e) => setPassword(e.target.value)}
          type={showPassword ? "text" : "password"}
          id="password"
          name="password"
          placeholder="Enter your password"
          className="w-full mt-1 p-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <span className="absolute right-2 top-[70%] transform -translate-y-1/2 cursor-pointer text-blue-700" onClick={handleIconPassword}>
            { showPassword ? ( <FaEyeSlash size={20} />) : (<FaEye size={20} />) }
        </span>
      </div>
      <button type="submit" className="w-full bg-blue-800 text-white py-2 rounded-md hover:bg-blue-900 transition">
        Log In
      </button>
    </form>
    <div className="flex items-center my-4">
  <div className="flex-grow border-t border-gray-300"></div>
  <span className="mx-2 text-gray-400 text-sm">OR</span>
  <div className="flex-grow border-t border-gray-300"></div>
</div>

<div className="flex flex-col gap-3">
  <button 
    onClick={() => OAuthCallback('google')} 
    className="w-full flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 rounded-md transition border"
  >
    <span className="pr-2">
        <FcGoogle size={20} />
    </span>
    Continue with Google
  </button>

  <button 
    onClick={() => OAuthCallback('github')} 
    className="w-full flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 rounded-md transition border"
  >
    <span className="pr-2">
        <FaGithub size={20} />
    </span>
    Continue with GitHub
  </button>
</div>
    <p className="mt-4 text-center text-sm text-blue-500">
        Don't have an account? {" "}
        <Link to="/signup" className="font-semibold text-blue-900 hover:underline">Sign up</Link>
    </p>
    <p className="mt-2 text-center text-sm text-blue-500">
    <Link to="/forgot-password" className="font-semibold text-blue-900 hover:underline">
        Forgot password?
    </Link>
    </p>
  </div>
</div>
  );
}

export default Login;