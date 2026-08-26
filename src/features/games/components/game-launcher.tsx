"use client";

import type { ComponentType } from "react";
import { useState } from "react";

import { accentVar } from "@/design-system";
import {
  claimPack,
  rollStarterPackFor,
  StarterPackReveal,
  useIsHydrated,
  useIsPackClaimed,
} from "@/features/packs";
import type { Sport } from "@/domain/sports";

import { HoopDuel } from "../basketball";
import { FinalOver } from "../final-over";
import { PenaltyShootout } from "../penalty-shootout";
import { TennisRally } from "../tennis";
import type { GameEntry } from "../data/game-registry";
import { sportForGame } from "../data/sport-decks";
import type { GameId } from "../types";

import { GamePlaceholder } from "./game-placeholder";

export type GameLauncherProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The games that exist. Anything absent falls through to the placeholder, which
 * says so plainly rather than 404ing — every tile in the app leads somewhere.
 */
const renderers: Partial<Record<GameId, ComponentType<GameLauncherProps>>> = {
  "penalty-shootout": PenaltyShootout,
  "final-over": FinalOver,
  "hoop-duel": HoopDuel,
  "tennis-rally": TennisRally,
};

function GameSurface({ game, entry }: GameLauncherProps) {
  const Game = renderers[game] ?? GamePlaceholder;
  return <Game game={game} entry={entry} />;
}

/**
 * What happens when a player opens a game.
 *
 * A game that fields a deck hands over its sport's starter pack the first time
 * it is entered, and only then; everything else goes straight through. This is
 * Flutter's `_enter*GameFlow` — check the sport's flag, run the reveal, and
 * re-issue the launch once it clears — with the flag in browser storage rather
 * than a bloc.
 */
export function GameLauncher({ game, entry }: GameLauncherProps) {
  const sport = sportForGame(game);
  const hydrated = useIsHydrated();
  const claimed = useIsPackClaimed(sport);

  // Storage is not readable on the server, so the gate cannot be decided there.
  // Rendering the game first would flash it before the pack, so the prerendered
  // frame names the game and nothing else, and the decision lands on hydration.
  if (!hydrated) return <GameOpening entry={entry} />;

  if (entry.requiresDeck && !claimed) {
    return <StarterPackGate game={game} entry={entry} sport={sport} />;
  }

  return <GameSurface game={game} entry={entry} />;
}

/**
 * Mounted only after hydration, so the roll happens exactly once and only in
 * the browser — a pack drawn during render would differ between the server and
 * the client and React would report the mismatch.
 */
function StarterPackGate({
  game,
  entry,
  sport,
}: GameLauncherProps & { sport: Sport }) {
  const [reveal] = useState(() => rollStarterPackFor(sport));
  const [opened, setOpened] = useState(false);

  if (opened) return <GameSurface game={game} entry={entry} />;

  return (
    <StarterPackReveal
      reveal={reveal}
      onComplete={() => {
        claimPack(sport, reveal);
        setOpened(true);
      }}
    />
  );
}

/**
 * The frame before the gate is known, and the whole of the prerendered HTML.
 *
 * It carries the game's name so the page is never blank — for a crawler, for a
 * slow connection, and for the beat before hydration decides what comes next.
 */
function GameOpening({ entry }: { entry: GameEntry }) {
  const accent = accentVar(entry.accent);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1
        className="font-display font-black leading-tight"
        style={{
          color: accent,
          fontSize: "var(--ds-text-2xl)",
          letterSpacing: "var(--ds-tracking-display)",
        }}
      >
        {entry.title}
      </h1>
      <p
        className="mt-3 font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        OPENING...
      </p>
    </div>
  );
}
