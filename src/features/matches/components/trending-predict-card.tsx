import { accentVar, Badge, Monogram, SignalPanel } from "@/design-system";
import type { SportMatch } from "@/domain/matches";

import { TileFooter } from "./tile-footer";
import { TileMetaRow } from "./tile-meta-row";

export type TrendingPredictCardProps = {
  match: SportMatch;
  /** True once the player has locked their answers for this fixture. */
  answered?: boolean;
};

const VIOLET = accentVar("violet");

/** An open prediction mission on a fixture. */
export function TrendingPredictCard({
  match,
  answered = false,
}: TrendingPredictCardProps) {
  return (
    <SignalPanel
      accent={VIOLET}
      tag={<Badge accent={VIOLET}>PREDICT</Badge>}
      href={`/matches/${match.id}`}
      label={`Predict ${match.home.name} versus ${match.away.name}`}
      footer={
        <TileFooter
          status={answered ? "ANSWERS LOCKED" : `+${match.rewardXp} XP MISSION`}
          accent={answered ? "var(--ds-color-success)" : VIOLET}
          volumeOz={match.volumeOz}
        />
      }
    >
      <TileMetaRow sport={match.sport} leagueLabel={match.leagueLabel} />

      {/* The matchup is this tile's focal element, so it carries the weight the
          other kinds give to a figure. */}
      <div className="flex flex-1 items-center justify-between gap-2">
        <Monogram
          name={match.home.name}
          initials={match.home.shortName}
          accent={match.home.color}
          size={32}
        />
        <span
          className="font-display text-2xs font-black tracking-label"
          style={{ color: VIOLET }}
        >
          VS
        </span>
        <Monogram
          name={match.away.name}
          initials={match.away.shortName}
          accent={match.away.color}
          size={32}
        />
      </div>

      <p className="truncate font-display text-sm font-black tracking-label">
        {match.home.shortName}
        {" // "}
        {match.away.shortName}
      </p>
    </SignalPanel>
  );
}
