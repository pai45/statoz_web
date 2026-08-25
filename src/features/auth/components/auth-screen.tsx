import { accentVar } from "@/design-system";

import { authHeroMedia } from "../constants";

import { AuthHero } from "./auth-hero";
import { AuthPanel } from "./auth-panel";

/**
 * The sign-in surface: artwork up top, the email-or-Google form below. On wide
 * screens the two sit side by side instead of stacking.
 */
export function AuthScreen() {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.05fr_minmax(26rem,0.95fr)]">
      <AuthHero
        media={authHeroMedia}
        className="h-[44dvh] min-h-60 shrink-0 lg:h-auto lg:min-h-dvh"
      />

      <div
        className="flex flex-1 flex-col justify-center border-t bg-surface lg:border-l lg:border-t-0"
        style={{
          borderColor: `color-mix(in srgb, ${accentVar("cyan")} 22%, transparent)`,
        }}
      >
        <AuthPanel className="mx-auto w-full max-w-md" />
      </div>
    </div>
  );
}
