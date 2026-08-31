"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { accentVar, GameIcon, MatchIcon, PickIcon } from "@/design-system";
import { AdSlot } from "@/features/ads";
import { AuthBoundary } from "@/features/auth";

import {
  loadOrCreatePlayerTag,
  saveAvatar,
  saveBanner,
  useIsHydrated,
  useProfileIdentity,
} from "../state/profile-identity";
import { playerDisplayName } from "../state/player-standing";
import { usePlayerProgress } from "../state/player-progress";
import type { ProfileStat } from "../types";

import { AchievementShowcase } from "./achievement-showcase";
import { FollowingBand } from "./following-band";
import { AvatarEditor, BannerEditor } from "./identity-editors";
import { LoadoutCard } from "./loadout-card";
import { ProfileActions } from "./profile-actions";
import { ProfileHero } from "./profile-hero";
import styles from "./profile.module.css";
import { StatBand } from "./stat-band";
import { TimeZoneCard } from "./time-zone-card";

/**
 * PROFILE — the player dossier.
 *
 * A player-card hero, the clubs they follow, a derived achievements showcase,
 * and honest career / prediction / picks telemetry, followed by the loadout
 * readout and the settings. All chrome is gradient-free: depth comes from flat
 * fills, cut-corner edges and hard drop shadows, and the only lit things on the
 * page are the hero's level chip and XP meter.
 *
 * The app scrolls one narrow column, because a phone is all it has. Here the
 * same column is the phone layout exactly, and splits into a dossier and a
 * sidebar once the viewport can hold both — the telemetry stays in the reading
 * column, and the things you act on move to the side.
 */

const cyan = accentVar("cyan");
const lime = accentVar("lime");
const orange = accentVar("orange");

type Editing = "avatar" | "banner" | null;

export function ProfileScreen() {
  return (
    <AuthBoundary
      intent="view your profile"
      message="Log in to see your profile, history, achievements, and loadouts."
      returnTo="/profile"
    >
      <ProfileDossier />
    </AuthBoundary>
  );
}

function ProfileDossier() {
  const hydrated = useIsHydrated();
  const identity = useProfileIdentity();
  const progress = usePlayerProgress();
  const [editing, setEditing] = useState<Editing>(null);

  /**
   * Minting the tag is a write to the identity store, and the store pushes the
   * new value straight back through `identity` — so the effect only ever
   * touches the external system. It cannot run during render: the mint draws a
   * random seed, and a server render would spell a different tag.
   */
  useEffect(() => {
    if (hydrated) loadOrCreatePlayerTag();
  }, [hydrated]);

  const { career, achievements } = progress;

  /**
   * Predictions and picks have no store behind them yet, so both bands read
   * zero. That is the same thing they show a player who has not made a call or
   * placed a position — the band belongs on the dossier either way.
   */
  const predictStats: ProfileStat[] = [
    { label: "PLAYED", value: achievements.predictionsMade },
    { label: "ACCURACY", value: 0, suffix: "%" },
    { label: "CORRECT", value: achievements.correctPredictions },
  ];

  const pickStats: ProfileStat[] = [
    { label: "PICKS", value: achievements.picksPlaced },
    { label: "WIN RATE", value: 0, suffix: "%" },
    { label: "ACTIVE", value: 0 },
  ];

  // The app counts draws here. Nothing the web plays can end level, so the
  // third cell carries the best run instead of a column of permanent zeroes.
  const gameStats: ProfileStat[] = [
    { label: "MATCHES", value: career.played },
    { label: "WIN %", value: career.winRate, suffix: "%" },
    { label: "BEST RUN", value: career.bestStreak },
  ];

  return (
    <div className="flex flex-1 flex-col pb-7">
      <div className="mx-auto w-full max-w-160 lg:max-w-260">
        <ProfileHero
          progress={progress}
          displayName={identity.displayName || playerDisplayName}
          avatarId={identity.avatarId}
          bannerId={identity.bannerId}
          playerTag={identity.playerTag}
          onEditAvatar={() => setEditing("avatar")}
          onEditBanner={() => setEditing("banner")}
        />

        <div className="px-4 pt-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5 lg:px-0 lg:pt-5">
          <div className="flex flex-col gap-3.5">
            <Section delay={0}>
              <FollowingBand identity={identity} />
            </Section>

            <Section delay={60}>
              <AchievementShowcase stats={achievements} />
            </Section>

            <Section delay={90}>
              <AdSlot placement="profile-dossier" />
            </Section>

            <Section delay={120}>
              <StatBand
                title="PREDICTS"
                accent={cyan}
                icon={<MatchIcon size={20} />}
                stats={predictStats}
                historyHref="/profile/history/predict"
              />
            </Section>

            <Section delay={160}>
              <StatBand
                title="PICKS"
                accent={lime}
                icon={<PickIcon size={20} />}
                stats={pickStats}
                historyHref="/profile/history/pick"
              />
            </Section>

            <Section delay={200}>
              <StatBand
                title="GAMES"
                accent={orange}
                icon={<GameIcon size={20} />}
                stats={gameStats}
                streak={career.currentStreak}
                historyHref="/profile/history/games"
              />
            </Section>
          </div>

          <div className="mt-3.5 flex flex-col gap-3.5 lg:mt-0">
            <Section delay={240}>
              <LoadoutCard />
            </Section>

            <Section delay={280}>
              <TimeZoneCard selectedId={identity.timeZoneId} />
            </Section>

            <Section delay={320}>
              <ProfileActions />
            </Section>
          </div>
        </div>
      </div>

      {editing === "avatar" ? (
        <AvatarEditor
          selectedId={identity.avatarId}
          onCancel={() => setEditing(null)}
          onSave={(avatarId) => {
            saveAvatar(avatarId);
            setEditing(null);
          }}
        />
      ) : null}

      {editing === "banner" ? (
        <BannerEditor
          selectedId={identity.bannerId}
          onCancel={() => setEditing(null)}
          onSave={(bannerId) => {
            saveBanner(bannerId);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** One dealt-in section of the dossier. */
function Section({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={styles.enter}
      style={{ "--enter-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
