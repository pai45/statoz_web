"use client";

import { accentVar, BrandIcon, HudPanel, LockIcon } from "@/design-system";
import { useAuthSession, useRequireAuth } from "@/features/auth";

import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../types";
import { GameScene } from "./game-scenes";

/**
 * Both layouts anchor the scene to the card's right side. `portrait` uses
 * compact typography for narrow bento columns; `landscape` gives the title
 * more room on a full-width deck banner.
 */
export type HeroLayout = "portrait" | "landscape";

export type ArcadeHeroTileProps = {
  game: GameId;
  entry: GameEntry;
  layout?: HeroLayout;
  /** Current run on this game. Hidden at zero, as in the app. */
  streak?: number;
};

/**
 * The full-dress arcade tile: a painted scene under a badge, a title, and the
 * verb that names what playing feels like.
 *
 * The bottom line is the game's own call to action rather than the app's fixed
 * "TAP // PLAY", which names an input the web does not only have.
 */
export function ArcadeHeroTile({
  game,
  entry,
  layout = "portrait",
  streak = 0,
}: ArcadeHeroTileProps) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const accent = accentVar(entry.accent);
  const lines = entry.titleLines ?? [entry.title];
  const landscape = layout === "landscape";
  const authenticated = session.status === "authenticated";
  const guest = session.status === "guest";

  return (
    <HudPanel
      accent={accent}
      glow={entry.glow}
      href={authenticated ? entry.href : undefined}
      onClick={
        authenticated
          ? undefined
          : () =>
              requireAuth({
                intent: "play",
                message: `Log in to play ${entry.title} and save your progress.`,
                returnTo: entry.href,
              })
      }
      label={`${entry.title}, ${guest ? "log in to play" : entry.ctaLabel}`}
    >
      <div
        className={[
          "relative flex flex-col",
          landscape ? "h-44 sm:h-48" : "h-full min-h-40",
        ].join(" ")}
      >
        <div
          className={[
            "pointer-events-none absolute inset-y-px right-px",
            landscape ? "w-[48%]" : "w-[68%]",
          ].join(" ")}
        >
          <GameScene game={game} />
        </div>

        <div
          className={[
            "relative flex flex-col items-start",
            landscape ? "px-4.25 pt-4.25" : "px-3.25 pb-1.5 pt-3.5",
          ].join(" ")}
        >
          {guest ? (
            <span
              className="inline-flex max-w-full items-center gap-1.5 px-1.75 py-1 font-display text-2xs font-black leading-compact"
              style={{
                color: accent,
                background: `color-mix(in srgb, ${accent} 16%, transparent)`,
              }}
            >
              <LockIcon size={12} /> LOG IN REQUIRED
            </span>
          ) : entry.badgeLabel ? (
            <span
              className="max-w-full truncate px-1.75 py-1 font-display text-2xs font-black leading-compact"
              style={{
                color: accent,
                background: `color-mix(in srgb, ${accent} 16%, transparent)`,
              }}
            >
              {entry.badgeLabel}
            </span>
          ) : null}

          {streak > 0 ? (
            <span
              className="mt-2 inline-flex items-center gap-1 font-display text-2xs font-black leading-compact"
              style={{ color: accentVar("gold") }}
            >
              <BrandIcon name="streak" size={13} alt="" />
              <span className="ds-tabular">{streak}</span>
            </span>
          ) : null}

          {/* Landscape keeps the title off the art, as the app does. */}
          <p
            className={[
              "font-display font-black leading-compact",
              landscape
                ? "mt-auto max-w-[60%] pt-6 text-xl tracking-wide"
                : "mt-2 w-full text-base tracking-label",
            ].join(" ")}
          >
            {lines.map((line) => (
              <span key={line} className="block truncate">
                {line}
              </span>
            ))}
          </p>

          {landscape ? (
            <p
              className="mt-1.5 line-clamp-2 max-w-[60%] font-display text-xs font-black leading-tight"
              style={{ color: accent }}
            >
              {entry.subtitle}
            </p>
          ) : null}
        </div>

        <p
          className={[
            "relative mt-auto font-display text-2xs font-black tracking-wide",
            landscape ? "px-4.25 pb-3.5" : "px-3.25 pb-2.75",
          ].join(" ")}
          style={{ color: `color-mix(in srgb, ${accent} 84%, transparent)` }}
        >
          {guest ? "LOG IN TO PLAY" : entry.ctaLabel}
        </p>
      </div>
    </HudPanel>
  );
}
