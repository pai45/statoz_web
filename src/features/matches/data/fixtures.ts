import type { SportMatch } from "@/domain/matches";
import type { PickMarket } from "@/domain/predictions";

/**
 * Static stand-in for the live fixture and market feeds. Shapes match the
 * domain types, so swapping in a repository later is a data-source change
 * rather than a component change.
 */

export const trendingMatches: SportMatch[] = [
  {
    id: "epl_cfc_new",
    sport: "football",
    leagueId: "epl",
    leagueLabel: "EPL",
    home: { id: "cfc", name: "Chelsea", shortName: "CHE", color: "#2b7fff" },
    away: { id: "new", name: "Newcastle United", shortName: "NEW", color: "#cad5e2" },
    status: "live",
    kickoff: "2026-08-25T19:00:00Z",
    homeScore: 2,
    awayScore: 1,
    liveMinute: 67,
    rewardXp: 120,
    volumeOz: 48200,
  },
  {
    id: "epl_mu_ars",
    sport: "football",
    leagueId: "epl",
    leagueLabel: "EPL",
    home: { id: "mu", name: "Manchester United", shortName: "MUN", color: "#f42d29" },
    away: { id: "ars", name: "Arsenal", shortName: "ARS", color: "#ff8904" },
    status: "scheduled",
    kickoff: "2026-08-26T16:30:00Z",
    rewardXp: 90,
    volumeOz: 31400,
  },
  {
    id: "wnba_demo_dal_phx",
    sport: "basketball",
    leagueId: "wnba",
    leagueLabel: "WNBA",
    home: { id: "dal", name: "Dallas Wings", shortName: "DAL", color: "#5cdfff" },
    away: { id: "phx", name: "Phoenix Mercury", shortName: "PHX", color: "#c27aff" },
    status: "scheduled",
    kickoff: "2026-08-26T01:00:00Z",
    rewardXp: 75,
    volumeOz: 12800,
  },
  {
    id: "1496576",
    sport: "cricket",
    leagueId: "ipl",
    leagueLabel: "IPL",
    home: { id: "mi", name: "Mumbai Indians", shortName: "MI", color: "#2b7fff" },
    away: { id: "csk", name: "Chennai Super Kings", shortName: "CSK", color: "#fdc700" },
    status: "live",
    kickoff: "2026-08-25T14:00:00Z",
    homeScore: 164,
    awayScore: 148,
    liveMinute: 17,
    rewardXp: 140,
    volumeOz: 67900,
  },
  {
    id: "wimbledon_mens_final_26",
    sport: "tennis",
    leagueId: "wimbledon",
    leagueLabel: "WIMBLEDON",
    home: { id: "alc", name: "Carlos Alcaraz", shortName: "ALC", color: "#51ff94" },
    away: { id: "sin", name: "Jannik Sinner", shortName: "SIN", color: "#5cdfff" },
    status: "scheduled",
    kickoff: "2026-08-27T13:00:00Z",
    rewardXp: 160,
    volumeOz: 88300,
  },
];

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

export function matchById(id: string): SportMatch | undefined {
  return trendingMatches.find((match) => match.id === id);
}

export function marketById(id: string): PickMarket | undefined {
  return trendingMarkets.find((market) => market.id === id);
}
