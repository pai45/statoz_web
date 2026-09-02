import Link from "next/link";
import type { CSSProperties } from "react";

import type { SportMatch, SportTeam } from "@/domain/matches";
import { formatKickoffTime, formatOzCompact } from "@/shared/utils";

import styles from "./sport-fixture-card.module.css";
import { TeamBadge } from "./team-badge";

export type SportFixtureCardProps = {
  match: SportMatch;
};

/** Flutter-faithful fixture surface shared by every sport match home. */
export function SportFixtureCard({ match }: SportFixtureCardProps) {
  const stateColor = match.status === "live"
    ? "var(--ds-color-danger)"
    : match.status === "finished"
      ? "var(--ds-color-fixture-border)"
      : "var(--ds-color-fixture-predicted)";
  const label = match.sport === "motorsport"
    ? `${match.home.name}, ${statusLabel(match)}`
    : `${match.home.name} versus ${match.away.name}, ${statusLabel(match)}`;

  return (
    <article
      className={styles.shell}
      style={{ "--fixture-state": stateColor } as CSSProperties}
    >
      <div aria-hidden className={styles.lift} />
      <div className={styles.frame}>
        <div className={styles.inner}>
          <div className={styles.body}>
            {match.sport === "motorsport" ? (
              <RaceIdentity match={match} />
            ) : (
              <Teams match={match} />
            )}
            {match.resultLine ? (
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

function Teams({ match }: { match: SportMatch }) {
  const cricket = match.sport === "cricket";
  const hasScore = match.homeScore != null || match.awayScore != null;
  return (
    <div className="flex min-w-0 items-start">
      <TeamColumn team={match.home} dim={match.status === "finished"} score={cricket ? match.homeScore : undefined} />
      <div className="flex shrink-0 flex-col items-center px-2 pt-2">
        {!cricket && hasScore ? (
          <span className="ds-tabular whitespace-nowrap font-display text-2xl font-black tracking-tight">
            {match.homeScore ?? "-"} - {match.awayScore ?? "-"}
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
      <TeamColumn team={match.away} alignEnd dim={match.status === "finished"} score={cricket ? match.awayScore : undefined} />
    </div>
  );
}

function TeamColumn({
  team,
  alignEnd = false,
  dim,
  score,
}: {
  team: SportTeam;
  alignEnd?: boolean;
  dim: boolean;
  score?: SportMatch["homeScore"];
}) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col ${alignEnd ? "items-end text-right" : "items-start text-left"}`}>
      <TeamBadge team={team} />
      <span className={`mt-2 line-clamp-2 text-base font-bold leading-tight ${dim ? "text-[var(--ds-color-fixture-dim-name)]" : "text-foreground"}`}>
        {team.name}
      </span>
      {score != null ? (
        <span className="ds-tabular mt-0.75 line-clamp-2 text-xs font-semibold leading-tight text-[var(--ds-color-fixture-score)]">
          {score}
        </span>
      ) : null}
    </div>
  );
}

function RaceIdentity({ match }: { match: SportMatch }) {
  return (
    <div className="flex flex-col items-center text-center">
      <TeamBadge team={match.home} />
      <span className={`mt-2 line-clamp-2 text-base font-bold leading-tight ${match.status === "finished" ? "text-[var(--ds-color-fixture-dim-name)]" : "text-foreground"}`}>
        {match.home.name}
      </span>
    </div>
  );
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
