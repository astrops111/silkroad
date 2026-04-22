import type { ReactNode } from "react";

/* Minimal CSS-only tooltip. Works for both hover and keyboard focus.
   Renders the trigger inline and the bubble above it. */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`group/tt relative inline-flex ${className ?? ""}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 max-w-[240px] whitespace-normal rounded-md bg-[var(--obsidian)] px-2.5 py-1.5 text-[11px] leading-snug font-medium text-white shadow-lg opacity-0 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 transition-opacity z-30"
      >
        {content}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -translate-x-1/2 border-[4px] border-transparent border-t-[var(--obsidian)]"
        />
      </span>
    </span>
  );
}
