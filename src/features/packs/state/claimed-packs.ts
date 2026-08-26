"use client";

import { useSyncExternalStore } from "react";

import type { Sport } from "@/domain/sports";

import type { PackRevealData } from "../types";

/** What one sport's starter pack granted, recorded when its reveal finishes. */
export type PackClaim = {
  claimedAt: string;
  playerCardIds: string[];
  actionCardIds: string[];
};

export type ClaimedPacks = Partial<Record<Sport, PackClaim>>;

const storageKey = "statoz.packs.v1";

/** The snapshot before anything is known — and the one the server always sees. */
const nothingClaimed: ClaimedPacks = Object.freeze({});

/**
 * `useSyncExternalStore` compares snapshots by reference, so the parsed value is
 * cached and only replaced when the stored text actually changes. Returning a
 * fresh object every read would re-render forever.
 */
let cachedRaw: string | null = null;
let cachedValue: ClaimedPacks = nothingClaimed;

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // A private window can refuse storage outright. Nothing is claimed, then.
    return null;
  }
}

function getSnapshot(): ClaimedPacks {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  if (!raw) {
    cachedValue = nothingClaimed;
    return cachedValue;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    cachedValue =
      parsed && typeof parsed === "object" ? (parsed as ClaimedPacks) : nothingClaimed;
  } catch {
    // Unreadable state is treated as no state rather than crashing the route.
    cachedValue = nothingClaimed;
  }
  return cachedValue;
}

function getServerSnapshot(): ClaimedPacks {
  return nothingClaimed;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab opening a pack should settle this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: ClaimedPacks): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage may be full or blocked; the claim is lost, the session is not.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

const neverChanges = () => () => {};

/**
 * False on the server and through the first client render, true afterwards.
 *
 * A page that rolls a pack needs this: a roll during render would produce one
 * pack on the server and a different one in the browser, and React would report
 * the mismatch. Waiting for hydration means the roll only ever happens once, in
 * the browser.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

/** Every pack this browser has opened. */
export function useClaimedPacks(): ClaimedPacks {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Whether this sport's starter pack has been opened.
 *
 * False on the server and on the first client render, so a page gated on this
 * must not render the reveal until it has hydrated — see `GameLauncher`.
 */
export function useIsPackClaimed(sport: Sport): boolean {
  return useClaimedPacks()[sport] !== undefined;
}

/** Records the pack a sport just handed over, cards included. */
export function claimPack(sport: Sport, reveal: PackRevealData): void {
  const current = getSnapshot();
  if (current[sport]) return;

  write({
    ...current,
    [sport]: {
      claimedAt: new Date().toISOString(),
      playerCardIds: reveal.playerCards.map((card) => card.id),
      actionCardIds: reveal.actionCards.map((card) => card.id),
    },
  });
}

/** Forgets every claim. Exists so the reveal can be seen again. */
export function resetClaimedPacks(): void {
  write({});
}
