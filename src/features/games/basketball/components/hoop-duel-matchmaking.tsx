"use client";

import { useEffect, useState } from "react";

import { accentVar, Glyph, withAlpha } from "@/design-system";

import {
  countdownStampMs,
  countdownTickMs,
  matchmakingHoldMs,
  matchmakingLockMs,
  matchmakingSearchMs,
} from "../constants";
import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";

import styles from "./hoop-duel.module.css";

/**
 * Queue, rival, tip-off — the web port of `GameMatchGate` and the kickoff
 * countdown it hands to.
 *
 * There is no queue and no server: the rival was drawn the moment the lobby's
 * CTA was pressed. The search is theatre, and deliberately so — it is the beat
 * that turns a solo game into a match, and Flutter spends the same two and a
 * half seconds on it for the same reason.
 *
 * Under `prefers-reduced-motion` the whole gate is skipped rather than played
 * still, matching Flutter's `disableAnimations` path: someone who asked for
 * less motion should not be made to sit through a cinematic with the motion
 * taken out.
 */

const gold = accentVar("gold");
const cyan = accentVar("cyan");
const violet = accentVar("violet");

type Stage = "searching" | "found" | "countdown";

export type HoopDuelMatchmakingProps = {
  playerName: string;
  rivalName: string;
  rivalTeam: string;
  rivalRating: number;
  difficultyLabel: string;
  onReady: () => void;
  onCancel: () => void;
};

export function HoopDuelMatchmaking({
  playerName,
  rivalName,
  rivalTeam,
  rivalRating,
  difficultyLabel,
  onReady,
  onCancel,
}: HoopDuelMatchmakingProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [stage, setStage] = useState<Stage>("searching");

  useEffect(() => {
    if (reducedMotion) {
      onReady();
      return;
    }
    const timer = window.setTimeout(() => setStage("found"), matchmakingSearchMs);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, onReady]);

  useEffect(() => {
    if (stage !== "found") return;
    const timer = window.setTimeout(
      () => setStage("countdown"),
      matchmakingLockMs + matchmakingHoldMs,
    );
    return () => window.clearTimeout(timer);
  }, [stage]);

  if (reducedMotion) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--ds-color-background-primary)" }}
    >
      {stage === "countdown" ? (
        <Countdown onComplete={onReady} />
      ) : (
        <>
          <p
            className="font-display font-black leading-none"
            style={{
              fontSize: "9px",
              letterSpacing: "2.4px",
              color: withAlpha(cyan, 0.8),
            }}
          >
            {stage === "searching" ? "SCANNING GLOBAL HOOP QUEUE" : "RIVAL LOCKED"}
          </p>

          <div
            className="relative mt-3 h-0.5 w-48 overflow-hidden"
            style={{ backgroundColor: withAlpha(cyan, 0.15) }}
            aria-hidden
          >
            {stage === "searching" ? (
              <span
                className={`${styles.queueSweep} absolute inset-y-0 w-1/3`}
                style={{ backgroundColor: cyan }}
              />
            ) : (
              <span className="absolute inset-0" style={{ backgroundColor: gold }} />
            )}
          </div>

          <div className="mt-8 flex w-full max-w-105 items-center justify-between gap-4">
            <Fighter name={playerName} detail="YOU" accent={cyan} />

            <span
              className="font-display font-black leading-none"
              style={{ fontSize: "18px", letterSpacing: "2px", color: gold }}
            >
              VS
            </span>

            <div className={stage === "found" ? styles.rivalLock : undefined}>
              <Fighter
                name={stage === "searching" ? "—" : rivalName}
                detail={stage === "searching" ? "SEARCHING" : `${rivalTeam} · ${rivalRating} OVR`}
                accent={violet}
                alignEnd
              />
            </div>
          </div>

          <p
            className="mt-8 font-display font-black leading-none text-muted"
            style={{ fontSize: "8px", letterSpacing: "1.8px" }}
          >
            {difficultyLabel} · TWO HALVES · SHOT CLOCK
          </p>

          <button
            type="button"
            onClick={onCancel}
            className="mt-6 cursor-pointer py-2 font-display font-black leading-none text-muted"
            style={{ fontSize: "9px", letterSpacing: "2px" }}
          >
            CANCEL
          </button>
        </>
      )}
    </div>
  );
}

function Fighter({
  name,
  detail,
  accent,
  alignEnd = false,
}: {
  name: string;
  detail: string;
  accent: string;
  alignEnd?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col ${alignEnd ? "items-end text-right" : "items-start"}`}
    >
      <span
        className="grid size-11 place-items-center"
        style={{
          color: accent,
          border: `1px solid ${withAlpha(accent, 0.45)}`,
          backgroundColor: withAlpha(accent, 0.1),
        }}
      >
        <Glyph name="sports_basketball" size={20} />
      </span>
      <span
        className="mt-2 w-full truncate font-display font-black leading-tight"
        style={{ fontSize: "13px", letterSpacing: "1px" }}
      >
        {name}
      </span>
      <span
        className="mt-1 w-full truncate font-display font-black leading-none text-muted"
        style={{ fontSize: "8px", letterSpacing: "1.2px" }}
      >
        {detail}
      </span>
    </div>
  );
}

/** 3 · 2 · 1 · TIP OFF! Each beat replaces the last, then the court takes over. */
function Countdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((n) => n - 1), countdownTickMs);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onComplete, countdownStampMs);
    return () => window.clearTimeout(timer);
  }, [count, onComplete]);

  const stamp = count === 0;

  return (
    <span
      key={count}
      className={styles.rivalLock}
      aria-live="assertive"
      style={{
        fontFamily: "var(--ds-font-display), sans-serif",
        fontWeight: 900,
        lineHeight: 1,
        fontSize: stamp ? "38px" : "72px",
        letterSpacing: stamp ? "4px" : "2px",
        color: stamp ? gold : "#ffffff",
        textShadow: `0 0 26px ${withAlpha(stamp ? gold : cyan, 0.6)}`,
      }}
    >
      {stamp ? "TIP OFF!" : count}
    </span>
  );
}
