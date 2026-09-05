"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  accentVar,
  GameIcon,
  GlidingTabs,
  MatchIcon,
  type GlidingTab,
} from "@/design-system";
import { sportOrder, type Sport } from "@/domain/sports";
import { gameCountForSport } from "@/features/games";
import {
  AllSportsSelector,
  fixtureCountsBySport,
  SportHubTabs,
  SportMatchFeed,
  type SportHubSelection,
  type SportSelectorCount,
} from "@/features/matches";
import { AdSlot } from "@/features/ads";

const tabs: GlidingTab[] = [
  {
    id: "match",
    label: "MATCH",
    accent: accentVar("cyan"),
    icon: <MatchIcon size={18} />,
  },
  {
    id: "games",
    label: "GAMES",
    accent: accentVar("orange"),
    icon: <GameIcon size={18} />,
  },
];

export type HomeHubProps = {
  /** The trending bento, rendered on the server and handed in as children. */
  matchFeed: ReactNode;
  /** The arcade bento, likewise server-rendered. */
  gamesFeed: ReactNode;
  /**
   * One deck per sport, all server-rendered. Every sport is handed over at
   * once so picking one switches without a round trip.
   */
  sportDecks: Record<Sport, ReactNode>;
};

/**
 * The home surface: the MATCH / GAMES switch over the sport browse strip and
 * the feed. Only the selection lives on the client — the feeds themselves are
 * server-rendered and passed through.
 *
 * Each tab keeps its own sport selection, so switching between them does not
 * reset the other's browse position.
 */
export function HomeHub({ matchFeed, gamesFeed, sportDecks }: HomeHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [matchSport, setMatchSport] = useState<SportHubSelection>(null);
  const [gamesSport, setGamesSport] = useState<SportHubSelection>(null);
  const [selectorMode, setSelectorMode] = useState<"matches" | "games" | null>(null);
  const matchCounts = fixtureCountsBySport();
  const gameCounts = Object.fromEntries(
    sportOrder.map((sport) => [sport, { total: gameCountForSport(sport) }]),
  ) as Record<Sport, SportSelectorCount>;
  const visibleSelectorMode = selectorMode ?? (tab === 0 ? "matches" : "games");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GlidingTabs
        label="Match or games"
        tabs={tabs}
        activeIndex={tab}
        onChange={setTab}
      />

      {tab === 0 ? (
        <div role="tabpanel" aria-label="Match" className="flex min-h-0 flex-1 flex-col">
          <SportHubTabs
            selected={matchSport}
            onSelect={setMatchSport}
            onMore={() => setSelectorMode("matches")}
            onSearch={() => router.push("/matches/search")}
          />
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {matchSport === null ? (
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                <AdSlot placement="home-feed" />
                {matchFeed}
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                <AdSlot placement="home-feed" />
                <SportMatchFeed key={matchSport} sport={matchSport} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div role="tabpanel" aria-label="Games" className="flex min-h-0 flex-1 flex-col">
          <SportHubTabs
            selected={gamesSport}
            onSelect={setGamesSport}
            onMore={() => setSelectorMode("games")}
          />
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
              <AdSlot placement="home-feed" />
              {gamesSport === null ? gamesFeed : sportDecks[gamesSport]}
            </div>
          </div>
        </div>
      )}

      <AllSportsSelector
        open={selectorMode !== null}
        mode={visibleSelectorMode}
        selected={visibleSelectorMode === "matches" ? matchSport : gamesSport}
        counts={visibleSelectorMode === "matches" ? matchCounts : gameCounts}
        onSelect={(selection) => {
          if (visibleSelectorMode === "matches") setMatchSport(selection);
          else setGamesSport(selection);
        }}
        onClose={() => setSelectorMode(null)}
      />
    </div>
  );
}
