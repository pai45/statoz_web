"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, Glyph, Progress } from "@/design-system";
import { levelProgress } from "@/domain/progression";

import type { PitchDuelHistoryEntry, PitchDuelProgress } from "../types";
import styles from "./pitch-duel.module.css";

const cyan = "var(--ds-color-accent-cyan)";
const lime = "var(--ds-color-accent-lime)";

export function PitchDuelLobby({
  progress,
  onPlay,
  onHowToPlay,
  onReplayTutorial,
  onExit,
}: {
  progress: PitchDuelProgress;
  onPlay: () => void;
  onHowToPlay: () => void;
  onReplayTutorial: () => void;
  onExit: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tutorialReset, setTutorialReset] = useState(false);
  const band = levelProgress(progress.xp);

  return (
    <section className={styles.lobby} aria-labelledby="pitch-duel-title">
      <header className={styles.lobbyHeader}>
        <button type="button" onClick={onExit} aria-label="Back to football games">
          <Glyph name="chevron_left" size={19} />
        </button>
        <div>
          <strong>PITCH DUEL</strong>
          <span>{"// MATCH LOBBY"}</span>
        </div>
        <div className={styles.levelBadge} aria-label={`Level ${band.level}`}>
          <span>LVL</span><b>{band.level}</b>
          <Progress value={band.fraction} accent={cyan} label={`Level ${band.level} progress`} height={3} />
        </div>
      </header>

      <div className={styles.lobbyBody}>
        <div className={`${styles.lobbyColumn} ${styles.rise}`}>
          <div className={styles.statusStrip}>
            <i /><b>DECK ONLINE</b><span /> <small>SYS://PITCH_DUEL v1.0.0</small>
          </div>

          <div className={styles.lobbyHero}>
            <div className={styles.heroEmblem} aria-hidden>
              <span><Glyph name="sports_soccer" size={55} /></span><i /><i />
            </div>
            <div>
              <h1 id="pitch-duel-title">PITCH DUEL</h1>
              <p>TACTICAL CARD DUEL</p>
              <b>DECK ONLINE</b>
            </div>
          </div>

          <div className={styles.lobbyStats}>
            <HudStat label="LEVEL" value={`${band.level}`} />
            <HudStat label="TOTAL XP" value={progress.xp.toLocaleString("en-US")} />
            <HudStat label="WINS" value={`${progress.wins}`} accent={lime} />
          </div>

          <Button size="lg" glow fullWidth accent={cyan} onClick={onPlay} leadingIcon={<Glyph name="play_arrow" size={20} />} className={styles.lobbyPlay}>
            PLAY MATCH
          </Button>

          <div className={styles.lobbyActions}>
            <Link href="/decks/football?returnTo=/play/pitch-duel">DECK BUILDER</Link>
            <button type="button" onClick={() => setHistoryOpen(true)}>MATCH HISTORY</button>
          </div>

          <div className={styles.lobbyLinks}>
            <button type="button" onClick={onHowToPlay}>HOW TO PLAY</button><i />
            <button
              type="button"
              onClick={() => {
                onReplayTutorial();
                setTutorialReset(true);
              }}
            >
              REPLAY WALKTHROUGH
            </button>
          </div>
          <p className={styles.resetNotice} role="status">{tutorialReset ? "Walkthrough armed for the next match." : ""}</p>
        </div>
      </div>

      {historyOpen ? <PitchDuelHistory entries={progress.history} onClose={() => setHistoryOpen(false)} /> : null}
    </section>
  );
}

function HudStat({ label, value, accent = cyan }: { label: string; value: string; accent?: string }) {
  return <div style={{ "--stat-accent": accent } as React.CSSProperties}><b>{value}</b><span>{label}</span></div>;
}

function PitchDuelHistory({ entries, onClose }: { entries: PitchDuelHistoryEntry[]; onClose: () => void }) {
  return (
    <div className={styles.historyScrim} role="dialog" aria-modal="true" aria-label="Pitch Duel match history">
      <div className={styles.historyPanel}>
        <header><h2>MATCH HISTORY</h2><button type="button" onClick={onClose} aria-label="Close match history">×</button></header>
        <div>
          {entries.length === 0 ? <p className={styles.historyEmpty}>No completed matches yet. Finish a duel and it will land here.</p> : entries.map((entry) => (
            <article key={entry.id} data-result={entry.result.toLowerCase()}>
              <b>{entry.result.toUpperCase()}</b>
              <div><strong>{entry.opponentName.toUpperCase()}</strong><span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(entry.playedAt))} · {entry.xpEarned > 0 ? "+" : ""}{entry.xpEarned} XP</span></div>
              <em>{entry.playerScore}-{entry.opponentScore}</em>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
