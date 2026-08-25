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
  /** Bottom corner cut on the active tab plate. */
  tabChamfer: 16,
  /** Corner cut on fields and buttons — the system's smallest chamfer. */
  fieldCut: 10,
  /** The HUD plate's strong cut, on the top-left and bottom-right corners. */
  hudCut: 14,
  /** The HUD plate's answering cut, on the top-right and bottom-left. */
  hudAccentCut: 4,
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
 * The HUD plate: a strong chamfer on the top-left and bottom-right corners, and
 * a smaller answering cut on the other two. Cards and action surfaces share it
 * so they read as one piece of hardware.
 */
export const hudClipPath = (() => {
  const big = `${shape.hudCut}px`;
  const small = `${shape.hudAccentCut}px`;
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
