import { Skeleton } from "@/components/ui/skeleton";

export default function SupplierLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-24 mt-4" />
            <Skeleton className="h-4 w-16 mt-2" />
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full mt-3" />
        ))}
      </div>
    </div>
  );
}
