/**
 * StatOz cuts corners instead of rounding them. These are the chamfer
 * measurements the surfaces share; components build clip paths from them so the
 * angles stay identical everywhere.
 */
export const shape = {
  /** Corner cut on a signal panel. */
  signalCut: 12,
  /** Width of the notch stepped into a signal panel's top-right edge. */
  signalNotch: 34,
  /** How far a signal panel's accent shadow sits below the panel. */
  signalLift: 6,
  /** Match-hub card: lower chamfer and centred status notch geometry. */
  fixtureCut: 12,
  fixtureNotchWidth: 96,
  fixtureNotchDepth: 22,
  fixtureNotchSlope: 12,
  fixtureLift: 6,
  /** Bottom corner cut on the active tab plate. */
  tabChamfer: 16,
  /** Corner cut on fields and buttons — the system's smallest chamfer. */
  fieldCut: 10,
  /** Corner cut on a dossier panel: the card chamfer, on all four corners. */
  panelCut: 12,
  /** The HUD plate's strong cut, on the top-left and bottom-right corners. */
  hudCut: 14,
  /** The HUD plate's answering cut, on the top-right and bottom-left. */
  hudAccentCut: 4,
  /** Denser HUD plate used by quiz objectives. */
  compactHudCut: 12,
  compactHudAccentCut: 3,
  /** Octagon corner cut, as a fraction of the badge's shortest side. */
  octagonCutRatio: 0.15,
  /**
   * A collectible card wears the HUD chamfer, but scaled to its own width so
   * every card size keeps the same proportion instead of the fixed 14/4 plate.
   */
  cardCutRatio: 0.13,
  cardCutMin: 10,
  cardCutMax: 30,
  /** The only rounded radii in the system — reserved for pills and meters. */
  radius: {
    none: "0",
    sm: "2px",
    md: "4px",
    pill: "999px",
  },
} as const;

/**
 * The signature panel silhouette: cut corners, plus a notch stepped into the
 * top-right edge.
 */
export const signalClipPath = [
  `polygon(`,
  `${shape.signalCut}px 0,`,
  `calc(100% - ${shape.signalNotch + 8}px) 0,`,
  `calc(100% - ${shape.signalNotch}px) 8px,`,
  `100% 8px,`,
  `100% calc(100% - ${shape.signalCut}px),`,
  `calc(100% - ${shape.signalCut}px) 100%,`,
  `8px 100%,`,
  `0 calc(100% - 8px),`,
  `0 ${shape.signalCut}px`,
  `)`,
].join(" ");

/** Square top with a centred trapezoidal status notch and cut lower corners. */
export const fixtureClipPath = (() => {
  const halfNotch = shape.fixtureNotchWidth / 2;
  const opening = halfNotch + shape.fixtureNotchSlope;
  return [
    "polygon(",
    "0 0,",
    `calc(50% - ${opening}px) 0,`,
    `calc(50% - ${halfNotch}px) ${shape.fixtureNotchDepth}px,`,
    `calc(50% + ${halfNotch}px) ${shape.fixtureNotchDepth}px,`,
    `calc(50% + ${opening}px) 0,`,
    "100% 0,",
    `100% calc(100% - ${shape.fixtureCut}px),`,
    `calc(100% - ${shape.fixtureCut}px) 100%,`,
    `${shape.fixtureCut}px 100%,`,
    `0 calc(100% - ${shape.fixtureCut}px)`,
    ")",
  ].join(" ");
})();

/** Regular octagon used for team badges and avatars. */
export const octagonClipPath = (() => {
  const cut = `${shape.octagonCutRatio * 100}%`;
  const rest = `${100 - shape.octagonCutRatio * 100}%`;
  return `polygon(${cut} 0, ${rest} 0, 100% ${cut}, 100% ${rest}, ${rest} 100%, ${cut} 100%, 0 ${rest}, 0 ${cut})`;
})();

/** Fields and buttons: the same small cut on all four corners. */
export const fieldClipPath = (() => {
  const c = `${shape.fieldCut}px`;
  return `polygon(${c} 0, calc(100% - ${c}) 0, 100% ${c}, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, ${c} 100%, 0 calc(100% - ${c}), 0 ${c})`;
})();

/**
 * A dossier panel: the card chamfer taken evenly around all four corners. The
 * profile's stacked surfaces read as one family because they share it, and it
 * differs from `fieldClipPath` only in carrying a card's cut rather than a
 * control's.
 */
export const panelClipPath = (() => {
  const c = `${shape.panelCut}px`;
  return `polygon(${c} 0, calc(100% - ${c}) 0, 100% ${c}, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, ${c} 100%, 0 calc(100% - ${c}), 0 ${c})`;
})();

/**
 * The HUD plate: a strong chamfer on the top-left and bottom-right corners, and
 * a smaller answering cut on the other two. Cards and action surfaces share it
 * so they read as one piece of hardware.
 *
 * `hudChamferPath` is the same geometry at any pair of cuts. Most surfaces want
 * the tokenised `hudClipPath`; a dense HUD built at several sizes at once — a
 * ball strip, a sting plate, a score token — needs the cuts to scale with the
 * element, and reaches for the function instead.
 */
export function hudChamferPath(bigCut: number, smallCut: number): string {
  const big = `${bigCut}px`;
  const small = `${smallCut}px`;
  return `polygon(${big} 0, calc(100% - ${small}) 0, 100% ${small}, 100% calc(100% - ${big}), calc(100% - ${big}) 100%, ${small} 100%, 0 calc(100% - ${small}), 0 ${big})`;
}

export const hudClipPath = hudChamferPath(shape.hudCut, shape.hudAccentCut);

/** The slightly tighter HUD silhouette used by quiz-set objective cards. */
export const compactHudClipPath = (() => {
  const big = `${shape.compactHudCut}px`;
  const small = `${shape.compactHudAccentCut}px`;
  return `polygon(${big} 0, calc(100% - ${small}) 0, 100% ${small}, 100% calc(100% - ${big}), calc(100% - ${big}) 100%, ${small} 100%, 0 calc(100% - ${small}), 0 ${big})`;
})();

/**
 * The card silhouette: the HUD chamfer again, sized from the two custom
 * properties a card sets for itself, so one path serves every card size — and
 * so an overlay such as the reveal's foil sweep clips to the exact same shape
 * by inheriting them rather than measuring the card at runtime.
 *
 * Use this string, not `var(--ds-clip-card)`, on anything that overrides the
 * cuts. A custom property's `var()` references resolve against the element that
 * *declares* it, so `--ds-clip-card` always resolves its cuts on `:root` and
 * silently ignores a local override; assigning this value directly resolves
 * them on the element using it, which is the whole point.
 */
export const cardClipPath = (() => {
  const big = "var(--ds-card-cut-big)";
  const small = "var(--ds-card-cut-small)";
  return `polygon(${big} 0, calc(100% - ${small}) 0, 100% ${small}, 100% calc(100% - ${big}), calc(100% - ${big}) 100%, ${small} 100%, 0 calc(100% - ${small}), 0 ${big})`;
})();

/** The chamfer measurements a card of the given width should declare. */
export function cardCuts(width: number): { big: number; small: number } {
  const big = Math.min(
    Math.max(width * shape.cardCutRatio, shape.cardCutMin),
    shape.cardCutMax,
  );
  return { big, small: big / 2 };
}

/** Active tab plate: square on top, cut on both bottom corners. */
export const tabPlateClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${shape.tabChamfer}px), calc(100% - ${shape.tabChamfer}px) 100%, ${shape.tabChamfer}px 100%, 0 calc(100% - ${shape.tabChamfer}px))`;

export type ShapeTokens = typeof shape;
