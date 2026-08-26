"use client";

import { useEffect, useState, type ReactNode } from "react";

import { accentVar, FlameIcon, withAlpha } from "@/design-system";
import { usePrefersReducedMotion } from "@/shared/hooks";

import type { ProfileStat } from "../types";

import { ProfilePanel } from "./profile-panel";

/**
 * A telemetry band: an accent-titled header with an optional streak, over a row
 * of matte HUD cells. Career, predictions and picks all read as the same
 * instrument because they share it.
 *
 * Flutter puts a HISTORY link in the header when there is an archive to open.
 * The prop is here for the same reason it is optional there — no archive, no
 * link — and none of the three archives has been built on the web yet.
 */

const gold = accentVar("gold");

export type StatBandProps = {
  title: string;
  accent: string;
  icon: ReactNode;
  stats: ProfileStat[];
  /** A running streak, shown only while one is actually running. */
  streak?: number;
};

export function StatBand({ title, accent, icon, stats, streak = 0 }: StatBandProps) {
  return (
    <ProfilePanel>
      <div className="p-3.5">
        <div className="flex items-center gap-2.25">
          <span aria-hidden className="grid size-5 place-items-center" style={{ color: accent }}>
            {icon}
          </span>
          <h2
            className="font-display font-black leading-none"
            style={{ fontSize: "15px", letterSpacing: "var(--ds-tracking-label)", color: accent }}
          >
            {title}
          </h2>
          {streak > 0 ? <StreakBadge value={streak} /> : null}
        </div>

        <div className="mt-3 flex gap-2">
          {stats.map((stat) => (
            <StatCell key={stat.label} stat={stat} accent={accent} />
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}

function StreakBadge({ value }: { value: number }) {
  return (
    <span
      className="ml-1 flex items-center gap-1"
      style={{ color: gold }}
      aria-label={`${value} in a row`}
    >
      <FlameIcon size={16} />
      <span className="ds-tabular font-display text-xs font-black leading-none">
        {value}
      </span>
    </span>
  );
}

/**
 * One cell. A number counts up on first paint — Flutter animates the same 600ms
 * ease-out — while anything that is not a number simply appears.
 */
function StatCell({ stat, accent }: { stat: ProfileStat; accent: string }) {
  const shown = useCountUp(stat.value);
  const value =
    stat.value === undefined ? (stat.text ?? "") : `${shown}${stat.suffix ?? ""}`;

  // Edge layer with the fill inset a pixel inside it: a clip path crops a
  // border away, so the hairline has to be a layer of its own.
  return (
    <div className="relative h-16 min-w-0 flex-1">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: withAlpha("var(--ds-color-border-strong)", 0.3),
        }}
      />
      <span
        aria-hidden
        className="absolute inset-px"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: "var(--ds-color-background-secondary)",
        }}
      />
      <div className="relative flex h-full flex-col justify-center px-3">
        <span
          className="truncate font-display font-black leading-none"
          style={{
            fontSize: "8px",
            letterSpacing: "var(--ds-tracking-wide)",
            color: withAlpha(accent, 0.9),
          }}
        >
          {stat.label}
        </span>
        <span className="ds-tabular mt-1.5 truncate font-display text-xl font-black leading-none">
          {value}
        </span>
      </div>
    </div>
  );
}

const countUpMs = 600;

/**
 * Eases a figure up from zero once, on mount.
 *
 * The state held is how far the run has got, not the figure itself, so a cell
 * with nothing to count to — a zero, or a viewer who asked for less motion —
 * simply renders its target and never schedules a frame. The page-wide reduced
 * motion rule only flattens CSS, so a number ticking in JavaScript would
 * otherwise be the one thing that ignored it.
 */
function useCountUp(target: number | undefined): number {
  const reduced = usePrefersReducedMotion();
  const animate = target !== undefined && target > 0 && !reduced;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!animate) return;

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / countUpMs);
      setProgress(t);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animate, target]);

  if (!animate) return target ?? 0;
  // easeOutCubic, so the figure decelerates into its final value.
  return Math.round(target * (1 - Math.pow(1 - progress, 3)));
}
