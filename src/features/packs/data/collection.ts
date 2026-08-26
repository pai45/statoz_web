import type { ActionCard, PlayerCard } from "@/domain/cards";

import { packXp } from "../rolling";
import type { ClaimedPacks } from "../state/claimed-packs";

import { actionCards } from "./action-cards";
import { basketballPlayerCards } from "./basketball-cards";
import { cricketPlayerCards } from "./cricket-cards";
import { footballPlayerCards } from "./football-cards";
import { racingPlayerCards } from "./racing-cards";
import { tennisPlayerCards } from "./tennis-cards";

/**
 * What this browser owns, resolved from the ids the pack claims recorded.
 *
 * A claim stores ids alone, so anything that wants to know a collection's size,
 * its rarity, or what it is worth has to look the cards back up. That belongs
 * here, with the pools, rather than in whichever feature happens to ask.
 */

const playersById = new Map<string, PlayerCard>(
  [
    ...footballPlayerCards,
    ...cricketPlayerCards,
    ...basketballPlayerCards,
    ...tennisPlayerCards,
    ...racingPlayerCards,
  ].map((card) => [card.id, card]),
);

const actionsById = new Map<string, ActionCard>(
  actionCards.map((card) => [card.id, card]),
);

export type CardCollection = {
  playerCards: PlayerCard[];
  actionCards: ActionCard[];
  /** Every card held, of either kind. */
  totalCards: number;
  platinumOwned: number;
  /**
   * What the collection is worth in XP — a player card its rating, an action
   * its power plus thirty, the same arithmetic a pack pays out on.
   */
  xp: number;
};

const emptyCollection: CardCollection = Object.freeze({
  playerCards: Object.freeze([]) as unknown as PlayerCard[],
  actionCards: Object.freeze([]) as unknown as ActionCard[],
  totalCards: 0,
  platinumOwned: 0,
  xp: 0,
});

/** Resolves every claimed id back to its card, skipping any that no longer exist. */
export function collectionFrom(claims: ClaimedPacks): CardCollection {
  const players: PlayerCard[] = [];
  const actions: ActionCard[] = [];

  for (const claim of Object.values(claims)) {
    if (!claim) continue;
    for (const id of claim.playerCardIds) {
      const card = playersById.get(id);
      if (card) players.push(card);
    }
    for (const id of claim.actionCardIds) {
      const card = actionsById.get(id);
      if (card) actions.push(card);
    }
  }

  if (players.length === 0 && actions.length === 0) return emptyCollection;

  const platinumOwned = [...players, ...actions].filter(
    (card) => card.tier === "platinum",
  ).length;

  return {
    playerCards: players,
    actionCards: actions,
    totalCards: players.length + actions.length,
    platinumOwned,
    xp: packXp(players, actions),
  };
}
