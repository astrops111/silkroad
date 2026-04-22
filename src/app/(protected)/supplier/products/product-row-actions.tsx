"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pause, Play, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, toggleProductActive } from "@/lib/actions/products";

export default function ProductRowActions({
  productId,
  productName,
  isActive,
}: {
  productId: string;
  productName: string;
  isActive: boolean;
}) {
  const [togglePending, startToggle] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function handleToggle() {
    startToggle(async () => {
      const res = await toggleProductActive(productId, !isActive);
      if (!res.success) toast.error(res.error ?? "Failed to update");
      else toast.success(isActive ? "Product paused" : "Product activated");
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${productName}"? This cannot be undone.`)) return;
    startDelete(async () => {
      const res = await deleteProduct(productId);
      if (!res.success) toast.error(res.error ?? "Failed to delete");
      else toast.success("Product deleted");
    });
  }

  const iconClass = "p-1.5 rounded-lg hover:bg-[var(--surface-tertiary)] transition-colors disabled:opacity-50";

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handleToggle}
        disabled={togglePending}
        className={iconClass}
        aria-label={isActive ? "Pause product" : "Activate product"}
        title={isActive ? "Pause listing" : "Activate listing"}
      >
        {togglePending ? (
          <Loader2 size={16} className="animate-spin text-[var(--text-tertiary)]" />
        ) : isActive ? (
          <Pause size={16} className="text-[var(--text-tertiary)]" />
        ) : (
          <Play size={16} className="text-[var(--success)]" />
        )}
      </button>
      <Link
        href={`/supplier/products/${productId}/edit`}
        className={iconClass}
        aria-label="Edit product"
        title="Edit"
      >
        <Pencil size={16} className="text-[var(--text-tertiary)]" />
      </Link>
      <button
        onClick={handleDelete}
        disabled={deletePending}
        className={iconClass}
        aria-label="Delete product"
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
