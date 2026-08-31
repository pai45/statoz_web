import type { CSSProperties } from "react";

import { PlatformNav, PlatformTopBar } from "@/features/shell";

/**
 * The platform shell. Navigation sits at the bottom on phones and moves to a
 * side rail once there is room for it.
 */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className="flex min-h-dvh flex-col lg:flex-row"
      style={
        {
          background: "var(--ds-gradient-app-background)",
          /**
           * The bar nav's height, published because it is sticky and therefore
           * floats over the page: anything a screen docks above it — the
           * leaderboard's YOUR RANK card — has to offset by exactly this. The
           * nav below is sized from the same value, so the two cannot drift.
           */
          "--platform-nav-height": "5.25rem",
        } as CSSProperties
      }
    >
      <div className="hidden shrink-0 lg:block lg:w-56">
        <div className="sticky top-0 h-dvh">
          <PlatformNav orientation="rail" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformTopBar />
        <main className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
          {children}
        </main>
      </div>

      <PlatformNav className="sticky bottom-0 z-20 h-[calc(var(--platform-nav-height)+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] lg:hidden" />
    </div>
  );
}
