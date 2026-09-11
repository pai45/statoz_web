"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { accentVar, GameIcon, GlidingTabs, MatchIcon, type GlidingTab } from "@/design-system";
import { sportOrder, type Sport } from "@/domain/sports";
import {
  AllSportsSelector,
  SportHubTabs,
  type SportSelectorCount,
} from "@/features/matches";

import { gameCountForSport } from "@/mocks/games";

const tabs: GlidingTab[] = [
  { id: "match", label: "MATCH", accent: accentVar("cyan"), icon: <MatchIcon size={18} /> },
  { id: "games", label: "GAMES", accent: accentVar("orange"), icon: <GameIcon size={18} /> },
];

export type SportGamesHubProps = {
  sport: Sport;
  children: ReactNode;
};

/**
 * The sport-specific arcade destination. It deliberately retains the platform
 * hub's two navigation layers so a game can return to its sport without
 * appearing to leave MATCH / GAMES altogether.
 */
export function SportGamesHub({ sport, children }: SportGamesHubProps) {
  const router = useRouter();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const counts = Object.fromEntries(
    sportOrder.map((item) => [item, { total: gameCountForSport(item) }]),
  ) as Record<Sport, SportSelectorCount>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GlidingTabs
        label="Match or games"
        tabs={tabs}
        activeIndex={1}
        onChange={(index) => {
          if (index === 0) router.push(`/?tab=match&sport=${sport}`);
        }}
      />
      <SportHubTabs
        selected={sport}
        onSelect={(selection) => {
          if (selection === null) router.push("/?tab=games");
          else router.push(`/games/${selection}`);
        }}
        onMore={() => setSelectorOpen(true)}
      />
      <div role="tabpanel" aria-label={`${sport} games`} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">{children}</div>
      </div>
      <AllSportsSelector
        open={selectorOpen}
        mode="games"
        selected={sport}
        counts={counts}
        onSelect={(selection) => {
          setSelectorOpen(false);
          if (selection === null) router.push("/?tab=games");
          else router.push(`/games/${selection}`);
        }}
        onClose={() => setSelectorOpen(false)}
      />
    </div>
  );
}
