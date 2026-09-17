import { createClient } from "@supabase/supabase-js";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const dealThreadId = "f3aa0636-5abd-48e8-a067-bf4940a1cc5e";
const mailboxId = "a4e803fc-5e92-46db-bec2-630cdd6bbf81";
const rfqId = "b3089812-f992-48f1-9923-235a8c084c78";

const { data: thread, error: thErr } = await admin.from("email_threads").insert({
  mailbox_id: mailboxId, subject_normalized: "E2E Review Test Thread — RFQ + Person filter check",
  deal_thread_id: dealThreadId, first_message_at: new Date(2026, 6, 28).toISOString(),
  last_message_at: new Date(2026, 6, 28).toISOString(), message_count: 1,
}).select("id").single();
console.log("thread:", thread, thErr);
if (thErr) process.exit(1);

const { data: msg, error: msgErr } = await admin.from("email_messages").insert({
  thread_id: thread.id, mailbox_id: mailboxId, direction: "inbound",
  from_address: "e2e-person-test@example.com", from_name: "E2E Person Tester",
  to_addresses: ["sales@silkroad.africa"], subject: "E2E Review Test Thread — RFQ + Person filter check",
  text_body: "Test message body for review pass.", received_at: new Date(2026, 6, 28).toISOString(),
}).select("id").single();
console.log("msg:", msg, msgErr);

console.log("FIXTURES_READY " + JSON.stringify({ rfqId, dealThreadId, threadId: thread.id, mailboxId }));
