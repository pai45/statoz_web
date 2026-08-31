"use client";

import Link from "next/link";

import { FixturePanel } from "@/design-system";
import { leadingOutcome, marketCanBuy, type PickMarket, type PickPosition } from "@/domain/predictions";

import styles from "./picks.module.css";

export function PickMarketCard({ market, positions = [], onPick, onClaim }: { market: PickMarket; positions?: PickPosition[]; onPick?: (market: PickMarket, outcomeId: string) => void; onClaim?: (position: PickPosition) => void }) {
  const leader = leadingOutcome(market);
  const accent = market.status === "live" ? "var(--ds-color-accent-orange)" : market.type === "future" ? "var(--ds-color-accent-gold)" : "var(--ds-color-accent-cyan)";
  return (
    <FixturePanel accent={accent} className={styles.card} as="article">
      <div className={styles.cardTop}>
        <span className={styles.plate}>{market.leagueLabel}</span>
        <span className={styles.tag}>{statusLabel(market)}</span>
      </div>
      <Link href={`/picks/${market.id}`} className={styles.questionLink}>{market.question}</Link>
      <div className={styles.outcomes}>
        {market.outcomes.slice(0, 4).map((outcome) => (
          <button key={outcome.id} type="button" className={styles.outcome} disabled={!marketCanBuy(market)} onClick={() => onPick?.(market, outcome.id)} aria-label={`Back ${outcome.label} at ${outcome.probabilityPercent} Oz`}>
            <strong>{outcome.probabilityPercent} Oz</strong><span>{outcome.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.probability} aria-label={`${leader.label} leads at ${leader.probabilityPercent} percent`}>
        {market.outcomes.map((outcome, outcomeIndex) => <span key={outcome.id} style={{ width: `${outcome.probabilityPercent}%`, background: outcome.color ?? (outcomeIndex % 2 ? "var(--ds-color-accent-violet)" : "var(--ds-color-accent-cyan)") }} />)}
      </div>
      {positions.length ? <div className={styles.tickets}>{positions.map((position) => <div className={styles.ticket} key={position.id}><strong>{position.outcomeLabel} · {position.shareCount} shares</strong><b>{position.stakeOz} Oz</b><small>{position.status.toUpperCase()}</small>{position.status === "settleable" ? <button type="button" className={styles.claim} onClick={() => onClaim?.(position)}>CLAIM</button> : <small>MAX {position.shareCount * 100} Oz</small>}</div>)}</div> : null}
      <div className={styles.meta}><span>{(market.type ?? "event").toUpperCase()}</span><span>{compact(market.volumeOz)} OZ VOL</span></div>
    </FixturePanel>
  );
}

function statusLabel(market: PickMarket): string {
  if (market.status === "live") return market.liveLabel ?? "LIVE";
  if (market.status === "settled") return "SETTLED";
  if (market.status === "voided") return "VOID";
  if (market.status === "unresolved" || market.status === "closed") return "CLOSED";
  return market.type === "future" ? "FUTURE" : "OPEN";
}
function compact(value: number): string { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value).toUpperCase(); }
