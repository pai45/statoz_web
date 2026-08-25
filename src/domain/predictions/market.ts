import type { Sport } from "../sports";

export type PickOutcome = {
  id: string;
  label: string;
  /** Implied probability, 0..100. */
  probabilityPercent: number;
  /** Change in percentage points since the previous tick. */
  delta?: number;
};

export type PickMarket = {
  id: string;
  sport: Sport;
  /** Competition the market belongs to, for example "FIFA WORLD CUP". */
  leagueLabel: string;
  question: string;
  outcomes: PickOutcome[];
  /** Oz staked across the market. */
  volumeOz: number;
  /** True once the market has settled. */
  resolved: boolean;
};

/** A market's front-runner. */
export function leadingOutcome(market: PickMarket): PickOutcome {
  return market.outcomes.reduce((leader, outcome) =>
    outcome.probabilityPercent > leader.probabilityPercent ? outcome : leader,
  );
}

/**
 * A market runs hot when its leader just swung by at least this many
 * percentage points. Calibrated so the pulse stays rare.
 */
export const HOT_DELTA_THRESHOLD = 5;

export function isHot(market: PickMarket): boolean {
  const delta = leadingOutcome(market).delta;
  return delta !== undefined && Math.abs(delta) >= HOT_DELTA_THRESHOLD && !market.resolved;
}
