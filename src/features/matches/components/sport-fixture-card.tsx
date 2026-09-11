import Link from "next/link";
import type { CSSProperties } from "react";

import type { SportMatch, SportTeam } from "@/domain/matches";
import { formatKickoffTime, formatOzCompact } from "@/shared/utils";

import styles from "./sport-fixture-card.module.css";
import { TeamBadge } from "./team-badge";

export type SportFixtureCardProps = {
  match: SportMatch;
  followedTeamName?: string;
  /** Keeps feed cards unchanged while Trending opts into its shared chrome. */
  appearance?: "default" | "trending";
};

/** Flutter-faithful fixture surface shared by every sport match home. */
export function SportFixtureCard({
  match,
  followedTeamName,
  appearance = "default",
}: SportFixtureCardProps) {
  const trending = appearance === "trending";
  const followed = [match.home, match.away].find((team) => team.name === followedTeamName);
  const stateColor = trending
    ? "var(--ds-color-fixture-predicted)"
    : match.status === "live"
      ? "var(--ds-color-danger)"
      : match.status === "finished"
        ? "var(--ds-color-fixture-border)"
        : followed?.color ?? "var(--ds-color-fixture-predicted)";
  const label = match.sport === "motorsport"
    ? `${match.home.name}, ${statusLabel(match)}`
    : `${match.home.name} versus ${match.away.name}, ${statusLabel(match)}`;

  return (
    <article
      className={`${styles.shell} ${trending ? styles.trending : ""}`}
      style={{ "--fixture-state": stateColor } as CSSProperties}
    >
      <div aria-hidden className={styles.lift} />
      <div className={styles.frame}>
        <div className={styles.inner}>
          <div className={styles.body}>
            {match.sport === "motorsport" ? (
              <RaceIdentity match={match} />
            ) : (
              <Teams match={match} followedTeamName={followedTeamName} />
            )}
            {showsResultSummary(match) ? (
              <p className="mt-3 text-center text-xs font-semibold leading-body text-[var(--ds-color-fixture-result)]">
                {match.resultLine}
              </p>
            ) : null}
          </div>
          <StatusStrip match={match} />
        </div>
      </div>
      <div className={styles.tag}>
        <StatusTag match={match} />
      </div>
      <Link href={`/matches/${match.id}`} aria-label={label} className={styles.stretchedLink} />
    </article>
  );
}

function StatusTag({ match }: { match: SportMatch }) {
  if (match.status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-label text-danger">
        <span aria-hidden className={styles.liveDot} />
        {match.liveMinute == null ? "LIVE" : `LIVE ${match.liveMinute}′`}
      </span>
    );
  }
  if (match.status === "finished") {
    return <span className="text-xs font-semibold tracking-tight text-muted">Finished</span>;
  }
  return (
    <time
      dateTime={match.kickoff}
      className="ds-tabular text-sm font-bold tracking-label text-[var(--ds-color-fixture-kickoff)]"
    >
      {formatKickoffTime(match.kickoff)}
    </time>
  );
}

function Teams({ match, followedTeamName }: { match: SportMatch; followedTeamName?: string }) {
  const cricket = match.sport === "cricket";
  const hasScore = match.homeScore != null || match.awayScore != null;
  const homeValue = scoreValue(match.homeScore);
  const awayValue = scoreValue(match.awayScore);
  const hasWinner = match.status === "finished" && homeValue != null && awayValue != null && homeValue !== awayValue;
  const homeWinner = hasWinner ? homeValue > awayValue : null;
  const awayWinner = hasWinner ? awayValue > homeValue : null;
  return (
    <div className="flex min-w-0 items-start">
      <TeamColumn team={match.home} followed={match.home.name === followedTeamName} dim={match.status === "finished" && homeWinner === false} winner={homeWinner} score={cricket ? match.homeScore : undefined} />
      <div className="flex shrink-0 flex-col items-center px-2 pt-2">
        {!cricket && hasScore ? (
          <span className="ds-tabular whitespace-nowrap font-display text-2xl font-black tracking-tight">
            <span className={homeWinner === false ? "text-muted" : "text-foreground"}>{match.homeScore ?? "-"}</span>
            <span className="text-muted"> - </span>
            <span className={awayWinner === false ? "text-muted" : "text-foreground"}>{match.awayScore ?? "-"}</span>
          </span>
        ) : (
          <span className="font-display text-lg font-black text-muted">-</span>
        )}
        {match.sport === "tennis" && match.tennisSets?.length ? (
          <div className="mt-1.5 flex max-w-32 flex-wrap justify-center gap-1.5">
            {match.tennisSets.map((set, index) => (
              <span
                key={`${set.homeScore}-${set.awayScore}-${index}`}
                className={`${styles.setChip} ds-tabular px-2 py-0.75 text-2xs font-bold text-cyan`}
              >
                {set.homeScore}-{set.awayScore}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <TeamColumn team={match.away} followed={match.away.name === followedTeamName} alignEnd dim={match.status === "finished" && awayWinner === false} winner={awayWinner} score={cricket ? match.awayScore : undefined} />
    </div>
  );
}

function TeamColumn({
  team,
  alignEnd = false,
  dim,
  winner,
  followed,
  score,
}: {
  team: SportTeam;
  alignEnd?: boolean;
  dim: boolean;
  winner: boolean | null;
  followed: boolean;
  score?: SportMatch["homeScore"];
}) {
  const cricketScore = score == null ? null : splitCricketScore(String(score));
  return (
    <div className={`flex min-w-0 flex-1 flex-col ${alignEnd ? "items-end text-right" : "items-start text-left"}`}>
      <span className={`flex items-center gap-2 ${alignEnd ? "flex-row-reverse" : ""}`}><TeamBadge team={team} />{cricketScore ? <b className={`ds-tabular font-display text-lg font-black ${dim ? "text-muted" : "text-foreground"}`}>{cricketScore.score}</b> : null}</span>
      <span className={`mt-2 line-clamp-2 max-w-full text-base font-bold leading-tight ${dim ? "text-[var(--ds-color-fixture-dim-name)]" : "text-foreground"}`} style={followed ? { color: team.color } : undefined}>
        {team.name}
      </span>
      {cricketScore?.qualifier ? (
        <span className={`ds-tabular mt-0.75 max-w-full text-xs font-semibold leading-tight ${winner ? "text-foreground" : "text-muted"}`}>
          {cricketScore.qualifier}
        </span>
      ) : null}
    </div>
  );
}

function splitCricketScore(value: string): { score: string; qualifier: string } {
  const index = value.indexOf("(");
  return index < 0 ? { score: value.trim(), qualifier: "" } : { score: value.slice(0, index).trim(), qualifier: value.slice(index).trim().replace(/^\(|\)$/g, "") };
}

function scoreValue(value: SportMatch["homeScore"]): number | null {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function RaceIdentity({ match }: { match: SportMatch }) {
  return (
    <div className="flex flex-col items-center text-center">
      <TeamBadge team={match.home} />
      <span className="mt-2 line-clamp-2 text-base font-bold leading-tight text-foreground">
        {match.home.name}
      </span>
    </div>
  );
}

function showsResultSummary(match: SportMatch): match is SportMatch & { resultLine: string } {
  return Boolean(match.resultLine) && match.sport !== "football" && match.sport !== "basketball";
}

function StatusStrip({ match }: { match: SportMatch }) {
  return (
    <div className={styles.footer}>
      {match.status === "live" ? (
        <span className="flex items-center gap-1.5 font-display text-2xs font-extrabold tracking-ultra text-danger">
          <span aria-hidden className={styles.liveDot} />
          IN PLAY
        </span>
      ) : match.status === "finished" ? (
        <span className="font-display text-2xs font-extrabold tracking-wide text-muted">FULL TIME</span>
      ) : (
        <span className="ds-tabular min-w-0 flex-1 truncate font-display text-2xs font-extrabold tracking-wide text-cyan/85">
          POTENTIAL +{match.rewardXp} XP
        </span>
      )}
      <span className="ds-tabular ml-auto shrink-0 font-display text-2xs font-semibold tracking-label text-muted">
        VOL {formatOzCompact(match.volumeOz)} OZ
      </span>
    </div>
  );
}

function statusLabel(match: SportMatch): string {
  if (match.status === "live") return match.liveMinute == null ? "live" : `live ${match.liveMinute} minutes`;
  if (match.status === "finished") return "finished";
  return formatKickoffTime(match.kickoff);
}
