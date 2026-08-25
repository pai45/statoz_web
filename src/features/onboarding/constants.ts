import type { SetupStepId } from "./types";

export type SetupStep = {
  id: SetupStepId;
  title: string;
  subtitle: string;
  /** The `SYS://` line under the dock. */
  helper: string;
};

/** The wizard, in order. There is no back button — the dock carries PREVIOUS. */
export const setupSteps: SetupStep[] = [
  {
    id: "avatar",
    title: "CHOOSE YOUR AVATAR",
    subtitle: "This is the face other operatives will see.",
    helper: "STEP 1 OF 3 // CHOOSE THE FACE FOR YOUR DOSSIER",
  },
  {
    id: "banner",
    title: "CHOOSE YOUR BANNER",
    subtitle: "The colours that fly behind your dossier.",
    helper: "STEP 2 OF 3 // SET YOUR BANNER COLOURS",
  },
  {
    id: "clubs",
    title: "CHOOSE CLUBS",
    subtitle: "Pick a sport, choose leagues, or tap any club to follow it.",
    helper: "STEP 3 OF 3 // PICK SPORTS, LEAGUES, AND CLUBS IN ONE PLACE",
  },
];

/** How long the brand splash holds before it hands over to the wizard. */
export const welcomeDurationMs = 3000;

/** The launch countdown: a beat per number, then a shorter one on GO. */
export const countdownStartsAt = 3;
export const countdownHoldMs = 850;
export const countdownGoHoldMs = 600;

/** Where a finished setup drops the player. */
export const afterOnboardingHref = "/";
