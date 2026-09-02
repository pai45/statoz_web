"use client";

import { useState } from "react";

import { Button, Glyph, type GlyphName } from "@/design-system";
import styles from "./pitch-duel.module.css";

const steps: Array<{ icon: GlyphName; title: string; body: string; hint: string; accent: string }> = [
  { icon: "style", title: "BUILD YOUR DECK", body: "Choose two attackers, two defenders, and six action cards to form your squad.", hint: "2 ATK · 2 DEF · 6 ACT", accent: "var(--ds-color-accent-violet)" },
  { icon: "sync_alt", title: "TOSS FOR ROLE", body: "Call the coin. The winner chooses who attacks first; roles alternate each round.", hint: "HEADS OR TAILS", accent: "var(--ds-color-accent-gold)" },
  { icon: "flag", title: "REVEAL SCENARIO", body: "A tactical scenario changes the attack and defense bonus before every move.", hint: "READ THE MOMENT", accent: "var(--ds-color-accent-lime)" },
  { icon: "flash_on", title: "LOCK YOUR MOVE", body: "Play one eligible player and one matching action, then time your power surge.", hint: "PLAYER + ACTION + TIMING", accent: "var(--ds-color-accent-cyan)" },
  { icon: "insights", title: "RESOLVE THE ROUND", body: "Rating, action power, scenario bonus, and timing decide the head-to-head total.", hint: "GOAL OR DENIED", accent: "var(--ds-color-success)" },
  { icon: "emoji_events", title: "FULL-TIME VERDICT", body: "The highest score after four rounds wins. A level score finishes as a draw.", hint: "WIN XP · EARN COINS", accent: "var(--ds-color-accent-violet)" },
];

export function PitchDuelHowTo({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  return (
    <section className={styles.howTo} aria-labelledby="how-to-title">
      <header className={styles.simpleHeader}>
        <button type="button" onClick={onBack} aria-label="Back to Pitch Duel lobby"><Glyph name="chevron_left" size={19} /></button>
        <div><h1 id="how-to-title">HOW TO PLAY</h1><p>{"// MASTER THE 4-ROUND DUEL"}</p></div>
      </header>
      <div className={styles.howToBody}>
        <div className={styles.overviewStrip}>
          <Overview icon="sports_soccer" label="4 ROUNDS" copy="One move each" />
          <Overview icon="style" label="PICK CARDS" copy="Player + Action" />
          <Overview icon="emoji_events" label="OUTSCORE" copy="Win the duel" />
        </div>
        <div className={styles.howToTitleRow}><b>HOW IT WORKS</b><span>{index + 1} / {steps.length}</span></div>
        <article className={styles.stepCard} style={{ "--step-accent": step.accent } as React.CSSProperties}>
          <div><span><Glyph name={step.icon} size={27} /></span><div><b>STEP {String(index + 1).padStart(2, "0")}</b><h2>{step.title}</h2></div></div>
          <p>{step.body}</p><strong>{step.hint}</strong>
        </article>
        <div className={styles.stepNav}>
          <button type="button" onClick={() => setIndex((value) => (value - 1 + steps.length) % steps.length)} aria-label="Previous step">‹</button>
          <div>{steps.map((_, item) => <button key={item} type="button" aria-label={`Show step ${item + 1}`} aria-pressed={item === index} onClick={() => setIndex(item)} />)}</div>
          <button type="button" onClick={() => setIndex((value) => (value + 1) % steps.length)} aria-label="Next step">›</button>
        </div>
        <div className={styles.powerFormula}><b>POWER CHECK</b><div><span>RATING</span><i>+</i><span>ACTION</span><i>+</i><span>BONUS</span><i>+</i><span>TIMING</span></div><p>Smart picks improve your odds. Risky cards can win big or punish you.</p></div>
        <Button size="lg" glow fullWidth onClick={onPlay}>PLAY MATCH</Button>
      </div>
    </section>
  );
}

function Overview({ icon, label, copy }: { icon: GlyphName; label: string; copy: string }) {
  return <div><Glyph name={icon} size={21} /><b>{label}</b><span>{copy}</span></div>;
}
