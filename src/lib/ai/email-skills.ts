import type OpenAI from "openai";
import { nvidiaClient, withModelFallback } from "@/lib/ai/nvidia";
import { createServiceClient } from "@/lib/supabase/server";
import { isAIFeatureEnabled } from "@/lib/ai/feature-flags";
import { logActivity } from "@/lib/crm/activities";
import { logError } from "@/lib/logging/activity";
import { ensureDealThread } from "@/lib/deals/threads";
import { createTicket } from "@/lib/support/tickets";
import type { Json } from "@/lib/supabase/database.types";

// ============================================================
// AI Email Skills — admin-defined processing rules for inbound
// mailbox email. The model only sees tools the skill allows;
// draft replies are queued for HUMAN review, never auto-sent.
// ============================================================

const BATCH_SIZE = 20;

interface TriggerConditions {
  from_pattern?: string;
  subject_pattern?: string;
  direction?: string;
  intents?: string[];
}

interface SkillRow {
  id: string;
  name: string;
  mailbox_id: string | null;
  trigger_conditions: TriggerConditions;
  prompt_template: string;
  allowed_actions: string[];
  priority: number;
}

interface MessageRow {
  id: string;
  mailbox_id: string;
  thread_id: string | null;
  message_id: string | null;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  text_body: string | null;
  snippet: string | null;
  sent_at: string | null;
}

const TOOL_DEFS: Record<string, OpenAI.Chat.Completions.ChatCompletionTool> = {
  draft_reply: {
    type: "function",
    function: {
      name: "draft_reply",
      description:
        "Draft a reply email. It will be queued for human review — an admin edits/approves before anything is sent.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Reply subject line" },
          body_text: { type: "string", description: "Plain-text reply body" },
        },
        required: ["subject", "body_text"],
      },
    },
  },
  link_to_rfq: {
    type: "function",
    function: {
      name: "link_to_rfq",
      description:
        "Link this email thread to a platform RFQ deal when the sender references an RFQ number like RFQ-20260711-AB12CD.",
      parameters: {
        type: "object",
        properties: {
          rfq_number: { type: "string", description: "The referenced RFQ number" },
        },
        required: ["rfq_number"],
      },
    },
  },
  create_crm_activity: {
    type: "function",
    function: {
      name: "create_crm_activity",
      description: "Record a CRM note about what this email means for the relationship or deal.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "One-paragraph summary for the CRM timeline" },
        },
        required: ["summary"],
      },
    },
  },
  escalate: {
    type: "function",
    function: {
      name: "escalate",
      description: "Flag this email for urgent human attention (complaints, legal, high-value).",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why this needs human attention now" },
        },
        required: ["reason"],
      },
    },
  },
  create_ticket: {
    type: "function",
    function: {
      name: "create_ticket",
      description: "Open a support ticket for this email.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
        },
        required: ["subject"],
      },
    },
  },
};

function matchesSkill(skill: SkillRow, message: MessageRow): boolean {
  if (skill.mailbox_id && skill.mailbox_id !== message.mailbox_id) return false;
  const cond = skill.trigger_conditions ?? {};
  try {
    if (cond.from_pattern && !new RegExp(cond.from_pattern, "i").test(message.from_address)) {
      return false;
    }
    if (cond.subject_pattern && !new RegExp(cond.subject_pattern, "i").test(message.subject ?? "")) {
      return false;
    }
  } catch {
    // Invalid stored regex — treat as non-matching rather than crashing the batch
    return false;
  }
  return true;
}

export interface SkillsRunSummary {
  processed: number;
  matchedRuns: number;
  draftsCreated: number;
  errors: string[];
}

/**
 * Process inbound emails that no skill run has seen yet. Called by the
 * email-skills cron. No-ops while the 'email_skills' flag is disabled.
 */
export async function processUnprocessedEmails(): Promise<SkillsRunSummary> {
  const summary: SkillsRunSummary = { processed: 0, matchedRuns: 0, draftsCreated: 0, errors: [] };

  if (!(await isAIFeatureEnabled("email_skills"))) return summary;

  const supabase = createServiceClient();

  const [{ data: messages }, { data: skills }] = await Promise.all([
    supabase
      .from("email_messages")
      .select("id, mailbox_id, thread_id, message_id, from_address, from_name, subject, text_body, snippet, sent_at")
      .eq("direction", "inbound")
      .is("skill_processed_at", null)
      .is("draft_status", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE),
    supabase
      .from("email_skills")
      .select("id, name, mailbox_id, trigger_conditions, prompt_template, allowed_actions, priority")
      .eq("is_active", true)
      .order("priority", { ascending: true }),
  ]);

  if (!messages?.length) return summary;

  const skillRows = (skills ?? []) as unknown as SkillRow[];

  for (const message of messages as MessageRow[]) {
    summary.processed++;

    for (const skill of skillRows) {
      if (!matchesSkill(skill, message)) continue;

      // Idempotency: one run per (skill, message)
      const { data: existingRun } = await supabase
        .from("email_skill_runs")
        .select("id")
        .eq("skill_id", skill.id)
        .eq("email_message_id", message.id)
        .maybeSingle();
      if (existingRun) continue;

      summary.matchedRuns++;
      try {
        const result = await executeSkill(skill, message);
        summary.draftsCreated += result.draftsCreated;
        await supabase.from("email_skill_runs").insert({
          skill_id: skill.id,
          email_message_id: message.id,
          status: "succeeded",
          actions_taken: result.actionsTaken as Json,
          ai_output: result.aiText ? ({ text: result.aiText } as Json) : null,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
        });
      } catch (err) {
        const messageText = err instanceof Error ? err.message : String(err);
        summary.errors.push(`${skill.name}/${message.id}: ${messageText}`);
        await supabase.from("email_skill_runs").insert({
          skill_id: skill.id,
          email_message_id: message.id,
          status: "failed",
          error_message: messageText,
        });
        await logError({
          errorCode: "email_skill_run_failed",
          message: `${skill.name}: ${messageText}`,
          source: "email-skills",
          metadata: { skillId: skill.id, emailMessageId: message.id },
        }).catch(() => {});
      }
    }

    await supabase
      .from("email_messages")
      .update({ skill_processed_at: new Date().toISOString() })
      .eq("id", message.id);
  }

  return summary;
}

interface ExecuteResult {
  actionsTaken: { action: string; detail: string }[];
  draftsCreated: number;
  aiText: string | null;
  inputTokens: number;
  outputTokens: number;
}

async function executeSkill(skill: SkillRow, message: MessageRow): Promise<ExecuteResult> {
  const client = nvidiaClient();
  const supabase = createServiceClient();

  const tools = skill.allowed_actions
    .map((a) => TOOL_DEFS[a])
    .filter((t): t is OpenAI.Chat.Completions.ChatCompletionTool => Boolean(t));

  const system = `You process inbound email for SilkRoad Africa, a B2B Asia→Africa marketplace.
Follow the operator's skill instructions below. Use ONLY the provided tools; if none
apply, reply with a short text explanation and take no action. Never invent RFQ
numbers or facts not present in the email.

SKILL INSTRUCTIONS:
${skill.prompt_template}`;

  const emailContext = `INBOUND EMAIL
From: ${message.from_name ?? ""} <${message.from_address}>
Subject: ${message.subject ?? "(no subject)"}
Date: ${message.sent_at ?? "unknown"}

${(message.text_body ?? message.snippet ?? "").slice(0, 6000)}`;

  const completion = await withModelFallback((model) =>
    client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        { role: "user", content: emailContext },
      ],
      ...(tools.length > 0 && { tools }),
    })
  );

  const assistantMsg = completion.choices[0]?.message;

  const result: ExecuteResult = {
    actionsTaken: [],
    draftsCreated: 0,
    aiText: assistantMsg?.content || null,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
  };

  const toolCalls = (assistantMsg?.tool_calls ?? []).filter(
    (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
      tc.type === "function"
  );

  for (const toolCall of toolCalls) {
    let input: Record<string, string> = {};
    try {
      input = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      continue; // malformed arguments — skip this action
    }
    switch (toolCall.function.name) {
      case "draft_reply": {
        const escaped = (input.body_text ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const { data: mailbox } = await supabase
          .from("mailboxes")
          .select("address, display_name")
          .eq("id", message.mailbox_id)
          .single();

        await supabase.from("email_messages").insert({
          mailbox_id: message.mailbox_id,
          thread_id: message.thread_id,
          direction: "outbound",
          folder: "Drafts",
          draft_status: "pending_review",
          draft_source_message_id: message.id,
          from_address: mailbox?.address ?? "unknown",
          from_name: mailbox?.display_name ?? null,
          to_addresses: [message.from_address],
          in_reply_to: message.message_id,
          references_header: message.message_id ? [message.message_id] : null,
          subject: input.subject ?? `Re: ${message.subject ?? ""}`,
          text_body: input.body_text ?? "",
          html_body: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escaped}</div>`,
          snippet: (input.body_text ?? "").replace(/\s+/g, " ").slice(0, 200),
          is_read: true,
        });
        result.draftsCreated++;
        result.actionsTaken.push({ action: "draft_reply", detail: input.subject ?? "" });
        break;
      }

      case "link_to_rfq": {
        const { data: rfq } = await supabase
          .from("rfqs")
          .select("id, title, buyer_company_id, buyer_user_id")
          .eq("rfq_number", input.rfq_number)
          .maybeSingle();

        if (rfq && message.thread_id) {
          const dealThreadId = await ensureDealThread({
            rfqId: rfq.id,
            title: rfq.title,
            buyerCompanyId: rfq.buyer_company_id,
            buyerUserId: rfq.buyer_user_id,
          });
          if (dealThreadId) {
            await supabase
              .from("email_threads")
              .update({ deal_thread_id: dealThreadId })
              .eq("id", message.thread_id);
            result.actionsTaken.push({ action: "link_to_rfq", detail: input.rfq_number });
          }
        } else {
          result.actionsTaken.push({
            action: "link_to_rfq",
            detail: `RFQ ${input.rfq_number} not found — skipped`,
          });
        }
        break;
      }

      case "create_crm_activity": {
        await logActivity({
          activityType: "ai_action",
          actorType: "ai",
          emailMessageId: message.id,
          referenceType: "email_message",
          referenceId: message.id,
          metadata: { skill: skill.name, preview: (input.summary ?? "").slice(0, 300) },
        });
        result.actionsTaken.push({ action: "create_crm_activity", detail: "logged" });
        break;
      }

      case "escalate": {
        const { data: admins } = await supabase
          .from("company_members")
          .select("user_id")
          .eq("role", "admin_super");
        for (const admin of admins ?? []) {
          await supabase.rpc("create_notification", {
            p_user_id: admin.user_id,
            p_company_id: null,
            p_title: "Email Escalated by AI",
            p_body: `${skill.name}: ${(input.reason ?? "").slice(0, 200)} — from ${message.from_address}`,
            p_type: "system",
            p_icon: "alert-circle",
            p_action_url: "/admin/mail",
            p_reference_type: "email_message",
            p_reference_id: message.id,
          });
        }
        result.actionsTaken.push({ action: "escalate", detail: input.reason ?? "" });
        break;
      }

      case "create_ticket": {
        const ticket = await createTicket({
          subject: input.subject ?? message.subject ?? "(no subject)",
          source: "ai",
          requesterEmail: message.from_address,
          priority: (input.priority as "low" | "normal" | "high" | "urgent") ?? "normal",
          emailThreadId: message.thread_id,
          body: message.text_body?.slice(0, 2000) ?? null,
        });
        result.actionsTaken.push({
          action: "create_ticket",
          detail: ticket ? ticket.ticketNumber : "ticket creation failed",
        });
        break;
      }
    }
  }

  return result;
}
