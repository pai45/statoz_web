import type { CSSProperties, ReactNode } from "react";

export type FixturePanelProps = {
  children: ReactNode;
  className?: string;
  accent?: string;
  as?: "article" | "section" | "div";
};

/** Product-agnostic notched fixture surface used by dense sports modules. */
export function FixturePanel({ children, className, accent = "var(--ds-color-accent-cyan)", as: Element = "article" }: FixturePanelProps) {
  return (
    <Element
      className={["relative isolate overflow-hidden border border-(--ds-color-fixture-border) bg-(image:--ds-gradient-fixture-card) shadow-(--ds-shadow-panel)", className].filter(Boolean).join(" ")}
      style={{ clipPath: "var(--ds-clip-fixture)", "--fixture-accent": accent } as CSSProperties}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[color-mix(in_srgb,var(--fixture-accent)_70%,transparent)]" />
      {children}
    </Element>
  );
}
