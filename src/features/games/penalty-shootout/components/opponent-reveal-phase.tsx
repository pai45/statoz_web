"use client";

import { useEffect, useState } from "react";

import { accentVar, Glyph, withAlpha } from "@/design-system";

import { opponentHoldMs, opponentLockMs, opponentSearchMs } from "../constants";
import { targetRatingForLevel } from "../engine/opponent";
import type { ShootoutState } from "../types";

import styles from "./penalty-shootout.module.css";
import { MatchScaffold } from "../../shared/components/match-chrome";

/**
 * Finding a rival.
 *
 * There is no queue and no server — the opponent was generated the moment the
 * shootout was created. The search is theatre, and deliberately so: it is the
 * beat that turns a solo game into a match, and Flutter spends the same two and
 * a half seconds on it for the same reason.
 */

export type OpponentRevealPhaseProps = {
  state: ShootoutState;
  onComplete: () => void;
  onQuit: () => void;
};

export function OpponentRevealPhase({
  state,
  onComplete,
  onQuit,
}: OpponentRevealPhaseProps) {
  const [found, setFound] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setFound(true), opponentSearchMs);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!found) return;
    const timer = window.setTimeout(
      onComplete,
      opponentLockMs + opponentHoldMs,
    );
    return () => window.clearTimeout(timer);
  }, [found, onComplete]);

  const cyan = accentVar("cyan");
  const orange = accentVar("orange");

  return (
    <MatchScaffold
      quitLabel="Quit shootout"
      title="PENALTY SHOOTOUT"
      subtitle={found ? "// RIVAL LOCKED" : "// MATCHMAKING"}
      onQuit={onQuit}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div
          className="grid size-22 place-items-center rounded-pill"
          style={{
            color: found ? orange : cyan,
            background: withAlpha(found ? orange : cyan, 0.12),
            border: `1px solid ${withAlpha(found ? orange : cyan, 0.45)}`,
          }}
        >
          <Glyph name={found ? "person_pin_circle" : "my_location"} size={40} />
        </div>

        <div className="w-full">
          <p
            className="font-display font-extrabold leading-compact"
            style={{
              color: found ? orange : cyan,
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-max)",
            }}
          >
            {found ? "OPPONENT FOUND" : "SEARCHING PENALTY QUEUE"}
          </p>

          {found ? (
            <p
              key={state.opponentName}
              className={`${styles.stamp} mt-3 font-display font-black leading-tight`}
              style={{
                fontSize: "var(--ds-text-2xl)",
                letterSpacing: "var(--ds-tracking-display)",
              }}
            >
              {state.opponentName.toUpperCase()}
            </p>
          ) : (
            <p
              className="mt-3 font-display font-black leading-tight text-muted"
              style={{
                fontSize: "var(--ds-text-2xl)",
                letterSpacing: "var(--ds-tracking-display)",
              }}
            >
              — — —
            </p>
          )}

          <p
            className="mt-3 font-bold leading-body text-muted"
            style={{ fontSize: "var(--ds-text-xs)" }}
          >
            {found
              ? `LEVEL ${state.cpuLevel} · SQUAD RATED ~${targetRatingForLevel(state.cpuLevel)}`
              : "Matching a squad to your level."}
          </p>
        </div>

        {/* The scanner: a bar sweeping a track until the queue answers. */}
        <div
          aria-hidden
          className="h-0.5 w-48 overflow-hidden"
          style={{ background: withAlpha(cyan, 0.14) }}
        >
          {found ? (
            <div className="h-full w-full" style={{ background: orange }} />
          ) : (
            <div
              className={`${styles.scan} h-full w-2/5`}
              style={{ background: cyan }}
            />
          )}
        </div>
      </div>
    </MatchScaffold>
  );
}
