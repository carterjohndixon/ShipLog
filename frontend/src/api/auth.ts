import { client } from "./client";
import { createClient } from "@supabase/supabase-js";

const TOKEN_KEY = "token";

const supabaseUrl: string = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey: string = process.env
    .REACT_APP_SUPABASE_ANON_KEY as string;

export const login = async (username: string, password: string) => {
    const { data } = await client.post("/user/login", { username, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
};

export const signup = async (username: string, password: string) => {
    const { data } = await client.post("/user/signup", { username, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
};

export const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
};

export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

export const isAuthenticated = () => {
    return !!getToken();
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
