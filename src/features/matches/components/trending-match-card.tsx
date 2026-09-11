import type { SportMatch } from "@/domain/matches";

import { SportFixtureCard } from "./sport-fixture-card";

export type TrendingMatchCardProps = {
  match: SportMatch;
};

/** Match tiles share the centred-status fixture structure used by sport feeds. */
export function TrendingMatchCard({ match }: TrendingMatchCardProps) {
  return <SportFixtureCard match={match} appearance="trending" />;
}
