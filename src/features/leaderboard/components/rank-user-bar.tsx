"use client";

import { withAlpha } from "@/design-system";

import type { LeaderboardEntry, ScoreMeta } from "../types";

import { MovementBadge, RivalAvatar, ScoreText } from "./rank-parts";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * The "where you stand" card.
 *
 * On a phone it is docked below the scroll so it never leaves; once there is
 * room it moves into the sidebar and simply stays in view. Either way it is the
 * same card — the framing is the caller's, since only the caller knows which
 * of the two it is doing.
 */

export type RankUserBarProps = {
  user: LeaderboardEntry;
  meta: ScoreMeta;
  accent: string;
  label?: string;
  /** The player's own portrait. Absent on a team board, which has a crest. */
  avatarSrc?: string;
  onOpen?: () => void;
};

export function RankUserBar({
  user,
  meta,
  accent,
  label = "Your rank",
  avatarSrc,
  onOpen,
}: RankUserBarProps) {
  const card = (
    <RankPlate
      cut={18}
      background={plateFill(accent, 0.1)}
      borderColor={withAlpha(accent, 0.34)}
      interactive={Boolean(onOpen)}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <RivalAvatar
          name={user.name}
          size={54}
          highlight
          team={user.team}
          src={user.team ? undefined : avatarSrc}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-display font-extrabold leading-none"
              style={{ fontSize: "11px", color: withAlpha(accent, 0.85) }}
            >
              {label}
            </span>
            <MovementBadge movement={user.movement} isNew={user.isNew} />
          </div>

          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className="ds-tabular font-display font-black leading-none"
              style={{ fontSize: "28px" }}
            >
              #{user.rank}
            </span>
            <span className="truncate text-base font-bold">{user.name}</span>
          </div>

          {user.subtitle ? (
            <p
              className="mt-1 truncate font-display font-black leading-none text-muted"
              style={{ fontSize: "9px", letterSpacing: "var(--ds-tracking-ultra)" }}
            >
              {user.subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <ScoreText
            key={`user-${meta.unit}-${user.score}`}
            value={user.score}
            className="ds-tabular font-display font-black leading-none"
            style={{ fontSize: "21px", color: accent }}
          />
          <span
            className="mt-1 font-display font-black leading-none"
            style={{
              fontSize: "9px",
              letterSpacing: "var(--ds-tracking-label)",
              color: withAlpha(accent, 0.7),
            }}
          >
            {meta.unit.toLowerCase()}
          </span>
        </div>
      </div>
    </RankPlate>
  );

  if (!onOpen) return card;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full cursor-pointer text-left"
      aria-label="Open your profile"
    >
      {card}
    </button>
  );
}
