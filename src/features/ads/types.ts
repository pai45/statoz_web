/** Stable identifiers used to name future AdSense slots without coupling UI to credentials. */
export type AdPlacementId =
  | "home-feed"
  | "games-catalog"
  | "profile-dossier"
  | "history-feed"
  | "leaderboard-rail";

export type AdFormat = "horizontal" | "rectangle";

export type AdCreative = "campaign" | "wireframe";

export type AdPlacement = {
  format: AdFormat;
  creative: AdCreative;
  desktopOnly?: boolean;
};
