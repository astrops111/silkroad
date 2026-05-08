"use client";

export function CookiePrefsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-cookie-prefs"))}
      className="hover:text-[var(--text-primary)] transition-colors"
    >
      {label}
    </button>
  );
}
