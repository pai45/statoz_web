import { accentVar, Badge, Progress, SignalPanel } from "@/design-system";
import { isHot, leadingOutcome, type PickMarket } from "@/domain/predictions";
import { pickMarketById } from "@/mocks/picks";

import { TileFooter } from "./tile-footer";
import { TileMetaRow } from "./tile-meta-row";

export type TrendingMarketCardProps = {
  market: PickMarket;
  /** `future` is a long-range outright; `pick` is a near-term call. */
  kind: "future" | "pick";
  /** Tall tiles have room to break out every outcome. */
  detailed?: boolean;
};

/** A prediction market tile — the leader's price, or the full outcome board. */
export function TrendingMarketCard({
  market,
  kind,
  detailed = false,
}: TrendingMarketCardProps) {
  market = pickMarketById(market.id) ?? market;
  const future = kind === "future";
  const accent = accentVar("cyan");
  const leader = leadingOutcome(market);
  const hot = isHot(market);

  return (
    <SignalPanel
      accent={accent}
      tag={<Badge accent={accent}>{future ? "FUTURE" : "PICK"}</Badge>}
      href={`/picks/${market.id}`}
      label={market.question}
      footer={
        <TileFooter
          status={market.resolved ? "SETTLED" : "MARKET OPEN"}
          accent={accent}
          volumeOz={market.volumeOz}
        />
      }
    >
      <TileMetaRow sport={market.sport} leagueLabel={market.leagueLabel} />

      {/* A full sentence, so it takes the body face. Everything else on the
          trending tiles is an identifier or a figure, and takes the display. */}
      <p
        className={[
          "font-sans text-sm font-bold leading-tight",
          detailed ? "line-clamp-3" : "line-clamp-2",
        ].join(" ")}
      >
        {market.question}
      </p>

      {detailed ? (
        <ul className="mt-1 flex flex-col gap-2">
          {market.outcomes.slice(0, 4).map((outcome) => {
            const leading = outcome.id === leader.id;
            const color = leading ? accent : "var(--ds-color-text-muted)";
            return (
              <li key={outcome.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className="min-w-0 flex-1 truncate font-display text-2xs font-extrabold tracking-label"
                    style={{ color }}
                  >
                    {outcome.label.toUpperCase()}
                  </span>
                  <span
                    className={[
                      "ds-tabular shrink-0 font-display font-black leading-compact",
                      leading ? "text-base" : "text-2xs",
                    ].join(" ")}
                    style={{ color }}
                  >
                    {outcome.probabilityPercent}%
                  </span>
                </div>
                <Progress
                  value={outcome.probabilityPercent / 100}
                  accent={color}
                  label={`${outcome.label} ${outcome.probabilityPercent} percent`}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-auto flex flex-col gap-1">
          <p className="truncate font-display text-2xs font-extrabold tracking-label">
            {leader.label.toUpperCase()}
          </p>
          <div className="flex items-end gap-1.5">
            <span
              className="ds-tabular font-display text-xl font-black leading-compact"
              style={{ color: accent }}
            >
              {leader.probabilityPercent}%
            </span>
            {leader.delta !== undefined ? (
              <DeltaBadge delta={leader.delta} hot={hot} />
            ) : null}
          </div>
        </div>
      )}
    </SignalPanel>
  );
}

function DeltaBadge({ delta, hot }: { delta: number; hot: boolean }) {
  const color = delta >= 0 ? "var(--ds-color-success)" : "var(--ds-color-danger)";
  const text = `${delta >= 0 ? "+" : ""}${delta}`;

  if (!hot) {
    return (
      <span
        className="ds-tabular pb-0.5 font-display text-2xs font-extrabold"
        style={{ color }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className="ds-tabular mb-0.5 animate-pulse rounded-md border px-1 py-px font-display text-2xs font-extrabold"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
        background: `color-mix(in srgb, ${color} 13%, transparent)`,
        boxShadow: `0 0 7px -3px color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {text}
    </span>
  );
}
