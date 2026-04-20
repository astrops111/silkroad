import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <div className="pt-[76px] min-h-screen bg-[var(--surface-secondary)]">
      <div className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
          <Skeleton className="h-12 w-full max-w-2xl mt-5 rounded-xl" />
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-24 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
