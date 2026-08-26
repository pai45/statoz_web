"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import {
  CheckIcon,
  FlagIcon,
  FootballIcon,
  GridViewIcon,
  RadarIcon,
  UnderlineTabs,
  accentVar,
} from "@/design-system";
import type { SportMatch } from "@/domain/matches";
import { sportModuleFor } from "@/domain/sports";

import type { MatchDetailScoreboard, MatchDetailTimelineEvent } from "../types";
import styles from "./match-detail.module.css";

type ScoreboardView = "facts" | "lineup" | "commentary";

export function MatchScoreboard({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  const [active, setActive] = useState<ScoreboardView>("facts");
  const labels = scoreTabs(match).map((tab) => ({ id: tab.id, label: tab.label }));
  const activeIndex = labels.findIndex((tab) => tab.id === active);
  const accent = accentVar(sportModuleFor(match.sport).accent);

  return (
    <div className={styles.scoreboardPanel}>
      <UnderlineTabs
        tabs={labels}
        activeIndex={activeIndex}
        onChange={(index) => setActive(labels[index].id as ScoreboardView)}
        accent={accent}
        label="Match scoreboard views"
        className={styles.scoreboardTabs}
      />
      <div className={styles.scoreboardScroll}>
        {active === "facts" ? <FactsView match={match} scoreboard={scoreboard} /> : null}
        {active === "lineup" ? <LineupsView match={match} scoreboard={scoreboard} /> : null}
        {active === "commentary" ? <CommentaryView scoreboard={scoreboard} /> : null}
      </div>
    </div>
  );
}

function scoreTabs(match: SportMatch): Array<{ id: ScoreboardView; label: string }> {
  const first = match.sport === "basketball" ? "BOX SCORE" : match.sport === "tennis" ? "SETS" : "FACTS";
  return [
    { id: "facts", label: first },
    { id: "lineup", label: "LINEUP" },
    { id: "commentary", label: "COMMENTARY" },
  ];
}

function FactsView({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const accent = accentVar(sportModuleFor(match.sport).accent);
  return (
    <div className={styles.statsGrid}>
      <Panel title="SCORECARD" accent={statusColor(match)} className={styles.scorecardPanel}>
        <div className={styles.scorecardState}>
          <span className={styles.scorecardIcon} style={{ "--state-color": statusColor(match) } as CSSProperties}>
            {match.status === "finished" ? <FlagIcon size={21} /> : <RadarIcon size={21} />}
          </span>
          <div>
            <strong>{match.status === "live" ? "LIVE NOW" : match.status === "finished" ? "FULL TIME" : "PRE-MATCH"}</strong>
            <p>{match.status === "live" ? `Live clock: ${match.liveMinute ?? "—"} minutes.` : match.resultLine ?? "Scoreboard opens when the match starts."}</p>
          </div>
        </div>
        <div className={styles.scoreRows}>
          {scoreboard.scoreRows.map((row) => (
            <div key={row.label} className={styles.scoreRow}>
              <span>{row.home}</span>
              <small>{row.label}</small>
              <span>{row.away}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="MATCH FACTS" accent={accent}>
        <dl className={styles.factsList}>
          {scoreboard.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="TEAM STATS" accent={accent} className={styles.teamStatsPanel}>
        <div className={styles.statsLegend}>
          <span style={{ color: match.home.color }}>{match.home.shortName}</span>
          <span style={{ color: match.away.color }}>{match.away.shortName}</span>
        </div>
        {scoreboard.stats.map((stat) => {
          const total = stat.homeValue + stat.awayValue;
          const homeShare = total === 0 ? 50 : (stat.homeValue / total) * 100;
          return (
            <div key={stat.label} className={styles.teamStat}>
              <div><span>{stat.home}</span><small>{stat.label}</small><span>{stat.away}</span></div>
              <div className={styles.teamStatMeter}>
                <span style={{ width: `${homeShare}%`, background: match.home.color }} />
                <span style={{ width: `${100 - homeShare}%`, background: match.away.color }} />
              </div>
            </div>
          );
        })}
      </Panel>

      {scoreboard.sessions ? (
        <Panel title="SESSION RESULTS" accent={accent}>
          <div className={styles.sessionList}>
            {scoreboard.sessions.map((session) => (
              <section key={session.label}>
                <h3>{session.label}</h3>
                {session.results.map((result) => <p key={result}>{result}</p>)}
              </section>
            ))}
          </div>
        </Panel>
      ) : null}

      {scoreboard.driverStandings ? (
        <Panel title="DRIVER STANDINGS" accent="var(--ds-color-accent-gold)">
          <ol className={styles.driverStandings}>
            {scoreboard.driverStandings.map((driver, index) => <li key={driver}><span>{index + 1}</span>{driver}</li>)}
          </ol>
        </Panel>
      ) : null}

      <Panel title="MATCH TIMELINE" accent={accent} className={styles.timelinePanel}>
        {scoreboard.timeline.length ? (
          <div className={styles.timelineList}>
            {scoreboard.timeline.map((event) => <TimelineRow key={`${event.minute}-${event.player}`} event={event} />)}
          </div>
        ) : <EmptyState title="Timeline waiting" message="Match events will appear here once play begins." />}
      </Panel>
    </div>
  );
}

function Panel({ title, accent, className, children }: { title: string; accent: string; className?: string; children: ReactNode }) {
  return (
    <section className={[styles.statPanel, className].filter(Boolean).join(" ")} style={{ "--panel-accent": accent } as CSSProperties}>
      <h2>{title}</h2>
      <div className={styles.statPanelBody}>{children}</div>
    </section>
  );
}

function TimelineRow({ event }: { event: MatchDetailTimelineEvent }) {
  const icon = event.type === "goal" || event.type === "score" ? <FootballIcon size={16} /> : event.type === "substitution" ? <CheckIcon size={16} /> : <span className={event.type === "red" ? styles.redCard : styles.yellowCard} />;
  return (
    <div className={[styles.timelineRow, event.side === "home" ? styles.timelineHome : styles.timelineAway].join(" ")}>
      <div className={styles.timelineCopy}>
        <strong>{event.player}</strong>
        {event.secondary ? <small>{event.secondary}</small> : null}
      </div>
      <span className={styles.timelineIcon}>{icon}</span>
      <time>{event.minute}</time>
    </div>
  );
}

function LineupsView({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const sportLabel = match.sport === "motorsport" ? "STARTING GRID" : match.sport === "cricket" ? "PLAYING XI" : match.sport === "basketball" ? "STARTING FIVE" : "LINEUPS";
  return (
    <div className={styles.lineupView}>
      <header className={styles.lineupHeader}>
        <GridViewIcon size={18} />
        <span>{sportLabel}</span>
      </header>
      <div className={styles.lineupPitch}>
        <LineupColumn team={match.home.name} shortName={match.home.shortName} color={match.home.color} lineup={scoreboard.homeLineup} />
        <LineupColumn team={match.away.name} shortName={match.away.shortName} color={match.away.color} lineup={scoreboard.awayLineup} alignEnd />
      </div>
    </div>
  );
}

function LineupColumn({ team, shortName, color, lineup, alignEnd = false }: { team: string; shortName: string; color: string; lineup: MatchDetailScoreboard["homeLineup"]; alignEnd?: boolean }) {
  return (
    <section className={[styles.lineupColumn, alignEnd ? styles.lineupColumnAway : ""].join(" ")} style={{ "--team-color": color } as CSSProperties}>
      <header><span>{shortName}</span><small>{lineup.formation}</small></header>
      <h2>{team}</h2>
      <ol>
        {lineup.players.map((player) => (
          <li key={`${team}-${player.number}`}>
            <span>{player.number}</span>
            <div><strong>{player.name}</strong><small>{player.role}{player.captain ? " · C" : ""}</small></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CommentaryView({ scoreboard }: { scoreboard: MatchDetailScoreboard }) {
  return scoreboard.commentary.length ? (
    <ol className={styles.commentaryList}>
      {scoreboard.commentary.map((item) => (
        <li key={`${item.minute}-${item.text}`}><time>{item.minute}</time><p>{item.text}</p></li>
      ))}
    </ol>
  ) : <EmptyState title="No commentary yet" message="Play-by-play commentary will appear here once the match starts." />;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className={styles.emptyState}><RadarIcon size={24} /><strong>{title}</strong><p>{message}</p></div>;
}

function statusColor(match: SportMatch): string {
  if (match.status === "live") return "var(--ds-color-danger)";
  if (match.status === "finished") return "var(--ds-color-text-muted)";
  return "var(--ds-color-accent-gold)";
}
