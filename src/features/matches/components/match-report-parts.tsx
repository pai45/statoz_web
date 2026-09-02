"use client";

import type { CSSProperties } from "react";

import { CheckIcon, FootballIcon, GridViewIcon, accentVar } from "@/design-system";
import type {
  MatchDetailCommentary,
  MatchDetailScoreboard,
  MatchDetailTimelineEvent,
  SportMatch,
} from "@/domain/matches";

import { EmptyPanel, SectionHeading, StatsRow } from "./match-stats-shell";
import styles from "./match-stats.module.css";
import detail from "./match-detail.module.css";

/**
 * The three sections every sport's report shares: the event log, the
 * play-by-play, and the two lineups.
 */

export function TimelineList({
  match,
  events,
}: {
  match: SportMatch;
  events: MatchDetailTimelineEvent[];
}) {
  if (events.length === 0) {
    return <EmptyPanel title="Event log pending" message="Goals, cards, and substitutions will appear here." />;
  }
  return (
    <div className={styles.tight}>
      <SectionHeading label="MATCH EVENT LOG" />
      {events.map((event) => {
        const color = event.side === "home" ? match.home.color : match.away.color;
        return (
          <StatsRow key={`${event.minute}-${event.player}`} accent={color}>
            <span className={styles.eventRow}>
              <i className={styles.eventSide} style={{ background: color }} aria-hidden="true" />
              <b className={styles.eventMinute}>{event.minute}</b>
              <span className={styles.eventCopy}>
                <strong>{event.player}</strong>
                {event.secondary ? <small>{event.secondary}</small> : null}
              </span>
              <EventGlyph type={event.type} />
            </span>
          </StatsRow>
        );
      })}
    </div>
  );
}

function EventGlyph({ type }: { type: MatchDetailTimelineEvent["type"] }) {
  if (type === "goal" || type === "score") return <FootballIcon size={16} aria-hidden="true" />;
  if (type === "substitution") return <CheckIcon size={16} aria-hidden="true" style={{ color: accentVar("lime") }} />;
  return (
    <span
      aria-hidden="true"
      style={{
        width: "12px",
        height: "16px",
        background: type === "red" ? "var(--ds-color-danger)" : "var(--ds-color-accent-gold)",
      }}
    />
  );
}

export function CommentaryView({ commentary }: { commentary: MatchDetailCommentary[] }) {
  if (commentary.length === 0) {
    return (
      <EmptyPanel
        title="No commentary yet"
        message="Play-by-play commentary will appear here once the match starts."
      />
    );
  }
  return (
    <div className={styles.tight}>
      <SectionHeading label="PLAY BY PLAY" />
      {commentary.map((item) => (
        <StatsRow key={`${item.minute}-${item.text}`}>
          <span className={styles.eventRow}>
            <b className={styles.eventMinute}>{item.minute}</b>
            <span className={styles.eventCopy}>
              <strong style={{ whiteSpace: "normal", fontWeight: 400 }}>{item.text}</strong>
            </span>
          </span>
        </StatsRow>
      ))}
    </div>
  );
}

export function LineupsView({
  match,
  scoreboard,
  heading,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
  heading?: string;
}) {
  const label =
    heading ??
    (match.sport === "motorsport"
      ? "STARTING GRID"
      : match.sport === "cricket"
        ? "PLAYING XI"
        : match.sport === "basketball"
          ? "STARTING FIVE"
          : "LINEUPS");
  return (
    <div className={detail.lineupView}>
      <header className={detail.lineupHeader}>
        <GridViewIcon size={18} />
        <span>{label}</span>
      </header>
      <div className={detail.lineupPitch}>
        <LineupColumn
          team={match.home.name}
          shortName={match.home.shortName}
          color={match.home.color}
          lineup={scoreboard.homeLineup}
        />
        <LineupColumn
          team={match.away.name}
          shortName={match.away.shortName}
          color={match.away.color}
          lineup={scoreboard.awayLineup}
          alignEnd
        />
      </div>
    </div>
  );
}

function LineupColumn({
  team,
  shortName,
  color,
  lineup,
  alignEnd = false,
}: {
  team: string;
  shortName: string;
  color: string;
  lineup: MatchDetailScoreboard["homeLineup"];
  alignEnd?: boolean;
}) {
  return (
    <section
      className={[detail.lineupColumn, alignEnd ? detail.lineupColumnAway : ""].join(" ")}
      style={{ "--team-color": color } as CSSProperties}
    >
      <header>
        <span>{shortName}</span>
        <small>{lineup.formation}</small>
      </header>
      <h2>{team}</h2>
      <ol>
        {lineup.players.map((player) => (
          <li key={`${team}-${player.number}`}>
            <span>{player.number}</span>
            <div>
              <strong>{player.name}</strong>
              <small>
                {player.role}
                {player.captain ? " · C" : ""}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
