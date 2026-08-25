import Image from "next/image";

import { accentVar, BrandIcon, glow, withAlpha } from "@/design-system";

import type { AuthHeroMedia } from "../types";

export type AuthHeroProps = {
  /** The clip to play, or null to fall back to the crest and gradient. */
  media: AuthHeroMedia | null;
  className?: string;
};

const CYAN = accentVar("cyan");

/**
 * The top of the sign-in surface: the athlete clip, a scrim that hands the eye
 * down to the form, and the crest sitting over both.
 */
export function AuthHero({ media, className }: AuthHeroProps) {
  const decorative = !media?.alt;

  return (
    <div
      className={["relative overflow-hidden", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{ background: "var(--ds-gradient-app-background)" }}
    >
      {media?.kind === "video" ? (
        <video
          className="absolute inset-0 size-full object-cover object-top"
          src={media.src}
          poster={media.poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden={decorative || undefined}
          aria-label={media.alt || undefined}
        />
      ) : media ? (
        <Image
          src={media.src}
          alt={media.alt ?? ""}
          fill
          priority
          /* An optimized GIF loses its animation, so pass those through. */
          unoptimized={media.src.endsWith(".gif")}
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover object-top"
        />
      ) : null}

      {/* Cool wash from the top, so the crest never sits on bare artwork. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 60% at 50% 0%, ${withAlpha(CYAN, 0.16)} 0%, transparent 62%)`,
        }}
      />
      {/* The hand-off into the form panel below. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{
          background:
            "linear-gradient(to top, var(--ds-color-background-secondary) 0%, transparent 100%)",
        }}
      />

      <div className="relative flex h-full items-start justify-center pt-8">
        <span
          className="grid size-14 place-items-center rounded-pill"
          style={{
            background: `color-mix(in srgb, ${accentVar("blue")} 28%, var(--ds-color-background-muted))`,
            boxShadow: `inset 0 0 0 1px ${withAlpha(CYAN, 0.4)}, ${glow(CYAN, { alpha: 0.35, blur: 28 })}`,
          }}
        >
          <BrandIcon name="logo" size={30} priority />
        </span>
      </div>
    </div>
  );
}
