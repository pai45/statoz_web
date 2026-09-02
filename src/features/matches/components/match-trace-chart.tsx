"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

import type { MatchTrace, SportMatch } from "@/domain/matches";

import styles from "./match-stats.module.css";

/**
 * A two-sided trace: both teams on one axis, scrubbable, with the events that
 * happened along it pinned to their sample.
 *
 * The design system's chart draws one series and is shared by XP and odds; a
 * match trace is always a contest between two sides and knows which team each
 * line belongs to, so it lives with the feature that knows that.
 */

const viewWidth = 1000;
const viewHeight = 220;

export function MatchTraceChart({
  match,
  trace,
  homeLabel,
  awayLabel,
}: {
  match: SportMatch;
  trace: MatchTrace;
  homeLabel?: string;
  awayLabel?: string;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const points = Math.max(trace.home.length, trace.away.length);
  const [selected, setSelected] = useState(points - 1);
  const index = Math.min(Math.max(selected, 0), Math.max(0, points - 1));

  const all = [...trace.home, ...trace.away];
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);
  const spread = Math.max(1, max - min);
  const x = (i: number) => (points <= 1 ? viewWidth : (viewWidth * i) / (points - 1));
  const y = (value: number) => viewHeight - ((value - min) / spread) * viewHeight;
  const path = (values: number[]) =>
    values.map((value, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");

  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    setSelected(Math.round(percent * (points - 1)));
  };

  return (
    <section className={styles.tracePanel}>
      <header className={styles.traceHead}>
        <b>{trace.title}</b>
        <span className={styles.traceReadout}>
          <span style={{ color: match.home.color }} className="ds-tabular">
            {homeLabel ?? match.home.shortName} {trace.home[index] ?? 0}
          </span>
          <small>{trace.ticks[index] ?? ""}</small>
          <span style={{ color: match.away.color }} className="ds-tabular">
            {awayLabel ?? match.away.shortName} {trace.away[index] ?? 0}
          </span>
        </span>
      </header>

      <div
        ref={canvas}
        className={styles.traceCanvas}
        role="slider"
        tabIndex={0}
        aria-label={`${trace.title} scrubber`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, points - 1)}
        aria-valuenow={index}
        aria-valuetext={`${trace.ticks[index] ?? index}: ${match.home.shortName} ${trace.home[index] ?? 0} ${trace.unit}, ${match.away.shortName} ${trace.away[index] ?? 0} ${trace.unit}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) scrub(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") setSelected((value) => Math.min(points - 1, value + 1));
          if (event.key === "ArrowLeft") setSelected((value) => Math.max(0, value - 1));
        }}
      >
        <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={path(trace.away)} fill="none" stroke={match.away.color} strokeWidth={3} vectorEffect="non-scaling-stroke" />
          <path d={path(trace.home)} fill="none" stroke={match.home.color} strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </svg>

        <span
          className={styles.traceGuide}
          style={{ left: `${(x(index) / viewWidth) * 100}%` }}
          aria-hidden="true"
        />

        {(trace.markers ?? []).map((marker) => (
          <span
            key={`${marker.index}-${marker.label}`}
            className={[styles.traceMarker, marker.decisive ? styles.traceMarkerFocal : ""].filter(Boolean).join(" ")}
            style={{
              left: `${(x(Math.min(marker.index, points - 1)) / viewWidth) * 100}%`,
              "--marker-color": marker.side === "home" ? match.home.color : match.away.color,
            } as CSSProperties}
            title={marker.label}
          />
        ))}
      </div>

      <footer className={styles.traceAxis}>
        <span>{trace.ticks[0]}</span>
        <span>{trace.ticks[Math.floor(points / 2)]}</span>
        <span>{trace.ticks.at(-1)}</span>
      </footer>
    </section>
  );
}
