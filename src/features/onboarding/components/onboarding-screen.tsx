"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { Sport } from "@/domain/sports";
import { saveProfileSetup } from "@/features/profile";

import { afterOnboardingHref, setupSteps } from "../constants";
import { avatarOptionById } from "../data/avatars";
import { profileBannerOptions } from "../data/banners";
import { followableLeaguesForSport } from "../data/followable-leagues";
import type { FollowableLeague, ProfileSetupResult } from "../types";

import { ArenaBackdrop } from "./arena-backdrop";
import { AvatarStep } from "./avatar-step";
import { BannerStep } from "./banner-step";
import { ClubsStep } from "./clubs-step";
import { LaunchCountdown } from "./launch-countdown";
import styles from "./motion.module.css";
import { SetupDock } from "./setup-dock";
import { SetupTopBar } from "./setup-top-bar";
import { WelcomeReveal } from "./welcome-reveal";

/** The splash plays first, the wizard next, the countdown last. */
type Phase = "welcome" | "setup" | "launch";

export type OnboardingScreenProps = {
  /** Pre-selected avatar for a player who already picked one. */
  initialAvatarId?: string;
  /**
   * Receives everything the player chose, in one piece. While unset, a finished
   * setup simply carries them into the app.
   */
  onComplete?: (result: ProfileSetupResult) => void;
};

/**
 * First-run setup: a brand splash, then avatar → banner → clubs, capped by a
 * launch countdown that drops the player into the app.
 *
 * Flutter stacks the three phases and toggles them with flags; here each is a
 * whole screen in its own right, so the phase picks which one renders.
 */
export function OnboardingScreen({
  initialAvatarId,
  onComplete,
}: OnboardingScreenProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("welcome");
  const [step, setStep] = useState(0);

  const [avatarId, setAvatarId] = useState(avatarOptionById(initialAvatarId).id);
  const [bannerId, setBannerId] = useState(profileBannerOptions[0].id);
  const [primarySport, setPrimarySport] = useState<Sport>("football");
  const [followedLeagueIds, setFollowedLeagueIds] = useState<string[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<Record<string, string>>({});
  const [activeLeagueId, setActiveLeagueId] = useState(
    followableLeaguesForSport("football")[0].id,
  );

  const availableLeagues = followableLeaguesForSport(primarySport);
  const isLastStep = step === setupSteps.length - 1;
  const activeStep = setupSteps[step];

  function next() {
    if (isLastStep) {
      setPhase("launch");
      return;
    }
    setStep((current) => current + 1);
  }

  function previous() {
    setStep((current) => Math.max(current - 1, 0));
  }

  /** SKIP moves on; DECIDE LATER on the last step drops the club picks. */
  function skip() {
    if (!isLastStep) {
      next();
      return;
    }
    setFollowedLeagueIds([]);
    setFavoriteTeams({});
    setPhase("launch");
  }

  /**
   * Finishing setup saves it. The profile reads the same record back, so the
   * dossier opens wearing the face and colours that were just chosen rather
   * than the defaults. `onComplete` still fires, for anything that wants to
   * know beyond the storing of it.
   */
  const enterApp = useCallback(() => {
    const result: ProfileSetupResult = {
      avatarId,
      bannerId,
      primarySport,
      followedLeagueIds,
      favoriteTeams,
    };
    saveProfileSetup(result);
    onComplete?.(result);
    router.push(afterOnboardingHref);
  }, [
    onComplete,
    router,
    avatarId,
    bannerId,
    primarySport,
    followedLeagueIds,
    favoriteTeams,
  ]);

  const startSetup = useCallback(() => setPhase("setup"), []);

  function selectSport(sport: Sport) {
    if (sport === primarySport) return;
    setPrimarySport(sport);
    setFollowedLeagueIds([]);
    setFavoriteTeams({});
    setActiveLeagueId(followableLeaguesForSport(sport)[0].id);
  }

  function toggleLeague(league: FollowableLeague) {
    setFollowedLeagueIds((current) => {
      if (current.includes(league.id)) {
        setFavoriteTeams((teams) =>
          Object.fromEntries(
            Object.entries(teams).filter(([id]) => id !== league.id),
          ),
        );
        return current.filter((id) => id !== league.id);
      }

      if (league.teams.length > 0) {
        setFavoriteTeams((teams) => ({ ...teams, [league.id]: league.teams[0].id }));
      }
      setActiveLeagueId(league.id);
      return [...current, league.id];
    });
  }

  /** Naming a favourite follows its league, and switches sport if it differs. */
  function selectTeam(league: FollowableLeague, teamId: string) {
    if (league.sport !== primarySport) {
      setPrimarySport(league.sport);
      setFollowedLeagueIds([league.id]);
      setFavoriteTeams({ [league.id]: teamId });
      setActiveLeagueId(league.id);
      return;
    }

    setActiveLeagueId(league.id);
    setFollowedLeagueIds((current) =>
      current.includes(league.id) ? current : [...current, league.id],
    );
    setFavoriteTeams((current) => ({ ...current, [league.id]: teamId }));
  }

  if (phase === "welcome") {
    return <WelcomeReveal onDone={startSetup} />;
  }

  if (phase === "launch") {
    return <LaunchCountdown onEnter={enterApp} />;
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <ArenaBackdrop />

      <SetupTopBar
        skipLabel={isLastStep ? "DECIDE LATER" : "SKIP"}
        onSkip={skip}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div
          /* Re-keyed so the step body replays its entrance on every change. */
          key={`${activeStep.id}-${activeLeagueId}`}
          className={`${styles.stepEnter} mx-auto flex w-full max-w-[32.5rem] flex-1 flex-col lg:max-w-4xl lg:justify-center`}
        >
          {activeStep.id === "avatar" ? (
            <AvatarStep selectedId={avatarId} onSelect={setAvatarId} />
          ) : activeStep.id === "banner" ? (
            <BannerStep selectedId={bannerId} onSelect={setBannerId} />
          ) : (
            <ClubsStep
              sport={primarySport}
              activeLeagueId={activeLeagueId}
              leagues={availableLeagues}
              followedIds={followedLeagueIds}
              favoriteTeams={favoriteTeams}
              onSelectSport={selectSport}
              onSelectLeague={(league) => setActiveLeagueId(league.id)}
              onToggleLeague={toggleLeague}
              onSelectTeam={selectTeam}
            />
          )}
        </div>
      </div>

      <SetupDock
        activeStep={step}
        stepCount={setupSteps.length}
        ctaLabel={isLastStep ? "FINISH SETUP" : "NEXT"}
        isNext={!isLastStep}
        canGoPrevious={step > 0}
        helper={activeStep.helper}
        onPrevious={previous}
        onNext={next}
      />
    </div>
  );
}
