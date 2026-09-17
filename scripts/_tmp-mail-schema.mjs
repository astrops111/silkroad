import { createClient } from "@supabase/supabase-js";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data } = await admin.from("email_threads").select("*").limit(1);
console.log(data && data[0] ? Object.keys(data[0]) : "no rows, checking via insert error");
