import type { CSSProperties, ReactNode } from "react";

import { accentVar, bottomCutPath, withAlpha } from "@/design-system";

/**
 * The Knowledge Arena's surface: a flat dark plate, square across the top with
 * both bottom corners cut, inside a one-pixel accent edge.
 *
 * The app draws it as a clipped fill with a stroke painted over the top. A clip
 * path crops a border away on the web, so the edge is a clipped plate with the
 * fill inset a pixel inside it — the construction every chamfered surface in
 * this codebase uses.
 *
 * `glow` is for the one panel a screen wants looked at first, and nothing else:
 * the entry briefing's set card, and the banner that names a set just unlocked.
 */

const cut = 12;

export type QuizPanelProps = {
  children: ReactNode;
  accent?: string;
  /** Blooms the accent behind the plate. One per screen, at most. */
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function QuizPanel({
  children,
  accent = accentVar("cyan"),
  glow = false,
  className,
  style,
}: QuizPanelProps) {
  const clip: CSSProperties = { clipPath: bottomCutPath(cut) };

  return (
    <div className={["relative", className ?? ""].filter(Boolean).join(" ")} style={style}>
      {/* The bloom sits behind everything, unclipped: a box-shadow would be
          cropped along with the element casting it. */}
      {glow ? (
        <div
          aria-hidden
          className="absolute -inset-0.5 blur-[6px]"
          style={{ ...clip, background: withAlpha(accent, 0.22) }}
        />
      ) : null}

      <div
        aria-hidden
        className="absolute inset-0"
        style={{ ...clip, background: withAlpha(accent, 0.5) }}
      />
      <div
        aria-hidden
        className="absolute inset-px"
        style={{ ...clip, background: "var(--ds-color-background-elevated)" }}
      />

      <div className="relative" style={clip}>
        {children}
      </div>
    </div>
  );
}
