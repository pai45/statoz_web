import type { ReactNode } from "react";

export type BentoSpan = "square" | "wide" | "tall";

export type BentoGridProps = {
  children: ReactNode;
  className?: string;
};

export type BentoTileProps = {
  span?: BentoSpan;
  children: ReactNode;
  className?: string;
};

const spanClass: Record<BentoSpan, string> = {
  square: "",
  wide: "col-span-2",
  tall: "row-span-2",
};

/**
 * Dense two-column bento that widens to three and four columns on larger
 * screens. Tiles pack into the first cell that fits, while source order stays
 * the reading and tab order.
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={[
        "grid grid-cols-2 gap-x-3 gap-y-5 [grid-auto-flow:dense] [grid-auto-rows:minmax(9.375rem,auto)]",
        "md:grid-cols-3 lg:grid-cols-4",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

/** One cell of a {@link BentoGrid}. */
export function BentoTile({ span = "square", children, className }: BentoTileProps) {
  return (
    <div className={[spanClass[span], className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
