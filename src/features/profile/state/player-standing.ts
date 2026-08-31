"use client";

import { useMemo } from "react";

import { avatarOptionById } from "@/features/onboarding";

import { usePlayerProgress } from "./player-progress";
import { useIsHydrated, useProfileIdentity } from "./profile-identity";

/**
 * Who the player is on a board: the narrow read a ranked list needs, without
 * reaching into the identity store or the progress projection itself.
 *
 * The same boundary shape as the games feature's `useGameCareer` — a feature
 * that owns numbers publishes a summary of them, rather than having every other
 * feature learn where they are kept.
 */
export type PlayerStanding = {
  displayName: string;
  /** Resolved portrait path, already falling back to the default face. */
  avatarSrc: string;
  totalXp: number;
  level: number;
  /**
   * False until the browser's own record has been read. A board must not rank
   * the player before it knows their XP — the server has no way to know it.
   */
  ready: boolean;
};

/**
 * The name the dossier and every board show. The app stores a chosen handle;
 * the web has never asked for one, so both surfaces say the same thing rather
 * than disagreeing about it.
 */
export const playerDisplayName = "PLAYER ONE";

export function usePlayerStanding(): PlayerStanding {
  const hydrated = useIsHydrated();
  const identity = useProfileIdentity();
  const progress = usePlayerProgress();

  return useMemo(
    () => ({
      displayName: identity.displayName || playerDisplayName,
      avatarSrc: avatarOptionById(identity.avatarId).src,
      totalXp: progress.totalXp,
      level: progress.level,
      ready: hydrated,
    }),
    [hydrated, identity.avatarId, identity.displayName, progress.totalXp, progress.level],
  );
}
