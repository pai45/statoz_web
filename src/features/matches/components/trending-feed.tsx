import {
  Badge,
  BentoGrid,
  BentoTile,
  SignalOffIcon,
  SignalPanel,
} from "@/design-system";

import { marketById, matchById } from "../data/fixtures";
import { matchTrendingCatalog, type TrendingTileConfig } from "../data/trending-catalog";
import { TrendingMarketCard } from "./trending-market-card";
import { TrendingMatchCard } from "./trending-match-card";
import { TrendingPredictCard } from "./trending-predict-card";

/** The curated trending bento — the home screen's main surface. */
export function TrendingFeed() {
  return (
    <BentoGrid>
      {matchTrendingCatalog.map((config) => (
        <BentoTile key={config.id} span={config.span}>
          <TrendingTile config={config} />
        </BentoTile>
      ))}
    </BentoGrid>
  );
}

function TrendingTile({ config }: { config: TrendingTileConfig }) {
  if (config.kind === "match" || config.kind === "predict") {
    const match = matchById(config.sourceId);
    if (!match) return <Unavailable kind={config.kind} />;
    return config.kind === "match" ? (
      <TrendingMatchCard match={match} />
    ) : (
      <TrendingPredictCard match={match} />
    );
  }

  const market = marketById(config.sourceId);
  if (!market) return <Unavailable kind={config.kind} />;
  return (
    <TrendingMarketCard
      market={market}
      kind={config.kind}
      detailed={config.span === "tall"}
    />
  );
}

const MUTED = "var(--ds-color-text-muted)";

function Unavailable({ kind }: { kind: TrendingTileConfig["kind"] }) {
  return (
    <SignalPanel
      accent={MUTED}
      lifted={false}
      tag={<Badge accent={MUTED}>{kind.toUpperCase()}</Badge>}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
        <SignalOffIcon size={22} />
        <p className="text-center font-display text-2xs font-extrabold leading-tight tracking-wide">
          SIGNAL
          <br />
          UNAVAILABLE
        </p>
      </div>
    </SignalPanel>
  );
}
