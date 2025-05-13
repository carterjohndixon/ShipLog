import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {FaEye, FaEyeSlash} from "react-icons/fa";
import {client} from "../api/client";

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    const token = new URLSearchParams(location.search).get("token"); // Extract token from URL

    useEffect(() => {
        if (!token) {
            setErrorMsg("Invalid or expired link.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) return;

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        if (!password || password.trim() === '' 
            || !confirmPassword || confirmPassword.trim() === ''
        ) {
            setErrorMsg("Passwords must not be empty.");
            return;
        }

        setLoading(true);
        try {
            const response = await client.post("/user/reset-password", { token, password, confirmPassword });
            setSuccessMsg("Password reset successful!");
            setErrorMsg("");
            setPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                navigate("/");
            }, 1500)
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || "Something went wrong.");
            setSuccessMsg("");
        } finally {
            setLoading(false);
        }
    };

    const handleIconPassword = () => {
        setShowPassword(!showPassword);
    }
    
    const handleIconConfirmPassword = () => {
        setShowConfirmPassword(!showConfirmPassword);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 flex items-center justify-center px-4 text-white">
            <div className="bg-white text-blue-900 w-full max-w-md p-8 rounded-xl shadow-2xl">
                <h2 className="text-2xl font-semibold text-center mb-6">Reset Password</h2>
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
                    <div className="relative mb-4">
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New Password"
                        className="w-full mb-4 p-2 pr-10 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2 top-[37%] transform -translate-y-1/2 cursor-pointer text-blue-700" onClick={handleIconPassword}>
                                { showPassword ? ( <FaEyeSlash size={20} />) : (<FaEye size={20} />) }
                            </span>
                    </div>
                    <div className="relative mb-4">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="w-full mb-4 p-2 pr-10 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    <span className="absolute right-2 top-[37%] transform -translate-y-1/2 cursor-pointer text-blue-700" onClick={handleIconConfirmPassword}>
                                { showConfirmPassword ? ( <FaEyeSlash size={20} />) : (<FaEye size={20} />) }
                            </span>
                            </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-800 text-white py-2 rounded-md hover:bg-blue-900 transition"
                        disabled={loading}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
