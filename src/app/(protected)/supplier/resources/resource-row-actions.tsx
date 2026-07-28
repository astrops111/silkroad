"use client";

import { useTransition } from "react";
import { Pause, Play, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteResourceListing,
  toggleResourceListingActive,
} from "@/lib/actions/resources-listing";

export default function ResourceRowActions({
  listingId,
  listingName,
  status,
}: {
  listingId: string;
  listingName: string;
  status: string;
}) {
  const [togglePending, startToggle] = useTransition();
  const [deletePending, startDelete] = useTransition();

  const canToggle = status === "approved" || status === "suspended";

  function handleToggle() {
    startToggle(async () => {
      const res = await toggleResourceListingActive(listingId);
      if (!res.success) toast.error(res.error ?? "Failed to update");
      else
        toast.success(
          status === "approved" ? "Listing suspended" : "Listing resubmitted for review"
        );
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${listingName}"? This cannot be undone.`)) return;
    startDelete(async () => {
      const res = await deleteResourceListing(listingId);
      if (!res.success) toast.error(res.error ?? "Failed to delete");
      else toast.success("Listing deleted");
    });
  }

  const iconClass =
    "p-1.5 rounded-lg hover:bg-[var(--surface-tertiary)] transition-colors disabled:opacity-50";

  return (
    <div className="inline-flex items-center gap-1">
      {canToggle && (
        <button
          onClick={handleToggle}
          disabled={togglePending}
          className={iconClass}
          aria-label={status === "approved" ? "Suspend listing" : "Resubmit listing"}
          title={status === "approved" ? "Suspend listing" : "Resubmit for review"}
        >
          {togglePending ? (
            <Loader2 size={16} className="animate-spin text-[var(--text-tertiary)]" />
          ) : status === "approved" ? (
            <Pause size={16} className="text-[var(--text-tertiary)]" />
          ) : (
            <Play size={16} className="text-[var(--success)]" />
          )}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={deletePending}
        className={iconClass}
        aria-label="Delete listing"
        title="Delete"
      >
        {deletePending ? (
          <Loader2 size={16} className="animate-spin text-[var(--danger)]" />
        ) : (
          <Trash2 size={16} className="text-[var(--danger)]" />
        )}
      </button>
    </div>
  );
}
