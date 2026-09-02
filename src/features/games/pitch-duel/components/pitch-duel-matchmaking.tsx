"use client";

import { useEffect, useState } from "react";

import { Avatar, Glyph } from "@/design-system";
import { avatarForName } from "@/features/onboarding";

import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import styles from "./pitch-duel.module.css";

type MatchmakingStage = "searching" | "found" | "countdown";

export function PitchDuelMatchmaking({
  playerName,
  playerAvatar,
  opponentName,
  cpuLevel,
  onReady,
  onCancel,
}: {
  playerName: string;
  playerAvatar: string;
  opponentName: string;
  cpuLevel: number;
  onReady: () => void;
  onCancel: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [stage, setStage] = useState<MatchmakingStage>("searching");

  useEffect(() => {
    if (reducedMotion) {
      onReady();
      return;
    }
    const timer = window.setTimeout(() => setStage("found"), 1450);
    return () => window.clearTimeout(timer);
  }, [onReady, reducedMotion]);

  useEffect(() => {
    if (stage !== "found") return;
    const timer = window.setTimeout(() => setStage("countdown"), 1050);
    return () => window.clearTimeout(timer);
  }, [stage]);

  if (reducedMotion) return null;
  if (stage === "countdown") return <KickoffCountdown onReady={onReady} />;

  const rival = avatarForName(opponentName);
  const found = stage === "found";
  return (
    <section className={styles.matchGate} aria-live="polite">
      <header className={styles.simpleHeader}>
        <button type="button" onClick={onCancel} aria-label="Cancel matchmaking">×</button>
        <div><h1>PITCH DUEL</h1><p>{found ? "// RIVAL LOCKED" : "// MATCHMAKING"}</p></div>
      </header>
      <div className={styles.matchGateBody}>
        <div className={styles.scannerIcon}><Glyph name={found ? "person_pin_circle" : "my_location"} size={39} /></div>
        <p>{found ? "OPPONENT FOUND" : "SCANNING GLOBAL PITCH QUEUE"}</p>
        <h2>{found ? opponentName : "— — —"}</h2>
        <div className={styles.faceoff} data-found={found}>
          <Fighter name={playerName} badge="PLAYER ONE" avatar={playerAvatar} />
          <b>VS</b>
          <Fighter name={found ? opponentName : "SEARCHING"} badge={`LV ${cpuLevel}`} avatar={found ? rival.src : undefined} rival />
        </div>
        <div className={styles.scanRail}><i data-found={found} /></div>
        <span>{found ? "RIVAL SIGNAL LOCKED" : "MATCHING A RIVAL TO YOUR LEVEL"}</span>
      </div>
    </section>
  );
}

function Fighter({ name, badge, avatar, rival = false }: { name: string; badge: string; avatar?: string; rival?: boolean }) {
  return (
    <div className={styles.fighter} data-rival={rival}>
      {avatar ? <Avatar src={avatar} alt="" size={78} ring={rival ? "var(--ds-color-accent-gold)" : "var(--ds-color-accent-cyan)"} ringWidth={2} /> : <span className={styles.fighterPlaceholder}>?</span>}
      <b>{name}</b><span>{badge}</span>
    </div>
  );
}

function KickoffCountdown({ onReady }: { onReady: () => void }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count > 0) {
      const timer = window.setTimeout(() => setCount((value) => value - 1), 800);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onReady, 700);
    return () => window.clearTimeout(timer);
  }, [count, onReady]);
  return (
    <div className={styles.kickoff} role="status" aria-live="assertive" aria-label={count > 0 ? `Starting in ${count}` : "Kick off"}>
      <span key={count}>{count > 0 ? count : "KICK OFF!"}</span>
    </div>
  );
}
