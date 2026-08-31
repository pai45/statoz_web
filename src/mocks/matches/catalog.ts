import type { MatchLeague, SportFixtureCount, SportMatch } from "@/domain/matches";
import { sportOrder, type Sport } from "@/domain/sports";

import { basketballFixtures } from "./basketball";
import { cricketFixtures } from "./cricket";
import { footballFixtures } from "./football";
import { motorsportFixtures } from "./motorsport";
import { tennisFixtures } from "./tennis";
import { matchLeagues } from "./definitions";

export { fixture, matchLeagues, team } from "./definitions";

/** Fixed timestamp that keeps the demo's relative date labels stable. */
export const matchDemoAnchor = "2026-08-25T00:00:00.000Z";

/** Stable reading order for the sport feed and static match routes. */
export const sportFixtures: SportMatch[] = [...footballFixtures, ...cricketFixtures, ...basketballFixtures, ...tennisFixtures, ...motorsportFixtures];

const matchIndex = new Map(sportFixtures.map((match) => [match.id, match]));
const leagueIndex = new Map(matchLeagues.map((league) => [league.id, league]));
export const allMockMatchIds = sportFixtures.map((match) => match.id);
export const trendingMatches = [requiredMatch("epl_cfc_new"), requiredMatch("epl_mu_ars"), requiredMatch("wnba_demo_dal_phx"), requiredMatch("1496576"), requiredMatch("wimbledon_mens_final_26")];
export function fixturesForSport(sport: Sport): SportMatch[] { return sportFixtures.filter((match) => match.sport === sport); }
export function matchById(id: string): SportMatch | undefined { return matchIndex.get(id); }
export function leagueById(id: string): MatchLeague | undefined { return leagueIndex.get(id); }
export function fixtureCountsBySport(): Record<Sport, SportFixtureCount> {
  return Object.fromEntries(sportOrder.map((sport) => {
    const fixtures = fixturesForSport(sport);
    return [sport, { total: fixtures.length, live: fixtures.filter((match) => match.status === "live").length }];
  })) as Record<Sport, SportFixtureCount>;
}
function requiredMatch(id: string): SportMatch {
  const match = matchIndex.get(id);
  if (!match) throw new Error(`Missing mock match: ${id}`);
  return match;
}
