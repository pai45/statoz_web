"use client";

import { useEffect, useState } from "react";

import { accentVar, Glyph, hudChamferPath, withAlpha } from "@/design-system";

import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import {
  countdownStampMs,
  countdownTickMs,
  matchmakingHoldMs,
  matchmakingLockMs,
  matchmakingSearchMs,
} from "../constants";

import styles from "./tennis.module.css";

/**
 * Queue, rival, countdown — the web port of `GameMatchGate`.
 *
 * There is no queue and no server: the rival was drawn the moment the lobby's
 * CTA was pressed. The search is theatre, and deliberately so — it is the beat
 * that turns a solo game into a match, and Flutter spends the same two and a
 * half seconds on it for the same reason.
 *
 * Under `prefers-reduced-motion` the whole gate is skipped rather than played
 * still, matching Flutter's `disableAnimations` path: a viewer who asked for
 * less motion should not be made to sit through a cinematic with the motion
 * removed.
 */

export type TennisMatchmakingProps = {
  playerName: string;
  opponentName: string;
  onReady: () => void;
  onCancel: () => void;
};

type Stage = "searching" | "found" | "countdown";

const displayStyle = { fontFamily: "var(--ds-font-display), sans-serif" } as const;

export function TennisMatchmaking({
  playerName,
  opponentName,
  onReady,
  onCancel,
}: TennisMatchmakingProps) {
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

  if (stage === "countdown") return <KickoffCountdown onComplete={onReady} />;

  const found = stage === "found";
  const cyan = accentVar("cyan");
  const gold = accentVar("gold");
  const accent = found ? gold : cyan;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel matchmaking"
          className="grid size-11 shrink-0 cursor-pointer place-items-center"
          style={{ color: cyan }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1
            className="truncate font-display font-black leading-compact"
            style={{ ...displayStyle, fontSize: "var(--ds-text-sm)" }}
          >
            TENNIS RALLY
          </h1>
          <p
            className="mt-1 truncate font-bold leading-compact text-muted"
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-wide)",
            }}
          >
            {found ? "// RIVAL LOCKED" : "// MATCHMAKING"}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div
          className="grid size-22 place-items-center rounded-pill"
          style={{
            color: accent,
            background: withAlpha(accent, 0.12),
            border: `1px solid ${withAlpha(accent, 0.45)}`,
          }}
        >
          <Glyph name={found ? "person_pin_circle" : "my_location"} size={40} />
        </div>

        <div className="w-full">
          <p
            className="font-display font-extrabold leading-compact"
            style={{
              ...displayStyle,
              color: accent,
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-max)",
            }}
          >
            {found ? "OPPONENT FOUND" : "SCANNING GLOBAL TENNIS QUEUE"}
          </p>

          {found ? (
            <p
              key={opponentName}
              className={`${styles.stamp} mt-3 font-display font-black leading-tight`}
              style={{ ...displayStyle, fontSize: "var(--ds-text-2xl)" }}
            >
              {opponentName}
            </p>
          ) : (
            <p
              className="mt-3 font-display font-black leading-tight text-muted"
              style={{ ...displayStyle, fontSize: "var(--ds-text-2xl)" }}
            >
              — — —
            </p>
          )}

          <p
            className="mt-3 font-bold leading-body text-muted"
            style={{ fontSize: "var(--ds-text-xs)" }}
          >
            {found ? `${playerName} steps on court` : "Matching a rival to your level."}
          </p>
        </div>

        {/* The scanner: a bar sweeping a track until the queue answers. */}
        <div
          aria-hidden
          className="h-0.5 w-48 overflow-hidden"
          style={{ background: withAlpha(cyan, 0.14) }}
        >
          {found ? (
            <div className="size-full" style={{ background: gold }} />
          ) : (
            <div className={`${styles.scan} h-full w-2/5`} style={{ background: cyan }} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Countdown ----------------------------------------------------------- */

/** Three, two, one, PLAY! — one beat a second, then the stamp. */
function KickoffCountdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((value) => value - 1), countdownTickMs);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onComplete, countdownStampMs);
    return () => window.clearTimeout(timer);
  }, [count, onComplete]);

  const lime = accentVar("lime");
  const cyan = accentVar("cyan");

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center"
      role="status"
      aria-live="assertive"
      aria-label={count > 0 ? `Starting in ${count}` : "Play"}
    >
      {count > 0 ? (
        <span
          key={count}
          className={`${styles.countdownTick} font-display font-black leading-none`}
          style={{
            ...displayStyle,
            color: cyan,
            fontSize: "var(--ds-text-countdown)",
            textShadow: `0 0 32px ${withAlpha(cyan, 0.45)}`,
          }}
        >
          {count}
        </span>
      ) : (
        <span
          className={`${styles.goStamp} px-8 py-4 font-display font-black leading-none`}
          style={{
            ...displayStyle,
            color: lime,
            fontSize: "var(--ds-text-celebration)",
            clipPath: hudChamferPath(18, 6),
            background: withAlpha("var(--ds-color-background-elevated)", 0.9),
            border: `2px solid ${withAlpha(lime, 0.6)}`,
            letterSpacing: "var(--ds-tracking-display)",
          }}
        >
          PLAY!
        </span>
      )}
    </div>
  );
}
