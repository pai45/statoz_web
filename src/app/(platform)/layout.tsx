import { PlatformNav, PlatformTopBar } from "@/features/shell";

/**
 * The platform shell. Navigation sits at the bottom on phones and moves to a
 * side rail once there is room for it.
 */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className="flex min-h-dvh flex-col lg:flex-row"
      style={{ background: "var(--ds-gradient-app-background)" }}
    >
      <div className="hidden shrink-0 lg:block lg:w-56">
        <div className="sticky top-0 h-dvh">
          <PlatformNav orientation="rail" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformTopBar title="StatOz" coins={1000} streak={7} />
        <main className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
          {children}
        </main>
      </div>

      <PlatformNav className="sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)] lg:hidden" />
    </div>
  );
}
