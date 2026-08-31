"use client";

import { useState } from "react";

import { AdaptiveDrawer } from "@/design-system";
import { sharesForStake, type PickMarket } from "@/domain/predictions";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { useEconomy } from "@/features/economy";

import { placePick, resetFilters, setLeagueFilter, setPickSort, setSportFilter, setStatusFilter, type PicksSnapshot } from "../state/picks-store";
import styles from "./picks.module.css";

export function PicksSettingsDrawer({ open, onClose, picks }: { open: boolean; onClose: () => void; picks: PicksSnapshot }) {
  return <AdaptiveDrawer open={open} onClose={onClose} title="FILTER & SORT"><div className={styles.drawerBody}>
    <ChoiceGroup label="LEAGUE" value={picks.leagueFilter} options={[['all','All'],['ipl','IPL'],['epl','EPL'],['fifa','FIFA'],['nba','NBA'],['laliga','LaLiga'],['serie-a','Serie A']]} onChange={setLeagueFilter} />
    <ChoiceGroup label="SPORT" value={picks.sportFilter} options={[['all','All'],['football','Football'],['cricket','Cricket'],['basketball','Basketball'],['tennis','Tennis'],['motorsport','Racing']]} onChange={(value) => setSportFilter(value as PicksSnapshot['sportFilter'])} />
    <ChoiceGroup label="STATUS" value={picks.statusFilter} options={[['all','All'],['open','Open'],['closed','Closed']]} onChange={(value) => setStatusFilter(value as PicksSnapshot['statusFilter'])} />
    <ChoiceGroup label="SORT" value={picks.sort} options={[['new','New'],['start','Start Time'],['closing','Closing'],['volume','Volume'],['trending','Trending']]} onChange={(value) => setPickSort(value as PicksSnapshot['sort'])} />
  </div><div className={styles.drawerFooter}><button className={styles.secondary} type="button" onClick={resetFilters}>CLEAR FILTERS</button><button className={styles.primary} type="button" onClick={onClose}>SHOW PICKS</button></div></AdaptiveDrawer>;
}

function ChoiceGroup({ label, value, options, onChange }: { label: string; value: string; options: [string,string][]; onChange: (value: string) => void }) {
  return <section className={styles.group}><h3 className={styles.groupTitle}>{label}</h3><div className={styles.choiceGrid}>{options.map(([id,text]) => <button key={id} type="button" onClick={() => onChange(id)} className={`${styles.filter} ${value === id ? styles.filterActive : ''}`} aria-pressed={value === id}>{text}</button>)}</div></section>;
}

export function PickTradeDrawer({ market, outcomeId, onClose }: { market: PickMarket | null; outcomeId: string | null; onClose: () => void }) {
  const outcome = market?.outcomes.find((item) => item.id === outcomeId);
  const price = outcome?.probabilityPercent ?? 1;
  const economy = useEconomy(); const session = useAuthSession(); const requireAuth = useRequireAuth();
  const [stakeText, setStakeText] = useState(String(price)); const [submitting, setSubmitting] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState("");
  const stake = Number(stakeText); const shares = sharesForStake(stake, price); const maxStake = Math.floor(economy.coins / price) * price;
  const reason = !Number.isInteger(stake) || stake <= 0 ? "Enter a whole-number stake" : stake > economy.coins ? "Insufficient Oz balance" : stake % price !== 0 ? `Stake must be a multiple of ${price} Oz` : "";
  const setMultiple = (multiple: number | "max") => setStakeText(String(multiple === "max" ? maxStake : price * multiple));
  const submit = () => {
    if (!market || !outcome || submitting || reason) { setError(reason); return; }
    if (session.status !== "authenticated") { requireAuth({ intent: "lock a pick", message: "Log in to buy shares and save this pick." }); return; }
    setSubmitting(true); const result = placePick({ marketId: market.id, outcomeId: outcome.id, stakeOz: stake });
    if (!result.ok) { setSubmitting(false); setError(result.reason === "insufficient" ? "Insufficient Oz balance" : "This pick could not be placed"); return; }
    setSuccess(true); window.setTimeout(() => { setSuccess(false); setSubmitting(false); onClose(); }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1850);
  };
  return <AdaptiveDrawer open={Boolean(market && outcome)} onClose={() => { if (!submitting) onClose(); }} title="BACK YOUR PICK"><div className={styles.drawerBody}>
    <div className={styles.tradeHero}><span>{market?.question}</span><strong>{outcome?.label} · {price} Oz/share</strong></div>
    <section className={styles.group}><h3 className={styles.groupTitle}>STAKE</h3><div className={styles.stakeControl}><button type="button" className={styles.stepper} onClick={() => setStakeText(String(Math.max(price, (Number(stakeText) || price) - price)))}>−</button><input className={styles.stakeInput} inputMode="numeric" value={stakeText} onChange={(event) => setStakeText(event.target.value.replace(/\D/g,""))} aria-label="Stake in Oz"/><button type="button" className={styles.stepper} onClick={() => setStakeText(String((Number(stakeText) || 0) + price))}>+</button></div><div className={styles.presets}>{([1,5,10,"max"] as const).map((value) => <button type="button" className={styles.preset} key={value} onClick={() => setMultiple(value)}>{value === "max" ? "MAX" : `${value}×`}</button>)}</div></section>
    <div className={styles.calcs}><div className={styles.calc}><span>SHARES</span><strong>{shares}</strong></div><div className={styles.calc}><span>MAX PAYOUT</span><strong>{shares * 100} Oz</strong></div><div className={styles.calc}><span>BALANCE</span><strong>{economy.coins} Oz</strong></div></div>
    <p className={styles.error} role="alert">{error || reason}</p><button className={styles.primary} type="button" disabled={Boolean(reason) || submitting} onClick={submit}>{submitting ? "LOCKING…" : `BACK ${outcome?.label ?? "PICK"}`}</button>
  </div>{success ? <div className={styles.success} role="status"><div><strong>PICK LOCKED</strong><span>{shares} shares · {stake} Oz</span></div></div> : null}</AdaptiveDrawer>;
}
