"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { leadingOutcome, marketCanBuy, type PickMarket, type PickPosition } from "@/domain/predictions";
import { useAuthSession, useRequireAuth } from "@/features/auth";

import { hasLinkedFixture } from "@/mocks/picks";
import { selectPositionsForMarket, settlePosition, usePicks } from "../state/picks-store";
import { PickTradeDrawer } from "./pick-drawers";
import { SettlementReveal } from "./settlement-reveal";
import styles from "./picks.module.css";

export function MarketDetailScreen({ market }: { market: PickMarket }) {
  const picks = usePicks(); const session = useAuthSession(); const requireAuth = useRequireAuth();
  const positions = session.isAuthenticated ? selectPositionsForMarket(picks, market.id) : [];
  const leader = leadingOutcome(market); const [outcomeId,setOutcomeId] = useState<string|null>(null); const [settled,setSettled] = useState<PickPosition|null>(null);
  const openTrade = (id: string) => { if (!requireAuth({ intent:"lock a pick", message:"Log in to buy shares and save this pick." })) return; setOutcomeId(id); };
  const claim = (position: PickPosition) => { if (!requireAuth({ intent:"claim a pick", message:"Log in to claim your result." })) return; const result=settlePosition(position.id); if(result) setSettled(result); };
  return <main className={styles.detail}>
    <Link href="/picks" className={styles.back}>← ALL PICKS</Link>
    <div className={styles.detailGrid}><div className={styles.detailMain}>
      <section className={styles.panel}><span className={styles.plate}>{market.leagueLabel}</span><h1 className={styles.detailQuestion}>{market.question}</h1><p className={styles.groupTitle}>{(market.type ?? "event").toUpperCase()} · {(market.status ?? "upcoming").toUpperCase()}</p><div className={styles.metrics}><Metric label="LEADING" value={`${leader.probabilityPercent}%`}/><Metric label="VOLUME" value={`${compact(market.volumeOz)} OZ`}/><Metric label="OUTCOMES" value={String(market.outcomes.length)}/></div></section>
      {(market.contextTitle || market.homeLabel) ? <section className={`${styles.panel} ${styles.score}`}><div><strong>{market.homeLabel ?? market.contextTitle}</strong><strong className={styles.scoreBig}>{market.homeScore ?? "—"}</strong></div><div><span className={styles.tag}>{market.liveLabel ?? (market.status === "settled" ? "FT" : "VS")}</span><small>{market.contextSubtitle}</small></div><div><strong>{market.awayLabel ?? ""}</strong><strong className={styles.scoreBig}>{market.awayScore ?? "—"}</strong></div></section> : null}
      <OddsChart market={market}/>
    </div><aside className={styles.detailSide}>
      <section className={styles.panel}><div className={styles.panelHeading}><h2>OUTCOMES</h2><span className={styles.groupTitle}>{marketCanBuy(market) ? "MARKET OPEN" : "MARKET UNAVAILABLE"}</span></div><div className={styles.outcomeRows}>{market.outcomes.map((outcome) => { const held=positions.some((position)=>position.outcomeId===outcome.id); return <div className={styles.outcomeRow} key={outcome.id}><span><strong>{outcome.label}</strong>{held?<small> · BACKED</small>:null}</span><b>{outcome.probabilityPercent} Oz</b><button type="button" disabled={!marketCanBuy(market)} onClick={()=>openTrade(outcome.id)}>{marketCanBuy(market)?"BACK":"CLOSED"}</button></div>; })}</div></section>
      {positions.length ? <section className={styles.panel}><div className={styles.panelHeading}><h2>YOUR TICKETS</h2></div><div className={styles.tickets}>{positions.map((position)=><div className={styles.ticket} key={position.id}><strong>{position.outcomeLabel} · {position.shareCount} shares</strong><b>{position.stakeOz} Oz</b><small>{position.status.toUpperCase()}</small>{position.status === "settleable"?<button className={styles.claim} type="button" onClick={()=>claim(position)}>CLAIM RESULT</button>:<small>MAX {position.shareCount*100} Oz</small>}</div>)}</div></section>:null}
      <section className={styles.panel}><div className={styles.panelHeading}><h2>MARKET RULES</h2></div><ul className={styles.rules}><li>Each share costs the displayed probability in Oz.</li><li>A winning share pays 100 Oz; losing shares pay 0 Oz.</li><li>Voided markets refund the original stake.</li><li>Official league results settle this local demo market.</li></ul></section>
      {hasLinkedFixture(market)?<Link href={`/matches/${market.matchId}#picks`} className={styles.primary}>VIEW LINKED MATCH →</Link>:null}
    </aside></div>
    <PickTradeDrawer key={`${market.id}:${outcomeId ?? "closed"}`} market={outcomeId?market:null} outcomeId={outcomeId} onClose={()=>setOutcomeId(null)}/><SettlementReveal position={settled} onClose={()=>setSettled(null)}/>
  </main>;
}

function Metric({label,value}:{label:string;value:string}) { return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>; }
function compact(value:number):string { return new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(value).toUpperCase(); }

function OddsChart({ market }: { market: PickMarket }) {
  const leader=leadingOutcome(market); const all=useMemo(()=>market.priceHistory ?? [],[market.priceHistory]); const [range,setRange]=useState<"all"|"week"|"day">("all"); const [selected,setSelected]=useState(Math.max(0,all.length-1)); const [expanded,setExpanded]=useState(false);
  const points=useMemo(()=>range === "day" ? all.slice(-3) : range === "week" ? all.slice(-4) : all,[all,range]);
  const values=points.map((point)=>point.percentsByOutcome[leader.id] ?? leader.probabilityPercent); const path=values.map((value,index)=>`${index?"L":"M"} ${values.length===1?50:index/(values.length-1)*100} ${100-value}`).join(" "); const active=Math.min(selected,Math.max(0,values.length-1));
  const scrub=(clientX:number,element:SVGSVGElement)=>{const rect=element.getBoundingClientRect();setSelected(Math.max(0,Math.min(values.length-1,Math.round(((clientX-rect.left)/rect.width)*(values.length-1)))))};
  const chart=<svg className={styles.chart} viewBox="0 0 100 100" preserveAspectRatio="none" tabIndex={0} role="slider" aria-label={`${leader.label} odds history`} aria-valuemin={0} aria-valuemax={Math.max(0,values.length-1)} aria-valuenow={active} aria-valuetext={`${leader.label} ${values[active] ?? leader.probabilityPercent} percent`} onPointerMove={(event)=>{if(event.buttons || event.pointerType==="touch") scrub(event.clientX,event.currentTarget)}} onPointerDown={(event)=>{event.currentTarget.setPointerCapture(event.pointerId);scrub(event.clientX,event.currentTarget)}} onKeyDown={(event)=>{if(event.key==="ArrowLeft"){event.preventDefault();setSelected((value)=>Math.max(0,value-1))}if(event.key==="ArrowRight"){event.preventDefault();setSelected((value)=>Math.min(values.length-1,value+1))}}}>{[25,50,75].map((y)=><line key={y} x1="0" x2="100" y1={y} y2={y} className={styles.chartGrid}/>) }<path d={path} className={styles.chartLine}/>{values.length?<circle cx={values.length===1?50:active/(values.length-1)*100} cy={100-values[active]} r="2.4" className={styles.chartDot}/>:null}</svg>;
  const chooseRange=(next:"all"|"week"|"day")=>{setRange(next);const length=next==="day"?Math.min(3,all.length):next==="week"?Math.min(4,all.length):all.length;setSelected(Math.max(0,length-1))};
  return <section className={styles.panel}><div className={styles.panelHeading}><h2>ODDS HISTORY · {values[active] ?? leader.probabilityPercent}%</h2><div className={styles.ranges}>{(["all","week","day"] as const).map((item)=><button key={item} type="button" className={`${styles.range} ${range===item?styles.filterActive:""}`} onClick={()=>chooseRange(item)}>{item.toUpperCase()}</button>)}</div></div>{chart}<p className={styles.groupTitle} aria-live="polite">{leader.label}: {values[active] ?? leader.probabilityPercent}% · {points[active]?new Date(points[active].at).toLocaleString("en",{month:"short",day:"numeric",hour:"numeric"}):"Latest"}</p><button className={styles.expand} type="button" onClick={()=>setExpanded(true)}>EXPAND CHART ↗</button><ExpandedChart open={expanded} onClose={()=>setExpanded(false)}>{chart}</ExpandedChart></section>;
}

function ExpandedChart({open,onClose,children}:{open:boolean;onClose:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null); useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();if(!open&&dialog.open)dialog.close()},[open]);
  return <dialog ref={ref} className={styles.chartDialog} onCancel={(event)=>{event.preventDefault();onClose()}} onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose()}}><div className={styles.panelHeading}><h2>EXPANDED ODDS HISTORY</h2><button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close expanded chart">×</button></div>{children}</dialog>;
}
