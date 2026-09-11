import { accentVar, Badge, SignalPanel } from "@/design-system";
import type { SportMatch } from "@/domain/matches";

import { TeamBadge } from "./team-badge";
import { TileFooter } from "./tile-footer";
import { TileMetaRow } from "./tile-meta-row";

export type TrendingPredictCardProps = {
  match: SportMatch;
  /** True once the player has locked their answers for this fixture. */
  answered?: boolean;
};

const PRIMARY_ACCENT = accentVar("cyan");
const BORDER_ACCENT = "var(--ds-color-fixture-predicted)";

/** An open prediction mission on a fixture. */
export function TrendingPredictCard({
  match,
  answered = false,
}: TrendingPredictCardProps) {
  return (
    <SignalPanel
      accent={BORDER_ACCENT}
      appearance="balanced"
      tag={<Badge accent={PRIMARY_ACCENT}>PREDICT</Badge>}
      href={`/matches/${match.id}`}
      label={`Predict ${match.home.name} versus ${match.away.name}`}
      footer={
        <TileFooter
          status={answered ? "ANSWERS LOCKED" : `+${match.rewardXp} XP MISSION`}
          accent={PRIMARY_ACCENT}
          volumeOz={match.volumeOz}
        />
      }
    >
      <TileMetaRow sport={match.sport} leagueLabel={match.leagueLabel} />

      {/* The matchup is this tile's focal element, so it carries the weight the
          other kinds give to a figure. */}
      <div className="flex flex-1 items-center justify-between gap-2">
        <TeamBadge team={match.home} size={46} />
        <span
          className="font-display text-2xs font-black tracking-label"
          style={{ color: PRIMARY_ACCENT }}
        >
          VS
        </span>
        <TeamBadge team={match.away} size={46} />
      </div>

      <p className="truncate font-display text-sm font-black tracking-label">
        {match.home.shortName}
        {" // "}
        {match.away.shortName}
      </p>
    </SignalPanel>
  );
}
