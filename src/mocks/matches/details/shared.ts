import type {
  MatchDetailBoardEntry,
  MatchDetailData,
  MatchDetailLineup,
  MatchDetailQuiz,
  MatchDetailQuizState,
  MatchDetailScoreboard,
  SportMatch,
} from "@/domain/matches";
import { formatKickoffDate, formatKickoffTime } from "@/shared/utils";

import { matchDetailRivals } from "../detail-rivals";

export type DetailConfig = {
  mainQuiz: { title: string; subtitle: string; questions: number; rewardXp: number };
  eventQuiz?: { subtitle: string; rewardXp: number };
  lineup: { formation: string; roles: string[] };
  statLabels: string[];
  scoreRows: (match: SportMatch, seed: number) => MatchDetailScoreboard["scoreRows"];
  motorsport?: boolean;
  sessions?: MatchDetailScoreboard["sessions"];
  driverStandings?: string[];
};

export function buildMatchDetail(
  match: SportMatch,
  config: DetailConfig,
): MatchDetailData {
  const state: MatchDetailQuizState = match.status === "scheduled"
    ? "open"
    : match.status === "live"
      ? "locked"
      : "finished";
  const lockedMain = match.id === "epl_cfc_new" && state === "locked";
  const main: MatchDetailQuiz = {
    id: "main",
    ...config.mainQuiz,
    state,
    answered: lockedMain || state === "finished" ? config.mainQuiz.questions : 0,
    contest: match.sport === "football" ? {
      entryLabel: state === "finished"
        ? "FINISHED #2"
        : lockedMain
          ? "ENTRY PAID"
          : "−25 OZ ENTRY",
      prizeLabel: state === "finished" ? "+120 OZ WON" : "1ST · 2ND · 3RD",
    } : undefined,
  };
  const quizzes: MatchDetailQuiz[] = [
    main,
    ...(config.eventQuiz ? [{
      id: "events",
      title: "Match Events Quiz",
      subtitle: config.eventQuiz.subtitle,
      questions: 3,
      rewardXp: config.eventQuiz.rewardXp,
      state,
      answered: state === "finished" ? 3 : 0,
    }] : []),
  ];
  const seed = stableSeed(`${match.id}:scoreboard`);

  return {
    quizzes,
    leaderboard: Object.fromEntries(
      quizzes.map((quiz) => [quiz.id, leaderboardFor(`${match.id}:${quiz.id}`)]),
    ),
    scoreboard: {
      facts: [
        {
          label: "STATUS",
          value: match.status === "live"
            ? `LIVE ${match.liveMinute ?? ""}`.trim()
            : match.status === "finished"
              ? "FULL TIME"
              : "PRE-MATCH",
        },
        {
          label: "KICKOFF",
          value: `${formatKickoffDate(match.kickoff)} · ${formatKickoffTime(match.kickoff)}`,
        },
        { label: "LEAGUE", value: match.leagueId.toUpperCase() },
        { label: "SPORT", value: match.sport.toUpperCase() },
      ],
      stats: config.statLabels.map((label, index) => statFor(label, seed, index)),
      timeline: timelineFor(match, config.motorsport === true),
      commentary: commentaryFor(match, config.motorsport === true),
      homeLineup: lineupFor(match.home.name, config.lineup, seed),
      awayLineup: lineupFor(match.away.name, config.lineup, seed + 19),
      scoreRows: config.scoreRows(match, seed),
      sessions: config.sessions,
      driverStandings: config.driverStandings,
    },
  };
}

function leaderboardFor(key: string): MatchDetailBoardEntry[] {
  const seed = stableSeed(key);
  return Array.from({ length: 6 }, (_, index) => {
    const rival = matchDetailRivals[(seed + index * 5) % matchDetailRivals.length];
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

function statFor(label: string, seed: number, index: number) {
  const homeValue = 36 + ((seed + index * 11) % 45);
  const awayValue = 35 + ((seed + index * 17) % 44);
  return {
    label,
    home: String(homeValue),
    away: String(awayValue),
    homeValue,
    awayValue,
  };
}

function lineupFor(
  team: string,
  config: DetailConfig["lineup"],
  seed: number,
): MatchDetailLineup {
  const names = [
    "Mason", "Jordan", "Alex", "Riley", "Taylor", "Morgan",
    "Casey", "Cameron", "Jamie", "Avery", "Drew",
  ];
  return {
    formation: config.formation,
    players: config.roles.map((role, index) => ({
      name: `${team.split(" ")[0]} ${names[index]}`,
      number: 1 + ((seed + index * 7) % 45),
      role,
      captain: index === 2,
    })),
  };
}

function timelineFor(match: SportMatch, motorsport: boolean) {
  if (match.status === "scheduled") return [];
  if (motorsport) {
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

function commentaryFor(match: SportMatch, motorsport: boolean) {
  if (match.status === "scheduled") return [];
  const first = motorsport ? "LAP 12" : "18'";
  const second = motorsport ? "LAP 27" : "34'";
  return [
    { minute: first, text: `${match.home.name} take control with a decisive phase of play.` },
    { minute: second, text: `${match.away.name} respond as the pace of the match rises.` },
    {
      minute: match.status === "live" ? "LIVE" : "FT",
      text: match.status === "live"
        ? "Live data remains active as the fixture develops."
        : match.resultLine ?? "Final match data has been recorded.",
    },
  ];
}

function stableSeed(value: string): number {
  let hash = 17;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return hash;
}
