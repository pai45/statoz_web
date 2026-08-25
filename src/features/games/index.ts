export { ArcadeHeroTile, type HeroLayout } from "./components/arcade-hero-tile";
export { GameScene, gameSceneAssets, type GameSceneProps } from "./components/game-scenes";
export { GamesTrendingFeed } from "./components/games-trending-feed";
export { QuickGameTile } from "./components/quick-game-tile";
export { QuickPlayHeader } from "./components/quick-play-header";
export { SportGameDeck } from "./components/sport-game-deck";
export { gameEntryFor, gameRegistry, type GameEntry } from "./data/game-registry";
export { deckFor, sportGameDecks, type SportDeck } from "./data/sport-decks";
export { gamesTrendingCatalog } from "./data/trending-catalog";
export type {
  GameId,
  GameSceneId,
  GameTileKind,
  GamesTrendingTileConfig,
} from "./types";
