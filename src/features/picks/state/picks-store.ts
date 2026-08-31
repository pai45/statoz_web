"use client";

import { useSyncExternalStore } from "react";

import { outcomeFor, payoutForShares, sharesForStake, type PickMarket, type PickMarketStatus, type PickMarketType, type PickPosition } from "@/domain/predictions";
import type { Sport } from "@/domain/sports";
import { readEconomy, settleCoinReward, spendCoins } from "@/features/economy";
import { recordStreakActivity } from "@/features/streaks/activity";

import { pickMarketById, pickMarkets, picksDemoAnchor } from "@/mocks/picks";

export type PickSort = "new" | "start" | "closing" | "volume" | "trending";
export type PickStatusFilter = "all" | "open" | "closed";
export type PicksSnapshot = {
  version: 1; hydrated: boolean; positions: PickPosition[];
  typeFilter: PickMarketType | "all"; sportFilter: Sport | "all";
  leagueFilter: string; statusFilter: PickStatusFilter; sort: PickSort;
};
export type PlacePickResult = { ok: true; position: PickPosition } | { ok: false; reason: "market" | "outcome" | "closed" | "stake" | "insufficient" };

const storageKey = "statoz.picks.v1";
const listeners = new Set<() => void>();
const serverSnapshot: PicksSnapshot = Object.freeze({ version: 1, hydrated: false, positions: [], typeFilter: "all", sportFilter: "all", leagueFilter: "all", statusFilter: "open", sort: "start" });
let current: PicksSnapshot | null = null;

function seededPositions(): PickPosition[] {
  return [
    seed("demo-live", "ipl_pjk_rcb_winner", "rcb", 112, 2, "live"),
    seed("demo-unresolved", "ipl_opener_50", "yes", 124, 2, "unresolved"),
    seed("demo-win", "epl_mu_over_1_5", "over", 94, 2, "settleable"),
    seed("demo-loss", "epl_avl_bha_double_chance", "bha", 64, 2, "settleable"),
    seed("demo-void", "ipl_rain_delay", "yes", 70, 2, "settleable"),
  ].filter((position): position is PickPosition => Boolean(position));
}

function seed(id: string, marketId: string, outcomeId: string, stakeOz: number, shareCount: number, status: PickPosition["status"]): PickPosition | null {
  const market = pickMarketById(marketId); const outcome = market && outcomeFor(market, outcomeId);
  if (!market || !outcome) return null;
  return { id, marketId, marketQuestion: market.question, marketType: market.type ?? "event", leagueLabel: market.leagueLabel, outcomeId, outcomeLabel: outcome.label, stakeOz, shareCount, averageProbabilityPercent: stakeOz / shareCount, submittedAt: picksDemoAnchor, status, payoutOz: 0 };
}

function coercePositions(value: unknown): PickPosition[] {
  if (!Array.isArray(value)) return seededPositions();
  return value.filter((item): item is PickPosition => Boolean(item) && typeof item === "object" && typeof (item as PickPosition).id === "string" && typeof (item as PickPosition).marketId === "string");
}

function load(): PicksSnapshot {
  let positions = seededPositions();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) positions = coercePositions((JSON.parse(raw) as { positions?: unknown }).positions);
  } catch { /* Private mode keeps the in-memory demo. */ }
  return syncSnapshot({ ...serverSnapshot, hydrated: true, positions });
}

function syncPosition(position: PickPosition): PickPosition {
  if (position.status === "won" || position.status === "lost" || position.status === "voided") return position;
  const market = pickMarketById(position.marketId);
  if (!market) return position;
  if (market.status === "voided") return { ...position, status: "settleable", resultNote: market.voidReason };
  if (market.status === "settled") return { ...position, status: "settleable", resultNote: market.resultNote };
  if (market.status === "live") return { ...position, status: "live" };
  if (market.status === "unresolved" || market.status === "closed") return { ...position, status: "unresolved" };
  return { ...position, status: "pending" };
}

function syncSnapshot(snapshot: PicksSnapshot): PicksSnapshot { return { ...snapshot, positions: snapshot.positions.map(syncPosition) }; }
function getSnapshot(): PicksSnapshot { if (typeof window === "undefined") return serverSnapshot; current ??= load(); return current; }
function notify(): void { listeners.forEach((listener) => listener()); }
function write(next: PicksSnapshot): PicksSnapshot {
  current = syncSnapshot(next);
  try { window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, positions: current.positions })); } catch { /* Keep memory state. */ }
  notify(); return current;
}
function setFilters(patch: Partial<Pick<PicksSnapshot, "typeFilter" | "sportFilter" | "leagueFilter" | "statusFilter" | "sort">>): void { current = { ...getSnapshot(), ...patch }; notify(); }
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); if (!listeners.size && typeof window !== "undefined") window.removeEventListener("storage", onStorage); };
}
function onStorage(event: StorageEvent): void { if (event.key === storageKey || event.key === null) { current = load(); notify(); } }

export function usePicks(): PicksSnapshot { return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot); }
export function readPicks(): PicksSnapshot { return getSnapshot(); }
export function setTypeFilter(value: PicksSnapshot["typeFilter"]): void { setFilters({ typeFilter: value }); }
export function setSportFilter(value: PicksSnapshot["sportFilter"]): void { setFilters({ sportFilter: value }); }
export function setLeagueFilter(value: string): void { setFilters({ leagueFilter: value }); }
export function setStatusFilter(value: PickStatusFilter): void { setFilters({ statusFilter: value }); }
export function setPickSort(value: PickSort): void { setFilters({ sort: value }); }
export function resetFilters(): void { setFilters({ typeFilter: "all", sportFilter: "all", leagueFilter: "all", statusFilter: "all" }); }

function openStatus(status: PickMarketStatus | undefined): boolean { return status === "upcoming" || status === "live"; }
export function selectFilteredMarkets(snapshot: PicksSnapshot): PickMarket[] {
  const filtered = pickMarkets.filter((market) => {
    if (snapshot.typeFilter !== "all" && market.type !== snapshot.typeFilter) return false;
    if (snapshot.sportFilter !== "all" && market.sport !== snapshot.sportFilter) return false;
    if (snapshot.leagueFilter !== "all" && market.leagueId !== snapshot.leagueFilter) return false;
    if (snapshot.statusFilter === "open" && !openStatus(market.status)) return false;
    if (snapshot.statusFilter === "closed" && openStatus(market.status)) return false;
    return true;
  });
  const start = (market: PickMarket) => Date.parse(market.closesAt ?? "9999-12-31");
  return filtered.toSorted((a, b) => {
    if (snapshot.sort === "volume") return b.volumeOz - a.volumeOz;
    if (snapshot.sort === "trending") return Math.abs(b.outcomes[0]?.delta ?? 0) - Math.abs(a.outcomes[0]?.delta ?? 0);
    if (snapshot.sort === "new") return start(b) - start(a);
    return start(a) - start(b);
  });
}
export function selectPositionsForMarket(snapshot: PicksSnapshot, marketId: string): PickPosition[] { return snapshot.positions.filter((position) => position.marketId === marketId); }

export function placePick(input: { marketId: string; outcomeId: string; stakeOz: number }): PlacePickResult {
  const market = pickMarketById(input.marketId); if (!market) return { ok: false, reason: "market" };
  const outcome = outcomeFor(market, input.outcomeId); if (!outcome) return { ok: false, reason: "outcome" };
  if (market.status !== "upcoming" && market.status !== "live") return { ok: false, reason: "closed" };
  const shares = sharesForStake(input.stakeOz, outcome.probabilityPercent); if (!shares) return { ok: false, reason: "stake" };
  if (readEconomy().coins < input.stakeOz) return { ok: false, reason: "insufficient" };
  const paid = spendCoins({ id: `pick-${market.id}-${outcome.id}`, coins: input.stakeOz, title: "PICK STAKE", subtitle: `${outcome.label} · ${market.leagueLabel}` });
  if (!paid.ok) return { ok: false, reason: "insufficient" };
  const snapshot = getSnapshot(); const existing = snapshot.positions.find((position) => position.marketId === market.id && position.outcomeId === outcome.id && !["won", "lost", "voided"].includes(position.status));
  const position: PickPosition = existing ? { ...existing, stakeOz: existing.stakeOz + input.stakeOz, shareCount: existing.shareCount + shares, averageProbabilityPercent: (existing.stakeOz + input.stakeOz) / (existing.shareCount + shares), submittedAt: new Date().toISOString() } : { id: `pick-${market.id}-${outcome.id}-${Date.now()}`, marketId: market.id, marketQuestion: market.question, marketType: market.type ?? "event", leagueLabel: market.leagueLabel, outcomeId: outcome.id, outcomeLabel: outcome.label, stakeOz: input.stakeOz, shareCount: shares, averageProbabilityPercent: outcome.probabilityPercent, submittedAt: new Date().toISOString(), status: market.status === "live" ? "live" : "pending", payoutOz: 0 };
  write({ ...snapshot, positions: existing ? snapshot.positions.map((item) => item.id === existing.id ? position : item) : [position, ...snapshot.positions] });
  recordStreakActivity("pick", new Date(position.submittedAt));
  return { ok: true, position };
}

export function settlePosition(positionId: string): PickPosition | null {
  const snapshot = getSnapshot(); const position = snapshot.positions.find((item) => item.id === positionId); if (!position || position.status !== "settleable") return null;
  const market = pickMarketById(position.marketId); if (!market || (market.status !== "settled" && market.status !== "voided")) return null;
  const won = market.status === "settled" && market.resolvedOutcomeId === position.outcomeId;
  const payoutOz = market.status === "voided" ? position.stakeOz : won ? payoutForShares(position.shareCount) : 0;
  if (payoutOz > 0) settleCoinReward({ id: `pick-payout:${position.id}`, coins: payoutOz, title: market.status === "voided" ? "PICK REFUND" : "PICK WON", subtitle: position.marketQuestion });
  const settled: PickPosition = { ...position, status: market.status === "voided" ? "voided" : won ? "won" : "lost", payoutOz, resolvedAt: new Date().toISOString(), resultNote: market.resultNote ?? market.voidReason };
  write({ ...snapshot, positions: snapshot.positions.map((item) => item.id === settled.id ? settled : item) }); return settled;
}
