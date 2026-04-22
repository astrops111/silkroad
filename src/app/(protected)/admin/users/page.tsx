import Link from "next/link";
import { listUsers } from "@/lib/actions/admin-users-list";
import { UsersTable } from "./users-table";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10) || 1;
  const pageSize = parseInt(sp.size ?? "25", 10) || 25;

  const result = await listUsers(page, pageSize);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {result.total} total · manage roles and profiles for platform users.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/create">
            <UserPlus className="size-4" />
            New user
          </Link>
        </Button>
      </div>

      <UsersTable initial={result} />
    </div>
  );
}
