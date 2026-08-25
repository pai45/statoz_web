import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export type SignalPanelProps = {
  /** CSS color that drives the panel's edge, hairline, wash, and lift. */
  accent: string;
  /** Small label pinned to the panel's top-left corner. */
  tag?: ReactNode;
  /** Casts the accent-tinted shadow that makes the panel sit above the page. */
  lifted?: boolean;
  href?: string;
  onClick?: () => void;
  /** Accessible name, required when the panel is interactive. */
  label?: string;
  className?: string;
  children?: ReactNode;
};

const clip: CSSProperties = { clipPath: "var(--ds-clip-signal)" };

/**
 * The signature StatOz surface: a chamfered plate with a notched top-right
 * edge, an accent hairline across the top, and an accent shadow beneath.
 *
 * Built from three stacked layers that share one clip path — a lift, an accent
 * edge, and the inset fill — so the cut corners stay crisp at any size.
 *
 * When interactive, the hit area is a stretched overlay rather than a wrapper,
 * so panel content stays flow-level regardless of which element it uses.
 */
export function SignalPanel({
  accent,
  tag,
  lifted = true,
  href,
  onClick,
  label,
  className,
  children,
}: SignalPanelProps) {
  const interactive = Boolean(href ?? onClick);
  const style = { "--panel-accent": accent } as CSSProperties;

  return (
    <div className="group relative h-full w-full" style={style}>
      {lifted ? (
        <div
          aria-hidden
          className="absolute inset-0 translate-y-(--ds-shape-signal-lift)"
          style={{
            ...clip,
            background:
              "color-mix(in srgb, var(--panel-accent) 22%, transparent)",
          }}
        />
      ) : null}

      <div
        className={[
          "relative h-full w-full transition-transform duration-150",
          interactive
            ? "group-hover:-translate-y-0.5 group-active:translate-y-0"
            : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Accent edge — the inset fill below leaves 1px of it showing. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            ...clip,
            background:
              "color-mix(in srgb, var(--panel-accent) 55%, transparent)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-px"
          style={{
            ...clip,
            background:
              "color-mix(in srgb, var(--panel-accent) 4.5%, var(--ds-color-background-elevated))",
          }}
        />
        {/* The one bright line on the panel. */}
        <div
          aria-hidden
          className="absolute inset-x-3.5 top-0 h-0.5"
          style={{
            background:
              "color-mix(in srgb, var(--panel-accent) 80%, transparent)",
          }}
        />

        {tag ? <div className="absolute left-3 top-2.5 z-10">{tag}</div> : null}

        <div className="relative z-10 flex h-full w-full flex-col">{children}</div>

        {href ? (
          <Link
            href={href}
            aria-label={label}
            className="absolute inset-0 z-20"
            style={clip}
          />
        ) : onClick ? (
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="absolute inset-0 z-20"
            style={clip}
          />
        ) : null}
      </div>
    </div>
  );
}
