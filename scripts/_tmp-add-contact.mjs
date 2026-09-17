import { createClient } from "@supabase/supabase-js";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.from("crm_contacts").insert({
  full_name: "E2E Person Tester", email: "e2e-person-test@example.com",
}).select("id").single();
console.log(data, error);
