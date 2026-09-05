"use client";

import { DailyDrop } from "@/features/packs";

import Link from "next/link";
import type { CSSProperties } from "react";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@/design-system";

import {
  lobbyActionsDelayMs,
  lobbyDifficultyDelayMs,
  lobbyHeroDelayMs,
  lobbyLinksDelayMs,
  lobbyPlayDelayMs,
} from "../constants";
import type { HoopDuelStats } from "../state/hoop-duel-progress";
import {
  basketballDifficulties,
  basketballDifficultyLabels,
  type BasketballDifficulty,
} from "../types";

import styles from "./hoop-duel.module.css";

/**
 * The Hoop Duel lobby — the web port of `basketball_lobby_screen.dart`.
 *
 * The screen the game opens on: that the court is live, what you have done here
 * before, how hard you want it, and the one action that matters. It is the
 * Flutter lobby beat for beat — status strip, emblem and wordmark, the
 * difficulty row, the TIP OFF hero, then the quieter links.
 *
 * One thing moved. Flutter files the career record behind Match History, a
 * screen the web does not have; rather than drop the numbers, they sit in the
 * lobby where the Flutter panel's own layout put them.
 */

const gold = accentVar("gold");
const cyan = accentVar("cyan");
const violet = accentVar("violet");
const success = feedbackVar("success");

function rise(delayMs: number): CSSProperties {
  return { "--rise-delay": `${delayMs}ms` } as CSSProperties;
}

const difficultyBlurbs: Record<BasketballDifficulty, string> = {
  rookie: "Forgiving",
  pro: "Balanced",
  allStar: "Ruthless",
};

export type HoopDuelLobbyProps = {
  stats: HoopDuelStats;
  /** Whether the starter pack has dealt a guard, a wing and a big. */
  squadReady: boolean;
  /** The three names that will take the floor, for the CTA's helper line. */
  starterName: string | null;
  backHref: string;
  onDifficultyChange: (difficulty: BasketballDifficulty) => void;
  onPlay: () => void;
};

export function HoopDuelLobby({
  stats,
  squadReady,
  starterName,
  backHref,
  onDifficultyChange,
  onPlay,
}: HoopDuelLobbyProps) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden">
      {/* A quiet court wash behind the column, so the lobby is somewhere. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 60% at 50% 0%, ${withAlpha(gold, 0.08)} 0%, transparent 60%),
             radial-gradient(90% 50% at 50% 100%, ${withAlpha(cyan, 0.06)} 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex w-full max-w-110 flex-1 flex-col justify-center px-5 py-6">
        {/* Status strip. */}
        <div className={styles.rise} style={rise(0)}>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`${styles.courtOpen} size-1.75 rounded-full`}
              style={{ backgroundColor: success }}
            />
            <span
              className="font-display font-black leading-none"
              style={{ fontSize: "9px", letterSpacing: "2px", color: success }}
            >
              COURT OPEN
            </span>
            <span
              aria-hidden
              className="h-px flex-1"
              style={{ backgroundColor: withAlpha(gold, 0.16) }}
            />
            <span
              className="font-display font-black leading-none text-muted"
              style={{ fontSize: "8.5px", letterSpacing: "1.2px" }}
            >
              SYS://HOOP_DUEL v1.0.0
            </span>
          </div>
        </div>

        {/* Hero. */}
        <div className={`${styles.rise} mt-4`} style={rise(lobbyHeroDelayMs)}>
          <div className="flex items-center gap-4">
            <span
              className={`${styles.emblemPulse} grid size-19 shrink-0 place-items-center rounded-full`}
              aria-hidden
              style={{
                color: gold,
                backgroundColor: withAlpha("#0d111a", 0.5),
                border: `1px solid ${withAlpha(gold, 0.26)}`,
              }}
            >
              <Glyph name="sports_basketball" size={38} />
            </span>

            <div className="min-w-0 flex-1">
              <h1
                className="font-display font-black leading-none"
                style={{
                  fontSize: "23px",
                  letterSpacing: "1.2px",
                  textShadow: `0 0 14px ${withAlpha(gold, 0.45)}`,
                }}
              >
                HOOP DUEL
              </h1>
              <p
                className="mt-1.5 font-display font-black leading-tight text-muted"
                style={{ fontSize: "8.5px", letterSpacing: "1.8px" }}
              >
                TWO HALVES · SHOT CLOCK · FIRST TO OUTSCORE
              </p>
              <span
                className="mt-2.5 inline-block px-2 py-0.5 font-display font-black leading-none"
                style={{
                  fontSize: "8px",
                  letterSpacing: "1.2px",
                  color: stats.wins > 0 ? gold : "var(--ds-color-text-muted)",
                  border: `1px solid ${withAlpha(
                    stats.wins > 0 ? gold : "#90a1b9",
                    0.5,
                  )}`,
                }}
              >
                {stats.wins > 0
                  ? `${stats.wins} WINS`
                  : stats.games > 0
                    ? `${stats.games} GAMES IN`
                    : "FRESH LEGS"}
              </span>
            </div>
          </div>
        </div>

        {/* Career record. */}
        {stats.games > 0 ? (
          <div className={`${styles.rise} mt-4.5`} style={rise(lobbyHeroDelayMs + 60)}>
            <div
              className="flex px-3.5 py-3"
              style={{
                backgroundColor: "var(--ds-color-background-elevated)",
                border: `1px solid ${withAlpha(gold, 0.3)}`,
              }}
            >
              <RecordStat label="GAMES" value={`${stats.games}`} />
              <RecordStat label="WINS" value={`${stats.wins}`} accent={gold} />
              <RecordStat
                label="BEST WIN"
                value={stats.bestMargin > 0 ? `+${stats.bestMargin}` : "—"}
                accent={cyan}
              />
              <RecordStat label="DUNKS" value={`${stats.totalDunks}`} accent={violet} />
              <RecordStat
                label="STREAK"
                value={`${stats.currentStreak}`}
                accent={stats.currentStreak > 0 ? success : undefined}
              />
            </div>
          </div>
        ) : null}

        {/* Difficulty. */}
        <div className={`${styles.rise} mt-5`} style={rise(lobbyDifficultyDelayMs)}>
          <p
            className="font-display font-black leading-none text-muted"
            style={{ fontSize: "9px", letterSpacing: "2px" }}
          >
            DIFFICULTY
          </p>
          <div className="mt-2.5 flex gap-2">
            {basketballDifficulties.map((difficulty) => {
              const selected = difficulty === stats.difficulty;
              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => onDifficultyChange(difficulty)}
                  aria-pressed={selected}
                  className="flex-1 cursor-pointer px-2 py-3 transition-colors duration-150"
                  style={{
                    backgroundColor: selected
                      ? `color-mix(in srgb, ${gold} 14%, var(--ds-color-background-elevated))`
                      : "var(--ds-color-background-elevated)",
                    border: `${selected ? 1.6 : 1}px solid ${
                      selected
                        ? gold
                        : "color-mix(in srgb, var(--ds-color-border-default) 50%, transparent)"
                    }`,
                  }}
                >
                  <span
                    className="block font-display font-black leading-none"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "1px",
                      color: selected ? gold : "var(--ds-color-text-muted)",
                    }}
                  >
                    {basketballDifficultyLabels[difficulty]}
                  </span>
                  <span className="mt-1 block text-[9px] leading-none text-muted">
                    {difficultyBlurbs[difficulty]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The one action that matters. */}
        <div className={`${styles.rise} mt-5`} style={rise(lobbyPlayDelayMs)}>
          <button
            type="button"
            onClick={onPlay}
            disabled={!squadReady}
            className="w-full cursor-pointer px-4 py-3.5 text-center transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: withAlpha(gold, 0.14),
              border: `1.6px solid ${gold}`,
              boxShadow: squadReady ? `0 0 22px -6px ${withAlpha(gold, 0.5)}` : undefined,
            }}
          >
            <span
              className="flex items-center justify-center gap-2"
              style={{ color: gold }}
            >
              <Glyph name="sports_basketball" size={18} />
              <span
                className="font-display font-black leading-none"
                style={{ fontSize: "15px", letterSpacing: "2px" }}
              >
                TIP OFF
              </span>
            </span>
            <span
              className="mt-1.5 block font-display font-black leading-none text-muted"
              style={{ fontSize: "8px", letterSpacing: "1.2px" }}
            >
              {squadReady && starterName !== null
                ? `${starterName.toUpperCase()} STARTS · ${basketballDifficultyLabels[stats.difficulty]} · STATOZ`
                : "OPEN YOUR STARTER PACK TO FIELD A ROSTER"}
            </span>
          </button>
        </div>

        {/* How it plays. */}
        <div className={`${styles.rise} mt-5`} style={rise(lobbyActionsDelayMs)}>
          <div
            className="px-3.5 py-3"
            style={{
              backgroundColor: withAlpha("#0d111a", 0.5),
              border: "1px solid var(--ds-color-border-muted)",
            }}
          >
            <p
              className="font-display font-black leading-none text-muted"
              style={{ fontSize: "8px", letterSpacing: "1.8px" }}
            >
              HOW TO PLAY
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-[11px] leading-body text-muted">
              <li>◀ ▶ move · double-tap to burst-drive · again mid-drive to spin</li>
              <li>Hold ACTION to rise, release in the lime for a perfect shot</li>
              <li>Tap near the rim to finish · hold while driving to dunk</li>
              <li>On defense: hold to guard, tap to steal, release with the shooter to block</li>
            </ul>
          </div>
        </div>

        <div className={`${styles.rise} mt-4 flex justify-center gap-5`} style={rise(lobbyLinksDelayMs)}>
          <Link
            href="/decks/basketball?returnTo=/play/hoop-duel"
            className="py-2 font-display font-black leading-none text-gold underline-offset-4 hover:underline"
            style={{ fontSize: "9px", letterSpacing: "1.8px" }}
          >
            ROSTER DECK
          </Link>
          <Link
            href={backHref}
            className="py-2 font-display font-black leading-none text-muted underline-offset-4 hover:underline"
            style={{ fontSize: "9px", letterSpacing: "1.8px" }}
          >
            BACK TO BASKETBALL GAMES
          </Link>
        </div>
        <DailyDrop sport="basketball" />
      </div>
    </div>
  );
}

function RecordStat({
  label,
  value,
  accent = "#ffffff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <span
        className="font-display font-black leading-none tabular-nums"
        style={{ fontSize: "17px", color: accent }}
      >
        {value}
      </span>
      <span
        className="mt-1 whitespace-nowrap font-display font-black leading-none text-muted"
        style={{ fontSize: "7px", letterSpacing: "0.6px" }}
      >
        {label}
      </span>
    </div>
  );
}
