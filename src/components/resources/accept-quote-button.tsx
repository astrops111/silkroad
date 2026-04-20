"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptQuoteAndDraftLc } from "@/lib/actions/resources-lc";

interface Props {
  quotationId: string;
  label: string;
  pendingLabel: string;
}

export function AcceptQuoteButton({ quotationId, label, pendingLabel }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    start(async () => {
      const result = await acceptQuoteAndDraftLc(quotationId);
      if (!result.success) {
        setError(result.error ?? "Failed to accept quote");
        return;
      }
      router.push(`/resources/lc/${result.data!.lc_id}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-300">{error}</span>}
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded-md bg-[var(--amber)] text-black font-medium disabled:opacity-50 hover:opacity-90"
      >
        {pending ? pendingLabel : label}
      </button>
    </div>
  );
}
