import type { SportMatch } from "@/domain/matches";
import { sportModuleFor } from "@/domain/sports";
import { formatKickoffDate, formatKickoffTime } from "@/shared/utils";

import type {
  MatchDetailBoardEntry,
  MatchDetailData,
  MatchDetailLineup,
  MatchDetailMarket,
  MatchDetailOutcome,
  MatchDetailQuiz,
  MatchDetailScoreboard,
} from "../types";

const rivals = [
  { name: "jarvis", movement: -1, badge: "PRO" },
  { name: "Vortex", movement: 2 },
  { name: "NeoStrike", movement: -1, badge: "PRO" },
  { name: "PhantomX", movement: 1 },
  { name: "Blaze", movement: 4 },
  { name: "Titan", movement: -2 },
  { name: "EchoZero", movement: 1, badge: "PRO" },
  { name: "Reaper", movement: -3 },
  { name: "NovaQ", movement: 2 },
  { name: "Falcon9", movement: -1 },
  { name: "Striker", movement: 5, isNew: true },
  { name: "Diwakar", movement: -2 },
  { name: "monika", movement: 1, badge: "PRO" },
  { name: "Raja2000", movement: -1 },
  { name: "Invincible51", movement: 4 },
  { name: "rocky", movement: -2 },
  { name: "Mirage", movement: 1 },
  { name: "Zenith", movement: -1, isNew: true },
  { name: "Ghost", movement: 2 },
  { name: "Drift", movement: -3 },
  { name: "Volt", movement: 1 },
  { name: "Comet", movement: -1 },
  { name: "Rookie7", movement: 0, isNew: true },
] as const;

/**
 * Static counterpart of Flutter's prediction, pick, and score repositories.
 * It intentionally derives the lesser fixture details from the stable match id
 * so every route has a complete, repeatable detail surface without inventing
 * an API boundary for the demo data.
 */
export function matchDetailFor(match: SportMatch): MatchDetailData {
  const quizzes = quizSetsFor(match);
  return {
    quizzes,
    markets: marketsFor(match),
    leaderboard: Object.fromEntries(
      quizzes.map((quiz) => [quiz.id, leaderboardFor(`${match.id}:${quiz.id}`)]),
    ),
    scoreboard: scoreboardFor(match),
  };
}

function quizSetsFor(match: SportMatch): MatchDetailQuiz[] {
  const state: MatchDetailQuiz["state"] = match.status === "scheduled" ? "open" : match.status === "live" ? "locked" : "finished";
  const lockedMain = match.id === "epl_cfc_new" && state === "locked";
  const main = sportQuizMeta(match);
  const contest = match.sport === "football" && main.id === "main"
    ? {
        entryLabel: state === "finished" ? "FINISHED #2" : lockedMain ? "ENTRY PAID" : "−25 OZ ENTRY",
        prizeLabel: state === "finished" ? "+120 OZ WON" : "1ST · 2ND · 3RD",
      }
    : undefined;

  return [
    {
      ...main,
      state,
      answered: lockedMain || state === "finished" ? main.questions : 0,
      contest,
    },
    ...(match.sport === "tennis"
      ? []
      : [{
          id: "events",
          title: match.sport === "cricket" ? "Match Events Quiz" : "Match Events Quiz",
          subtitle: eventSubtitle(match),
          questions: 3,
          rewardXp: match.sport === "motorsport" ? 190 : match.sport === "cricket" ? 210 : 230,
          state,
          answered: state === "finished" ? 3 : 0,
        }]),
  ];
}

function sportQuizMeta(match: SportMatch) {
  switch (match.sport) {
    case "football":
      return { id: "main", title: "Scoreline Quiz", subtitle: "Final score and scoring market", questions: 2, rewardXp: 150 };
    case "cricket":
      return { id: "main", title: "Match Basics Quiz", subtitle: "Toss, sixes, and match winner", questions: 3, rewardXp: 225 };
    case "basketball":
      return { id: "main", title: "Match Basics Quiz", subtitle: "Winner, total points, and margins", questions: 3, rewardXp: 225 };
    case "tennis":
      return { id: "main", title: "Match Basics Quiz", subtitle: "Winner, sets, and tiebreaks", questions: 3, rewardXp: 225 };
    case "motorsport":
      return { id: "main", title: "Race Predictions", subtitle: "Winner, podium, and fastest lap", questions: 3, rewardXp: 240 };
  }
}

function eventSubtitle(match: SportMatch) {
  if (match.sport === "cricket") return "Powerplay, wickets, and final-over drama";
  if (match.sport === "motorsport") return "Safety cars and race incidents";
  if (match.sport === "basketball") return "Quarter scoring and final margin";
  return "Winner, first goal, and discipline";
}

function marketsFor(match: SportMatch): MatchDetailMarket[] {
  const seed = stableSeed(match.id);
  const hasDraw = match.sport === "football" || match.sport === "cricket";
  const homeProbability = hasDraw ? 40 + (seed % 20) : 46 + (seed % 20);
  const drawProbability = hasDraw ? 16 + (seed % 10) : 0;
  const awayProbability = 100 - homeProbability - drawProbability;
  const marketStatus = match.status === "scheduled" ? "open" : match.status === "live" ? "live" : "closed";
  const primaryOutcomes: MatchDetailOutcome[] = [
    outcome(match.home.id, match.home.name, match.home.shortName, homeProbability, 3, match.home.color, match.home.badgeTextColor),
    ...(hasDraw ? [outcome("draw", "Draw", "DRA", drawProbability, -1, "var(--ds-color-rarity-silver-deep)", "var(--ds-color-text-default)")] : []),
    outcome(match.away.id, match.away.name, match.away.shortName, awayProbability, -2, match.away.color, match.away.badgeTextColor),
  ];
  const accent = `var(--ds-color-accent-${sportModuleFor(match.sport).accent})`;
  const sideLabel = match.sport === "motorsport" ? "Podium finish" : sportMarketLabel(match);

  return [
    {
      id: `${match.id}:result`,
      leagueId: match.leagueId,
      leagueLabel: match.leagueLabel,
      type: "match",
      question: `${match.home.name} vs ${match.away.name} result`,
      status: marketStatus,
      liveLabel: match.liveMinute == null ? "LIVE" : `LIVE ${match.liveMinute}'`,
      closesLabel: match.status === "scheduled" ? closesLabel(match.kickoff) : undefined,
      volumeOz: 1500 + (seed % 4000),
      outcomes: primaryOutcomes,
    },
    {
      id: `${match.id}:side`,
      leagueId: match.leagueId,
      leagueLabel: match.leagueLabel,
      type: "future",
      question: sideLabel,
      context: `${match.leagueLabel} · ${match.home.shortName} / ${match.away.shortName}`,
      status: marketStatus,
      liveLabel: match.liveMinute == null ? "LIVE" : `LIVE ${match.liveMinute}'`,
      closesLabel: match.status === "scheduled" ? closesLabel(match.kickoff) : undefined,
      volumeOz: 900 + (seed % 3200),
      outcomes: [
        outcome("yes", sideLabel, "YES", 42 + (seed % 16), 2, accent, "var(--ds-color-text-inverse)"),
        outcome("no", "No", "NO", 33 + ((seed >> 2) % 14), -2, "var(--ds-color-rarity-silver-deep)", "var(--ds-color-text-default)"),
        outcome("other", "Other", "ALT", 100 - (42 + (seed % 16)) - (33 + ((seed >> 2) % 14)), 1, "var(--ds-color-accent-violet)", "var(--ds-color-text-default)"),
        outcome("long", "Long shot", "LS", 18, 4, "var(--ds-color-accent-orange)", "var(--ds-color-text-inverse)"),
      ],
    },
  ];
}

function sportMarketLabel(match: SportMatch) {
  if (match.sport === "cricket") return "Over 12.5 sixes";
  if (match.sport === "basketball") return "Overtime required";
  if (match.sport === "tennis") return "Match reaches a tiebreak";
  return "Over 2.5 total goals";
}

function outcome(id: string, label: string, code: string, probability: number, delta: number, color: string, ink?: string): MatchDetailOutcome {
  return { id, label, code, probability, delta, color, ink: ink ?? inkFor(color) };
}

function leaderboardFor(key: string): MatchDetailBoardEntry[] {
  const seed = stableSeed(key);
  return Array.from({ length: 6 }, (_, index) => {
    const rival = rivals[(seed + index * 5) % rivals.length];
    return {
      rank: index + 1,
      name: rival.name,
      points: 620 - index * 47 + ((seed + index * 13) % 31),
      correct: 5 - (index % 3),
      movement: rival.movement,
      badge: "badge" in rival ? rival.badge : undefined,
      isNew: "isNew" in rival ? rival.isNew : undefined,
    };
  });
}

function scoreboardFor(match: SportMatch): MatchDetailScoreboard {
  const seed = stableSeed(`${match.id}:scoreboard`);
  const facts = [
    { label: "STATUS", value: match.status === "live" ? `LIVE ${match.liveMinute ?? ""}`.trim() : match.status === "finished" ? "FULL TIME" : "PRE-MATCH" },
    { label: "KICKOFF", value: `${formatKickoffDate(match.kickoff)} · ${formatKickoffTime(match.kickoff)}` },
    { label: "LEAGUE", value: match.leagueId.toUpperCase() },
    { label: "SPORT", value: match.sport.toUpperCase() },
  ];
  const statLabels = match.sport === "football"
    ? ["POSSESSION", "SHOTS", "ON TARGET", "PASSES"]
    : match.sport === "cricket"
      ? ["RUN RATE", "BOUNDARIES", "WICKETS", "DOT BALLS"]
      : match.sport === "basketball"
        ? ["FIELD GOALS", "3 POINTS", "REBOUNDS", "ASSISTS"]
        : match.sport === "tennis"
          ? ["ACES", "WINNERS", "BREAK POINTS", "1ST SERVE"]
          : ["TOP SPEED", "LAPS", "PIT STOPS", "TYRE STINT"];
  const stats = statLabels.map((label, index) => {
    const homeValue = 36 + ((seed + index * 11) % 45);
    const awayValue = 35 + ((seed + index * 17) % 44);
    return { label, home: String(homeValue), away: String(awayValue), homeValue, awayValue };
  });
  const homeLineup = lineupFor(match.home.name, match.sport, seed);
  const awayLineup = lineupFor(match.away.name, match.sport, seed + 19);

  return {
    facts,
    stats,
    timeline: timelineFor(match),
    commentary: commentaryFor(match),
    homeLineup,
    awayLineup,
    scoreRows: scoreRowsFor(match, seed),
    sessions: match.sport === "motorsport"
      ? [
          { label: "PRACTICE 1", results: ["1. Verstappen  1:12.844", "2. Norris  +0.184", "3. Leclerc  +0.316"] },
          { label: "QUALIFYING", results: ["P1 Verstappen", "P2 Norris", "P3 Leclerc"] },
        ]
      : undefined,
    driverStandings: match.sport === "motorsport" ? ["Verstappen · 251", "Norris · 221", "Leclerc · 188", "Piastri · 176"] : undefined,
  };
}

function lineupFor(team: string, sport: SportMatch["sport"], seed: number): MatchDetailLineup {
  const roles = sport === "football"
    ? ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "AM", "LW", "ST"]
    : sport === "cricket"
      ? ["BAT", "BAT", "AR", "WK", "AR", "BWL", "BWL", "BWL", "BWL", "BWL", "BWL"]
      : ["STARTER", "STARTER", "STARTER", "STARTER", "STARTER"];
  return {
    formation: sport === "football" ? "4-3-3" : sport === "cricket" ? "PLAYING XI" : "STARTING FIVE",
    players: roles.map((role, index) => ({
      name: `${team.split(" ")[0]} ${["Mason", "Jordan", "Alex", "Riley", "Taylor", "Morgan", "Casey", "Cameron", "Jamie", "Avery", "Drew"][index]}`,
      number: 1 + ((seed + index * 7) % 45),
      role,
      captain: index === 2,
    })),
  };
}

function timelineFor(match: SportMatch) {
  if (match.status === "scheduled") return [];
  if (match.sport === "motorsport") {
    return [
      { minute: "LAP 12", side: "home" as const, type: "score" as const, player: "Fastest lap posted" },
      { minute: "LAP 27", side: "away" as const, type: "substitution" as const, player: "Pit window opens" },
    ];
  }
  return [
    { minute: "18'", side: "home" as const, type: "goal" as const, player: match.home.name },
    { minute: "34'", side: "away" as const, type: "yellow" as const, player: match.away.name },
    { minute: "67'", side: "home" as const, type: "substitution" as const, player: "Impact substitute", secondary: "Tactical change" },
  ];
}

function commentaryFor(match: SportMatch) {
  if (match.status === "scheduled") return [];
  return [
    { minute: match.sport === "motorsport" ? "LAP 12" : "18'", text: `${match.home.name} take control with a decisive phase of play.` },
    { minute: match.sport === "motorsport" ? "LAP 27" : "34'", text: `${match.away.name} respond as the pace of the match rises.` },
    { minute: match.status === "live" ? "LIVE" : "FT", text: match.status === "live" ? "Live data remains active as the fixture develops." : match.resultLine ?? "Final match data has been recorded." },
  ];
}

function scoreRowsFor(match: SportMatch, seed: number) {
  if (match.sport === "cricket") return [
    { label: "POWERPLAY", home: "52/1", away: "46/2" },
    { label: "OVERS", home: "20.0", away: match.status === "live" ? "17.2" : "20.0" },
    { label: "RUN RATE", home: "8.25", away: "7.40" },
  ];
  if (match.sport === "basketball") return [
    { label: "Q1", home: "24", away: "19" },
    { label: "Q2", home: "21", away: "25" },
    { label: "Q3", home: String(18 + (seed % 10)), away: String(19 + ((seed >> 2) % 10)) },
    { label: "Q4", home: "—", away: "—" },
  ];
  if (match.sport === "tennis") return [
    { label: "SET 1", home: "6", away: "4" },
    { label: "SET 2", home: "3", away: "6" },
    { label: "SET 3", home: match.status === "live" ? "4" : "6", away: match.status === "live" ? "4" : "2" },
  ];
  if (match.sport === "motorsport") return [
    { label: "RACE", home: match.status === "scheduled" ? "PENDING" : "P1", away: match.status === "scheduled" ? "PENDING" : "P2" },
    { label: "LAPS", home: "44", away: "44" },
    { label: "GAP", home: "—", away: "+2.184" },
  ];
  return [
    { label: "FIRST HALF", home: match.homeScore == null ? "—" : String(match.homeScore), away: match.awayScore == null ? "—" : String(match.awayScore) },
    { label: "SHOTS", home: String(7 + (seed % 7)), away: String(5 + ((seed >> 2) % 7)) },
    { label: "CORNERS", home: String(2 + (seed % 5)), away: String(1 + ((seed >> 3) % 5)) },
  ];
}

function closesLabel(kickoff: string) {
  // Fixture data is intentionally deterministic so the server and client always
  // render the same market copy.
  const demoNow = new Date("2026-08-25T00:00:00.000Z").getTime();
  const hours = Math.max(1, Math.round((new Date(kickoff).getTime() - demoNow) / 3_600_000));
  return hours < 24 ? `${hours}H` : `${Math.floor(hours / 24)}D`;
}

function stableSeed(value: string): number {
  let hash = 17;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  return hash;
}

function inkFor(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex) return "var(--ds-color-text-default)";
  const value = Number.parseInt(hex[1], 16);
  const luminance = (0.2126 * ((value >> 16) & 255) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255)) / 255;
  return luminance > 0.48 ? "var(--ds-color-text-inverse)" : "var(--ds-color-text-default)";
}
