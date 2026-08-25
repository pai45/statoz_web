import type { ComponentType } from "react";

import {
  AutoAwesomeIcon,
  BasketballIcon,
  BlockIcon,
  BoltIcon,
  CallSplitIcon,
  CompressIcon,
  CricketIcon,
  DangerousIcon,
  DirectionsRunIcon,
  FlagIcon,
  FlameIcon,
  FlashOnIcon,
  FootballIcon,
  GridViewIcon,
  HealingIcon,
  MotorsportIcon,
  MyLocationIcon,
  PanToolIcon,
  PersonPinCircleIcon,
  PsychologyIcon,
  SecurityIcon,
  ShieldIcon,
  SwapHorizIcon,
  SwipeDownIcon,
  SyncAltIcon,
  TennisIcon,
  TrendingUpIcon,
  TurnRightIcon,
  WarningIcon,
} from "./glyphs";
import type { IconProps } from "./icon";

/**
 * Glyphs addressable by name, so data can carry an icon as a string rather than
 * a component. The keys are the Material Symbols names, which is what the card
 * pool already records, so a card's `icon` field crosses over verbatim.
 */
export const glyphRegistry = {
  auto_awesome: AutoAwesomeIcon,
  block: BlockIcon,
  bolt: BoltIcon,
  call_split: CallSplitIcon,
  compress: CompressIcon,
  dangerous: DangerousIcon,
  directions_run: DirectionsRunIcon,
  flag: FlagIcon,
  flash_on: FlashOnIcon,
  grid_view: GridViewIcon,
  healing: HealingIcon,
  local_fire_department: FlameIcon,
  my_location: MyLocationIcon,
  pan_tool: PanToolIcon,
  person_pin_circle: PersonPinCircleIcon,
  psychology: PsychologyIcon,
  security: SecurityIcon,
  shield: ShieldIcon,
  sports_basketball: BasketballIcon,
  sports_cricket: CricketIcon,
  sports_motorsports: MotorsportIcon,
  sports_soccer: FootballIcon,
  sports_tennis: TennisIcon,
  swap_horiz: SwapHorizIcon,
  swipe_down: SwipeDownIcon,
  sync_alt: SyncAltIcon,
  trending_up: TrendingUpIcon,
  turn_right: TurnRightIcon,
  warning: WarningIcon,
} as const satisfies Record<string, ComponentType<IconProps>>;

export type GlyphName = keyof typeof glyphRegistry;

export type GlyphProps = IconProps & {
  name: GlyphName;
};

/** Renders a registered glyph by name. */
export function Glyph({ name, ...props }: GlyphProps) {
  const Component = glyphRegistry[name];
  return <Component {...props} />;
}
