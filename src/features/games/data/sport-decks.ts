import type { Sport } from "@/domain/sports";

import { gameRegistry } from "./game-registry";
import type { GameId } from "../types";

/**
 * Every game a sport offers, in the order its deck lists them. Heroes lead,
 * quick games follow — the deck reads the `kind` off the registry rather than
 * keeping two lists, so a game can be promoted by editing one field.
 */
export const sportGameDecks: Record<Sport, GameId[]> = {
  football: [
    "pitch-duel",
    "penalty-shootout",
    "football-chess",
    "football-quiz",
    "football-bingo",
    "guess-player",
  ],
  cricket: ["final-over", "cricket-quiz", "cricket-guess-player"],
  basketball: ["hoop-duel", "basketball-quiz", "basketball-guess-player"],
  tennis: ["tennis-rally", "tennis-quiz", "tennis-guess-winner"],
  motorsport: ["grand-prix-dash", "motorsport-quiz", "guess-driver"],
};

export type SportDeck = {
  sport: Sport;
  heroes: GameId[];
  quick: GameId[];
};

/** A sport's deck, split into the two shelves it renders as. */
export function deckFor(sport: Sport): SportDeck {
  const games = sportGameDecks[sport];
  return {
    sport,
    heroes: games.filter((id) => gameRegistry[id].kind === "hero"),
    quick: games.filter((id) => gameRegistry[id].kind === "quick"),
  };
}
