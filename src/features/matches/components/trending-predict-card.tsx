import { accentVar, Badge, Monogram, SignalPanel } from "@/design-system";
import type { SportMatch } from "@/domain/matches";
import { sportModuleFor } from "@/domain/sports";

import { SportIcon } from "./sport-icon";

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
  const sportModule = sportModuleFor(match.sport);
  const sportAccent = accentVar(sportModule.accent);

  return (
    <SignalPanel
      accent={VIOLET}
      tag={<Badge accent={VIOLET}>PREDICT</Badge>}
      href={`/matches/${match.id}`}
      label={`Predict ${match.home.name} versus ${match.away.name}`}
    >
      <div className="flex flex-1 flex-col px-3 pb-2 pt-8.5">
        <div className="flex items-center gap-1.5">
          <SportIcon sport={match.sport} size={13} style={{ color: sportAccent }} />
          <span className="truncate font-display text-2xs font-extrabold tracking-wide text-muted">
            {match.leagueLabel}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Monogram
            name={match.home.name}
            initials={match.home.shortName}
            accent={match.home.color}
            size={30}
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
            size={30}
          />
        </div>

        <p className="mt-1.5 truncate font-display text-base font-black tracking-tight">
          {match.home.shortName}
          {" // "}
          {match.away.shortName}
        </p>

        <p
          className="mt-1 truncate text-2xs font-bold leading-tight"
          style={{ color: answered ? "var(--ds-color-success)" : VIOLET }}
        >
          {answered ? "ANSWERS LOCKED" : "+XP MISSION OPEN"}
        </p>
      </div>
    </SignalPanel>
  );
}
