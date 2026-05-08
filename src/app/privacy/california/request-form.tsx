"use client";

import { useState } from "react";

const REQUEST_TYPES = [
  { value: "know", label: "Right to Know — what personal information you hold about me" },
  { value: "delete", label: "Right to Delete — delete my personal information" },
  { value: "correct", label: "Right to Correct — correct inaccurate personal information" },
  { value: "opt_out", label: "Right to Opt-Out — do not sell or share my personal information" },
];

type Status = "idle" | "submitting" | "success" | "error";

export function CaliforniaRequestForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    requestType: "",
    details: "",
  });
  const [status, setStatus] = useState<Status>("idle");

  function set(field: keyof typeof form) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/privacy/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-sm text-green-800">
        <p className="font-semibold">Request received</p>
        <p className="mt-1">
          We will respond within 45 days at the email address you provided. For complex requests
          we may extend this to 90 days with notice.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="ca-full-name" className="block text-sm font-medium text-stone-800 mb-1">
          Full name
        </label>
        <input
          id="ca-full-name"
          type="text"
          required
          value={form.fullName}
          onChange={set("fullName")}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label htmlFor="ca-email" className="block text-sm font-medium text-stone-800 mb-1">
          Email address
        </label>
        <input
          id="ca-email"
          type="email"
          required
          value={form.email}
          onChange={set("email")}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label
          htmlFor="ca-request-type"
          className="block text-sm font-medium text-stone-800 mb-1"
        >
          Type of request
        </label>
        <select
          id="ca-request-type"
          required
          value={form.requestType}
          onChange={set("requestType")}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Select a request type</option>
          {REQUEST_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ca-details" className="block text-sm font-medium text-stone-800 mb-1">
          Additional details{" "}
          <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="ca-details"
          rows={4}
          value={form.details}
          onChange={set("details")}
          placeholder="Describe the specific information or correction you are requesting…"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600">
          Something went wrong. Please email us at{" "}
          <a href="mailto:privacy@silkroad.africa" className="underline underline-offset-2">
            privacy@silkroad.africa
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
      >
        {status === "submitting" ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
