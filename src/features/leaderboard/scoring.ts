import type {
  GameMode,
  LeaderboardType,
  ScoreMeta,
  TournamentBoard,
  TournamentScope,
} from "./types";

/**
 * How a board reads the field.
 *
 * Every rival has exactly one canonical XP; a board is a lens on it, never a
 * separate table of numbers. Keeping the arithmetic here — pure, with no store
 * or hook behind it — is what makes that checkable.
 */

export const leaderboardTypeOrder: LeaderboardType[] = [
  "matchDay",
  "tournament",
  "games",
];

export const tournamentBoardOrder: TournamentBoard[] = ["teams", "players"];

export const tournamentScopeOrder: TournamentScope[] = [
  "weekly",
  "season",
  "allTime",
];

export const gameModeOrder: GameMode[] = [
  "quiz",
  "cardDuel",
  "streaks",
  "accuracy",
];

/** What the score column is measured in. */
export function scoreMetaFor(
  type: LeaderboardType,
  isTeamBoard: boolean,
): ScoreMeta {
  if (isTeamBoard) return { unit: "PTS" };
  return { unit: type === "games" ? "W" : "XP" };
}

/** A rival's canonical XP, read through the active board's lens. */
export function scoreFor(
  type: LeaderboardType,
  base: number,
  scope: TournamentScope,
  mode: GameMode,
): number {
  switch (type) {
    case "matchDay":
      return base;
    case "tournament":
      // A season is six weeks of play, and all-time is twenty-seven.
      return scope === "weekly" ? base : scope === "season" ? base * 6 : base * 27;
    case "games":
      // Wins, not XP — a rough win count with a nudge per mode.
      return Math.round(base / 55) + gameModeOrder.indexOf(mode);
  }
}
