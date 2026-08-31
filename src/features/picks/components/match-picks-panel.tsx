"use client";

import Link from "next/link";
import { useState } from "react";

import type { PickMarket, PickPosition } from "@/domain/predictions";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { pickMarketsForMatch } from "@/mocks/picks";

import {
  selectPositionsForMarket,
  settlePosition,
  usePicks,
} from "../state/picks-store";
import { PickTradeDrawer } from "./pick-drawers";
import { PickMarketCard } from "./pick-market-card";
import { SettlementReveal } from "./settlement-reveal";
import styles from "./picks.module.css";

export function MatchPicksPanel({ matchId }: { matchId: string }) {
  const markets = pickMarketsForMatch(matchId);
  const picks = usePicks();
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const [trade, setTrade] = useState<{
    market: PickMarket;
    outcomeId: string;
  } | null>(null);
  const [settled, setSettled] = useState<PickPosition | null>(null);

  function open(market: PickMarket, outcomeId: string) {
    if (!requireAuth({
      intent: "lock a pick",
      message: "Log in to buy shares and save this pick.",
    })) return;
    setTrade({ market, outcomeId });
  }

  function claim(position: PickPosition) {
    if (!requireAuth({
      intent: "claim a pick",
      message: "Log in to claim your pick result.",
    })) return;
    const result = settlePosition(position.id);
    if (result) setSettled(result);
  }

  return (
    <div className={styles.matchPanel}>
      <Link href="/picks" className={styles.matchHeader}>
        <span className={styles.matchHeaderIcon} aria-hidden>◎</span>
        <span>
          <strong>VIEW ALL PICKS</strong>
          <small>Browse every open market</small>
        </span>
        <b aria-hidden>›</b>
      </Link>

      {markets.length ? (
        <div className={styles.grid}>
          {markets.map((market) => (
            <PickMarketCard
              key={market.id}
              market={market}
              positions={session.isAuthenticated
                ? selectPositionsForMarket(picks, market.id)
                : []}
              onPick={open}
              onClaim={claim}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          NO PICK MARKET IS OPEN FOR THIS FIXTURE.
          <br />
          VIEW ALL PICKS TO FIND ANOTHER EDGE.
        </div>
      )}

      <PickTradeDrawer
        key={`${trade?.market.id ?? "closed"}:${trade?.outcomeId ?? "none"}`}
        market={trade?.market ?? null}
        outcomeId={trade?.outcomeId ?? null}
        onClose={() => setTrade(null)}
      />
      <SettlementReveal position={settled} onClose={() => setSettled(null)} />
    </div>
  );
}
