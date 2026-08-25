"use client";

import { useState, type ReactNode } from "react";

import {
  accentVar,
  GameIcon,
  GlidingTabs,
  MatchIcon,
  SignalOffIcon,
  type GlidingTab,
} from "@/design-system";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { SportHubTabs, type SportHubSelection } from "@/features/matches";

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
  const [tab, setTab] = useState(0);
  const [matchSport, setMatchSport] = useState<SportHubSelection>(null);
  const [gamesSport, setGamesSport] = useState<SportHubSelection>(null);

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
          <SportHubTabs selected={matchSport} onSelect={setMatchSport} />
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {matchSport === null ? (
              <div className="mx-auto w-full max-w-6xl">{matchFeed}</div>
            ) : (
              <EmptyState
                title={`${sportModuleFor(matchSport).label.toUpperCase()} FEED`}
                detail="This sport's fixtures land in a later pass. Trending covers every sport today."
              />
            )}
          </div>
        </div>
      ) : (
        <div role="tabpanel" aria-label="Games" className="flex min-h-0 flex-1 flex-col">
          <SportHubTabs selected={gamesSport} onSelect={setGamesSport} />
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mx-auto w-full max-w-6xl">
              {gamesSport === null ? gamesFeed : sportDecks[gamesSport]}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center text-muted">
      <SignalOffIcon size={28} />
      <p className="font-display text-sm font-black tracking-wide">{title}</p>
      <p className="text-sm leading-body">{detail}</p>
    </div>
  );
}
