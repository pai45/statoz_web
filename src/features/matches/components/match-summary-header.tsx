import type { CSSProperties } from "react";

import type { SportMatch, SportTeam } from "@/domain/matches";
import { formatKickoffTime } from "@/shared/utils";

import styles from "./match-detail.module.css";

export function MatchSummaryHeader({ match }: { match: SportMatch }) {
  if (match.sport === "motorsport") {
    return <GrandPrixSummary match={match} />;
  }

  const hasScore = match.homeScore != null || match.awayScore != null;
  const score = match.sport === "cricket"
    ? "VS"
    : hasScore
      ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}`
      : "-";

  return (
    <section className={styles.summary} aria-label="Match summary">
      <div className={styles.summaryBracket}>
        <time
          dateTime={match.status === "scheduled" ? match.kickoff : undefined}
          className={styles.summaryStatus}
          style={{ color: statusColor(match) }}
        >
          {statusText(match)}
        </time>

        <div className={styles.summaryTeams}>
          <TeamBadge team={match.home} />
          <span className={styles.teamName} style={{ marginLeft: 10 }}>
            {match.home.name}
          </span>
          <span
            className={`${styles.summaryScore} ${hasScore || match.sport === "cricket" ? "" : styles.summaryScoreEmpty}`}
          >
            {score}
          </span>
          <span className={`${styles.teamName} ${styles.teamNameAway}`}>
            {match.away.name}
          </span>
          <span style={{ width: 10, flex: "none" }} />
          <TeamBadge team={match.away} />
        </div>

        <div className={styles.summarySplit} aria-hidden>
          <span style={{ background: match.home.color }} />
          <span style={{ background: match.away.color, opacity: 0.92 }} />
        </div>
      </div>
    </section>
  );
}

function GrandPrixSummary({ match }: { match: SportMatch }) {
  return (
    <section className={styles.summary} style={{ paddingTop: 12 }} aria-label="Race summary">
      <div className={styles.summaryBracket} style={{ paddingTop: 12 }}>
        <span className={styles.summaryStatus} style={{ color: statusColor(match), fontSize: 14 }}>
          {match.status === "scheduled" ? "UPCOMING" : match.status === "live" ? "LIVE" : "FT"}
        </span>
        <div className="mt-2.5 line-clamp-2 text-center font-display text-xl font-bold leading-tight">
          {match.home.name.toUpperCase()}
        </div>
        <div className={styles.summarySplit} aria-hidden>
          <span style={{ background: "var(--ds-color-accent-cyan)" }} />
          <span style={{ background: "var(--ds-color-danger)", opacity: 0.92 }} />
        </div>
      </div>
    </section>
  );
}

export function TeamBadge({ team, size = 44 }: { team: SportTeam; size?: number }) {
  const style = {
    width: size,
    height: size,
    "--team-primary": team.color,
    "--team-secondary": team.secondaryColor ?? team.color,
    "--team-ink": team.badgeTextColor ?? "var(--ds-color-text-default)",
  } as CSSProperties;

  return (
    <span className={styles.teamBadge} style={style} role="img" aria-label={team.name}>
      <span aria-hidden className={styles.teamBadgeShadow} />
      <span className={styles.teamBadgeFace}>{team.shortName}</span>
    </span>
  );
}

function statusColor(match: SportMatch): string {
  if (match.status === "live") return "var(--ds-color-danger)";
  if (match.status === "finished") return "var(--ds-color-text-muted)";
  return "var(--ds-color-accent-gold)";
}

function statusText(match: SportMatch): string {
  if (match.status === "live") {
    return match.liveMinute == null ? "LIVE" : `LIVE ${match.liveMinute}'`;
  }
  if (match.status === "finished") return "FT";
  return formatKickoffTime(match.kickoff);
}
