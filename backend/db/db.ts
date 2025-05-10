import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseURL = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPA_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseURL, supabaseKey);

async function checkConnection() {
    try {
        await supabase.from("some_table").select("*").limit(1);
        console.log("Supabase connection is active.");
        return true;
    } catch (error) {
        console.error("Supabase connection error:", error);
        return false;
    }
}

checkConnection();

export default supabase;
