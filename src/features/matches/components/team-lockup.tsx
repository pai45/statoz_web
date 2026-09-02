import type { SportTeam } from "@/domain/matches";

import { TeamBadge } from "./team-badge";

export type TeamLockupProps = {
  team: SportTeam;
  /** Right-aligns the badge and name, for the away side of a fixture. */
  alignEnd?: boolean;
};

/** A team's badge stacked over its short name. */
export function TeamLockup({ team, alignEnd = false }: TeamLockupProps) {
  return (
    <div
      className={[
        "flex w-22 min-w-0 flex-col gap-1",
        alignEnd ? "items-end text-right" : "items-start text-left",
      ].join(" ")}
    >
      <TeamBadge team={team} size={34} />
      {/* One step below the tile's clock or score: the teams identify the
          fixture, the figure is what the tile is about. */}
      <span className="w-full truncate font-display text-sm font-black tracking-tight">
        {team.shortName}
      </span>
    </div>
  );
}
