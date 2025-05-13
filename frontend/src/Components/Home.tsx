import React from "react";
import { ShipWheel } from "lucide-react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 mb-6">
        <ShipWheel className="w-10 h-10 text-white" />
        <h1 className="text-4xl font-bold tracking-tight">ShipLog</h1>
      </div>

      <p className="text-xl max-w-xl text-center mb-8">
        Seamlessly log, track, and manage your sea journeys, cargo details, and onboard tasks — all in one intuitive dashboard.
      </p>

      <Link
        className="bg-white text-blue-800 hover:bg-gray-100 text-lg px-6 py-3 rounded-xl shadow-md transition"
        to="/dashboard"
      >
        Launch Dashboard
      </Link>
    </div>
  );
};

export default Home;
