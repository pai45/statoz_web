"use client";

import type { ReactElement } from "react";

import {
  accentVar,
  GridViewIcon,
  HudPanel,
  LockIcon,
  PersonSearchIcon,
  QuizIcon,
  type IconProps,
} from "@/design-system";
import { useAuthSession, useRequireAuth } from "@/features/auth";

import { gameRegistry, type GameEntry } from "@/mocks/games";
import type { GameId, GameSceneId } from "../types";
import { GameScene } from "./game-scenes";

/**
 * The glyph each format is identified by, keyed off the scene rather than the
 * game — five sports run the same quiz and it wears the same mark in each.
 */
const icons: Partial<Record<GameSceneId, (props: IconProps) => ReactElement>> = {
  quiz: QuizIcon,
  bingo: GridViewIcon,
  "guess-player": PersonSearchIcon,
  "guess-driver": PersonSearchIcon,
  "guess-winner": PersonSearchIcon,
};

export type QuickGameTileProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The compact arcade plate: the game's glyph as a boxed mark, over its scene
 * run faintly as a watermark rather than shown outright. Quick games stay
 * quieter than the arcade heroes — the scene is texture here, not the subject.
 */
export function QuickGameTile({ game, entry }: QuickGameTileProps) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const accent = accentVar(entry.accent);
  const Glyph = icons[gameRegistry[game].scene];
  const authenticated = session.status === "authenticated";
  const guest = session.status === "guest";

  return (
    <HudPanel
      accent={accent}
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
      label={`${entry.title}, ${guest ? "log in to play" : "free to play"}`}
    >
      <div
        className="relative flex h-full min-h-40 flex-col p-3.25"
        style={{
          background: `color-mix(in srgb, ${accent} 5.5%, var(--ds-color-background-elevated))`,
        }}
      >
        {/* Bled off the bottom-right corner, the way the glyph mark used to be. */}
        <div className="pointer-events-none absolute -bottom-4 -right-5 h-4/5 w-3/5">
          <GameScene game={game} opacity={0.11} washed={false} />
        </div>

        {/* The one bright line on the plate, stopping short of the notch. */}
        <span
          aria-hidden
          className="absolute left-3.5 right-8.5 top-0 h-0.5"
          style={{ background: `color-mix(in srgb, ${accent} 82%, transparent)` }}
        />

        <div className="relative flex items-start justify-between gap-2">
          <span
            className="grid size-10 shrink-0 place-items-center border"
            style={{
              color: accent,
              borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
              background:
                "color-mix(in srgb, var(--ds-color-background-primary) 55%, transparent)",
            }}
          >
            {Glyph ? <Glyph size={22} /> : null}
          </span>

          <span
            className="inline-flex items-center gap-1.25 px-1.75 py-1 font-display text-2xs font-black leading-compact"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            }}
          >
            {guest ? <LockIcon size={12} /> : null}
            <span
              aria-hidden
              className="size-1.25 rounded-pill"
              style={{ background: accent }}
            />
            {guest ? "LOG IN" : "FREE"}
          </span>
        </div>

        <p className="relative mt-3 line-clamp-2 font-display text-sm font-black leading-compact tracking-label">
          {entry.title}
        </p>

        <p
          className="relative mt-1.25 line-clamp-2 text-2xs font-semibold leading-tight tracking-wide"
          style={{ color: `color-mix(in srgb, ${accent} 76%, transparent)` }}
        >
          {entry.subtitle}
        </p>
      </div>
    </HudPanel>
  );
}
