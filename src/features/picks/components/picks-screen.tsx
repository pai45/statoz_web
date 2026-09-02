"use client";

import { useState } from "react";

import type { PickMarket, PickPosition } from "@/domain/predictions";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { HowToPlayButton } from "@/features/how-to-play";

import { selectFilteredMarkets, selectPositionsForMarket, setTypeFilter, settlePosition, usePicks } from "../state/picks-store";
import { PickMarketCard } from "./pick-market-card";
import { PickTradeDrawer, PicksSettingsDrawer } from "./pick-drawers";
import { SettlementReveal } from "./settlement-reveal";
import styles from "./picks.module.css";

export function PicksScreen() {
  const picks = usePicks(); const session = useAuthSession(); const requireAuth = useRequireAuth();
  const markets = selectFilteredMarkets(picks); const [settings, setSettings] = useState(false); const [trade, setTrade] = useState<{ market: PickMarket; outcomeId: string } | null>(null); const [settled, setSettled] = useState<PickPosition | null>(null);
  const openTrade = (market: PickMarket, outcomeId: string) => { if (!requireAuth({ intent: "lock a pick", message: "Log in to buy shares and save your picks." })) return; setTrade({ market, outcomeId }); };
  const claim = (position: PickPosition) => { if (!requireAuth({ intent: "claim a pick", message: "Log in to claim your pick result." })) return; const result = settlePosition(position.id); if (result) setSettled(result); };
  return <main className={styles.page}>
    <div className={styles.header}><h1 className={styles.title}>ALL PICKS</h1><div className={styles.headerActions}><HowToPlayButton mode="pick"/><button type="button" className={styles.iconButton} aria-label="Filter and sort picks" onClick={() => setSettings(true)}>☷</button></div></div>
    <nav className={styles.filters} aria-label="Pick types">{([['all','ALL'],['match','MATCHES'],['event','EVENT'],['future','FUTURES']] as const).map(([id,label]) => <button type="button" key={id} className={`${styles.filter} ${picks.typeFilter === id ? styles.filterActive : ''}`} aria-pressed={picks.typeFilter === id} onClick={() => setTypeFilter(id)}>{label}</button>)}</nav>
    {!picks.hydrated ? <div className={styles.grid} aria-label="Loading picks">{[0,1,2].map((item) => <div className={styles.empty} key={item}>LOADING MARKET…</div>)}</div> : markets.length ? <div className={styles.grid}>{markets.map((market) => <PickMarketCard key={market.id} market={market} positions={session.isAuthenticated ? selectPositionsForMarket(picks,market.id) : []} onPick={openTrade} onClaim={claim}/>)}</div> : <div className={styles.empty}><div><strong>NO MARKETS FOUND</strong><p>Adjust or clear your filters to see more picks.</p></div></div>}
    <PicksSettingsDrawer open={settings} onClose={() => setSettings(false)} picks={picks}/><PickTradeDrawer key={`${trade?.market.id ?? "closed"}:${trade?.outcomeId ?? "none"}`} market={trade?.market ?? null} outcomeId={trade?.outcomeId ?? null} onClose={() => setTrade(null)}/><SettlementReveal position={settled} onClose={() => setSettled(null)}/>
  </main>;
}
