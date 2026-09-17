import { createClient } from "@supabase/supabase-js";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: rfq } = await admin.from("rfqs").select("id, rfq_number, title, buyer_company_id, companies:buyer_company_id(name)").limit(1).single();
console.log("rfq:", rfq);

const { data: mailbox } = await admin.from("mailboxes").select("id, address").eq("address", "sales@silkroad.africa").single();
console.log("mailbox:", mailbox);

// Create a deal_thread linked to this RFQ
const { data: dealThread, error: dtErr } = await admin.from("deal_threads").insert({
  rfq_id: rfq.id, title: "E2E Review Test Case — RFQ linked", buyer_company_id: rfq.buyer_company_id,
}).select("id").single();
console.log("dealThread:", dealThread, dtErr);

// Create an email_thread on this mailbox, linked to the deal_thread
const { data: thread, error: thErr } = await admin.from("email_threads").insert({
  mailbox_id: mailbox.id, subject: "E2E Review Test Thread — RFQ + Person filter check",
  deal_thread_id: dealThread.id, status: "open",
}).select("id").single();
console.log("thread:", thread, thErr);

// Create a message on this thread from a known person
const { data: msg, error: msgErr } = await admin.from("email_messages").insert({
  thread_id: thread.id, mailbox_id: mailbox.id, direction: "inbound",
  from_address: "e2e-person-test@example.com", from_name: "E2E Person Tester",
  to_addresses: ["sales@silkroad.africa"], subject: "E2E Review Test Thread — RFQ + Person filter check",
  text_body: "Test message body for review pass.", received_at: new Date(2026, 6, 28).toISOString(),
}).select("id").single();
console.log("msg:", msg, msgErr);

console.log("FIXTURES READY:", { rfqId: rfq.id, dealThreadId: dealThread.id, threadId: thread.id, mailboxId: mailbox.id });
