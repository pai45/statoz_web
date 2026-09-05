/**
 * The match report — what the STATS tab reads.
 *
 * Every sport's report is the same handful of shapes: one headline number, an
 * intel block, a trace or two, and whichever list that sport keeps (goals,
 * leaders, innings, a box score, a ball-by-ball feed). Keeping them shared
 * means the panels are shared too, and only the tab list changes per sport.
 */

/** The single most interesting number on a report, sized like a hero. */
export type MatchPulse = {
  /** Pre-formatted, so each sport keeps its own unit (68%, 9.4, 161/5). */
  value: string;
  label: string;
  caption: string;
  /** Whose figure it is; the hero takes that side's colour. */
  side: "home" | "away" | "gold";
  /** The state pill beside the sport: LIVE 67', FULL TIME, PRE-MATCH. */
  statusLabel: string;
  /** Movement chip beside the figure. Zero or absent hides it. */
  delta?: number;
  deltaSuffix?: string;
  deltaDecimals?: number;
  subtitle: string;
  metrics: Array<{ label: string; value: string; gold?: boolean }>;
};

/** The competition, the ground, and the handful of facts around them. */
export type MatchIntel = {
  competition: string;
  season: string;
  venue: string;
  attendance?: string;
  facts: Array<{ label: string; value: string }>;
  /** One line on how it finished, once it has. */
  resultNote?: string;
};

/**
 * A two-sided trace: one sample per tick for each side, with the events that
 * happened along it pinned to their sample.
 */
export type MatchTrace = {
  title: string;
  /** What the two series measure, for the scrub readout. */
  unit: string;
  ticks: string[];
  home: number[];
  away: number[];
  markers?: Array<{
    index: number;
    label: string;
    side: "home" | "away";
    /** The one that decided it; the chart's single focal element. */
    decisive?: boolean;
  }>;
};

export type MatchScorer = {
  minute: string;
  player: string;
  side: "home" | "away";
  note: string;
};

export type StatLeader = {
  name: string;
  side: "home" | "away";
  line: string;
  note: string;
};

export type BoxScore = {
  columns: string[];
  rows: Array<{ name: string; side: "home" | "away"; values: string[] }>;
};

/** One batter's line in an innings. */
export type BattingLine = {
  name: string;
  /** How they were out. Absent while they are still in. */
  dismissal?: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
};

/** One bowler's figures in an innings. */
export type BowlingLine = {
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
};

export type InningsLine = {
  team: string;
  side: "home" | "away";
  score: string;
  overs: string;
  runRate: string;
  topBat: string;
  topBowl: string;
  /** The card behind the summary: who batted, and who bowled at them. */
  batting: BattingLine[];
  bowling: BowlingLine[];
  /** Named when this innings is a chase. */
  target?: number;
};

export type FeedEvent = {
  marker: string;
  text: string;
  kind: "score" | "wicket" | "note";
};
