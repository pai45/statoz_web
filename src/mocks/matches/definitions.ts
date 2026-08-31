import type { MatchLeague, SportMatch, SportTeam } from "@/domain/matches";
import type { Sport } from "@/domain/sports";

export const matchLeagues: MatchLeague[] = [
  { id: "epl", sport: "football", name: "Premier League", shortCode: "EPL", accent: "#5cdfff" }, { id: "fifa", sport: "football", name: "World Cup", shortCode: "FIFA", accent: "#51ff94" }, { id: "ipl", sport: "cricket", name: "Indian Premier League", shortCode: "IPL", accent: "#c27aff" }, { id: "t20i", sport: "cricket", name: "International T20", shortCode: "T20I", accent: "#ff8904" }, { id: "wnba", sport: "basketball", name: "WNBA", shortCode: "WNBA", accent: "#ff8904" }, { id: "nba", sport: "basketball", name: "NBA", shortCode: "NBA", accent: "#f42d29" }, { id: "wimbledon", sport: "tennis", name: "Wimbledon", shortCode: "WIMBLEDON", accent: "#51ff94" }, { id: "atp", sport: "tennis", name: "ATP Tour", shortCode: "ATP", accent: "#2b7fff" }, { id: "wta", sport: "tennis", name: "WTA Tour", shortCode: "WTA", accent: "#c27aff" }, { id: "f1", sport: "motorsport", name: "Formula 1", shortCode: "F1", accent: "#f42d29" }, { id: "indy", sport: "motorsport", name: "IndyCar", shortCode: "INDY", accent: "#2b7fff" },
];

export function team(id: string, name: string, shortName: string, color: string, secondaryColor: string, badgeTextColor = "#ffffff"): SportTeam { return { id, name, shortName, color, secondaryColor, badgeTextColor }; }

type FixtureExtras = Partial<Pick<SportMatch, "homeScore" | "awayScore" | "liveMinute" | "resultLine">> & { tennisSets?: Array<[number, number]> };

export function fixture(id: string, sport: Sport, leagueId: string, home: SportTeam, away: SportTeam, kickoff: string, status: SportMatch["status"], rewardXp: number, volumeOz: number, extras: FixtureExtras = {}): SportMatch {
  const league = matchLeagues.find((candidate) => candidate.id === leagueId);
  if (!league) throw new Error(`Unknown mock league: ${leagueId}`);
  return { id, sport, leagueId, leagueLabel: league.shortCode, home, away, kickoff, status, rewardXp, volumeOz, homeScore: extras.homeScore, awayScore: extras.awayScore, liveMinute: extras.liveMinute, resultLine: extras.resultLine, tennisSets: extras.tennisSets?.map(([homeScore, awayScore]) => ({ homeScore, awayScore })) };
}
