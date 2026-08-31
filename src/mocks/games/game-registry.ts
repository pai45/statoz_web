import type { AccentName } from "@/design-system";

import type { GameId, GameSceneId, GameTileKind } from "@/features/games/types";

export type GameEntry = {
  kind: GameTileKind;
  /** Single-line title, and the accessible name the tile announces. */
  title: string;
  /**
   * Where the title is set over fixed lines rather than wrapped. Flutter pins
   * these so long names break at the same point every time.
   */
  titleLines?: string[];
  subtitle: string;
  /** Hero tiles only: the corner tag above the title. */
  badgeLabel?: string;
  /** Hero tiles only: the verb pinned to the bottom edge. */
  ctaLabel?: string;
  accent: AccentName;
  /** Casts the accent bloom. Only the featured game sets it. */
  glow?: boolean;
  /**
   * Whether the game fields a deck of cards. Those games hand the player their
   * sport's starter pack the first time they enter; quizzes and the guessing
   * games need no cards and so have no gate.
   */
  requiresDeck?: true;
  /** The illustration this game shows; formats that repeat share one. */
  scene: GameSceneId;
  href: string;
};

/**
 * Copy, accent, illustration, and destination for every playable game.
 *
 * The Flutter screen builds these inline, in two places — the trending bento
 * and the per-sport deck — and the two disagree in a few spots. Here each game
 * has one identity, so the collapsed cases are called out where they happen.
 *
 * Route slugs follow the game module directories under `features/games`, so a
 * few differ from the id: the arcade names a game, the module names a sport.
 */
export const gameRegistry: Record<GameId, GameEntry> = {
  /* ---- football ------------------------------------------------------- */
  "pitch-duel": {
    kind: "hero",
    title: "PITCH DUEL",
    subtitle: "TACTICAL CARD GAME",
    badgeLabel: "FEATURED // TACTICAL",
    ctaLabel: "ENTER THE DUEL",
    accent: "cyan",
    glow: true,
    scene: "pitch-duel",
    href: "/play/pitch-duel",
    requiresDeck: true,
  },
  "penalty-shootout": {
    kind: "hero",
    title: "PENALTY SHOOTOUT",
    titleLines: ["PENALTY", "SHOOTOUT"],
    subtitle: "SUDDEN-DEATH SPOT KICKS",
    badgeLabel: "SUDDEN DEATH",
    ctaLabel: "TAKE THE SHOT",
    accent: "lime",
    scene: "penalty-shootout",
    href: "/play/penalty-shootout",
    requiresDeck: true,
  },
  "football-chess": {
    kind: "hero",
    title: "5V5 FOOTBALL CHESS",
    titleLines: ["5V5 FOOTBALL", "CHESS"],
    subtitle: "TACTICAL SQUAD DUEL",
    badgeLabel: "FEATURED // 5V5",
    ctaLabel: "MAKE YOUR MOVE",
    accent: "gold",
    scene: "football-chess",
    href: "/play/football-chess",
    requiresDeck: true,
  },
  "football-quiz": {
    kind: "quick",
    title: "FOOTBALL QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "violet",
    scene: "quiz",
    href: "/play/quiz/football",
  },
  "football-bingo": {
    kind: "quick",
    title: "FOOTBALL BINGO",
    // The deck said "COUNTRY x CLUB GRID"; both axes are clubs, and the grid
    // asks which player turned out for the pair. The trending bento says
    // "BUILD A WINNING GRID".
    subtitle: "CLUB x CLUB GRID",
    // Orange in the deck, cyan in the bento. Orange keeps it distinct from the
    // three cyan football games it sits beside.
    accent: "orange",
    scene: "bingo",
    href: "/play/football-bingo",
  },
  "guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY FOOTBALL MYSTERY",
    // Pink is the family colour every other mystery game uses; the bento's lime
    // was the odd one out.
    accent: "pink",
    scene: "guess-player",
    href: "/play/guess-player",
  },

  /* ---- cricket -------------------------------------------------------- */
  "final-over": {
    kind: "hero",
    title: "FINAL OVER",
    subtitle: "THREE-OVER CHASE",
    badgeLabel: "FEATURED // THREE OVERS",
    ctaLabel: "START THE CHASE",
    accent: "cyan",
    scene: "final-over",
    href: "/play/final-over",
    requiresDeck: true,
  },
  "cricket-quiz": {
    kind: "quick",
    title: "CRICKET QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "violet",
    scene: "quiz",
    href: "/play/quiz/cricket",
  },
  "cricket-guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY CRICKET MYSTERY",
    accent: "pink",
    scene: "guess-player",
    href: "/play/guess-player/cricket",
  },

  /* ---- basketball ----------------------------------------------------- */
  "hoop-duel": {
    kind: "hero",
    title: "HOOP DUEL",
    subtitle: "STREET 1-ON-1 ARCADE HOOPS",
    badgeLabel: "FEATURED // STREET",
    ctaLabel: "HIT THE COURT",
    accent: "gold",
    scene: "hoop-duel",
    href: "/play/basketball",
    requiresDeck: true,
  },
  "basketball-quiz": {
    kind: "quick",
    title: "BASKETBALL QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "violet",
    scene: "quiz",
    href: "/play/quiz/basketball",
  },
  "basketball-guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY BASKETBALL MYSTERY",
    accent: "pink",
    scene: "guess-player",
    href: "/play/guess-player/basketball",
  },

  /* ---- tennis --------------------------------------------------------- */
  "tennis-rally": {
    kind: "hero",
    title: "TENNIS RALLY",
    subtitle: "2D ARCADE SETS // 5 MODES",
    badgeLabel: "FEATURED // NEW",
    ctaLabel: "STEP ON COURT",
    accent: "lime",
    scene: "tennis-rally",
    href: "/play/tennis",
    requiresDeck: true,
  },
  "tennis-quiz": {
    kind: "quick",
    title: "TENNIS QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "violet",
    scene: "quiz",
    href: "/play/quiz/tennis",
  },
  "tennis-guess-winner": {
    kind: "quick",
    title: "GUESS THE WINNER",
    subtitle: "DAILY MYSTERY",
    accent: "cyan",
    scene: "guess-winner",
    href: "/play/guess-winner",
  },

  /* ---- motorsport ----------------------------------------------------- */
  "grand-prix-dash": {
    kind: "hero",
    title: "GRAND PRIX DASH",
    titleLines: ["GRAND PRIX", "DASH"],
    subtitle: "ONE-LAP ARCADE RACER",
    badgeLabel: "FEATURED // RACE",
    ctaLabel: "RACE NOW",
    accent: "racing",
    scene: "grand-prix-dash",
    href: "/play/grand-prix",
    requiresDeck: true,
  },
  "motorsport-quiz": {
    kind: "quick",
    title: "MOTORSPORT QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "violet",
    scene: "quiz",
    href: "/play/quiz/motorsport",
  },
  "guess-driver": {
    kind: "quick",
    title: "GUESS THE DRIVER",
    subtitle: "DAILY F1 MYSTERY",
    accent: "pink",
    scene: "guess-driver",
    href: "/play/guess-driver",
  },
};

/** The registry entry for a game, or `undefined` when it has no tile yet. */
export function gameEntryFor(id: GameId): GameEntry | undefined {
  return gameRegistry[id];
}

/**
 * Every game addressable under `/play`, and the game each href names.
 *
 * Built from the registry rather than kept alongside it, so a game that changes
 * its href cannot end up unreachable.
 */
const gameByHref: Record<string, GameId> = Object.fromEntries(
  Object.entries(gameRegistry).map(([id, entry]) => [entry.href, id as GameId]),
);

export function playableGameHrefs(): string[] {
  return Object.keys(gameByHref);
}

export function gameForHref(
  href: string,
): { game: GameId; entry: GameEntry } | null {
  const game = gameByHref[href];
  return game ? { game, entry: gameRegistry[game] } : null;
}
