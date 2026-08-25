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
    nav: "#1a253a",
  },
  text: {
    default: "#ffffff",
    muted: "#90a1b9",
    subtle: "#cad5e2",
    accent: "#5cdfff",
    inverse: "#081019",
    disabled: "#6a7282",
  },
  border: {
    default: "#314158",
    muted: "#243654",
    subtle: "#20293e",
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
export type AccentName = keyof typeof colors.accent;
export type FeedbackName = keyof typeof colors.feedback;

/** The CSS custom property backing an accent, for inline color props. */
export function accentVar(name: AccentName): string {
  return `var(--ds-color-accent-${name})`;
}

/** The CSS custom property backing a feedback color. */
export function feedbackVar(name: FeedbackName): string {
  return `var(--ds-color-${name})`;
}
