"use client";

import { useEffect, useState, type CSSProperties } from "react";

import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  CloseIcon,
  LockIcon,
  PaidIcon,
  TrophyIcon,
} from "@/design-system";
import type { SportMatch } from "@/domain/matches";
import type { SettlementQuestionResult } from "@/domain/predictions";
import { usePrefersReducedMotion } from "@/shared/hooks";

import type { SettlementOutcome } from "../state/prediction-store";
import styles from "./predictions.module.css";

/**
 * The two moments the PREDICT tab earns: sealing a card, and revealing what it
 * was worth. Both are full-bleed over the tab, both can be skipped, and neither
 * decides anything — the XP and any prize are credited before they play.
 */

/* ---- Sealing --------------------------------------------------------------- */

const lockedHoldMs = 3200;

export function PredictionLockedOverlay({
  potentialXp,
  count,
  automatic,
  onDone,
}: {
  potentialXp: number;
  count: number;
  automatic: boolean;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [xp, setXp] = useState(reduced ? potentialXp : 0);

  useEffect(() => {
    if (reduced) {
      const skip = window.setTimeout(onDone, 400);
      return () => window.clearTimeout(skip);
    }
    const began = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const progress = Math.min(1, (performance.now() - began) / 1400);
      setXp(Math.round(potentialXp * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    const finish = window.setTimeout(onDone, lockedHoldMs);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(finish);
    };
  }, [reduced, potentialXp, onDone]);

  return (
    <div className={styles.overlay} role="status">
      <div>
        <div className={styles.seal}>
          <LockIcon size={64} aria-hidden="true" />
        </div>
        <h2 className={styles.overlayHeadline}>{automatic ? "LOCKED AT KICKOFF" : "PREDICTION LOCKED"}</h2>
        <p className={styles.overlayBody}>
          {count} futures sealed. {automatic ? "Kickoff closed the card for you." : "Answers can no longer be edited."}
        </p>
        <p className={`${styles.overlayXp} ${styles.tabular}`}>+{xp} XP IN PLAY</p>
      </div>
    </div>
  );
}

/* ---- Revealing ------------------------------------------------------------- */

const verdictStepMs = 820;
const headerHoldMs = 1100;

export function SettlementRevealOverlay({
  match,
  outcome,
  isContest,
  onDone,
}: {
  match: SportMatch;
  outcome: SettlementOutcome;
  isContest: boolean;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const results = outcome.results;
  const summaryStage = results.length + 1;
  const [stage, setStage] = useState(reduced ? summaryStage : 0);

  useEffect(() => {
    if (reduced || stage >= summaryStage) return;
    const delay = stage === 0 ? headerHoldMs : verdictStepMs;
    const timer = window.setTimeout(() => setStage((value) => value + 1), delay);
    return () => window.clearTimeout(timer);
  }, [reduced, stage, summaryStage]);

  const onSummary = stage >= summaryStage;
  const revealedXp = onSummary
    ? outcome.xp
    : results.slice(0, Math.max(0, stage - 1)).reduce((sum, result) => sum + result.earnedXp, 0);
  const perfect = results.length > 0 && outcome.correctCount === results.length;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-label="Prediction settled"
      onClick={() => !onSummary && setStage(summaryStage)}
    >
      {onSummary ? (
        <div className={styles.revealSheet}>
          <header className={styles.revealHead}>
            <h2 className={styles.revealTitle} style={perfect ? undefined : { color: "var(--ds-color-text-default)" }}>
              {perfect ? "PERFECT QUIZ" : "PREDICTION SETTLED"}
            </h2>
            <p className={`${styles.revealFixture} ${styles.tabular}`}>
              {outcome.correctCount} / {results.length} CORRECT
            </p>
          </header>

          <dl className={styles.revealTotals}>
            <Cell label="XP EARNED" value={`+${outcome.xp}`} color="var(--ds-color-accent-gold)" />
            <Cell label="CORRECT" value={`${outcome.correctCount}/${results.length}`} />
            <Cell
              label="FIELD"
              value={isContest ? `#${outcome.rank} of ${outcome.fieldSize}` : `${outcome.fieldSize}`}
              color="var(--ds-color-accent-cyan)"
            />
          </dl>

          {isContest ? <ContestPrizeBeat rank={outcome.rank} field={outcome.fieldSize} prizeOz={outcome.prizeOz} /> : null}

          <button type="button" className={[styles.pagerButton, styles.pagerFocal].join(" ")} onClick={onDone}>
            CONTINUE
            <ArrowRightIcon size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className={styles.revealSheet}>
          <header className={styles.revealHead}>
            <h2 className={styles.revealTitle} style={{ color: "var(--ds-color-text-default)" }}>RESULTS ARE IN</h2>
            <p className={styles.revealFixture}>
              {match.home.shortName} vs {match.away.shortName}
            </p>
            <p className={styles.revealFixture}>
              <span className={styles.tabular}>SETTLING {results.length} FUTURES</span>
              {"  ·  "}
              <b className={styles.tabular} style={{ color: "var(--ds-color-accent-gold)" }}>+{revealedXp} XP</b>
            </p>
          </header>

          <div className={styles.verdictList}>
            {results.slice(0, Math.min(stage, results.length)).map((result, index) => (
              <VerdictRow key={result.text} index={index + 1} result={result} />
            ))}
          </div>

          <p className={styles.revealFixture} style={{ textAlign: "center" }}>TAP TO SKIP</p>
        </div>
      )}
    </div>
  );
}

function VerdictRow({ index, result }: { index: number; result: SettlementQuestionResult }) {
  const accent = result.correct ? "var(--ds-color-success)" : "var(--ds-color-danger)";
  return (
    <div className={styles.verdictRow} style={{ "--verdict-accent": accent } as CSSProperties}>
      <span className={styles.reviewIndex} style={{ borderColor: accent, color: accent }}>Q{index}</span>
      <span className={styles.verdictCopy}>
        <span className={styles.verdictText}>{result.text}</span>
        <span className={styles.verdictAnswer}>
          {result.pickedLabel}
          {result.correct ? "" : ` → ${result.correctLabel}`}
        </span>
      </span>
      {result.multiplier ? <BoltIcon size={14} aria-hidden="true" style={{ color: "var(--ds-color-accent-gold)" }} /> : null}
      {result.correct ? <CheckIcon size={16} aria-hidden="true" style={{ color: accent }} /> : <CloseIcon size={16} aria-hidden="true" style={{ color: accent }} />}
      <span className={styles.verdictStamp}>{result.correct ? `+${result.earnedXp}` : "0"}</span>
    </div>
  );
}

/**
 * The paid contest's payoff. On the podium this is the gold moment; off it, a
 * calm muted readout, so the glow keeps its meaning.
 */
function ContestPrizeBeat({ rank, field, prizeOz }: { rank: number; field: number; prizeOz: number }) {
  const won = prizeOz > 0;
  const accent = won ? "var(--ds-color-accent-gold)" : "var(--ds-color-text-muted)";
  return (
    <section
      className={[styles.prizeBeat, won ? styles.prizeBeatWon : ""].filter(Boolean).join(" ")}
      style={{ "--prize-accent": accent } as CSSProperties}
    >
      <span className={styles.pollMeta} style={{ justifyContent: "center", color: accent }}>
        {won ? <TrophyIcon size={13} aria-hidden="true" /> : null}
        SCORELINE CONTEST
      </span>
      <strong className={[styles.display, styles.tabular].join(" ")} style={{ color: accent, fontSize: "18px" }}>
        FINISHED #{rank} OF {field}
      </strong>
      <span className={[styles.pollMeta, styles.tabular].join(" ")} style={{ justifyContent: "center", color: accent }}>
        {won ? <PaidIcon size={13} aria-hidden="true" /> : null}
        {won ? `+${prizeOz} OZ CREDITED` : "OFF THE PODIUM — NO PRIZE"}
      </span>
    </section>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={styles.revealCell} style={{ "--cell-color": color } as CSSProperties}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
