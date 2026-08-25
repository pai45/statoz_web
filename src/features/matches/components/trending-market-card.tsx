import { accentVar, Badge, Progress, SignalPanel } from "@/design-system";
import { isHot, leadingOutcome, type PickMarket } from "@/domain/predictions";
import { sportModuleFor } from "@/domain/sports";
import { formatOzCompact } from "@/shared/utils";

import { SportIcon } from "./sport-icon";

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
  const future = kind === "future";
  const accent = accentVar(future ? "gold" : "lime");
  const sportModule = sportModuleFor(market.sport);
  const sportAccent = accentVar(sportModule.accent);
  const leader = leadingOutcome(market);
  const hot = isHot(market);

  return (
    <SignalPanel
      accent={accent}
      tag={<Badge accent={accent}>{future ? "FUTURE" : "PICK"}</Badge>}
      href={`/picks/${market.id}`}
      label={market.question}
    >
      <div className="flex flex-1 flex-col px-3 pb-3 pt-9.5">
        <div className="flex items-center gap-1.5">
          <SportIcon sport={market.sport} size={13} style={{ color: sportAccent }} />
          <span
            className="truncate font-display text-2xs font-extrabold tracking-wide"
            style={{ color: accent }}
          >
            {market.leagueLabel}
          </span>
        </div>

        <p className="mt-2 line-clamp-3 text-base font-extrabold leading-tight">
          {market.question}
        </p>

        {detailed ? (
          <ul className="mt-4 space-y-1.75">
            {market.outcomes.slice(0, 4).map((outcome) => {
              const leading = outcome.id === leader.id;
              const color = leading ? accent : "var(--ds-color-text-muted)";
              return (
                <li key={outcome.id}>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="flex-1 truncate font-display text-2xs font-extrabold tracking-tight"
                      style={{ color }}
                    >
                      {outcome.label.toUpperCase()}
                    </span>
                    <span
                      className="ds-tabular font-display text-2xs font-black"
                      style={{ color }}
                    >
                      {outcome.probabilityPercent}%
                    </span>
                  </div>
                  <Progress
                    className="mt-0.75"
                    value={outcome.probabilityPercent / 100}
                    accent={color}
                    label={`${outcome.label} ${outcome.probabilityPercent} percent`}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3">
            <p className="truncate font-display text-2xs font-black tracking-label">
              {leader.label.toUpperCase()}
            </p>
            <div className="mt-1 flex items-end gap-1.5">
              <span
                className="ds-tabular font-display text-2xl font-black leading-compact"
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

        <p className="ds-tabular mt-auto pt-2 text-2xs font-semibold leading-tight text-muted">
          VOL {formatOzCompact(market.volumeOz)} OZ
        </p>
      </div>
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
