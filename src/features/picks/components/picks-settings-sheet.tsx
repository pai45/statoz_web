"use client";

import { AdaptiveDrawer } from "@/design-system";

import {
  setLeagueFilter,
  setPickSort,
  setStatusFilter,
  type PicksSnapshot,
  type PickSort,
  type PickStatusFilter,
} from "../state/picks-store";
import styles from "./picks.module.css";

/**
 * The market filters, on the sheet the app puts them on: league, status, and
 * the sort — chips only, so the whole thing reads at a glance.
 *
 * The type filter is not here; it lives on the strip above the list.
 */
export function PicksSettingsSheet({
  open,
  onClose,
  picks,
}: {
  open: boolean;
  onClose: () => void;
  picks: PicksSnapshot;
}) {
  return (
    <AdaptiveDrawer hud open={open} onClose={onClose} title="Market filters">
      <div className={styles.settingsBody}>
        <b className={styles.settingsTitle}>MARKET FILTERS</b>

        <ChipGroup
          label="LEAGUE"
          value={picks.leagueFilter}
          options={[
            ["all", "ALL"],
            ["ipl", "IPL"],
            ["epl", "EPL"],
            ["fifa", "FIFA"],
            ["nba", "NBA"],
            ["laliga", "LALIGA"],
            ["serie-a", "SERIE A"],
          ]}
          onChange={setLeagueFilter}
        />

        <ChipGroup
          label="STATUS"
          value={picks.statusFilter}
          options={[
            ["all", "ALL"],
            ["open", "OPEN"],
            ["closed", "CLOSED"],
          ]}
          onChange={(value) => setStatusFilter(value as PickStatusFilter)}
        />

        <ChipGroup
          label="SORT BY"
          value={picks.sort}
          options={[
            ["new", "NEW"],
            ["start", "START TIME"],
            ["closing", "CLOSING"],
            ["volume", "VOLUME"],
            ["trending", "TRENDING"],
          ]}
          onChange={(value) => setPickSort(value as PickSort)}
        />
      </div>
    </AdaptiveDrawer>
  );
}

function ChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <section className={styles.settingsGroup}>
      <h3 className={styles.settingsLabel}>{label}</h3>
      <div className={styles.chipWrap}>
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            className={`${styles.filter} ${value === id ? styles.filterActive : ""}`}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {text}
          </button>
        ))}
      </div>
    </section>
  );
}
