import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/crm/activities";
import { logError } from "@/lib/logging/activity";

// ============================================================
// Email sequences (drip / follow-up chains).
// Step delay_hours are CUMULATIVE from the trigger moment; the
// enrollment scan only enrolls once step 1 is already due, and
// each step schedules the next by delay difference. Stop
// conditions end a chain the moment the subject converts.
// ============================================================

interface SequenceRow {
  id: string;
  name: string;
  trigger_event: string;
  email_sequence_steps: StepRow[];
}

interface StepRow {
  id: string;
  step_order: number;
  delay_hours: number;
  template_id: string | null;
  subject_template: string | null;
  html_template: string | null;
}

export interface SequencesRunSummary {
  enrolled: number;
  sent: number;
  stopped: number;
  completed: number;
  errors: string[];
}

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

/**
 * One cron pass: enroll newly-due subjects, then advance active
 * enrollments whose next_send_at has arrived.
 */
export async function processEmailSequences(): Promise<SequencesRunSummary> {
  const summary: SequencesRunSummary = { enrolled: 0, sent: 0, stopped: 0, completed: 0, errors: [] };
  const supabase = createServiceClient();

  const { data: sequences } = await supabase
    .from("email_sequences")
    .select(`
      id, name, trigger_event,
      email_sequence_steps ( id, step_order, delay_hours, template_id, subject_template, html_template )
    `)
    .eq("is_active", true);

  for (const sequence of (sequences ?? []) as unknown as SequenceRow[]) {
    const steps = [...(sequence.email_sequence_steps ?? [])].sort((a, b) => a.step_order - b.step_order);
    if (steps.length === 0) continue;

    try {
      summary.enrolled += await enroll(sequence, steps[0]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(`enroll ${sequence.name}: ${message}`);
      await logError({
        errorCode: "sequence_step_failed",
        message: `enroll ${sequence.name}: ${message}`,
        source: "email-sequences",
        metadata: { sequenceId: sequence.id, phase: "enroll" },
      }).catch(() => {});
    }

    try {
      const advanced = await advance(sequence, steps);
      summary.sent += advanced.sent;
      summary.stopped += advanced.stopped;
      summary.completed += advanced.completed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(`advance ${sequence.name}: ${message}`);
      await logError({
        errorCode: "sequence_step_failed",
        message: `advance ${sequence.name}: ${message}`,
        source: "email-sequences",
        metadata: { sequenceId: sequence.id, phase: "advance" },
      }).catch(() => {});
    }
  }

  return summary;
}

/** Find subjects whose first step is due and enroll them (idempotent). */
async function enroll(sequence: SequenceRow, firstStep: StepRow): Promise<number> {
  const supabase = createServiceClient();
  let enrolled = 0;

  if (sequence.trigger_event === "rfq_no_quote") {
    // Open RFQs past the first-step delay with no quotes yet
    const { data: rfqs } = await supabase
      .from("rfqs")
      .select("id, rfq_number, invited_supplier_ids, published_at")
      .eq("status", "open")
      .lt("published_at", hoursAgoIso(firstStep.delay_hours))
      .limit(50);

    for (const rfq of rfqs ?? []) {
      for (const supplierId of rfq.invited_supplier_ids ?? []) {
        const { data: member } = await supabase
          .from("company_members")
          .select("user_profiles ( email, full_name )")
          .eq("company_id", supplierId)
          .eq("is_primary", true)
          .maybeSingle();
        const contact = member?.user_profiles as unknown as { email: string; full_name: string } | null;
        if (!contact?.email) continue;

        const { error } = await supabase.from("email_sequence_enrollments").insert({
          sequence_id: sequence.id,
          subject_type: "rfq",
          subject_id: rfq.id,
          contact_email: contact.email,
          contact_name: contact.full_name,
          next_send_at: new Date().toISOString(),
        });
        if (!error) enrolled++;
        // 23505 = already enrolled — expected on every pass
      }
    }
  }

  if (sequence.trigger_event === "quote_expiring") {
    // Submitted quotes expiring within 3 days — nudge the buyer
    const threeDaysOut = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const { data: quotes } = await supabase
      .from("quotations")
      .select(`
        id, valid_until, rfq_id,
        rfqs ( rfq_number, buyer_user_id, user_profiles!rfqs_buyer_user_id_fkey ( email, full_name ) )
      `)
      .eq("status", "submitted")
      .gte("valid_until", today)
      .lte("valid_until", threeDaysOut)
      .limit(50);

    for (const quote of quotes ?? []) {
      const rfq = quote.rfqs as unknown as {
        rfq_number: string;
        user_profiles: { email: string; full_name: string } | null;
      } | null;
      const buyer = rfq?.user_profiles;
      if (!buyer?.email) continue;

      const { error } = await supabase.from("email_sequence_enrollments").insert({
        sequence_id: sequence.id,
        subject_type: "quotation",
        subject_id: quote.id,
        contact_email: buyer.email,
        contact_name: buyer.full_name,
        next_send_at: new Date().toISOString(),
      });
      if (!error) enrolled++;
    }
  }

  return enrolled;
}

/** Stop condition per trigger — true means the chain should end now. */
async function shouldStop(triggerEvent: string, subjectType: string, subjectId: string): Promise<boolean> {
  const supabase = createServiceClient();

  if (triggerEvent === "rfq_no_quote" && subjectType === "rfq") {
    const { data: rfq } = await supabase
      .from("rfqs")
      .select("status")
      .eq("id", subjectId)
      .maybeSingle();
    return !rfq || rfq.status !== "open";
  }

  if (triggerEvent === "quote_expiring" && subjectType === "quotation") {
    const { data: quote } = await supabase
      .from("quotations")
      .select("status")
      .eq("id", subjectId)
      .maybeSingle();
    return !quote || quote.status !== "submitted";
  }

  return false;
}

async function buildVars(
  subjectType: string,
  subjectId: string,
  contactName: string | null
): Promise<Record<string, string>> {
  const supabase = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const vars: Record<string, string> = { name: contactName ?? "there", actionUrl: appUrl };

  if (subjectType === "rfq") {
    const { data: rfq } = await supabase
      .from("rfqs")
      .select("rfq_number")
      .eq("id", subjectId)
      .maybeSingle();
    if (rfq) {
      vars.rfqNumber = rfq.rfq_number;
      vars.actionUrl = `${appUrl}/supplier/rfq/${subjectId}/quote`;
    }
  }
  if (subjectType === "quotation") {
    const { data: quote } = await supabase
      .from("quotations")
      .select("rfq_id, rfqs ( rfq_number )")
      .eq("id", subjectId)
      .maybeSingle();
    const rfq = quote?.rfqs as unknown as { rfq_number: string } | null;
    if (rfq) vars.rfqNumber = rfq.rfq_number;
    if (quote) vars.actionUrl = `${appUrl}/dashboard/rfq/${quote.rfq_id}`;
  }

  return vars;
}

async function advance(
  sequence: SequenceRow,
  steps: StepRow[]
): Promise<{ sent: number; stopped: number; completed: number }> {
  const supabase = createServiceClient();
  const result = { sent: 0, stopped: 0, completed: 0 };

  const { data: due } = await supabase
    .from("email_sequence_enrollments")
    .select("id, subject_type, subject_id, contact_email, contact_name, current_step, created_at")
    .eq("sequence_id", sequence.id)
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString())
    .limit(50);

  for (const enrollment of due ?? []) {
    if (await shouldStop(sequence.trigger_event, enrollment.subject_type, enrollment.subject_id)) {
      await supabase
        .from("email_sequence_enrollments")
        .update({ status: "stopped", updated_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      result.stopped++;
      continue;
    }

    const step = steps[enrollment.current_step];
    if (!step) {
      await supabase
        .from("email_sequence_enrollments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      result.completed++;
      continue;
    }

    // Resolve template (managed template wins over inline copy)
    let subjectTemplate = step.subject_template ?? "";
    let htmlTemplate = step.html_template ?? "";
    if (step.template_id) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject_template, html_template")
        .eq("id", step.template_id)
        .maybeSingle();
      if (template) {
        subjectTemplate = template.subject_template;
        htmlTemplate = template.html_template;
      }
    }
    if (!subjectTemplate || !htmlTemplate) continue;

    const vars = await buildVars(enrollment.subject_type, enrollment.subject_id, enrollment.contact_name);
    const sent = await sendEmail(
      {
        to: enrollment.contact_email,
        subject: substitute(subjectTemplate, vars),
        html: substitute(htmlTemplate, vars),
      },
      `sequence_${sequence.name}_step${step.step_order}`
    );

    if (sent) {
      result.sent++;
      await logActivity({
        activityType: "email_outbound",
        referenceType: enrollment.subject_type === "rfq" ? "rfq" : "quotation",
        referenceId: enrollment.subject_id,
        metadata: { sequence: sequence.name, step: step.step_order, to: enrollment.contact_email },
      });
    }

    const nextStep = steps[enrollment.current_step + 1];
    if (nextStep) {
      const gapHours = Math.max(nextStep.delay_hours - step.delay_hours, 1);
      await supabase
        .from("email_sequence_enrollments")
        .update({
          current_step: enrollment.current_step + 1,
          next_send_at: new Date(Date.now() + gapHours * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", enrollment.id);
    } else {
      await supabase
        .from("email_sequence_enrollments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      result.completed++;
    }
  }

  return result;
}
