"use client";

import { useState } from "react";

import {
  rollDefaultStarterPack,
  StarterPackReveal,
  starterPackReveal,
} from "@/features/packs";
import type { PlayerCard } from "@/domain/cards";

// TEMPORARY preview route — delete before shipping.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rank: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

export default function PackPreviewPage() {
  const [round, setRound] = useState(0);
  const pack = rollDefaultStarterPack({ random: seeded(42 + round) });
  const reveal = starterPackReveal({ pack, xpGained: 250, levelsGained: [2] });

  // Rarest first, so the preview leads with the loudest reveal it can produce.
  const byTier = (a: PlayerCard, b: PlayerCard) =>
    rank[b.tier] - rank[a.tier] || b.rating - a.rating;

  return (
    <StarterPackReveal
      key={round}
      reveal={{ ...reveal, playerCards: [...reveal.playerCards].sort(byTier) }}
      onComplete={() => setRound((n) => n + 1)}
    />
  );
}
