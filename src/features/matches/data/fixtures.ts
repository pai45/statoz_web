import type { SportMatch, SportTeam } from "@/domain/matches";
import { sportOrder, type Sport } from "@/domain/sports";
import type { PickMarket } from "@/domain/predictions";

import type { MatchLeague, SportFixtureCount } from "../types";

/**
 * Deterministic mock catalog for the static site. The UI treats 25 Aug 2026 as
 * TODAY, which keeps day/week labels stable across builds and hydration.
 */
export const matchDemoAnchor = "2026-08-25T00:00:00.000Z";

export const matchLeagues: MatchLeague[] = [
  { id: "epl", sport: "football", name: "Premier League", shortCode: "EPL", accent: "#5cdfff" },
  { id: "fifa", sport: "football", name: "World Cup", shortCode: "FIFA", accent: "#51ff94" },
  { id: "ipl", sport: "cricket", name: "Indian Premier League", shortCode: "IPL", accent: "#c27aff" },
  { id: "t20i", sport: "cricket", name: "International T20", shortCode: "T20I", accent: "#ff8904" },
  { id: "wnba", sport: "basketball", name: "WNBA", shortCode: "WNBA", accent: "#ff8904" },
  { id: "nba", sport: "basketball", name: "NBA", shortCode: "NBA", accent: "#f42d29" },
  { id: "wimbledon", sport: "tennis", name: "Wimbledon", shortCode: "WIMBLEDON", accent: "#51ff94" },
  { id: "atp", sport: "tennis", name: "ATP Tour", shortCode: "ATP", accent: "#2b7fff" },
  { id: "wta", sport: "tennis", name: "WTA Tour", shortCode: "WTA", accent: "#c27aff" },
  { id: "f1", sport: "motorsport", name: "Formula 1", shortCode: "F1", accent: "#f42d29" },
  { id: "indy", sport: "motorsport", name: "IndyCar", shortCode: "INDY", accent: "#2b7fff" },
];

const teams = {
  chelsea: team("chelsea", "Chelsea", "CHE", "#034694", "#ffffff"),
  newcastle: team("newcastle", "Newcastle United", "NEW", "#241f20", "#ffffff"),
  united: team("man-utd", "Manchester United", "MUN", "#da291c", "#fbe122"),
  arsenal: team("arsenal", "Arsenal", "ARS", "#ef0107", "#ffffff"),
  liverpool: team("liverpool", "Liverpool", "LIV", "#c8102e", "#00b2a9"),
  city: team("man-city", "Manchester City", "MCI", "#6cabdd", "#1c2c5b"),
  spurs: team("spurs", "Tottenham Hotspur", "TOT", "#132257", "#ffffff"),
  villa: team("villa", "Aston Villa", "AVL", "#670e36", "#95bfe5"),
  france: team("france", "France", "FRA", "#1e5aa8", "#ef4135"),
  england: team("england", "England", "ENG", "#ffffff", "#cf081f", "#081019"),
  mumbai: team("mumbai", "Mumbai Indians", "MI", "#004ba0", "#d1ab3e"),
  chennai: team("chennai", "Chennai Super Kings", "CSK", "#ffff3c", "#0081c8", "#081019"),
  bengaluru: team("bengaluru", "Royal Challengers Bengaluru", "RCB", "#d71920", "#f6c344"),
  rajasthan: team("rajasthan", "Rajasthan Royals", "RR", "#254aa5", "#ea1a85"),
  india: team("india", "India", "IND", "#1c4ea0", "#ff9933"),
  pakistan: team("pakistan", "Pakistan", "PAK", "#01411c", "#ffffff"),
  dallas: team("dallas", "Dallas Wings", "DAL", "#002b5c", "#c4d600"),
  phoenix: team("phoenix", "Phoenix Mercury", "PHX", "#3c286e", "#f05023"),
  lakers: team("lakers", "Los Angeles Lakers", "LAL", "#552583", "#f9a01b"),
  warriors: team("warriors", "Golden State Warriors", "GSW", "#1d428a", "#ffc72c"),
  liberty: team("liberty", "New York Liberty", "NYL", "#6eceb2", "#000000", "#081019"),
  aces: team("aces", "Las Vegas Aces", "LVA", "#c8102e", "#c5c7c9"),
  alcaraz: team("alcaraz", "Carlos Alcaraz", "ESP", "#f1bf00", "#aa151b", "#081019"),
  sinner: team("sinner", "Jannik Sinner", "ITA", "#009246", "#ce2b37"),
  djokovic: team("djokovic", "Novak Djokovic", "SRB", "#0c4076", "#c6363c"),
  gauff: team("gauff", "Coco Gauff", "USA", "#3c3b6e", "#b22234"),
  swiatek: team("swiatek", "Iga Swiatek", "POL", "#ffffff", "#dc143c", "#081019"),
  f1: team("formula-1", "Dutch Grand Prix", "F1", "#e10600", "#ffffff"),
  f1Belgium: team("formula-1-belgium", "Belgian Grand Prix", "F1", "#e10600", "#f7c948"),
  f1Italy: team("formula-1-italy", "Italian Grand Prix", "F1", "#e10600", "#009246"),
  indy: team("indycar-gateway", "Gateway 500", "INDY", "#001489", "#d71920"),
  field: team("race-field", "Race Field", "GRID", "#314158", "#90a1b9"),
} as const;

export const sportFixtures: SportMatch[] = [
  // Football: four same-day EPL fixtures exercise the Flutter preview cap.
  fixture("epl_cfc_new", "football", "epl", teams.chelsea, teams.newcastle, "2026-08-25T19:00:00.000Z", "live", 120, 48200, { homeScore: 2, awayScore: 1, liveMinute: 67 }),
  fixture("epl_liv_mci", "football", "epl", teams.liverpool, teams.city, "2026-08-25T21:00:00.000Z", "scheduled", 110, 96500),
  fixture("epl_tot_avl", "football", "epl", teams.spurs, teams.villa, "2026-08-25T17:30:00.000Z", "scheduled", 80, 21600),
  fixture("epl_mu_ars_today", "football", "epl", teams.united, teams.arsenal, "2026-08-25T15:00:00.000Z", "scheduled", 90, 31400),
  fixture("epl_mu_ars", "football", "epl", teams.united, teams.arsenal, "2026-08-26T16:30:00.000Z", "scheduled", 90, 31400),
  fixture("fifa_fra_eng_result", "football", "fifa", teams.france, teams.england, "2026-08-24T18:30:00.000Z", "finished", 160, 128000, { homeScore: 4, awayScore: 6, resultLine: "England won 6-4 to take third place" }),

  // Cricket scores are display strings because innings carry wickets and overs.
  fixture("1496576", "cricket", "ipl", teams.mumbai, teams.chennai, "2026-08-25T14:00:00.000Z", "live", 140, 67900, { homeScore: "164/6 (17.2 ov)", awayScore: "148/8 (20 ov)", liveMinute: 17 }),
  fixture("ipl_rcb_rr", "cricket", "ipl", teams.bengaluru, teams.rajasthan, "2026-08-26T14:30:00.000Z", "scheduled", 100, 42300),
  fixture("t20i_ind_pak", "cricket", "t20i", teams.india, teams.pakistan, "2026-08-24T13:30:00.000Z", "finished", 130, 112000, { homeScore: "202/6 (20 ov)", awayScore: "189/9 (20 ov)", resultLine: "India won by 13 runs" }),

  fixture("wnba_demo_dal_phx", "basketball", "wnba", teams.dallas, teams.phoenix, "2026-08-26T01:00:00.000Z", "scheduled", 75, 12800),
  fixture("nba_lal_gsw", "basketball", "nba", teams.lakers, teams.warriors, "2026-08-25T23:30:00.000Z", "scheduled", 110, 83400),
  fixture("wnba_nyl_lva", "basketball", "wnba", teams.liberty, teams.aces, "2026-08-25T20:00:00.000Z", "live", 95, 36700, { homeScore: 68, awayScore: 64, liveMinute: 33 }),
  fixture("wnba_phx_dal_result", "basketball", "wnba", teams.phoenix, teams.dallas, "2026-08-24T19:00:00.000Z", "finished", 75, 15100, { homeScore: 75, awayScore: 82, resultLine: "Dallas Wings won 82-75" }),

  fixture("wimbledon_mens_final_26", "tennis", "wimbledon", teams.alcaraz, teams.sinner, "2026-08-27T13:00:00.000Z", "scheduled", 160, 88300),
  fixture("atp_alc_djo_result", "tennis", "atp", teams.alcaraz, teams.djokovic, "2026-08-24T13:00:00.000Z", "finished", 160, 66400, { homeScore: 3, awayScore: 0, resultLine: "Alcaraz won 6-4, 6-2, 6-1", tennisSets: [[6, 4], [6, 2], [6, 1]] }),
  fixture("atp_alc_sin", "tennis", "atp", teams.alcaraz, teams.sinner, "2026-08-25T13:00:00.000Z", "scheduled", 150, 75200),
  fixture("wta_swi_gau", "tennis", "wta", teams.swiatek, teams.gauff, "2026-08-25T16:00:00.000Z", "live", 125, 44100, { homeScore: 1, awayScore: 1, liveMinute: 78, tennisSets: [[6, 4], [3, 6]] }),
  fixture("atp_sin_djo", "tennis", "atp", teams.sinner, teams.djokovic, "2026-08-26T12:30:00.000Z", "scheduled", 145, 62800),

  // Motorsport cards intentionally render only the home/race identity.
  fixture("f1_belgian_gp", "motorsport", "f1", teams.f1Belgium, teams.field, "2026-08-22T13:00:00.000Z", "finished", 180, 163000, { resultLine: "Verstappen won from pole" }),
  fixture("f1_dutch_practice", "motorsport", "f1", teams.f1, teams.field, "2026-08-25T11:30:00.000Z", "live", 90, 71400, { liveMinute: 38 }),
  fixture("f1_dutch_gp", "motorsport", "f1", teams.f1, teams.field, "2026-08-30T13:00:00.000Z", "scheduled", 200, 189000),
  fixture("indy_gateway_500", "motorsport", "indy", teams.indy, teams.field, "2026-08-30T18:00:00.000Z", "scheduled", 150, 82400),
  fixture("f1_italian_gp", "motorsport", "f1", teams.f1Italy, teams.field, "2026-09-06T13:00:00.000Z", "scheduled", 200, 201000),
];

const matchIndex = new Map(sportFixtures.map((match) => [match.id, match]));
const leagueIndex = new Map(matchLeagues.map((league) => [league.id, league]));

export const allMockMatchIds = sportFixtures.map((match) => match.id);

/** Matches used by the curated bento retain its existing source IDs. */
export const trendingMatches = [
  requiredMatch("epl_cfc_new"),
  requiredMatch("epl_mu_ars"),
  requiredMatch("wnba_demo_dal_phx"),
  requiredMatch("1496576"),
  requiredMatch("wimbledon_mens_final_26"),
];

export function fixturesForSport(sport: Sport): SportMatch[] {
  return sportFixtures.filter((match) => match.sport === sport);
}

export function matchById(id: string): SportMatch | undefined {
  return matchIndex.get(id);
}

export function leagueById(id: string): MatchLeague | undefined {
  return leagueIndex.get(id);
}

export function fixtureCountsBySport(): Record<Sport, SportFixtureCount> {
  return Object.fromEntries(
    sportOrder.map((sport) => {
      const fixtures = fixturesForSport(sport);
      return [sport, { total: fixtures.length, live: fixtures.filter((match) => match.status === "live").length }];
    }),
  ) as Record<Sport, SportFixtureCount>;
}

export const trendingMarkets: PickMarket[] = [
  {
    id: "fifa_2026_winner",
    sport: "football",
    leagueLabel: "WORLD CUP",
    question: "Who lifts the 2026 World Cup?",
    outcomes: [
      { id: "bra", label: "Brazil", probabilityPercent: 24, delta: 3 },
      { id: "fra", label: "France", probabilityPercent: 21, delta: -2 },
      { id: "eng", label: "England", probabilityPercent: 15, delta: 1 },
      { id: "arg", label: "Argentina", probabilityPercent: 14, delta: -1 },
    ],
    volumeOz: 412000,
    resolved: false,
  },
  {
    id: "epl_liv_mc_winner",
    sport: "football",
    leagueLabel: "EPL",
    question: "Liverpool vs Man City — full-time result?",
    outcomes: [
      { id: "liv", label: "Liverpool", probabilityPercent: 41, delta: 7 },
      { id: "draw", label: "Draw", probabilityPercent: 27, delta: -3 },
      { id: "mci", label: "Man City", probabilityPercent: 32, delta: -4 },
    ],
    volumeOz: 96500,
    resolved: false,
  },
  {
    id: "ipl_2026_winner",
    sport: "cricket",
    leagueLabel: "IPL",
    question: "Which side takes the 2026 IPL title?",
    outcomes: [
      { id: "csk", label: "Chennai", probabilityPercent: 28, delta: 2 },
      { id: "mi", label: "Mumbai", probabilityPercent: 23, delta: -1 },
      { id: "rcb", label: "Bengaluru", probabilityPercent: 19, delta: 4 },
    ],
    volumeOz: 238000,
    resolved: false,
  },
  {
    id: "ipl_sixes_over_12_5",
    sport: "cricket",
    leagueLabel: "IPL",
    question: "Over 12.5 sixes in tonight's innings?",
    outcomes: [
      { id: "over", label: "Over", probabilityPercent: 58, delta: 6 },
      { id: "under", label: "Under", probabilityPercent: 42, delta: -6 },
    ],
    volumeOz: 44700,
    resolved: false,
  },
  {
    id: "epl_mu_over_1_5",
    sport: "football",
    leagueLabel: "EPL",
    question: "Man United to score over 1.5 goals?",
    outcomes: [
      { id: "over", label: "Over", probabilityPercent: 47, delta: -2 },
      { id: "under", label: "Under", probabilityPercent: 53, delta: 2 },
    ],
    volumeOz: 29100,
    resolved: false,
  },
  {
    id: "f1_belgian_gp_winner",
    sport: "motorsport",
    leagueLabel: "BELGIAN GP",
    question: "Who wins at Spa?",
    outcomes: [
      { id: "ver", label: "Verstappen", probabilityPercent: 36, delta: 1 },
      { id: "nor", label: "Norris", probabilityPercent: 29, delta: 5 },
      { id: "lec", label: "Leclerc", probabilityPercent: 18, delta: -3 },
    ],
    volumeOz: 153000,
    resolved: false,
  },
];

export function marketById(id: string): PickMarket | undefined {
  return trendingMarkets.find((market) => market.id === id);
}

function team(
  id: string,
  name: string,
  shortName: string,
  color: string,
  secondaryColor: string,
  badgeTextColor = "#ffffff",
): SportTeam {
  return { id, name, shortName, color, secondaryColor, badgeTextColor };
}

type FixtureExtras = Partial<Pick<
  SportMatch,
  "homeScore" | "awayScore" | "liveMinute" | "resultLine"
>> & { tennisSets?: Array<[number, number]> };

function fixture(
  id: string,
  sport: Sport,
  leagueId: string,
  home: SportTeam,
  away: SportTeam,
  kickoff: string,
  status: SportMatch["status"],
  rewardXp: number,
  volumeOz: number,
  extras: FixtureExtras = {},
): SportMatch {
  const league = matchLeagues.find((candidate) => candidate.id === leagueId);
  if (!league) throw new Error(`Unknown mock league: ${leagueId}`);
  return {
    id,
    sport,
    leagueId,
    leagueLabel: league.shortCode,
    home,
    away,
    kickoff,
    status,
    rewardXp,
    volumeOz,
    homeScore: extras.homeScore,
    awayScore: extras.awayScore,
    liveMinute: extras.liveMinute,
    resultLine: extras.resultLine,
    tennisSets: extras.tennisSets?.map(([homeScore, awayScore]) => ({ homeScore, awayScore })),
  };
}

function requiredMatch(id: string): SportMatch {
  const match = matchIndex.get(id);
  if (!match) throw new Error(`Missing mock match: ${id}`);
  return match;
}
