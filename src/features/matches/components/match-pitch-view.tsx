"use client";

import { useState, type CSSProperties } from "react";

import { FilterChips, GroupsIcon, NoDataState, StadiumIcon } from "@/design-system";
import type {
  MatchDetailLineup,
  MatchDetailPlayer,
  MatchDetailScoreboard,
  SportMatch,
  SportTeam,
} from "@/domain/matches";

import { TeamBadge } from "./team-badge";
import styles from "./match-pitch.module.css";

/**
 * The team sheet as a board rather than a list: one side at a time, its shape
 * laid out on the surface it plays on, and the bench under it.
 *
 * The formation string is the layout — "4-3-3" is a back four, a midfield
 * three and a front three — so the rows come from the data rather than from a
 * per-fixture arrangement.
 */
export function MatchPitchView({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  const [showHome, setShowHome] = useState(true);
  const home = scoreboard.homeLineup;
  const away = scoreboard.awayLineup;

  if (home.players.length === 0 && away.players.length === 0) {
    return (
      <NoDataState
        icon={GroupsIcon}
        spark={StadiumIcon}
        title="Lineups not locked"
        message="Confirmed formations and squad roles will appear here."
      />
    );
  }

  const team = showHome ? match.home : match.away;
  const lineup = showHome ? home : away;

  return (
    <div className={styles.view} style={{ "--team-color": team.color } as CSSProperties}>
      <FilterChips
        label="Team sheet"
        options={[match.home.shortName, match.away.shortName]}
        selected={team.shortName}
        accent="var(--team-color)"
        onSelect={(value) => setShowHome(value === match.home.shortName)}
      />

      <div className={styles.scroll} key={team.id}>
        <IdentityPanel team={team} lineup={lineup} />
        <Board lineup={lineup} basketball={match.sport === "basketball"} />
        <BenchPanel lineup={lineup} />
      </div>
    </div>
  );
}

/** Who is out, in what shape, and whether the sheet is official. */
function IdentityPanel({ team, lineup }: { team: SportTeam; lineup: MatchDetailLineup }) {
  const squad = lineup.players.length + lineup.substitutes.length;
  return (
    <section className={styles.panel}>
      <div className={styles.identity}>
        <TeamBadge team={team} size={48} />
        <span className={styles.identityCopy}>
          <strong>{team.name.toUpperCase()}</strong>
          <small>
            {lineup.formation} FORMATION // {squad} PLAYER SQUAD
          </small>
        </span>
        <span
          className={styles.sheetState}
          style={
            {
              "--state-color": lineup.confirmed
                ? "var(--ds-color-success)"
                : "var(--ds-color-accent-gold)",
            } as CSSProperties
          }
        >
          {lineup.confirmed ? "CONFIRMED" : "PROJECTED"}
        </span>
      </div>
    </section>
  );
}

/**
 * The surface and the shape on it. The keeper is a row of one, and every
 * number in the formation is a row after that.
 */
function Board({ lineup, basketball }: { lineup: MatchDetailLineup; basketball: boolean }) {
  const counts = [1, ...lineup.formation.split("-").map((part) => Number.parseInt(part, 10) || 0)];
  const rows: MatchDetailPlayer[][] = [];
  let cursor = 0;
  for (const count of counts) {
    const end = Math.min(cursor + count, lineup.players.length);
    rows.push(lineup.players.slice(cursor, end));
    cursor = end;
  }
  if (cursor < lineup.players.length) rows.push(lineup.players.slice(cursor));

  return (
    <section className={`${styles.panel} ${styles.boardPanel}`}>
      <div className={[styles.pitch, basketball ? styles.pitchCourt : ""].filter(Boolean).join(" ")}>
        <span aria-hidden className={styles.markings} />
        <span aria-hidden className={styles.goalAreas} />
        <span aria-hidden className={styles.centreCircle} />
        <span aria-hidden className={styles.centreSpot} />
        <div className={styles.rows}>
          {rows.map((row, index) => (
            <div key={index} className={styles.row}>
              {row.map((player) => (
                <PitchPlayer key={`${player.number}-${player.name}`} player={player} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PitchPlayer({ player }: { player: MatchDetailPlayer }) {
  return (
    <span className={styles.player}>
      <b className={styles.playerNumber}>{player.number}</b>
      <span className={styles.playerName}>{shortName(player.name)}</span>
    </span>
  );
}

/** "Chelsea Mason" reads as "Mason" on a shirt-sized plate. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function BenchPanel({ lineup }: { lineup: MatchDetailLineup }) {
  return (
    <section className={styles.panel}>
      <div className={styles.benchHead}>
        <b>BENCH UNIT</b>
        <small>{String(lineup.substitutes.length).padStart(2, "0")} AVAILABLE</small>
      </div>
      {lineup.substitutes.length === 0 ? (
        <p className={styles.benchEmpty}>No substitutes supplied.</p>
      ) : (
        <div className={styles.bench}>
          {lineup.substitutes.map((player) => (
            <span key={`${player.number}-${player.name}`} className={styles.benchTile}>
              <b>{player.number}</b>
              <span>
                <strong>{shortName(player.name)}</strong>
                <small>{player.role.toUpperCase()}</small>
              </span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
