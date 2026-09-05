"use client";

import { DailyDrop } from "@/features/packs";

import Link from "next/link";
import type { CSSProperties } from "react";

import { Glyph } from "@/design-system";
import { levelProgress } from "@/domain/progression";

import {
  lobbyEnterMs,
  lobbyHeroDelayMs,
  lobbyPlayDelayMs,
  lobbyTiersDelayMs,
} from "../constants";
import type { FinalOverStats } from "../state/final-over-progress";
import {
  finalOverTiers,
  tierBlurbs,
  tierLabels,
  tierRange,
  type FinalOverTier,
} from "../tuning";

import styles from "./final-over.module.css";

export type FinalOverLobbyProps = {
  stats: FinalOverStats;
  tier: FinalOverTier;
  squadReady: boolean;
  backHref: string;
  onTierChange: (tier: FinalOverTier) => void;
  onPlay: () => void;
};

function delayed(delay: number): CSSProperties {
  return { "--lobby-delay": `${delay}ms` } as CSSProperties;
}

export function FinalOverLobby({
  stats,
  tier,
  squadReady,
  backHref,
  onTierChange,
  onPlay,
}: FinalOverLobbyProps) {
  const band = levelProgress(stats.xp);

  return (
    <section className={styles.finalLobby} aria-labelledby="final-over-title">
      <header className={styles.finalLobbyHeader}>
        <Link href={backHref} aria-label="Back to cricket games">
          <Glyph name="chevron_left" size={23} />
        </Link>

        <div className={styles.lobbyLevel} aria-label={`Level ${band.level}, ${band.intoLevel} of ${band.levelSpan} XP`}>
          <span>LVL</span>
          <b>{band.level}</b>
          <i aria-hidden>
            <span style={{ width: `${band.fraction * 100}%` }} />
          </i>
          <small>{band.intoLevel}/{band.levelSpan}</small>
          <Glyph name="chevron_right" size={15} />
        </div>
      </header>

      <div className={styles.finalLobbyMain}>
        <div className={`${styles.lobbyIn} ${styles.finalStatus}`} style={delayed(0)}>
          <i />
          <span>SYS://FINAL_OVER V1.0.0 — PITCH READY</span>
        </div>

        <div className={`${styles.lobbyIn} ${styles.finalHero}`} style={delayed(lobbyHeroDelayMs)}>
          <span aria-hidden><Glyph name="sports_cricket" size={28} /></span>
          <div>
            <h1 id="final-over-title">FINAL OVER</h1>
            <p>THREE OVERS. FIVE BATTERS. ONE CHASE.</p>
            <b>{tierBlurbs[tier]}</b>
          </div>
        </div>

        <div className={`${styles.lobbyIn} ${styles.tierSection}`} style={delayed(lobbyTiersDelayMs)}>
          <p>CHASE TIER</p>
          <div role="group" aria-label="Chase tier">
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

        <div className={`${styles.lobbyIn} ${styles.finalActions}`} style={delayed(lobbyPlayDelayMs)}>
          <button type="button" className={styles.takeGuard} onClick={onPlay} disabled={!squadReady}>
            <span aria-hidden><Glyph name="sports_cricket" size={28} /></span>
            <i aria-hidden />
            <span>
              <b>{squadReady ? "TAKE GUARD" : "SQUAD INCOMPLETE"}</b>
              <small>
                {squadReady
                  ? `${tierLabels[tier]} / TARGET ${tierRange(tier)}`
                  : "OPEN YOUR CRICKET PACK TO FIELD FIVE BATTERS"}
              </small>
            </span>
          </button>

          <div className={styles.finalSecondaryActions}>
            <Link href="/decks/cricket?returnTo=/play/final-over">CRICKET DECK</Link>
            <Link href="/profile/history/games">MATCH HISTORY</Link>
          </div>
        </div>
        <DailyDrop sport="cricket" />
      </div>
    </section>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={styles.finalTierTile}
    >
      <b>{tierLabels[tier]}</b>
      <span>{tierRange(tier)}</span>
    </button>
  );
}

export { lobbyEnterMs };
