import {
  accentVar,
  Badge,
  feedbackVar,
  SignalPanel,
  TrendingUpIcon,
} from "@/design-system";
import { isFinished, isLive, type SportMatch } from "@/domain/matches";
import { formatKickoffDate, formatKickoffTime } from "@/shared/utils";

import { TeamLockup } from "./team-lockup";
import { TileFooter } from "./tile-footer";
import { TileMetaRow } from "./tile-meta-row";

export type TrendingMatchCardProps = {
  match: SportMatch;
};

const PRIMARY_ACCENT = accentVar("cyan");
const LIVE_ACCENT = feedbackVar("danger");

/** A fixture tile: both teams, the clock or score, and what a call is worth. */
export function TrendingMatchCard({ match }: TrendingMatchCardProps) {
  const live = isLive(match);
  const finished = isFinished(match);

  // The tile's one hero figure — the clock while it runs, then the result.
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
    <Badge accent={LIVE_ACCENT}>LIVE</Badge>
  ) : (
    <Badge accent={PRIMARY_ACCENT}>{finished ? "RESULT" : "MATCH"}</Badge>
  );

  return (
    <SignalPanel
      accent={PRIMARY_ACCENT}
      tag={tag}
      href={`/matches/${match.id}`}
      label={`${match.home.name} versus ${match.away.name}, ${centerLabel}`}
      footer={
        <TileFooter
          status={`POTENTIAL +${match.rewardXp} XP`}
          accent={PRIMARY_ACCENT}
          icon={<TrendingUpIcon size={13} className="text-cyan" />}
          volumeOz={match.volumeOz}
        />
      }
    >
      <TileMetaRow sport={match.sport} leagueLabel={match.leagueLabel} showSportLabel />

      <div className="flex flex-1 items-center gap-2">
        <TeamLockup team={match.home} />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span
            className="ds-tabular font-display text-xl font-black leading-compact tracking-tight"
            style={{ color: live ? PRIMARY_ACCENT : undefined }}
          >
            {centerLabel}
          </span>
          <span className="ds-tabular text-2xs font-semibold leading-compact text-muted">
            {detail}
          </span>
        </div>
        <TeamLockup team={match.away} alignEnd />
      </div>
    </SignalPanel>
  );
}
