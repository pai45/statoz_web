"use client";

import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import styles from "./interactive-line-chart.module.css";

export type InteractiveLineChartProps = {
  /** Chronological values, oldest to newest. Empty input renders as zero. */
  values: number[];
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number) => void;
  /** Accessible name for the scrub control. */
  label: string;
  /** Describes the currently selected value to assistive technology. */
  valueText: (value: number, index: number) => string;
  accent?: string;
  height?: CSSProperties["height"];
  className?: string;
};

const viewBoxWidth = 1000;
const viewBoxHeight = 100;

function clampIndex(index: number | null, pointCount: number): number {
  if (pointCount <= 1) return 0;
  if (index === null) return pointCount - 1;
  return Math.min(Math.max(index, 0), pointCount - 1);
}

/**
 * A scrub-able line graph shared by XP, odds, and any future history surface.
 *
 * The line uses a stretched SVG, but the selected guide and ring are HTML/CSS
 * elements in screen space. A circle inside `preserveAspectRatio="none"` scales
 * into an ellipse; keeping the pointer outside the SVG makes it stay perfectly
 * circular at every responsive aspect ratio.
 */
export function InteractiveLineChart({
  values,
  selectedIndex,
  onSelectedIndexChange,
  label,
  valueText,
  accent = "var(--ds-color-accent-cyan)",
  height,
  className,
}: InteractiveLineChartProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const safeValues = values.length > 0 ? values : [0];
  const activeIndex = clampIndex(selectedIndex, safeValues.length);
  const lastValue = safeValues.at(-1) ?? 0;
  const padding = Math.max(10, Math.floor(Math.abs(lastValue) / 20));
  const minValue = Math.max(0, Math.min(...safeValues) - padding);
  const maxValue = Math.max(...safeValues) + padding;
  const spread = Math.max(1, maxValue - minValue);
  const points = safeValues.map((value, index) => ({
    x:
      safeValues.length === 1
        ? viewBoxWidth
        : (viewBoxWidth * index) / (safeValues.length - 1),
    y: viewBoxHeight - ((value - minValue) / spread) * viewBoxHeight,
  }));
  const selectedPoint = points[activeIndex];
  const xPercent = (selectedPoint.x / viewBoxWidth) * 100;
  const yPercent = (selectedPoint.y / viewBoxHeight) * 100;

  const selectAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const percent = Math.min(
      Math.max((event.clientX - rect.left) / Math.max(1, rect.width), 0),
      1,
    );
    onSelectedIndexChange(Math.round(percent * (safeValues.length - 1)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    onSelectedIndexChange(
      Math.min(
        Math.max(activeIndex + direction, 0),
        safeValues.length - 1,
      ),
    );
  };

  return (
    <div
      className={[styles.plot, className ?? ""].filter(Boolean).join(" ")}
      style={
        {
          "--line-chart-accent": accent,
          ...(height === undefined ? {} : { height }),
        } as CSSProperties
      }
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, safeValues.length - 1)}
      aria-valuenow={activeIndex}
      aria-valuetext={valueText(safeValues[activeIndex], activeIndex)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        selectAt(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          selectAt(event);
        }
      }}
      onKeyDown={onKeyDown}
    >
      <div ref={canvasRef} className={styles.canvas} aria-hidden>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="none"
        >
          {[0, 50, 100].map((y) => (
            <line
              key={y}
              x1="0"
              x2={viewBoxWidth}
              y1={y}
              y2={y}
              className={styles.gridLine}
            />
          ))}
          <polyline
            points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
            className={styles.line}
          />
        </svg>

        <span
          className={styles.guide}
          style={{ left: `${xPercent}%` }}
        />
        <span
          className={styles.marker}
          style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
        />
      </div>
    </div>
  );
}
