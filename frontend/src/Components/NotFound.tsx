import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-sky-600 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-gray-800 dark:text-white mb-4">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">Oops! Page not found.</p>
      <p className="text-md text-gray-500 dark:text-gray-400 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to={isLoggedIn ? "/" : "/login"}
        className="bg-white text-blue-800 hover:bg-gray-100 text-lg px-6 py-3 rounded-xl shadow-md transition"
      >
        {isLoggedIn ? "Go back home" : "Go to login"}
      </Link>
    </div>
  );
}
