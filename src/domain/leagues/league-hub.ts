import type { SportTeam } from "../matches";
import type { Sport } from "../sports";

export type LeagueHubTab = "table" | "leaders" | "games" | "picks";

export type LeagueStandingColumn = {
  id: string;
  label: string;
  /** The last/result column is brighter than supporting metrics. */
  emphasis?: boolean;
};

export type LeagueStandingRow = {
  rank: number;
  competitor: SportTeam;
  tableName?: string;
  rankChange?: number;
  form?: string;
  metrics: Record<string, string | number>;
  zone?: { label: string; color: string };
};

export type LeagueStandingGroup = {
  id: string;
  label: string;
  shortLabel: string;
  rows: LeagueStandingRow[];
};

export type LeagueLeader = {
  id: string;
  name: string;
  competitor: SportTeam;
  value: number;
  displayValue: string;
  detail?: string;
};

export type LeagueLeaderCategory = {
  id: string;
  label: string;
  unitLabel: string;
  accent: "league" | "success" | "orange" | "danger";
  leaders: LeagueLeader[];
};

export type LeagueHubSnapshot = {
  id: string;
  sport: Sport;
  name: string;
  shortCode: string;
  accent: string;
  seasonLabel: string;
  columns: LeagueStandingColumn[];
  groups: LeagueStandingGroup[];
  leaderCategories: LeagueLeaderCategory[];
};
