import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShipWheel } from "lucide-react";
import { supabase } from "../api/auth";

export default function SetUsername() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(false);

    // const {data: {session}, error: sessionError} = await supabase.auth.getSession();
    const {data: {user}, error: userError} = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("Error fetching session:", userError?.message);
        setError("Failed to fetch user session");
        setLoading(false);
        return;
    }

    if (!username || username.trim() === '') {
      setError("Username cannot be empty");
      setLoading(false);
      return;
    }

    const {data: existingUsername, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking username:", checkError.message);
      setError("Error checking username availability.");
      setLoading(false);
      return;
    }
    
    if (existingUsername) {
      setError("Username already taken.");
      setLoading(false);
      return;
    }

    const {error: upsertError} = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        verifiedEmail: user.email_confirmed_at ? true : false,
        password: null,
        username: username,
        isUsernameSet: true,
      });

    if (upsertError) {
      console.error("Error saving username:", upsertError.message);

      if(upsertError.message.includes("duplicate key value")) {
        setError("Username already exists.")
      } else {
        setError("Error saving username. Please try again");
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 mb-6">
        <ShipWheel className="w-10 h-10 text-white" />
        <h1 className="text-4xl font-bold tracking-tight">ShipLog</h1>
      </div>

      <p className="text-xl max-w-xl text-center mb-8">
        Before you embark, let's set your unique captain's username.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          className="w-full px-4 py-3 rounded-xl text-blue-900 text-lg placeholder-gray-500 focus:outline-none"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {error && <p className="text-red-300 text-center">{error}</p>}

        {success && <p className="text-green-300 text-center">Username successfully set!</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-white text-blue-800 hover:bg-gray-100 text-lg px-6 py-3 rounded-xl shadow-md transition"
        >
          {loading ? "Saving..." : "Set Username"}
        </button>
      </form>
    </div>
  );
}

// Have green pop up showing username sucessfully set on set-username