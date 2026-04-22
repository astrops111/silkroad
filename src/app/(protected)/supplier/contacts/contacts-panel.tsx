"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Phone,
  Star,
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  User as UserIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlatformRole } from "@/lib/supabase/database.types";
import {
  inviteContactByEmail,
  updateContactRole,
  removeContact,
  setPrimaryContact,
} from "@/lib/actions/supplier-contacts";

const ROLE_OPTIONS: { value: PlatformRole; label: string; description: string }[] = [
  {
    value: "supplier_owner",
    label: "Owner",
    description: "Full access — team, payouts, products, orders",
  },
  {
    value: "supplier_catalog",
    label: "Catalog",
    description: "Manage products, images, documents, categories",
  },
  {
    value: "supplier_sales",
    label: "Sales",
    description: "Orders, RFQs, and buyer messages",
  },
  {
    value: "supplier_warehouse",
    label: "Warehouse",
    description: "Fulfilment, shipments, stock levels only",
  },
];

function roleLabel(role: PlatformRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

interface Member {
  id: string;
  userId: string;
  role: PlatformRole;
  isPrimary: boolean;
  joinedAt: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

interface Props {
  currentUserId: string;
  currentRole: PlatformRole;
  members: Member[];
}

export default function ContactsPanel({ currentUserId, currentRole, members }: Props) {
  const isOwner = currentRole === "supplier_owner";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PlatformRole>("supplier_sales");
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);

  function handleInvite() {
    setActingId("invite");
    startTransition(async () => {
      const res = await inviteContactByEmail({ email, role: inviteRole });
      setActingId(null);
      if (!res.success) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success("Team member added");
      setEmail("");
      setInviteRole("supplier_sales");
      setInviteOpen(false);
    });
  }

  function changeRole(memberId: string, newRole: PlatformRole) {
    setActingId(memberId);
    startTransition(async () => {
      const res = await updateContactRole(memberId, newRole);
      setActingId(null);
      if (!res.success) toast.error(res.error ?? "Failed");
      else toast.success("Role updated");
    });
  }

  function remove(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from your team?`)) return;
    setActingId(memberId);
    startTransition(async () => {
      const res = await removeContact(memberId);
      setActingId(null);
      if (!res.success) toast.error(res.error ?? "Failed");
      else toast.success("Member removed");
    });
  }

  function makePrimary(memberId: string) {
    setActingId(memberId);
    startTransition(async () => {
      const res = await setPrimaryContact(memberId);
      setActingId(null);
      if (!res.success) toast.error(res.error ?? "Failed");
      else toast.success("Primary contact updated");
    });
  }

  const owners = members.filter((m) => m.role === "supplier_owner");
  const staff = members.filter((m) => m.role !== "supplier_owner");

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Team & Contacts
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {members.length} member{members.length === 1 ? "" : "s"} · one primary contact receives platform notifications.
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Add member
          </Button>
        )}
      </div>

      {!isOwner && (
        <div className="flex gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-tertiary)]" />
          <p>Only the owner can add or remove team members. Ask them to update the team if you need access changes.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--amber)]" />
            Owners
          </CardTitle>
          <CardDescription>
            Owners have full access to the account. One is marked as the primary contact.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border-subtle)]">
          {owners.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] py-4">
              No owners yet.
            </p>
          ) : (
            owners.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isCurrentUser={m.userId === currentUserId}
                canManage={isOwner}
                acting={actingId === m.id}
                onChangeRole={changeRole}
                onRemove={remove}
                onMakePrimary={makePrimary}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--amber)]" />
            Staff
          </CardTitle>
          <CardDescription>
            Scoped access to catalog, sales, or warehouse operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border-subtle)]">
          {staff.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] py-4">
              No staff yet. {isOwner && "Add members to delegate catalog, sales, or warehouse work."}
            </p>
          ) : (
            staff.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isCurrentUser={m.userId === currentUserId}
                canManage={isOwner}
                acting={actingId === m.id}
                onChangeRole={changeRole}
                onRemove={remove}
                onMakePrimary={makePrimary}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a team member</DialogTitle>
            <DialogDescription>
              The person must already have a signed-up account. Adding them here grants immediate access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as PlatformRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {r.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={pending || !email.trim()}>
              {actingId === "invite" && <Loader2 className="w-4 h-4 animate-spin" />}
              Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RowProps {
  member: Member;
  isCurrentUser: boolean;
  canManage: boolean;
  acting: boolean;
  onChangeRole: (id: string, role: PlatformRole) => void;
  onRemove: (id: string, name: string) => void;
  onMakePrimary: (id: string) => void;
}

function MemberRow({
  member,
  isCurrentUser,
  canManage,
  acting,
  onChangeRole,
  onRemove,
  onMakePrimary,
}: RowProps) {
  const name = member.fullName ?? member.email ?? "Unknown user";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="w-10 h-10 rounded-full bg-[var(--amber-glow)] flex items-center justify-center shrink-0 overflow-hidden">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-[var(--amber-dark)]">
            {initials || <UserIcon className="w-4 h-4" />}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {name}
          </p>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-[10px]">
              You
            </Badge>
          )}
          {member.isPrimary && (
            <Badge className="text-[10px]">
              <Star className="w-3 h-3" />
              Primary
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-0.5">
          {member.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3" />
              {member.email}
            </span>
          )}
          {member.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {member.phone}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canManage && !isCurrentUser ? (
          <Select
            value={member.role}
            onValueChange={(v) => onChangeRole(member.id, v as PlatformRole)}
            disabled={acting}
          >
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{roleLabel(member.role)}</Badge>
        )}

        {canManage && member.role === "supplier_owner" && !member.isPrimary && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMakePrimary(member.id)}
            disabled={acting}
            title="Make primary contact"
          >
            <Star className="w-4 h-4" />
          </Button>
        )}

        {canManage && !isCurrentUser && !member.isPrimary && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(member.id, name)}
            disabled={acting}
            className="text-[var(--danger)]"
            title="Remove from team"
          >
            {acting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
