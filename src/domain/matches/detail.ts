import type { Sport } from "@/domain/sports";

export type MatchDetailQuizState = "open" | "locked" | "finished";

export type MatchDetailQuiz = {
  id: string;
  title: string;
  subtitle: string;
  questions: number;
  rewardXp: number;
  state: MatchDetailQuizState;
  answered: number;
  contest?: {
    entryLabel: string;
    prizeLabel: string;
  };
};

export type MatchDetailOutcome = {
  id: string;
  label: string;
  code: string;
  probability: number;
  delta: number;
  color: string;
  ink: string;
};

export type MatchDetailMarket = {
  id: string;
  leagueId: string;
  leagueLabel: string;
  type: "match" | "future";
  question: string;
  context?: string;
  status: "open" | "live" | "closed";
  liveLabel?: string;
  closesLabel?: string;
  volumeOz: number;
  outcomes: MatchDetailOutcome[];
};

export type MatchDetailBoardEntry = {
  rank: number;
  name: string;
  points: number;
  correct: number;
  movement: number;
  badge?: string;
  isNew?: boolean;
};

export type MatchDetailStat = {
  label: string;
  home: string;
  away: string;
  homeValue: number;
  awayValue: number;
};

export type MatchDetailTimelineEvent = {
  minute: string;
  side: "home" | "away";
  type: "goal" | "yellow" | "red" | "substitution" | "score";
  player: string;
  secondary?: string;
};

export type MatchDetailCommentary = {
  minute: string;
  text: string;
};

export type MatchDetailLineup = {
  formation: string;
  players: Array<{ name: string; number: number; role: string; captain?: boolean }>;
};

export type MatchDetailScoreboard = {
  facts: Array<{ label: string; value: string }>;
  stats: MatchDetailStat[];
  timeline: MatchDetailTimelineEvent[];
  commentary: MatchDetailCommentary[];
  homeLineup: MatchDetailLineup;
  awayLineup: MatchDetailLineup;
  scoreRows: Array<{ label: string; home: string; away: string }>;
  sessions?: Array<{ label: string; results: string[] }>;
  driverStandings?: string[];
};

/** Static, feature-owned data that makes a fixture's Flutter match-detail tabs complete. */
export type MatchDetailData = {
  quizzes: MatchDetailQuiz[];
  leaderboard: Record<string, MatchDetailBoardEntry[]>;
  scoreboard: MatchDetailScoreboard;
};

/** Presentation data for one fixture competition. Its accent is brand data. */
export type MatchLeague = {
  id: string;
  sport: Sport;
  name: string;
  shortCode: string;
  accent: string;
};

export type SportFixtureCount = {
  live: number;
  total: number;
};
