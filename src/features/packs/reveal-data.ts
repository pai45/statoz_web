import { starterPackActions, starterPackPlayers } from "./types";
import type { PackRevealData, StarterPack } from "./types";

export type StarterRevealOptions = {
  pack: StarterPack;
  xpGained?: number;
  /** Levels crossed by opening this pack, in order. */
  levelsGained?: number[];
};

/**
 * The football starter pack's reveal: the players flip one at a time, the
 * actions arrive together.
 */
export function starterPackReveal({
  pack,
  xpGained = 0,
  levelsGained = [],
}: StarterRevealOptions): PackRevealData {
  const playerCards = starterPackPlayers(pack);
  const actionCards = starterPackActions(pack);
  const total = playerCards.length + actionCards.length;

  return {
    playerCards,
    actionCards,
    headline: "STARTER\nPACK",
    statusLabel: "UNLOCKED",
    ctaLabel: "ENTER THE GAME",
    summaryLabel: `${total} CARDS ADDED TO YOUR COLLECTION`,
    xpGained,
    levelsGained,
    groupActionCards: true,
    maxAnimatedPlayerCards: 5,
  };
}

/** The cricket starter, which flips every card it contains. */
export function cricketStarterPackReveal({
  pack,
  xpGained = 0,
  levelsGained = [],
}: StarterRevealOptions): PackRevealData {
  const playerCards = starterPackPlayers(pack);
  const actionCards = starterPackActions(pack);
  const total = playerCards.length + actionCards.length;

  return {
    playerCards,
    actionCards,
    headline: "CRICKET\nSTARTER",
    statusLabel: "UNLOCKED",
    ctaLabel: "ENTER FINAL OVER",
    summaryLabel: `${total} CARDS ADDED TO YOUR COLLECTION`,
    xpGained,
    levelsGained,
    groupActionCards: false,
    maxAnimatedPlayerCards: 3,
  };
}
