import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../api/auth";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [userExists, setUserExists] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      setUserExists(!!user);
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) return null; // or show a loading spinner
  return userExists ? <>{children}</> : <Navigate to="/login" replace />;
};

export default AuthProvider;
