import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-secondary)]">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span className="text-[var(--terracotta)]">Silk</span>
              <span className="text-[var(--text-primary)]">Road</span>
            </h1>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 tracking-widest uppercase">
              Africa
            </p>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
