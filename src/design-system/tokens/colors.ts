/**
 * StatOz semantic color tokens, seeded from the Flutter application's theme.
 * Components should use semantic names instead of raw palette values.
 */
export const colors = {
  background: {
    primary: "#0d111a",
    secondary: "#0f172b",
    elevated: "#1d293d",
    muted: "#070c1f",
  },
  text: {
    default: "#ffffff",
    muted: "#90a1b9",
    subtle: "#cad5e2",
    accent: "#5cdfff",
    inverse: "#081019",
  },
  border: {
    default: "#314158",
    muted: "#243654",
    strong: "#45556c",
    active: "rgba(173, 70, 255, 0.5)",
  },
  accent: {
    cyan: "#5cdfff",
    violet: "#c27aff",
    orange: "#ff8904",
    lime: "#51ff94",
    gold: "#fdc700",
    blue: "#2b7fff",
    racing: "#f42d29",
    pink: "#ff94c1",
  },
  feedback: {
    success: "#05df72",
    warning: "#fdc700",
    danger: "#ff4d4d",
    info: "#3c95da",
  },
  overlay: {
    subtle: "rgba(255, 255, 255, 0.1)",
    scrim: "rgba(0, 0, 0, 0.84)",
  },
} as const;

export type ColorTokens = typeof colors;
