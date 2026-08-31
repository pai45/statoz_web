import type { BentoSpan } from "@/design-system";
import type { Sport } from "@/domain/sports";

/** What a trending tile is asking the player to do. */
export type TrendingTileKind = "match" | "predict" | "pick" | "future";

export type TrendingTileConfig = {
  id: string;
  kind: TrendingTileKind;
  /** Id of the match or market the tile renders. */
  sourceId: string;
  sport: Sport;
  span: BentoSpan;
};

/**
 * The curated trending feed. Order is the reading order; the bento packs the
 * tiles into whichever cells they fit.
 */
export const matchTrendingCatalog: TrendingTileConfig[] = [
  {
    id: "trend-live-epl",
    kind: "match",
    sourceId: "epl_cfc_new",
    sport: "football",
    span: "wide",
  },
  {
    id: "trend-world-cup-future",
    kind: "future",
    sourceId: "fifa_2026_winner",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-arsenal-predict",
    kind: "predict",
    sourceId: "epl_mu_ars",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-liverpool-pick",
    kind: "pick",
    sourceId: "epl_liv_mc_winner",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-wnba-predict",
    kind: "predict",
    sourceId: "wnba_demo_dal_phx",
    sport: "basketball",
    span: "square",
  },
  {
    id: "trend-live-cricket",
    kind: "match",
    sourceId: "1496576",
    sport: "cricket",
    span: "wide",
  },
  {
    id: "trend-ipl-future",
    kind: "future",
    sourceId: "ipl_2026_winner",
    sport: "cricket",
    span: "square",
  },
  {
    id: "trend-ipl-sixes-pick",
    kind: "pick",
    sourceId: "ipl_sixes_over_12_5",
    sport: "cricket",
    span: "square",
  },
  {
    id: "trend-wimbledon-predict",
    kind: "predict",
    sourceId: "wimbledon_mens_final_26",
    sport: "tennis",
    span: "wide",
  },
  {
    id: "trend-man-utd-pick",
    kind: "pick",
    sourceId: "epl_mu_over_1_5",
    sport: "football",
    span: "square",
  },
  {
    id: "trend-belgian-gp-future",
    kind: "future",
    sourceId: "f1_belgian_gp_winner",
    sport: "motorsport",
    span: "square",
  },
];
