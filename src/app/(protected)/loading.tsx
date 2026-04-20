import { Loader2 } from "lucide-react";

export default function ProtectedLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--amber)" }}
        />
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
      </div>
    </div>
  );
}
