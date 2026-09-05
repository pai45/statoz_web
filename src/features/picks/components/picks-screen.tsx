"use client";

import { useState } from "react";

import { BoltIcon, FlashOnIcon, NoDataState, PickIcon, ScheduleIcon, SettingsIcon, TimerIcon, accentVar } from "@/design-system";
import type { PickMarketType } from "@/domain/predictions";
import { useAuthSession } from "@/features/auth";
import { HowToPlayButton } from "@/features/how-to-play";

import {
  resetFilters,
  selectFilteredMarkets,
  selectPositionsForMarket,
  setTypeFilter,
  usePicks,
} from "../state/picks-store";
import { PickMarketCard } from "./pick-market-card";
import { PicksSettingsSheet } from "./picks-settings-sheet";
import { usePickTrading } from "./pick-trading";
import styles from "./picks.module.css";

const typeFilters: { id: PickMarketType | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "match", label: "MATCHES" },
  { id: "event", label: "EVENT" },
  { id: "future", label: "FUTURES" },
];

/** Every open market, filtered by type on the strip and by league in the sheet. */
export function PicksScreen() {
  const picks = usePicks();
  const session = useAuthSession();
  const markets = selectFilteredMarkets(picks);
  const [settings, setSettings] = useState(false);
  const { openTrade, claim, overlays } = usePickTrading();

  const filtered =
    picks.typeFilter !== "all" ||
    picks.leagueFilter !== "all" ||
    picks.sportFilter !== "all" ||
    picks.statusFilter !== "all";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ALL PICKS</h1>
        <div className={styles.headerActions}>
          <HowToPlayButton mode="pick" />
          <button
            type="button"
            className={styles.settingsButton}
            aria-label="Filter and sort picks"
            onClick={() => setSettings(true)}
          >
            <SettingsIcon size={17} />
          </button>
        </div>
      </div>

      <nav className={styles.filters} aria-label="Pick types">
        {typeFilters.map((filter) => (
          <button
            type="button"
            key={filter.id}
            className={`${styles.filter} ${picks.typeFilter === filter.id ? styles.filterActive : ""}`}
            aria-pressed={picks.typeFilter === filter.id}
            onClick={() => setTypeFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {!picks.hydrated ? (
        <PicksSkeleton />
      ) : markets.length ? (
        <div className={styles.grid}>
          {markets.map((market, index) => (
            <div key={market.id} className={styles.cardEnter} style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}>
              <PickMarketCard
                market={market}
                positions={session.isAuthenticated ? selectPositionsForMarket(picks, market.id) : []}
                onPick={openTrade}
                onClaim={claim}
              />
            </div>
          ))}
        </div>
      ) : filtered ? (
        <NoDataState
          icon={PickIcon}
          spark={ScheduleIcon}
          title="No picks found"
          message="Try another league, market type, or clear filters."
          action={
            <button type="button" className={styles.clearAction} onClick={resetFilters}>
              <TimerIcon size={16} aria-hidden="true" />
              CLEAR FILTERS
            </button>
          }
        />
      ) : picks.positions.length > 0 ? (
        <NoDataState
          icon={ScheduleIcon}
          spark={BoltIcon}
          title="No live picks"
          message="Fresh pick markets will appear here soon."
        />
      ) : (
        <NoDataState
          icon={PickIcon}
          spark={FlashOnIcon}
          accent={accentVar("lime")}
          title="Be the 1st to pick"
          message="No one has submitted a pick yet. Make the opening call."
        />
      )}

      <PicksSettingsSheet open={settings} onClose={() => setSettings(false)} picks={picks} />
      {overlays}
    </main>
  );
}

/** Four pulsing plates while the markets hydrate, as the app shows. */
function PicksSkeleton() {
  return (
    <div className={styles.skeleton} aria-label="Loading picks" aria-busy="true">
      {[76, 138, 138, 138].map((height, index) => (
        <span key={index} className={styles.skeletonPlate} style={{ height }} />
      ))}
    </div>
  );
}
