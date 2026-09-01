"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { InteractiveLineChart } from "@/design-system";
import {
  leadingOutcome,
  marketCanBuy,
  type PickMarket,
  type PickPosition,
} from "@/domain/predictions";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { hasLinkedFixture } from "@/mocks/picks";

import {
  selectPositionsForMarket,
  settlePosition,
  usePicks,
} from "../state/picks-store";
import { PickTradeDrawer } from "./pick-drawers";
import { SettlementReveal } from "./settlement-reveal";
import styles from "./picks.module.css";

export function MarketDetailScreen({ market }: { market: PickMarket }) {
  const picks = usePicks();
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const positions = session.isAuthenticated
    ? selectPositionsForMarket(picks, market.id)
    : [];
  const leader = leadingOutcome(market);
  const [outcomeId, setOutcomeId] = useState<string | null>(null);
  const [settled, setSettled] = useState<PickPosition | null>(null);

  const openTrade = (id: string) => {
    if (
      !requireAuth({
        intent: "lock a pick",
        message: "Log in to buy shares and save this pick.",
      })
    ) {
      return;
    }
    setOutcomeId(id);
  };

  const claim = (position: PickPosition) => {
    if (
      !requireAuth({
        intent: "claim a pick",
        message: "Log in to claim your result.",
      })
    ) {
      return;
    }
    const result = settlePosition(position.id);
    if (result) setSettled(result);
  };

  return (
    <main className={styles.detail}>
      <Link href="/picks" className={styles.back}>
        ← ALL PICKS
      </Link>

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <section className={styles.panel}>
            <span className={styles.plate}>{market.leagueLabel}</span>
            <h1 className={styles.detailQuestion}>{market.question}</h1>
            <p className={styles.groupTitle}>
              {(market.type ?? "event").toUpperCase()} ·{" "}
              {(market.status ?? "upcoming").toUpperCase()}
            </p>
            <div className={styles.metrics}>
              <Metric label="LEADING" value={`${leader.probabilityPercent}%`} />
              <Metric label="VOLUME" value={`${compact(market.volumeOz)} OZ`} />
              <Metric label="OUTCOMES" value={String(market.outcomes.length)} />
            </div>
          </section>

          {market.contextTitle || market.homeLabel ? (
            <section className={`${styles.panel} ${styles.score}`}>
              <div>
                <strong>{market.homeLabel ?? market.contextTitle}</strong>
                <strong className={styles.scoreBig}>{market.homeScore ?? "—"}</strong>
              </div>
              <div>
                <span className={styles.tag}>
                  {market.liveLabel ?? (market.status === "settled" ? "FT" : "VS")}
                </span>
                <small>{market.contextSubtitle}</small>
              </div>
              <div>
                <strong>{market.awayLabel ?? ""}</strong>
                <strong className={styles.scoreBig}>{market.awayScore ?? "—"}</strong>
              </div>
            </section>
          ) : null}

          <OddsChart market={market} />
        </div>

        <aside className={styles.detailSide}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <h2>OUTCOMES</h2>
              <span className={styles.groupTitle}>
                {marketCanBuy(market) ? "MARKET OPEN" : "MARKET UNAVAILABLE"}
              </span>
            </div>
            <div className={styles.outcomeRows}>
              {market.outcomes.map((outcome) => {
                const held = positions.some(
                  (position) => position.outcomeId === outcome.id,
                );
                return (
                  <div className={styles.outcomeRow} key={outcome.id}>
                    <span>
                      <strong>{outcome.label}</strong>
                      {held ? <small> · BACKED</small> : null}
                    </span>
                    <b>{outcome.probabilityPercent} Oz</b>
                    <button
                      type="button"
                      disabled={!marketCanBuy(market)}
                      onClick={() => openTrade(outcome.id)}
                    >
                      {marketCanBuy(market) ? "BACK" : "CLOSED"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {positions.length ? (
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>YOUR TICKETS</h2>
              </div>
              <div className={styles.tickets}>
                {positions.map((position) => (
                  <div className={styles.ticket} key={position.id}>
                    <strong>
                      {position.outcomeLabel} · {position.shareCount} shares
                    </strong>
                    <b>{position.stakeOz} Oz</b>
                    <small>{position.status.toUpperCase()}</small>
                    {position.status === "settleable" ? (
                      <button
                        className={styles.claim}
                        type="button"
                        onClick={() => claim(position)}
                      >
                        CLAIM RESULT
                      </button>
                    ) : (
                      <small>MAX {position.shareCount * 100} Oz</small>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <h2>MARKET RULES</h2>
            </div>
            <ul className={styles.rules}>
              <li>Each share costs the displayed probability in Oz.</li>
              <li>A winning share pays 100 Oz; losing shares pay 0 Oz.</li>
              <li>Voided markets refund the original stake.</li>
              <li>Official league results settle this local demo market.</li>
            </ul>
          </section>

          {hasLinkedFixture(market) ? (
            <Link href={`/matches/${market.matchId}#picks`} className={styles.primary}>
              VIEW LINKED MATCH →
            </Link>
          ) : null}
        </aside>
      </div>

      <PickTradeDrawer
        key={`${market.id}:${outcomeId ?? "closed"}`}
        market={outcomeId ? market : null}
        outcomeId={outcomeId}
        onClose={() => setOutcomeId(null)}
      />
      <SettlementReveal position={settled} onClose={() => setSettled(null)} />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function compact(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .toUpperCase();
}

function OddsChart({ market }: { market: PickMarket }) {
  const leader = leadingOutcome(market);
  const all = useMemo(() => market.priceHistory ?? [], [market.priceHistory]);
  const [range, setRange] = useState<"all" | "week" | "day">("all");
  const [selected, setSelected] = useState(Math.max(0, all.length - 1));
  const [expanded, setExpanded] = useState(false);
  const points = useMemo(
    () =>
      range === "day"
        ? all.slice(-3)
        : range === "week"
          ? all.slice(-4)
          : all,
    [all, range],
  );
  const values = points.length
    ? points.map(
        (point) =>
          point.percentsByOutcome[leader.id] ?? leader.probabilityPercent,
      )
    : [leader.probabilityPercent];
  const active = Math.min(selected, values.length - 1);

  const chooseRange = (next: "all" | "week" | "day") => {
    setRange(next);
    const length =
      next === "day"
        ? Math.min(3, all.length)
        : next === "week"
          ? Math.min(4, all.length)
          : all.length;
    setSelected(Math.max(0, length - 1));
  };

  const chart = (height: string) => (
    <InteractiveLineChart
      values={values}
      selectedIndex={selected}
      onSelectedIndexChange={setSelected}
      label={`${leader.label} odds history`}
      valueText={(value) => `${leader.label} ${value} percent`}
      height={height}
    />
  );

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <h2>ODDS HISTORY · {values[active]}%</h2>
        <div className={styles.ranges}>
          {(["all", "week", "day"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.range} ${range === item ? styles.filterActive : ""}`}
              onClick={() => chooseRange(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {chart("13.75rem")}

      <p className={styles.groupTitle} aria-live="polite">
        {leader.label}: {values[active]}% ·{" "}
        {points[active]
          ? new Date(points[active].at).toLocaleString("en", {
              month: "short",
              day: "numeric",
              hour: "numeric",
            })
          : "Latest"}
      </p>
      <button
        className={styles.expand}
        type="button"
        onClick={() => setExpanded(true)}
      >
        EXPAND CHART ↗
      </button>
      <ExpandedChart open={expanded} onClose={() => setExpanded(false)}>
        {chart("min(60dvh, 32rem)")}
      </ExpandedChart>
    </section>
  );
}

function ExpandedChart({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.chartDialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panelHeading}>
        <h2>EXPANDED ODDS HISTORY</h2>
        <button
          className={styles.iconButton}
          type="button"
          onClick={onClose}
          aria-label="Close expanded chart"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
