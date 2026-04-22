"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Factory,
  Shield,
  Plus,
  Loader2,
} from "lucide-react";
import {
  addRoleToUser,
  type ListUsersResult,
  type UserListRow,
} from "@/lib/actions/admin-users-list";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const COUNTRIES = [
  { code: "GH", name: "Ghana", region: "africa_west" },
  { code: "NG", name: "Nigeria", region: "africa_west" },
  { code: "KE", name: "Kenya", region: "africa_east" },
  { code: "TZ", name: "Tanzania", region: "africa_east" },
  { code: "UG", name: "Uganda", region: "africa_east" },
  { code: "ZA", name: "South Africa", region: "africa_south" },
  { code: "EG", name: "Egypt", region: "africa_north" },
  { code: "MA", name: "Morocco", region: "africa_north" },
  { code: "CI", name: "Ivory Coast", region: "africa_west" },
  { code: "CN", name: "China", region: "cn" },
];

type AddRoleType = "buyer" | "supplier" | "admin";

export function UsersTable({ initial }: { initial: ListUsersResult }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [dialog, setDialog] = useState<{
    user: UserListRow;
    role: AddRoleType;
  } | null>(null);

  function updateQuery(next: { page?: number; size?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.page !== undefined) params.set("page", String(next.page));
    if (next.size !== undefined) {
      params.set("size", String(next.size));
      params.set("page", "1"); // reset to first page on size change
    }
    startTransition(() => router.push(`?${params.toString()}`));
  }

  const { users, total, page, pageSize } = initial;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <>
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Roles</th>
              <th className="px-4 py-3 font-semibold">Companies</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-[var(--text-tertiary)]"
                >
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.userId} className="hover:bg-[var(--surface-secondary)]/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--text-primary)]">
                    {u.fullName ?? "—"}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {u.email ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {u.countryCode ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.hasBuyer && (
                      <Badge variant="secondary" className="gap-1">
                        <ShoppingCart className="size-3" />
                        Buyer
                      </Badge>
                    )}
                    {u.hasSupplier && (
                      <Badge variant="secondary" className="gap-1">
                        <Factory className="size-3" />
                        Supplier
                      </Badge>
                    )}
                    {u.hasAdmin && (
                      <Badge className="gap-1">
                        <Shield className="size-3" />
                        Admin
                      </Badge>
                    )}
                    {!u.hasBuyer && !u.hasSupplier && !u.hasAdmin && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        No roles
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                  {u.companies.length === 0 ? (
                    <span className="text-[var(--text-tertiary)]">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {u.companies.slice(0, 2).map((c) => (
                        <div key={c.id} className="truncate max-w-[240px]">
                          {c.name}
                          <span className="text-[var(--text-tertiary)] ml-1">
                            ({c.type === "buyer_org" ? "buyer" : c.type})
                          </span>
                        </div>
                      ))}
                      {u.companies.length > 2 && (
                        <div className="text-[var(--text-tertiary)]">
                          +{u.companies.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="size-3.5" />
                        Add role
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Add profile</DropdownMenuLabel>
                      <DropdownMenuItem
                        disabled={u.hasBuyer}
                        onSelect={() => setDialog({ user: u, role: "buyer" })}
                      >
                        <ShoppingCart className="size-4" />
                        Buyer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={u.hasSupplier}
                        onSelect={() => setDialog({ user: u, role: "supplier" })}
                      >
                        <Factory className="size-4" />
                        Supplier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={u.hasAdmin}
                        onSelect={() => setDialog({ user: u, role: "admin" })}
                      >
                        <Shield className="size-4" />
                        Promote to Admin
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <Label htmlFor="page-size" className="text-xs">
            Per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => updateQuery({ size: parseInt(v, 10) })}
          >
            <SelectTrigger id="page-size" className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-[var(--text-tertiary)]">
            {total === 0 ? "0 of 0" : `${from}–${to} of ${total}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => updateQuery({ page: page - 1 })}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="text-xs text-[var(--text-tertiary)]">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => updateQuery({ page: page + 1 })}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {dialog && (
        <AddRoleDialog
          user={dialog.user}
          role={dialog.role}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          onSuccess={() => {
            setDialog(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}

function AddRoleDialog({
  user,
  role,
  onOpenChange,
  onSuccess,
}: {
  user: UserListRow;
  role: AddRoleType;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    countryCode: user.countryCode ?? "",
    marketRegion: "",
  });

  function handleCountry(code: string) {
    const c = COUNTRIES.find((x) => x.code === code);
    if (c)
      setForm((p) => ({
        ...p,
        countryCode: c.code,
        marketRegion: c.region,
      }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload =
      role === "admin"
        ? { userId: user.userId, role: "admin" as const }
        : {
            userId: user.userId,
            role,
            companyName: form.companyName,
            countryCode: form.countryCode,
            marketRegion: form.marketRegion,
          };

    const result = await addRoleToUser(payload);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    onSuccess();
  }

  const title =
    role === "admin"
      ? `Promote ${user.fullName ?? user.email} to Admin`
      : `Add ${role === "supplier" ? "Supplier" : "Buyer"} profile`;

  const isValid =
    role === "admin" ||
    (form.companyName.length >= 2 && form.countryCode.length === 2);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {role === "admin"
              ? "This attaches the user to the platform-admin company with admin_super role. They'll be able to access /admin after next login."
              : `Creates a new ${role === "supplier" ? "supplier" : "buyer_org"} company and attaches ${user.fullName ?? user.email} to it.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {role !== "admin" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, companyName: e.target.value }))
                  }
                  placeholder={
                    role === "supplier"
                      ? "e.g. Guangzhou Parts Co"
                      : "e.g. Lagos Trading Ltd"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={form.countryCode}
                  onValueChange={handleCountry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || loading}>
              {loading && <Loader2 className="animate-spin size-4" />}
              {role === "admin" ? "Promote" : "Create & attach"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
