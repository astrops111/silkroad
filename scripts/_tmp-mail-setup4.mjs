import { createClient } from "@supabase/supabase-js";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const threadId = "46454ac8-6302-4dd6-85ce-63532c58533c";
const mailboxId = "a4e803fc-5e92-46db-bec2-630cdd6bbf81";
const rfqId = "b3089812-f992-48f1-9923-235a8c084c78";
const dealThreadId = "f3aa0636-5abd-48e8-a067-bf4940a1cc5e";

const { data: msg, error: msgErr } = await admin.from("email_messages").insert({
  thread_id: threadId, mailbox_id: mailboxId, direction: "inbound",
  from_address: "e2e-person-test@example.com", from_name: "E2E Person Tester",
  to_addresses: ["sales@silkroad.africa"], subject: "E2E Review Test Thread — RFQ + Person filter check",
  text_body: "Test message body for review pass.", sent_at: new Date(2026, 6, 28).toISOString(),
}).select("id").single();
console.log("msg:", msg, msgErr);

console.log("FIXTURES_READY " + JSON.stringify({ rfqId, dealThreadId, threadId, mailboxId }));
