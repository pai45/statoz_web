"use client";

import { useSyncExternalStore } from "react";

import type { Sport } from "@/domain/sports";
import type { PlayerRole } from "@/domain/cards";
import { readEconomy, useEconomy } from "@/features/economy";

import type { DeckSnapshot, LoadoutFor, SportLoadout } from "../types";

const storageKey = "statoz.decks.v1";
const emptyDecks: DeckSnapshot = Object.freeze({ version: 1, loadouts: {} });
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: DeckSnapshot = emptyDecks;

function stringList(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))].slice(
        0,
        limit,
      )
    : [];
}

function coerceLoadout(sport: Sport, value: unknown): SportLoadout | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (sport === "football") {
    return {
      sport,
      attackers: stringList(record.attackers, 2),
      defenders: stringList(record.defenders, 2),
      keeperId: typeof record.keeperId === "string" ? record.keeperId : null,
      actionCardIds: stringList(record.actionCardIds, 6),
    };
  }
  if (sport === "cricket") {
    return { sport, batterIds: stringList(record.batterIds, 5) };
  }
  if (sport === "basketball") {
    const playerIds = stringList(record.playerIds, 3);
    const starter =
      typeof record.starterId === "string" && playerIds.includes(record.starterId)
        ? record.starterId
        : playerIds[0] ?? null;
    return { sport, playerIds, starterId: starter };
  }
  if (sport === "tennis") {
    return {
      sport,
      playerId: typeof record.playerId === "string" ? record.playerId : null,
    };
  }
  return {
    sport,
    driverId: typeof record.driverId === "string" ? record.driverId : null,
  };
}

function coerce(value: unknown): DeckSnapshot {
  if (!value || typeof value !== "object") return emptyDecks;
  const record = value as Record<string, unknown>;
  const source =
    record.loadouts && typeof record.loadouts === "object"
      ? (record.loadouts as Record<string, unknown>)
      : {};
  const loadouts: DeckSnapshot["loadouts"] = {};
  for (const sport of [
    "football",
    "cricket",
    "basketball",
    "tennis",
    "motorsport",
  ] as const) {
    const loadout = coerceLoadout(sport, source[sport]);
    if (loadout) Object.assign(loadouts, { [sport]: loadout });
  }
  return { version: 1, loadouts };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function claimSeeded(snapshot: DeckSnapshot): DeckSnapshot {
  const economy = readEconomy();
  const loadouts = { ...snapshot.loadouts };
  let changed = false;
  for (const sport of [
    "football",
    "cricket",
    "basketball",
    "tennis",
    "motorsport",
  ] as const) {
    const claim = economy.starterClaims[sport];
    if (!loadouts[sport] && claim) {
      Object.assign(loadouts, {
        [sport]: loadoutFromClaim(
          sport,
          claim.playerCardIds,
          claim.actionCardIds,
        ),
      });
      changed = true;
    }
  }
  return changed ? { version: 1, loadouts } : snapshot;
}

function getSnapshot(): DeckSnapshot {
  const raw = readRaw();
  if (raw === cachedRaw) {
    cachedValue = claimSeeded(cachedValue);
    return cachedValue;
  }
  cachedRaw = raw;
  try {
    cachedValue = claimSeeded(raw ? coerce(JSON.parse(raw)) : emptyDecks);
  } catch {
    cachedValue = claimSeeded(emptyDecks);
  }
  return cachedValue;
}

function notify(): void {
  cachedRaw = null;
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: DeckSnapshot): DeckSnapshot {
  const safe = coerce(next);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(safe));
  } catch {
    cachedValue = safe;
  }
  notify();
  return safe;
}

export function useDecks(): DeckSnapshot {
  // Economy changes may introduce a newly claimed starter pack.
  useEconomy();
  return useSyncExternalStore(subscribe, getSnapshot, () => emptyDecks);
}

export function readDecks(): DeckSnapshot {
  if (typeof window === "undefined") return emptyDecks;
  return getSnapshot();
}

export function saveLoadout<S extends Sport>(
  sport: S,
  loadout: LoadoutFor<S>,
): DeckSnapshot {
  const current = readDecks();
  return write({
    version: 1,
    loadouts: { ...current.loadouts, [sport]: loadout },
  });
}

export function seedLoadoutFromClaim(
  sport: Sport,
  playerCardIds: string[],
  actionCardIds: string[] = [],
): DeckSnapshot {
  const current = readDecks();
  if (current.loadouts[sport]) return current;
  return write({
    version: 1,
    loadouts: {
      ...current.loadouts,
      [sport]: loadoutFromClaim(sport, playerCardIds, actionCardIds),
    },
  });
}

export function loadoutFromClaim(
  sport: Sport,
  players: string[],
  actions: string[] = [],
): SportLoadout {
  if (sport === "football") {
    return {
      sport,
      attackers: players.slice(0, 2),
      defenders: players.slice(2, 4),
      keeperId: players[4] ?? null,
      actionCardIds: actions.slice(0, 6),
    };
  }
  if (sport === "cricket") return { sport, batterIds: players.slice(0, 5) };
  if (sport === "basketball") {
    const playerIds = players.slice(0, 3);
    return { sport, playerIds, starterId: playerIds[0] ?? null };
  }
  if (sport === "tennis") return { sport, playerId: players[0] ?? null };
  return { sport, driverId: players[0] ?? null };
}

export function isLoadoutComplete(loadout: SportLoadout | undefined): boolean {
  if (!loadout) return false;
  if (loadout.sport === "football") {
    return (
      loadout.attackers.length === 2 &&
      loadout.defenders.length === 2 &&
      loadout.keeperId !== null &&
      loadout.actionCardIds.length === 6
    );
  }
  if (loadout.sport === "cricket") return loadout.batterIds.length === 5;
  if (loadout.sport === "basketball") {
    return (
      loadout.playerIds.length === 3 &&
      loadout.starterId !== null &&
      loadout.playerIds.includes(loadout.starterId)
    );
  }
  if (loadout.sport === "tennis") return loadout.playerId !== null;
  return loadout.driverId !== null;
}

export function validateLoadout(
  loadout: SportLoadout | undefined,
  inventory: {
    playerCardIds: string[];
    actionCardIds: string[];
    roles?: Partial<Record<string, PlayerRole>>;
  },
): string[] {
  if (!loadout) return ["No loadout has been saved."];
  const errors: string[] = [];
  const players = loadout.sport === "football"
    ? [...loadout.attackers, ...loadout.defenders, ...(loadout.keeperId ? [loadout.keeperId] : [])]
    : loadout.sport === "cricket" ? loadout.batterIds
      : loadout.sport === "basketball" ? loadout.playerIds
        : loadout.sport === "tennis" ? (loadout.playerId ? [loadout.playerId] : [])
          : loadout.driverId ? [loadout.driverId] : [];
  if (!isLoadoutComplete(loadout)) errors.push("Fill every required slot.");
  if (new Set(players).size !== players.length) errors.push("A player can only occupy one slot.");
  if (players.some((id) => !inventory.playerCardIds.includes(id))) errors.push("Remove cards that are no longer owned.");

  if (loadout.sport === "football") {
    if (new Set(loadout.actionCardIds).size !== loadout.actionCardIds.length) errors.push("Action cards cannot repeat.");
    if (loadout.actionCardIds.some((id) => !inventory.actionCardIds.includes(id))) errors.push("Remove action cards that are no longer owned.");
    if (loadout.attackers.some((id) => inventory.roles?.[id] !== "attacker")) errors.push("Attacker slots require attacker cards.");
    if (loadout.defenders.some((id) => inventory.roles?.[id] !== "defender")) errors.push("Defender slots require defender cards.");
    if (loadout.keeperId && inventory.roles?.[loadout.keeperId] !== "goalkeeper") errors.push("The keeper slot requires a goalkeeper.");
  }
  if (loadout.sport === "cricket" && loadout.batterIds.some((id) => inventory.roles?.[id] !== "batsman")) errors.push("The cricket lineup accepts batters only.");
  if (loadout.sport === "basketball") {
    const required: PlayerRole[] = ["basketballGuard", "basketballWing", "basketballBig"];
    if (loadout.playerIds.some((id, index) => inventory.roles?.[id] !== required[index])) errors.push("Select one guard, one wing, and one big.");
  }
  if (loadout.sport === "tennis" && loadout.playerId && inventory.roles?.[loadout.playerId] !== "tennisSingles") errors.push("Select a tennis athlete.");
  if (loadout.sport === "motorsport" && loadout.driverId && !["f1Driver", "f2Driver", "nascarDriver", "indycarDriver"].includes(inventory.roles?.[loadout.driverId] ?? "")) errors.push("Select a motorsport driver.");
  return [...new Set(errors)];
}
