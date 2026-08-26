import type { PlayerCard } from "@/domain/cards";

import type { RandomSource } from "./cpu";

/** The rating the CPU squad is drawn around, climbing two a level to a cap. */
export function targetRatingForLevel(level: number): number {
  return Math.min(95, 66 + level * 2);
}

/**
 * Picks `count` cards near the target rating, but not the same ones every
 * time: it sorts the pool by distance from the target, then shuffles a window
 * of the closest and takes from that. A strictly nearest pick would field the
 * identical opponent at every level.
 */
function variedNearestByRating(
  pool: PlayerCard[],
  target: number,
  count: number,
  random: RandomSource,
): PlayerCard[] {
  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target),
  );

  const windowSize = Math.min(pool.length, Math.max(count * 8, 12));
  const window = sorted.slice(0, windowSize);
  for (let index = window.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [window[index], window[swap]] = [window[swap], window[index]];
  }

  return window.slice(0, count);
}

export type ShootoutOpponent = {
  /** In kick order: ATK1, ATK2, DEF1, DEF2, GK. */
  shooters: PlayerCard[];
  keeper: PlayerCard;
};

/**
 * Builds the CPU's five takers at the player's level. The keeper appears twice
 * on purpose — it stands in goal and takes the fifth kick, as in Flutter.
 */
export function generateShootoutOpponent(
  level: number,
  attackerPool: PlayerCard[],
  defenderPool: PlayerCard[],
  keeperPool: PlayerCard[],
  random: RandomSource = Math.random,
): ShootoutOpponent {
  const target = targetRatingForLevel(level);
  const cpuAttackers = variedNearestByRating(attackerPool, target, 2, random);
  const cpuDefenders = variedNearestByRating(defenderPool, target, 2, random);
  const keeper = variedNearestByRating(keeperPool, target, 1, random)[0];

  return {
    shooters: [...cpuAttackers, ...cpuDefenders, keeper],
    keeper,
  };
}
