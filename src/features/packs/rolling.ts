import {
  cardTiers,
  type ActionCard,
  type CardTier,
  type PlayerCard,
} from "@/domain/cards";

import {
  actionCards as defaultActionCards,
  attackActionCards,
  defenseActionCards,
} from "./data/action-cards";
import { attackers, defenders, goalkeepers } from "./data/football-cards";
import type { StarterPack } from "./types";

/**
 * A source of randomness in `[0, 1)`. Flutter takes a `Random`; taking the
 * function instead lets a caller pass a seeded generator and get a reproducible
 * pack, which is what makes the weighting testable at all.
 */
export type RandomSource = () => number;

/** Relative drop weights for the starter pack — 55 : 35 : 4 : 1. */
export const starterPackTierWeights: Record<CardTier, number> = {
  bronze: 55,
  silver: 35,
  gold: 4,
  platinum: 1,
};

const totalTierWeight = Object.values(starterPackTierWeights).reduce(
  (sum, weight) => sum + weight,
  0,
);

/** Probability a single roll lands on this tier. */
export function starterDropChance(tier: CardTier): number {
  return starterPackTierWeights[tier] / totalTierWeight;
}

/**
 * Tiers in descending drop order. `rollPackRarity` walks this list, so the rare
 * tiers are tested first and the common one absorbs any floating-point slack.
 */
const tiersByDropOrder: CardTier[] = ["platinum", "gold", "silver", "bronze"];

/** Where a player's overall sits on the pack's tier scale. */
export function packRarityForRating(rating: number): CardTier {
  if (rating >= 90) return "platinum";
  if (rating >= 86) return "gold";
  if (rating >= 80) return "silver";
  return "bronze";
}

/** Where an action's power sits on the same scale. */
export function packRarityForPower(power: number): CardTier {
  if (power >= 22) return "platinum";
  if (power >= 16) return "gold";
  if (power >= 10) return "silver";
  return "bronze";
}

export function packRarityOfPlayer(card: PlayerCard): CardTier {
  return packRarityForRating(card.rating);
}

export function packRarityOfAction(card: ActionCard): CardTier {
  return packRarityForPower(card.power);
}

/** Rolls a target tier on the 55 / 35 / 4 / 1 weighting. */
export function rollPackRarity(random: RandomSource = Math.random): CardTier {
  const roll = random();
  let cumulative = 0;
  for (const tier of tiersByDropOrder) {
    cumulative += starterDropChance(tier);
    if (roll < cumulative) return tier;
  }
  return "bronze";
}

/**
 * Draws one card from `pool` matching a fresh rarity roll, skipping anything
 * already in `taken`.
 *
 * When nothing of the rolled tier is left it falls back to the nearest tier by
 * ordinal distance, so a draw never fails while any card remains — without it a
 * 1% platinum roll against an exhausted platinum shelf would throw.
 */
function drawByRarity<T>(
  pool: T[],
  rarityOf: (card: T) => CardTier,
  taken: Set<T>,
  random: RandomSource,
): T {
  const available = pool.filter((card) => !taken.has(card));
  if (available.length === 0) {
    throw new Error("Starter pack draw failed: pool exhausted.");
  }

  const target = cardTiers.indexOf(rollPackRarity(random));
  const distance = (card: T) =>
    Math.abs(cardTiers.indexOf(rarityOf(card)) - target);
  const nearest = Math.min(...available.map(distance));
  const candidates = available.filter((card) => distance(card) === nearest);

  const pick = candidates[Math.floor(random() * candidates.length)];
  taken.add(pick);
  return pick;
}

export const starterPackStrikerCount = 2;
export const starterPackDefenderCount = 2;
export const starterPackKeeperCount = 1;
export const starterPackActionCount = 5;

export type RollStarterPackOptions = {
  strikerPool: PlayerCard[];
  defenderPool: PlayerCard[];
  keeperPool: PlayerCard[];
  attackActionPool: ActionCard[];
  defenseActionPool: ActionCard[];
  actionCount?: number;
  random?: RandomSource;
};

/**
 * Rolls a starter pack from the supplied pools.
 *
 * Every card goes through `rollPackRarity`, and no card repeats inside a pack.
 * The actions split as evenly as the count allows; an odd remainder goes to a
 * random side, so a five-action pack is 3 + 2 or 2 + 3 rather than always the
 * same shape.
 */
export function rollStarterPack({
  strikerPool,
  defenderPool,
  keeperPool,
  attackActionPool,
  defenseActionPool,
  actionCount = starterPackActionCount,
  random = Math.random,
}: RollStarterPackOptions): StarterPack {
  const takenPlayers = new Set<PlayerCard>();
  const takenActions = new Set<ActionCard>();

  const drawPlayer = (pool: PlayerCard[]) =>
    drawByRarity(pool, packRarityOfPlayer, takenPlayers, random);
  const drawAction = (pool: ActionCard[]) =>
    drawByRarity(pool, packRarityOfAction, takenActions, random);

  const strikers = Array.from({ length: starterPackStrikerCount }, () =>
    drawPlayer(strikerPool),
  );
  const defenders = Array.from({ length: starterPackDefenderCount }, () =>
    drawPlayer(defenderPool),
  );
  const keeper = drawPlayer(keeperPool);

  const half = Math.floor(actionCount / 2);
  const attackCount =
    half + (actionCount % 2 === 1 && random() < 0.5 ? 1 : 0);
  const defenseCount = actionCount - attackCount;

  return {
    strikers,
    defenders,
    keeper,
    attackActions: Array.from({ length: attackCount }, () =>
      drawAction(attackActionPool),
    ),
    defenseActions: Array.from({ length: defenseCount }, () =>
      drawAction(defenseActionPool),
    ),
  };
}

/** Rolls a starter pack from the game's own football pools. */
export function rollDefaultStarterPack(
  options: { actionCount?: number; random?: RandomSource } = {},
): StarterPack {
  return rollStarterPack({
    strikerPool: attackers,
    defenderPool: defenders,
    keeperPool: goalkeepers,
    attackActionPool: attackActionCards,
    defenseActionPool: defenseActionCards,
    ...options,
  });
}

/** Every action card, for callers rolling their own split. */
export const actionCardPool = defaultActionCards;

/* ---- Match deck constraint --------------------------------------------- */

/** A deck taken into a match may hold at most this many cards. */
export const maxMatchDeckCards = 5;

export function isValidMatchDeckSize(count: number): boolean {
  return count >= 1 && count <= maxMatchDeckCards;
}

export function canAddToMatchDeck(currentCount: number): boolean {
  return currentCount < maxMatchDeckCards;
}

/** Trims a deck to the five-card limit, preserving order. */
export function enforceMatchDeckLimit<T>(cards: T[]): T[] {
  return cards.slice(0, maxMatchDeckCards);
}
