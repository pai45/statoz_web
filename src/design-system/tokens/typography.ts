export const typography = {
  family: {
    body: '"Onest", var(--font-geist-sans), sans-serif',
    display: '"Orbitron", "Onest", var(--font-geist-sans), sans-serif',
    mono: 'var(--font-geist-mono), monospace',
  },
  size: {
    xs: "0.6875rem",
    sm: "0.8125rem",
    md: "0.875rem",
    base: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    "2xl": "2rem",
    hero: "2.625rem",
    celebration: "3.375rem",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    compact: 1,
    tight: 1.2,
    body: 1.4,
    relaxed: 1.6,
  },
  letterSpacing: {
    normal: "0",
    label: "0.05em",
    display: "0.075em",
  },
} as const;

export type TypographyTokens = typeof typography;
