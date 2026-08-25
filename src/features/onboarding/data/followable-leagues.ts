import type { Sport } from "@/domain/sports";

import type { FollowableLeague } from "../types";

/**
 * The leagues a player can follow during setup, with the clubs they can name a
 * favourite from. Kept separate from the prediction fixtures so seeding a
 * league here never spawns an empty section on the home surface. EPL and the
 * cricket ids mirror the fixture data so a favourite lines up later.
 */
export const followableLeagues: FollowableLeague[] = [
  {
    sport: "football",
    id: "epl",
    name: "English Premier League",
    shortCode: "EPL",
    teams: [
      { id: "liv", name: "Liverpool", shortName: "LFC", color: "#c8102e" },
      { id: "ars", name: "Arsenal", shortName: "ARS", color: "#ef0107" },
      { id: "mc", name: "Man City", shortName: "MCI", color: "#6cabdd" },
      { id: "mu", name: "Man Utd", shortName: "MU", color: "#d5122a" },
      { id: "cfc", name: "Chelsea", shortName: "CFC", color: "#1f4fd6" },
      { id: "new", name: "Newcastle", shortName: "NEW", color: "#edede8" },
      { id: "avl", name: "Aston Villa", shortName: "AVL", color: "#7a003c" },
      { id: "whu", name: "West Ham", shortName: "WHU", color: "#7a263a" },
    ],
  },
  {
    sport: "football",
    id: "laliga",
    name: "La Liga",
    shortCode: "LAL",
    teams: [
      { id: "rma", name: "Real Madrid", shortName: "RMA", color: "#febe10" },
      { id: "fcb", name: "Barcelona", shortName: "FCB", color: "#a50044" },
      { id: "atm", name: "Atletico", shortName: "ATM", color: "#cb3524" },
      { id: "sev", name: "Sevilla", shortName: "SEV", color: "#d9182b" },
      { id: "rso", name: "Real Sociedad", shortName: "RSO", color: "#0067b1" },
      { id: "bet", name: "Real Betis", shortName: "BET", color: "#00954c" },
    ],
  },
  {
    sport: "football",
    id: "seriea",
    name: "Serie A",
    shortCode: "SEA",
    teams: [
      { id: "juv", name: "Juventus", shortName: "JUV", color: "#ffffff" },
      { id: "int", name: "Inter", shortName: "INT", color: "#0068a8" },
      { id: "mil", name: "AC Milan", shortName: "MIL", color: "#fb090b" },
      { id: "nap", name: "Napoli", shortName: "NAP", color: "#12a0d7" },
      { id: "rom", name: "Roma", shortName: "ROM", color: "#8e1f2f" },
      { id: "laz", name: "Lazio", shortName: "LAZ", color: "#87d8f7" },
    ],
  },
  {
    sport: "football",
    id: "bundesliga",
    name: "Bundesliga",
    shortCode: "BUN",
    teams: [
      { id: "bay", name: "Bayern", shortName: "BAY", color: "#dc052d" },
      { id: "bvb", name: "Dortmund", shortName: "BVB", color: "#fde100" },
      { id: "rbl", name: "RB Leipzig", shortName: "RBL", color: "#dd0741" },
      { id: "b04", name: "Leverkusen", shortName: "B04", color: "#e32221" },
      { id: "sge", name: "Frankfurt", shortName: "SGE", color: "#e1000f" },
      { id: "wob", name: "Wolfsburg", shortName: "WOB", color: "#65b32e" },
    ],
  },
  {
    sport: "cricket",
    id: "23810",
    name: "International T20",
    shortCode: "T20I",
    teams: [
      { id: "ind", name: "India", shortName: "IND", color: "#1d4ed8" },
      { id: "eng", name: "England", shortName: "ENG", color: "#ffffff" },
      { id: "wi", name: "West Indies", shortName: "WI", color: "#7a0016" },
      { id: "sl", name: "Sri Lanka", shortName: "SL", color: "#002b54" },
    ],
  },
  {
    sport: "motorsport",
    id: "formula1",
    name: "Formula 1",
    shortCode: "F1",
    teams: [
      { id: "rbr", name: "Red Bull Racing", shortName: "RBR", color: "#263bff" },
      { id: "fer", name: "Ferrari", shortName: "FER", color: "#dc0000" },
      { id: "mcl", name: "McLaren", shortName: "MCL", color: "#ff8700" },
      { id: "mer", name: "Mercedes", shortName: "MER", color: "#00d2be" },
      { id: "ast", name: "Aston Martin", shortName: "AST", color: "#006f62" },
      { id: "wil", name: "Williams", shortName: "WIL", color: "#00a3e0" },
    ],
  },
  {
    sport: "basketball",
    id: "nba",
    name: "National Basketball Association",
    shortCode: "NBA",
    teams: [
      { id: "lal", name: "LA Lakers", shortName: "LAL", color: "#552583" },
      { id: "bos", name: "Boston", shortName: "BOS", color: "#007a33" },
      { id: "gsw", name: "Golden State", shortName: "GSW", color: "#1d428a" },
      { id: "mia", name: "Miami", shortName: "MIA", color: "#98002e" },
      { id: "nyk", name: "New York", shortName: "NYK", color: "#006bb6" },
      { id: "dal", name: "Dallas", shortName: "DAL", color: "#00538c" },
    ],
  },
  {
    sport: "tennis",
    id: "atp",
    name: "ATP Tour",
    shortCode: "ATP",
    teams: [
      { id: "alcaraz", name: "Carlos Alcaraz", shortName: "ALC", color: "#c60b1e" },
      { id: "sinner", name: "Jannik Sinner", shortName: "SIN", color: "#008c45" },
      { id: "djokovic", name: "Novak Djokovic", shortName: "DJO", color: "#c6363c" },
    ],
  },
  {
    // Individual athletes are fetched per tournament, so there is nothing to
    // pick a favourite from here yet.
    sport: "tennis",
    id: "wimbledon",
    name: "Wimbledon",
    shortCode: "WIM",
    teams: [],
  },
];

export function followableLeaguesForSport(sport: Sport): FollowableLeague[] {
  return followableLeagues.filter((entry) => entry.sport === sport);
}

export function followableLeagueById(
  id: string,
): FollowableLeague | undefined {
  return followableLeagues.find((entry) => entry.id === id);
}
