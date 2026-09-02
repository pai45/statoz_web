"use client";

import type { CSSProperties } from "react";

import { accentVar, Button, Glyph, hudChamferPath, withAlpha } from "@/design-system";

import {
  lobbyEnterMs,
  lobbyHeroDelayMs,
  lobbyPlayDelayMs,
  lobbyTiersDelayMs,
} from "../constants";
import { finalOverKits } from "../data/kits";
import { winRate, type FinalOverStats } from "../state/final-over-progress";
import {
  finalOverTiers,
  tierBlurbs,
  tierLabels,
  tierRange,
  type FinalOverTier,
} from "../tuning";

import styles from "./final-over.module.css";

/**
 * The lobby — the web port of `final_over_hub.dart`.
 *
 * The lobby gates on the active five-batter deck and exposes globally owned
 * kits, preserving Flutter's information hierarchy in the responsive shell.
 */

export type FinalOverLobbyProps = {
  stats: FinalOverStats;
  tier: FinalOverTier;
  kitId: string;
  ownedKitIds: string[];
  squadReady: boolean;
  backHref: string;
  onTierChange: (tier: FinalOverTier) => void;
  onKitChange: (kitId: string) => void;
  onPlay: () => void;
};

function delayed(delay: number): CSSProperties {
  return { "--lobby-delay": `${delay}ms` } as CSSProperties;
}

export function FinalOverLobby({
  stats,
  tier,
  kitId,
  ownedKitIds,
  squadReady,
  backHref,
  onTierChange,
  onKitChange,
  onPlay,
}: FinalOverLobbyProps) {
  const cyan = accentVar("cyan");

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-95 flex-1 flex-col gap-4 px-5 pb-6 pt-4 md:max-w-120">
        <div className={styles.lobbyIn} style={delayed(0)}>
          <StatusBar />
        </div>

        <div className={styles.lobbyIn} style={delayed(lobbyHeroDelayMs)}>
          <HeroRow tier={tier} />
        </div>

        <div className={styles.lobbyIn} style={delayed(lobbyTiersDelayMs)}>
          <SectionLabel>CHASE TIER</SectionLabel>
          <div className="mt-2 flex gap-2">
            {finalOverTiers.map((option) => (
              <TierTile
                key={option}
                tier={option}
                selected={option === tier}
                onSelect={() => onTierChange(option)}
              />
            ))}
          </div>
        </div>

        <div className={styles.lobbyIn} style={delayed(lobbyTiersDelayMs + 40)}>
          <SectionLabel>KIT</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {finalOverKits.map((kit) => (
              <button
                key={kit.id}
                type="button"
                onClick={() => onKitChange(kit.id)}
                disabled={!ownedKitIds.includes(kit.id)}
                aria-pressed={kit.id === kitId}
                aria-label={kit.name}
                title={kit.name}
                className={`${styles.tile} grid size-11 cursor-pointer place-items-center`}
                style={{
                  clipPath: hudChamferPath(8, 3),
                  background: kit.primary,
                  border: `2px solid ${
                    kit.id === kitId ? kit.accent : withAlpha("var(--ds-color-border-default)", 0.8)
                  }`,
                  opacity: ownedKitIds.includes(kit.id) ? 1 : 0.32,
                }}
              >
                <span
                  className="block size-3.5"
                  style={{ background: kit.secondary, border: `1px solid ${kit.accent}` }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.lobbyIn} style={delayed(lobbyTiersDelayMs + 80)}>
          <CareerPanel stats={stats} />
        </div>

        <div className="flex-1" />

        <div
          className={`${styles.lobbyIn} flex flex-col gap-3`}
          style={delayed(lobbyPlayDelayMs)}
        >
          <Button
            accent={cyan}
            variant="solid"
            size="lg"
            fullWidth
            glow={squadReady}
            disabled={!squadReady}
            leadingIcon={<Glyph name="sports_cricket" size={20} />}
            onClick={onPlay}
          >
            {squadReady ? "TAKE GUARD" : "SQUAD INCOMPLETE"}
          </Button>
          <p
            className="text-center font-bold leading-compact text-muted"
            style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
          >
            {squadReady
              ? `${tierLabels[tier]} // TARGET ${tierRange(tier)}`
              : "OPEN YOUR CRICKET PACK TO FIELD FIVE BATTERS"}
          </p>
          <Button accent={cyan} variant="ghost" fullWidth href={backHref}>
            BACK TO GAMES
          </Button>
          <Button accent={cyan} variant="ghost" fullWidth href="/decks/cricket?returnTo=/play/final-over">
            DECK BUILDER
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---- Pieces --------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-bold leading-compact text-muted"
      style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-ultra)" }}
    >
      {children}
    </p>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`${styles.statusDot} block size-[7px] rounded-full`}
        style={{ background: accentVar("cyan") }}
      />
      <span
        className="font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
      >
        SYS://FINAL_OVER v1.0.0 — PITCH READY
      </span>
    </div>
  );
}

function HeroRow({ tier }: { tier: FinalOverTier }) {
  const cyan = accentVar("cyan");
  return (
    <div className="flex items-center gap-3.5">
      <span
        className={`${styles.heroPulse} grid size-14.5 shrink-0 place-items-center rounded-full`}
        style={{
          background: "var(--ds-color-background-elevated)",
          border: `1.6px solid ${withAlpha(cyan, 0.4)}`,
          color: cyan,
        }}
      >
        <Glyph name="sports_cricket" size={26} />
      </span>

      <div className="min-w-0">
        <h1
          className="font-display font-black leading-compact"
          style={{ fontSize: "var(--ds-text-2xl)", letterSpacing: "var(--ds-tracking-display)" }}
        >
          FINAL OVER
        </h1>
        <p
          className="mt-1 font-bold leading-compact text-muted"
          style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
        >
          THREE OVERS. FIVE BATTERS. ONE CHASE.
        </p>
        <span
          className="mt-2 inline-block px-2 py-[3px] font-bold leading-compact"
          style={{
            color: cyan,
            background: withAlpha(cyan, 0.12),
            border: `1px solid ${withAlpha(cyan, 0.7)}`,
            fontSize: "var(--ds-text-2xs)",
          }}
        >
          {tierBlurbs[tier]}
        </span>
      </div>
    </div>
  );
}

function TierTile({
  tier,
  selected,
  onSelect,
}: {
  tier: FinalOverTier;
  selected: boolean;
  onSelect: () => void;
}) {
  const cyan = accentVar("cyan");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${styles.tile} flex flex-1 cursor-pointer flex-col items-center gap-1 py-3`}
      style={{
        clipPath: hudChamferPath(10, 3),
        background: selected
          ? withAlpha(cyan, 0.16)
          : withAlpha("var(--ds-color-background-elevated)", 0.8),
        border: `${selected ? 1.5 : 1}px solid ${
          selected ? withAlpha(cyan, 0.9) : "var(--ds-color-border-default)"
        }`,
      }}
    >
      <span
        className="font-display font-black leading-compact"
        style={{
          color: selected ? cyan : "var(--ds-color-text-default)",
          fontSize: "var(--ds-text-sm)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {tierLabels[tier]}
      </span>
      <span
        className="font-bold leading-compact text-muted ds-tabular"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {tierRange(tier)}
      </span>
    </button>
  );
}

function CareerPanel({ stats }: { stats: FinalOverStats }) {
  const cyan = accentVar("cyan");
  return (
    <div
      className="p-3"
      style={{
        clipPath: hudChamferPath(14, 4),
        background: `linear-gradient(160deg, ${withAlpha(
          "var(--ds-color-background-secondary)",
          0.72,
        )}, ${withAlpha("var(--ds-color-background-primary)", 0.42)})`,
        border: `1px solid ${withAlpha(cyan, 0.28)}`,
      }}
    >
      <SectionLabel>CAREER</SectionLabel>
      <div className="mt-3 flex gap-2">
        <RecordStat label="BEST" value={String(stats.bestScore)} />
        <RecordStat label="WON" value={String(stats.wins)} />
        <RecordStat label="WIN RATE" value={winRate(stats)} />
        <RecordStat label="SIXES" value={String(stats.sixes)} />
        <RecordStat label="BEST ★" value={String(stats.bestStars)} />
      </div>
    </div>
  );
}

function RecordStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ fontSize: "var(--ds-text-lg)", letterSpacing: "var(--ds-tracking-display)" }}
      >
        {value}
      </p>
      <p
        className="mt-0.5 truncate font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {label}
      </p>
    </div>
  );
}

export { lobbyEnterMs };
