"use client";

import { useMemo } from "react";

import {
  earnedTracks,
  levelFromXp,
  levelProgress,
  totalTrackXp,
  type LevelProgress,
  type ProgressTrack,
  type TrackXp,
} from "@/domain/progression";
import { useGameCareer } from "@/features/games";
import { useEconomy } from "@/features/economy";
import { collectionFromIds } from "@/features/packs";

import type { AchievementStats, CareerRecord } from "../types";

/**
 * Everything the dossier reports about the player, assembled from the stores
 * that already own each number.
 *
 * Flutter reads one global bloc holding XP, coins, match history and streaks
 * together. The web keeps them where they are earned — a store per mode, a
 * store for the packs — and this is where they are added up. Nothing is stored
 * here; it is a projection, so a mode that records a win is reflected on the
 * profile without anything having to be kept in step.
 */
export type PlayerProgress = {
  /** XP per mode, plus the meta track the collection earns. */
  xpByTrack: TrackXp;
  totalXp: number;
  level: number;
  /** Where the player sits inside their current level. */
  band: LevelProgress;
  /** Tracks carrying any XP, in display order. */
  tracks: ProgressTrack[];
  career: CareerRecord;
  achievements: AchievementStats;
};

/** A track's own level, on the same curve as the profile total. */
export function trackLevel(xpByTrack: TrackXp, track: ProgressTrack): number {
  return levelFromXp(xpByTrack[track] ?? 0);
}

export function usePlayerProgress(): PlayerProgress {
  const games = useGameCareer();
  const economy = useEconomy();

  return useMemo(() => {
    const collection = collectionFromIds(
      economy.owned.playerCardIds,
      economy.owned.actionCardIds,
    );

    // Opening packs is the one thing that earns XP off the pitch, which is
    // exactly what the app's Cards / Meta track is for.
    const xpByTrack: TrackXp = { ...games.xpByTrack };
    if (collection.xp > 0) xpByTrack.cardsMeta = collection.xp;

    const totalXp = totalTrackXp(xpByTrack);
    const band = levelProgress(totalXp);

    const career: CareerRecord = {
      played: games.played,
      won: games.won,
      winRate: games.winRate,
      bestStreak: games.bestStreak,
      currentStreak: games.currentStreak,
    };

    const achievements: AchievementStats = {
      level: band.level,
      totalXp,
      matchesPlayed: games.played,
      matchWins: games.won,
      bestMatchStreak: games.bestStreak,
      // Clean sheets, the picks ledger, the prediction quiz and the coin
      // economy all belong to features the web has not built yet. They read
      // zero, which is what an untouched badge looks like either way.
      cleanSheets: 0,
      shootoutWins: games.shootoutWins,
      basketballWins: games.basketballWins,
      tennisAchievements: games.tennisAchievements,
      predictionsMade: 0,
      correctPredictions: 0,
      picksPlaced: 0,
      picksWon: 0,
      pickStreak: 0,
      pickProfit: 0,
      ownedCards: collection.totalCards,
      platinumOwned: collection.platinumOwned,
      coins: economy.coins,
    };

    return {
      xpByTrack,
      totalXp,
      level: band.level,
      band,
      tracks: earnedTracks(xpByTrack),
      career,
      achievements,
    };
  }, [economy, games]);
}
