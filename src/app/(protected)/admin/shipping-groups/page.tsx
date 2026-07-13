"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, Layers, Plus, Pencil, Trash2, RefreshCw, Package, Boxes } from "lucide-react";
import { toast } from "sonner";

const GROUP_TYPE_LABELS: Record<string, string> = {
  supplier: "Supplier",
  supplier_group: "Supplier Group",
  country: "Country",
  custom: "Custom",
};

const CONTAINER_LABELS: Record<string, string> = {
  lcl: "LCL",
  fcl_20: "FCL 20'",
  fcl_40: "FCL 40'",
  fcl_40hc: "FCL 40' HC",
  fcl_45: "FCL 45'",
  air_express: "Air Express",
  air_freight: "Air Freight",
};

interface GroupRow {
  id: string;
  name: string;
  code: string | null;
  group_type: string;
  description: string | null;
  country_code: string | null;
  preferred_container_type: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
}

export default function ShippingGroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipping-groups");
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch {
      toast.error("Failed to load shipping groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function handleDelete(g: GroupRow) {
    if (!confirm(`Delete group "${g.name}"? All ${g.product_count} products will be unassigned.`)) return;
    setDeleting(g.id);
    try {
      const res = await fetch(`/api/admin/shipping-groups?id=${g.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Group deleted"); await fetchGroups(); }
      else toast.error(data.error ?? "Failed");
    } catch {
      toast.error("Failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Shipping Groups
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Group products by container batch, country, or supplier for freight planning
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchGroups} className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link href="/admin/shipping-groups/clusters" className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-2">
            <Boxes className="w-4 h-4" /> Discover Clusters
          </Link>
          <Link href="/admin/shipping-groups/new" className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Group
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
            <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Layers className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No shipping groups yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Create groups to organise products into container batches</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Group", "Type", "Container", "Products", "Status", "Created", ""].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const isDel = deleting === g.id;
                  return (
                    <tr key={g.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{g.name}</p>
                        {g.code && (
                          <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>{g.code}</p>
                        )}
                        {g.country_code && (
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>Origin: {g.country_code}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
                          {GROUP_TYPE_LABELS[g.group_type] ?? g.group_type}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                          {g.preferred_container_type ? (CONTAINER_LABELS[g.preferred_container_type] ?? g.preferred_container_type) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{g.product_count}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full"
                          style={{
                            background: g.is_active
                              ? "color-mix(in srgb, var(--success) 10%, transparent)"
                              : "var(--surface-secondary)",
                            color: g.is_active ? "var(--success)" : "var(--text-tertiary)",
                          }}>
                          {g.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(g.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isDel ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--amber)" }} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/shipping-groups/${g.id}`} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => handleDelete(g)} className="p-1.5 rounded-lg" style={{ color: "var(--danger)" }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{groups.length} group{groups.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  );
}
