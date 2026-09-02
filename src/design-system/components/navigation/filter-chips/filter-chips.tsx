"use client";

import type { CSSProperties } from "react";

export type FilterChipsProps = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  accent?: string;
  label: string;
  className?: string;
};

/**
 * A scrollable strip of cut-corner chips.
 *
 * The active chip is the only tinted, outlined element; the rest stay calm
 * muted outlines, and none of them glow. Reach for it where a surface already
 * carries a focal element and the switch itself should stay quiet — a match
 * report's sections, a catalogue's facets.
 */
export function FilterChips({
  options,
  selected,
  onSelect,
  accent = "var(--ds-color-accent-cyan)",
  label,
  className,
}: FilterChipsProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={[
        "flex shrink-0 gap-1.75 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((option) => {
        const active = option === selected;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(option)}
            className="shrink-0 px-2.75 py-1.5 font-display text-3xs font-black whitespace-nowrap tracking-ultra transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              clipPath: "var(--ds-clip-chip)",
              color: active ? accent : "var(--ds-color-text-muted)",
              background: active ? `color-mix(in srgb, ${accent} 14%, transparent)` : "transparent",
              boxShadow: `inset 0 0 0 1px ${
                active
                  ? `color-mix(in srgb, ${accent} 72%, transparent)`
                  : "color-mix(in srgb, var(--ds-color-border-default) 28%, transparent)"
              }`,
              outlineColor: accent,
            } as CSSProperties}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
