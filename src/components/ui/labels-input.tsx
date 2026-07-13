"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface LabelsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Optional suggestions (e.g. brand, category) offered as one-tap adds. */
  suggestions?: string[];
  placeholder?: string;
  id?: string;
}

/**
 * Free-form chip/keyword input. Type and press Enter or comma to add a label;
 * click × or press Backspace on the empty field to remove. Labels are deduped
 * case-insensitively. Used for product keywords/labels on the entry + edit forms.
 */
export function LabelsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a keyword and press Enter",
  id,
}: LabelsInputProps) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const label = raw.trim();
    if (!label) return;
    const exists = value.some((v) => v.toLowerCase() === label.toLowerCase());
    if (!exists) onChange([...value, label]);
    setDraft("");
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  }

  const remainingSuggestions = suggestions.filter(
    (s) => s && !value.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-[var(--amber)]/40">
        {value.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
          >
            {label}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove ${label}`}
              className="text-[var(--text-tertiary)] hover:text-[var(--terracotta)]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {remainingSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-tertiary)]">Suggested:</span>
          {remainingSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-[var(--border-default)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:border-[var(--amber)] hover:text-[var(--text-primary)]"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
