import type { Sport } from "../sports";

export type MatchStatus = "scheduled" | "live" | "finished";

export type SportTeam = {
  id: string;
  name: string;
  shortName: string;
  /** Identity color, as a hex value. */
  color: string;
};

export type SportMatch = {
  id: string;
  sport: Sport;
  leagueId: string;
  /** Short code shown on tiles, for example "EPL". */
  leagueLabel: string;
  home: SportTeam;
  away: SportTeam;
  status: MatchStatus;
  /** ISO 8601 timestamp. */
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
  /** Minutes played, when live. */
  liveMinute?: number;
  /** XP a correct call on this match is worth. */
  rewardXp: number;
  /** Oz staked across this match's markets. */
  volumeOz: number;
};

export function isLive(match: SportMatch): boolean {
  return match.status === "live";
}

export function isFinished(match: SportMatch): boolean {
  return match.status === "finished";
}
