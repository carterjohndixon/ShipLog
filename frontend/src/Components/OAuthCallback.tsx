import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../api/auth";
import { Loader2, ShipWheel } from 'lucide-react';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("Error fetching user after OAuth:", error?.message);
        navigate('/login');
        return;
      }

      const { data, error: dbError } = await supabase
        .from('users')
        .select('isUsernameSet')
        .eq('id', user.id)
        .maybeSingle();

      if (dbError) {
        console.error("Error checking username status:", dbError.message);
        navigate('/login');
        return;
      }

      if (data?.isUsernameSet) {
        navigate('/');
      } else {
        navigate('/set-username');
      }
    };

    checkUser().finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 flex items-center justify-center text-white px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShipWheel className="w-10 h-10 animate-spin-slow" />
        <h2 className="text-3xl font-semibold">Finishing login...</h2>
        <p className="text-lg text-white/80">Hang tight, we're setting up your account.</p>
        <Loader2 className="animate-spin w-6 h-6 mt-2 text-white" />
      </div>
    </div>
  );
}
