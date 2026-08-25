import {
  accentVar,
  Badge,
  feedbackVar,
  SignalPanel,
  TrendingUpIcon,
} from "@/design-system";
import { isFinished, isLive, type SportMatch } from "@/domain/matches";
import { sportModuleFor } from "@/domain/sports";
import {
  formatKickoffDate,
  formatKickoffTime,
  formatOzCompact,
} from "@/shared/utils";

import { SportIcon } from "./sport-icon";
import { TeamLockup } from "./team-lockup";

export type TrendingMatchCardProps = {
  match: SportMatch;
};

/** A fixture tile: both teams, the clock or score, and what a call is worth. */
export function TrendingMatchCard({ match }: TrendingMatchCardProps) {
  const sportModule = sportModuleFor(match.sport);
  const sportAccent = accentVar(sportModule.accent);
  const live = isLive(match);
  const finished = isFinished(match);
  const accent = live ? feedbackVar("success") : sportAccent;

  const centerLabel = live
    ? `${match.liveMinute ?? 0}′`
    : finished
      ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}`
      : formatKickoffTime(match.kickoff);

  const detail = live
    ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
    : finished
      ? "FULL TIME"
      : formatKickoffDate(match.kickoff);

  const tag = live ? (
    <Badge accent={accent} variant="outlined" pulse>
      LIVE
    </Badge>
  ) : (
    <Badge accent={accent}>{finished ? "RESULT" : "MATCH"}</Badge>
  );

  return (
    <SignalPanel
      accent={accent}
      tag={tag}
      href={`/matches/${match.id}`}
      label={`${match.home.name} versus ${match.away.name}, ${centerLabel}`}
    >
      <div className="flex flex-1 flex-col px-3.5 pb-1 pt-8.5">
        <div className="flex items-center gap-1.5">
          <SportIcon sport={match.sport} size={13} style={{ color: sportAccent }} />
          <span
            className="font-display text-2xs font-extrabold tracking-wide"
            style={{ color: sportAccent }}
          >
            {sportModule.shortLabel}
          </span>
          <span aria-hidden className="h-2.25 w-px bg-line-strong" />
          <span className="truncate font-display text-2xs font-extrabold tracking-wide text-muted">
            {match.leagueLabel}
          </span>
        </div>

        <div className="mt-1 flex flex-1 items-center gap-2">
          <TeamLockup team={match.home} />
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <span
              className="ds-tabular font-display text-lg font-black leading-compact tracking-tight"
              style={{ color: live ? accent : undefined }}
            >
              {centerLabel}
            </span>
            <span className="ds-tabular mt-0.75 text-2xs font-semibold leading-compact text-muted">
              {detail}
            </span>
          </div>
          <TeamLockup team={match.away} alignEnd />
        </div>
      </div>

      <div className="flex h-8 items-center gap-1.5 border-t border-white/6 bg-surface-muted px-3.5">
        <TrendingUpIcon size={13} className="shrink-0 text-success" />
        <span className="ds-tabular flex-1 truncate text-2xs font-extrabold text-success">
          POTENTIAL +{match.rewardXp} XP
        </span>
        <span className="ds-tabular shrink-0 text-2xs font-semibold text-muted">
          VOL {formatOzCompact(match.volumeOz)} OZ
        </span>
      </div>
    </SignalPanel>
  );
}
