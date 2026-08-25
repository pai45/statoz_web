/** Gradient decisions that repeat across StatOz surfaces. */
export const gradients = {
  /** The full-bleed backdrop behind every platform screen. */
  appBackground: "linear-gradient(135deg, #010916 0%, #0e2646 100%)",
  /** Navigation chrome — brighter at the top edge so it lifts off the page. */
  navBar:
    "linear-gradient(to top, rgb(14 22 43 / 97.6%) 0%, rgb(28 40 60 / 97.6%) 100%)",
  /** The arena bed the pre-platform screens sit on — darker than the app. */
  arenaBackdrop:
    "linear-gradient(to bottom, #02060f 0%, #06121f 46%, #01040a 100%)",
  /** A step meter's completed segment. */
  stepPassed: "linear-gradient(to right, #00c850 0%, #009865 100%)",
  /** The segment the player is on — the only one that glows. */
  stepCurrent: "linear-gradient(to right, #ffb13d 0%, #ff7a1a 100%)",
} as const;

export type GradientTokens = typeof gradients;
