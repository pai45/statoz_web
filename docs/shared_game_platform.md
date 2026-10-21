# Shared game platform — implementation guide

Every game doc in this folder (`hoop_duel.md`, `final_over.md`, `tennis_rally.md`,
`grand_prix.md`, `football_chess.md`, `pitch_duel.md`, `football_quiz.md`,
`starter_pack.md`) depends on the same small platform. This page documents it once:
the route, the registry and launcher, the shared game modules, the outside
contracts (design system, economy, decks, progression, cards), the storage keys,
and the patterns every game follows. For each contract there are two options:
copy the real module from `statoz_web_pai`, or drop in the minimal shim shown here.

---

## 1. Project prerequisites

| | This repo |
|---|---|
| Framework | Next.js **16.3** App Router, React **19.2** (`useSyncExternalStore`, `useId`, lazy `useState` everywhere) |
| Language | TypeScript 5, `strict`, target ES2017, `moduleResolution: "bundler"` |
| Path alias | `"paths": { "@/*": ["./src/*"] }`. Every import below assumes it |
| Styling | Tailwind CSS **v4** (`@import "tailwindcss"` + `@theme inline` in `src/app/globals.css`), CSS Modules per game, CSS custom properties `--ds-*` from `src/design-system/styles/tokens.css` |
| Fonts | Self-hosted variable woff2 via `next/font/local`: **Onest** (`--font-onest`, body) and **Orbitron** (`--font-orbitron`, display). Tokens: `--ds-font-body`, `--ds-font-display` |
| Runtime deps | `next`, `react`, `react-dom` (`lottie-react` is not used by the games) |
| Static export | Optional (`GITHUB_PAGES=true` → `output: "export"`). `NEXT_PUBLIC_BASE_PATH` is honoured through `publicAsset()` |

Check the Next.js version in the target project. This repo's `AGENTS.md` warns
that its Next.js has breaking changes. `PageProps<"/play/[...slug]">` and
`LayoutProps<"/">` are the generated global route types of Next 16.

### Design tokens the games read

Copy `src/design-system/styles/tokens.css` (352 lines) and the `@theme inline`
block from `src/app/globals.css` (128 lines). The games reference:

```css
:root {
  --ds-color-background-primary: #0d111a;  --ds-color-background-secondary: #0f172b;
  --ds-color-background-elevated: #1d293d; --ds-color-background-muted: #070c1f;
  --ds-color-text-default: #ffffff; --ds-color-text-muted: #90a1b9; --ds-color-text-subtle: #cad5e2;
  --ds-color-border-default: #314158; --ds-color-border-muted: #243654; --ds-color-border-strong: #45556c;
  --ds-color-accent-white: var(--ds-color-text-default);
  --ds-color-accent-cyan: #5cdfff;  --ds-color-accent-violet: #c27aff; --ds-color-accent-orange: #ff8904;
  --ds-color-accent-lime: #51ff94;  --ds-color-accent-gold: #fdc700;   --ds-color-accent-blue: #2b7fff;
  --ds-color-accent-racing: #f42d29; --ds-color-accent-pink: #ff94c1;
  --ds-color-success: #05df72; --ds-color-warning: #fdc700; --ds-color-danger: #ff4d4d; --ds-color-info: #3c95da;
  --ds-color-rarity-bronze-light: #e8a45c; --ds-color-rarity-bronze-base: #cd7f32; --ds-color-rarity-bronze-deep: #5c3a1a;
  --ds-color-rarity-silver-light: #f1f5f9; --ds-color-rarity-silver-base: #cbd5e1; --ds-color-rarity-silver-deep: #64748b;
  --ds-color-rarity-gold-light: #ffe9a8;   --ds-color-rarity-gold-base: var(--ds-color-accent-gold); --ds-color-rarity-gold-deep: #b8860b;
  --ds-color-rarity-platinum-light: #b9f6ff; --ds-color-rarity-platinum-base: var(--ds-color-accent-cyan); --ds-color-rarity-platinum-deep: var(--ds-color-accent-violet);
  --ds-gradient-app-background: linear-gradient(135deg, #010916 0%, #0e2646 100%);
  --ds-gradient-pack-headline:  linear-gradient(135deg, #5cdfff 0%, #d4ff5c 100%);
  --ds-text-nano: .5rem; --ds-text-micro: .5625rem; --ds-text-2xs: .625rem; --ds-text-xs: .6875rem;
  --ds-text-compact: .75rem; --ds-text-sm: .8125rem; --ds-text-md: .875rem; --ds-text-base: .9375rem;
  --ds-text-lg: 1.0625rem; --ds-text-badge: 1.125rem; --ds-text-xl: 1.25rem; --ds-text-2xl: 1.375rem;
  --ds-text-3xl: 2rem; --ds-text-hero: 2.625rem; --ds-text-celebration: 3.375rem; --ds-text-countdown: 4.5rem;
  --ds-tracking-tight: .02em; --ds-tracking-label: .05em; --ds-tracking-wide: .07em; --ds-tracking-display: .075em;
  --ds-tracking-ultra: .12em; --ds-tracking-mega: .2em; --ds-tracking-max: .3em;
  /* …shape (chamfer cuts), leading, spacing: see tokens.css */
}
```

The canvas renderers read these once through `getComputedStyle` and carry
hard-coded hex fallbacks (`renderer/palette.ts` in each game), so the canvases draw
correctly even without them. The React HUDs use Tailwind classes mapped to them
(`text-muted`, `bg-surface-elevated`, `font-display`, `text-cyan`, `tracking-ultra`,
…), so those **do** need the tokens and the `@theme inline` mapping.

---

## 2. Route, registry and launcher

### Route

```
src/app/(fullscreen)/layout.tsx          // no nav chrome; min-h-dvh; background: var(--ds-gradient-app-background)
src/app/(fullscreen)/play/[...slug]/page.tsx
```

```tsx
// src/app/(fullscreen)/play/[...slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameLauncher, gameForHref, playableGameHrefs } from "@/features/games";

export function generateStaticParams() {          // every playable route is known up front
  return playableGameHrefs().map((href) => ({ slug: href.replace(/^\/play\//, "").split("/") }));
}

async function resolve(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  return gameForHref(`/play/${slug.join("/")}`);
}

export async function generateMetadata({ params }: PageProps<"/play/[...slug]">): Promise<Metadata> {
  const found = await resolve(params);
  return found ? { title: found.entry.title, description: found.entry.subtitle } : { title: "Play" };
}

export default async function PlayPage({ params }: PageProps<"/play/[...slug]">) {
  const found = await resolve(params);
  if (!found) notFound();
  return <GameLauncher game={found.game} entry={found.entry} />;
}
```

### Registry (`src/mocks/games/game-registry.ts`)

```ts
export type GameEntry = {
  kind: "hero" | "quick"; title: string; titleLines?: string[]; subtitle: string;
  badgeLabel?: string; ctaLabel?: string; accent: AccentName; glow?: boolean;
  requiresDeck?: true;           // → starter pack gate + loadout check
  scene: GameSceneId; href: string;
};
export const gameRegistry: Record<GameId, GameEntry> = { /* … */ };
export function gameForHref(href: string): { game: GameId; entry: GameEntry } | null;
export function playableGameHrefs(): string[];
export function sportForGame(game: GameId): Sport;   // in sport-decks.ts
```

The entries for the documented games:

| GameId | href | Sport | requiresDeck | Component |
|---|---|---|---|---|
| `pitch-duel` | `/play/pitch-duel` | football | ✓ | `PitchDuel` |
| `football-chess` | `/play/football-chess` | football | ✓ | `FootballChess` |
| `football-quiz` | `/play/quiz/football` | football | — | `SportQuiz` |
| `final-over` | `/play/final-over` | cricket | ✓ | `FinalOver` |
| `hoop-duel` | `/play/basketball` | basketball | ✓ | `HoopDuel` |
| `tennis-rally` | `/play/tennis` | tennis | ✓ | `TennisRally` |
| `grand-prix-dash` | `/play/grand-prix` | motorsport | ✓ | `GrandPrix` |

Every game component has the same props, `{ game: GameId; entry: GameEntry }`.

### Launcher (`src/features/games/components/game-launcher.tsx`)

`AuthBoundary` → `GameLandingAdProvider` → hydration gate → starter pack gate →
loadout check → `renderers[game]`. The code and the gate rules are in
[`starter_pack.md`](./starter_pack.md#1-the-gate-game-launchertsx). If you do not
need auth, ads, or starter packs, render the game component directly from a client
page:

```tsx
"use client";
import { HoopDuel } from "@/features/games/basketball";
export default function Page() {
  return <HoopDuel game="hoop-duel" entry={gameRegistry["hoop-duel"]} />;
}
```

(Keep the hydration gate if the game reads `localStorage` or `useSearchParams`
before its first effect. See `pitch_duel.md`.)

---

## 3. Shared game modules (`src/features/games/shared/`): copy as-is

| File | Exports | Used by |
|---|---|---|
| `components/matchmaking/*` (≈800 lines incl. CSS) | `GameMatchGate`, `GameMatchmakingView`, `GameKickoffCountdown`, `MatchmakingArenaBackground`, `matchmakingFighter`, `useMatchmakingPlayer`, `GameMatchmakingConfig`, `MatchmakingFighter` | Hoop Duel, Final Over, Tennis, Football Chess, Pitch Duel |
| `components/game-landing-ad.tsx` (+css) | `GameLandingAdProvider`, `GameLandingAd` | Tennis, Grand Prix, Football Chess, Quiz (lobby only) |
| `hooks/use-game-return.ts` | `useGameReturn()` → `router.back()` | All |
| `state/use-reduced-motion.ts` | re-exports `usePrefersReducedMotion` from `@/shared/hooks` | All arcade games |
| `state/use-clock.ts` | `useClock()`, a 1 Hz `Date \| null` | Daily modes |
| `engine/random-source.ts` | `type RandomSource = () => number` | Football Chess |
| `engine/curves.ts` | `clamp01`, `lerp`, `interval`, `easeOutCubic`, `easeOutBack`, `quadraticBezier`, `cubicCurve`, Flutter-exact `easeInCubicCurve`/`easeOutCubicCurve`/`easeInOutCubicCurve` | Final Over |
| `engine/opponent.ts` | `targetRatingForLevel(level) = min(95, 66 + 2·level)`, `generateShootoutOpponent(level, atk, def, gk, random)` → `[atk, atk, def, def, gk]` | Football Chess |
| `data/opponent-names.ts` | `opponentNames` (25 × 20 = 500), `randomOpponentName(random?)` | All head-to-head modes |
| `../components/game-leaderboard-cta.tsx` | `GameLeaderboardCta({ sport, gameId })` → link to `/leaderboard?type=games&sport=…&mode=…` | Lobbies (optional) |
| `../state/game-career.ts` | `useGameCareer()` aggregates every game's stats store into `{ xpByTrack, played, won, … }` | Quiz (reveal), profile. **Imports all games.** Trim it to the games you port |

### Matchmaking gate

```tsx
<GameMatchGate
  goLabel="TIP OFF!"                                   // the stamp the countdown ends on
  config={{
    title: "HOOP DUEL",
    queueLabel: "SCANNING GLOBAL HOOP QUEUE",
    player: useMatchmakingPlayer(`LV ${level}`),       // { name, avatar, badge } from the profile
    opponent: matchmakingFighter(rivalName, `LV ${level}`),   // avatar seeded from the name
    backgroundAsset?: "/assets/…", searchAccent?, lockedAccent?,
  }}
  onReady={startTheMatch}
  onCancel={backToLobby}
/>
```

The timings are theatre (there is no real queue): a 2.6 s scan, a 360 ms rival
reveal, a 700 ms hold, then 3-2-1 at 1 s per tick and a 780 ms GO stamp. Reduced
motion collapses the scan to 180 ms. Outside deps: `Avatar`, `Button`, `Glyph`,
`accentVar`, `feedbackVar`, `withAlpha`, `hudChamferPath` (design system),
`publicAsset`, `next/image`, `useProfileIdentity`/`playerDisplayName` (profile),
and `avatarOptionById`/`avatarForName` (onboarding).

---

## 4. Outside contracts and minimal shims

### 4.1 `@/domain/cards`

```ts
export type CardTier = "bronze" | "silver" | "gold" | "platinum";
export const cardTiers: CardTier[] = ["bronze", "silver", "gold", "platinum"];
export function cardTierRank(tier: CardTier) { return cardTiers.indexOf(tier); }

export type PlayerRole =
  | "attacker" | "defender" | "goalkeeper" | "batsman" | "bowler"
  | "basketballGuard" | "basketballWing" | "basketballBig"
  | "tennisSingles" | "f1Driver" | "f2Driver" | "nascarDriver" | "indycarDriver";

export const playerRoleLabels: Record<PlayerRole, string> = {
  attacker: "ATK", defender: "DEF", goalkeeper: "GK", batsman: "BAT", bowler: "BOWL",
  basketballGuard: "G", basketballWing: "W", basketballBig: "BIG", tennisSingles: "SGL",
  f1Driver: "F1", f2Driver: "F2", nascarDriver: "CUP", indycarDriver: "IND",
};

export type PlayerCard = {
  id: string; name: string; shortName: string; country: string; countryCode: string;
  position: string; role: PlayerRole; rating: number; trait: string; tier: CardTier;
  icon: string; portraitSrc?: string;
};

export type ActionCategory = "attack" | "defense" | "special";
export type ActionCard = {
  id: string; title: string; category: ActionCategory; tier: CardTier;
  effect: string; power: number; risky: boolean; icon: string;
};
```

Card pools live in `src/mocks/packs/*` and are re-exported from `@/features/packs`
as `footballAttackers`, `footballDefenders`, `footballGoalkeepers`,
`footballPlayerCards`, `cricketBattingCards`, `cricketPlayerCards`,
`basketballPlayerCards`, `tennisPlayerCards`, `racingPlayerCards`,
`allActionCards`, `playerCardForId`, `actionCardForId` and `portraitForCard`.

### 4.2 `@/domain/sports`

```ts
export type Sport = "football" | "cricket" | "basketball" | "tennis" | "motorsport";
export const sportModules = {
  football:   { sport: "football",   label: "Football",   shortLabel: "FTBL",   accent: "cyan" },
  cricket:    { sport: "cricket",    label: "Cricket",    shortLabel: "CRKT",   accent: "white" },
  basketball: { sport: "basketball", label: "Basket",     shortLabel: "BALL",   accent: "gold" },
  tennis:     { sport: "tennis",     label: "Tennis",     shortLabel: "TENNIS", accent: "lime" },
  motorsport: { sport: "motorsport", label: "Motorsport", shortLabel: "MOTOR",  accent: "racing" },
} as const;
export function sportModuleFor(sport: Sport) { return sportModules[sport]; }
```

### 4.3 `@/domain/progression` (copy verbatim; pure)

```ts
const levelXp = 50;   // a level costs 50 XP more than the one before: 0, 100, 300, 600, 1000 …
export function xpToReach(level: number) { return levelXp * level * (level - 1); }
export function levelFromXp(totalXp: number) {
  const xp = Math.max(0, totalXp);
  return Math.max(1, Math.floor((levelXp + Math.sqrt(levelXp * levelXp + 4 * levelXp * xp)) / (2 * levelXp)));
}
export function levelProgress(totalXp: number) {
  const xp = Math.max(0, totalXp), level = levelFromXp(xp);
  const start = xpToReach(level), span = xpToReach(level + 1) - start, intoLevel = xp - start;
  return { level, intoLevel, levelSpan: span, toNextLevel: span - intoLevel, fraction: span === 0 ? 0 : intoLevel / span };
}

export type ProgressTrack = "pitchDuel" | "shootout" | "footballChess" | "quiz" | "bingo" | "guessPlayer"
  | "finalOver" | "hoopDuel" | "grandPrix" | "tennis" | "prediction" | "cardsMeta";
export type TrackXp = Partial<Record<ProgressTrack, number>>;
export function totalTrackXp(xp: TrackXp) { return Object.values(xp).reduce((s, v) => s + (v ?? 0), 0); }
```

### 4.4 `@/design-system` helpers

The games import these small helpers everywhere:

```ts
export function accentVar(name: "white"|"cyan"|"violet"|"orange"|"lime"|"gold"|"blue"|"racing"|"pink") {
  return `var(--ds-color-accent-${name})`;
}
export function feedbackVar(name: "success" | "warning" | "danger" | "info") {
  return `var(--ds-color-${name})`;
}
export function withAlpha(color: string, alpha: number) {
  return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
}
/** The chamfered HUD silhouette as a clip-path polygon. */
export function hudChamferPath(bigCut: number, smallCut: number) {
  const big = `${bigCut}px`, small = `${smallCut}px`;
  return `polygon(${big} 0, calc(100% - ${small}) 0, 100% ${small}, 100% calc(100% - ${big}), calc(100% - ${big}) 100%, ${small} 100%, 0 calc(100% - ${small}), 0 ${big})`;
}
```

The components they use are `Button` (`size`, `fullWidth`, `glow`, `accent`),
`Glyph` + `glyphRegistry` + `GlyphName` (a name → SVG icon map using
Material-style names such as `sports_basketball`, `bolt`, `close`, `shield`),
`Avatar`, `TrophyIcon`, `ArrowLeftIcon`, `CloseIcon`, `LockIcon`, `QuizIcon`,
`BoltIcon`, `BrandIcon`, and the card faces `PlayerCard` / `ActionCard` (plus
`cardCuts`, `playerCardWidths` and `rarityPack` for the pack reveal). Port
`src/design-system/` (tokens + icons + those components), or map them to your own
component library. The props are small and visible at each call site.

### 4.5 `@/features/economy`

The real store is `src/features/economy/state/economy-store.ts` (596 lines). It is
one versioned blob, `statoz.economy.v1`, with coins (opening balance 1000), owned
items, equipped cosmetics, starter claims, the daily drop timestamp, a transaction
log (250 entries), and `settledRewardIds` (the last 512) as the payout guard. The
games call:

| Function | Contract |
|---|---|
| `useEconomy()` | `{ coins, owned: { playerCardIds, actionCardIds, kitIds, jerseyIds, liveryIds, … }, equipped: { kitId, jerseyId, liveryId, … }, starterClaims }` |
| `settleCoinReward({ id, coins, title, subtitle? })` | **Idempotent by `id`.** Credits coins once |
| `spendCoins({ id, coins, title, subtitle? })` | Returns `{ ok: true } \| { ok: false, reason: "insufficient" }` |
| `equipCosmetic(kind, id)` | Only if owned |
| `claimStarterPack(sport, claim)` | Idempotent per sport. Merges the ids into owned |
| `useIsEconomyHydrated()` | `false` on the server and first render, then `true` |

Minimal shim (same storage pattern, without the transaction log):

```ts
"use client";
import { useSyncExternalStore } from "react";
import type { Sport } from "@/domain/sports";

type Claim = { claimedAt: string; playerCardIds: string[]; actionCardIds: string[] };
type Economy = {
  coins: number;
  owned: { playerCardIds: string[]; actionCardIds: string[]; kitIds: string[]; jerseyIds: string[]; liveryIds: string[] };
  equipped: { kitId: string; jerseyId: string; liveryId: string };
  starterClaims: Partial<Record<Sport, Claim>>;
  settledRewardIds: string[];
};
const key = "app.economy.v1";
const fresh: Economy = Object.freeze({
  coins: 1000,
  owned: { playerCardIds: [], actionCardIds: [], kitIds: ["voltage"], jerseyIds: ["statoz"], liveryIds: ["gridLine"] },
  equipped: { kitId: "voltage", jerseyId: "statoz", liveryId: "gridLine" },
  starterClaims: {}, settledRewardIds: [],
}) as Economy;

const listeners = new Set<() => void>();
let raw: string | null | undefined; let value: Economy = fresh;
function read(): Economy {
  let next: string | null = null;
  try { next = localStorage.getItem(key); } catch {}
  if (next !== raw) { raw = next; try { value = next ? { ...fresh, ...JSON.parse(next) } : fresh; } catch { value = fresh; } }
  return value;
}
function write(next: Economy) {
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { value = next; }
  raw = undefined; listeners.forEach((l) => l());
  return next;
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };

export const useEconomy = () => useSyncExternalStore(subscribe, read, () => fresh);
export const readEconomy = () => (typeof window === "undefined" ? fresh : read());
export const useIsEconomyHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export function settleCoinReward({ id, coins }: { id: string; coins: number; title: string; subtitle?: string }) {
  const e = readEconomy();
  if (e.settledRewardIds.includes(id)) return e;
  return write({ ...e, coins: e.coins + Math.max(0, Math.floor(coins)), settledRewardIds: [...e.settledRewardIds, id].slice(-512) });
}
export function spendCoins({ coins }: { id: string; coins: number; title: string; subtitle?: string }) {
  const e = readEconomy();
  if (e.coins < coins) return { ok: false as const, reason: "insufficient" as const, snapshot: e };
  return { ok: true as const, snapshot: write({ ...e, coins: e.coins - coins }) };
}
export function equipCosmetic(kind: "kit" | "jersey" | "livery", id: string) {
  const e = readEconomy();
  const owned = e.owned[`${kind}Ids` as const];
  return owned.includes(id) ? write({ ...e, equipped: { ...e.equipped, [`${kind}Id`]: id } }) : e;
}
export function claimStarterPack(sport: Sport, claim: Claim) {
  const e = readEconomy();
  if (e.starterClaims[sport]) return e;
  const merge = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  return write({ ...e,
    owned: { ...e.owned, playerCardIds: merge(e.owned.playerCardIds, claim.playerCardIds), actionCardIds: merge(e.owned.actionCardIds, claim.actionCardIds) },
    starterClaims: { ...e.starterClaims, [sport]: claim } });
}
```

### 4.6 `@/features/cards-decks`

Real store: `src/features/cards-decks/state/deck-store.ts`, key `statoz.decks.v2`
(named deck slots, each with one loadout per sport; v1 is migrated). The contract:

```ts
export type FootballLoadout   = { sport: "football"; attackers: string[]; defenders: string[]; keeperId: string | null; actionCardIds: string[] };
export type CricketLoadout    = { sport: "cricket"; batterIds: string[] };
export type BasketballLoadout = { sport: "basketball"; playerIds: string[]; starterId: string | null };
export type TennisLoadout     = { sport: "tennis"; playerId: string | null };
export type MotorsportLoadout = { sport: "motorsport"; driverId: string | null };

useDecks(): DeckSnapshot
activeLoadout(snapshot, sport): LoadoutFor<sport> | undefined
isLoadoutComplete(loadout): boolean     // football 2/2/gk/6 · cricket 5 · basketball 3 + starter · tennis 1 · motorsport 1
seedLoadoutFromClaim(sport, playerIds, actionIds)   // see starter_pack.md → loadoutFromClaim
```

Minimal shim: a single deck with no slots works, as long as `activeLoadout`
returns the shapes above.

### 4.7 `@/shared/*`

```ts
// @/shared/config (base-path.ts)
const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const basePath = raw.endsWith("/") ? raw.slice(0, -1) : raw;
export function publicAsset(path: string) { return path.startsWith("/") ? `${basePath}${path}` : path; }

// @/shared/hooks
export function usePrefersReducedMotion(): boolean {            // useSyncExternalStore on matchMedia
  return useSyncExternalStore(
    (cb) => { const q = matchMedia("(prefers-reduced-motion: reduce)"); q.addEventListener("change", cb); return () => q.removeEventListener("change", cb); },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false);
}
export function useCountUp(target: number | undefined, durationMs = 600): number;  // rAF easeOutCubic; jumps straight to the target under reduced motion

// @/shared/utils
export function formatInt(value: number) { return new Intl.NumberFormat("en-US").format(Math.round(value)); }
```

### 4.8 Profile, onboarding, auth, ads, streaks (optional)

| Import | Contract | Who needs it |
|---|---|---|
| `@/features/profile` → `useProfileIdentity()`, `playerDisplayName` | `{ displayName, avatarId, … }`; fallback `"PLAYER ONE"` | Matchmaking player banner, Pitch Duel |
| `@/features/onboarding` → `avatarOptionById(id)`, `avatarForName(name)` | `{ id, label, src }` from 6 avatars in `/assets/avatars/*.webp`; `avatarForName` hashes the name | Matchmaking banners |
| `@/features/auth` → `AuthBoundary` | Renders children only for a logged-in session | Launcher (remove if no auth) |
| `@/features/ads` → `AdSlot({ placement })` | A placeholder ad frame | `GameLandingAd` (stub it or delete the ad) |
| `@/features/streaks/activity` → `recordStreakActivity(activity, date)` | Daily streak credit | Pitch Duel (no-op is fine) |
| `@/features/packs` → `DailyDrop({ sport })` | Lobby daily free-card tile | Lobbies (optional) |

---

## 5. localStorage keys

| Key | Owner | Contents |
|---|---|---|
| `statoz.economy.v1` | economy | Wallet, owned/equipped, starter claims, payout guard |
| `statoz.packs.v1` | packs (legacy) | Old starter claims, merged into the economy on read |
| `statoz.decks.v2` (`v1` legacy) | cards-decks | Deck slots and per-sport loadouts |
| `statoz.hoopduel.v1` | Hoop Duel | Career + difficulty + hints |
| `statoz.finalover.v1` | Final Over | Career + tier + kit + hints |
| `statoz.tennis.v1` | Tennis Rally | Career, settings, mastery, achievements, settled ids, **resume snapshot** |
| `statoz.grandprix.v1` | Grand Prix | Career, PBs by circuit × laps, last circuit/laps |
| `statoz.footballchess.v1` | Football Chess | W/D/L, streaks, formation |
| `statoz.pitch-duel.v1` | Pitch Duel | XP, record, tutorials, last 25 matches |
| `statoz.quiz.v1` | Quiz | Per sport → mode → set progress |

Rename the `statoz.` prefix in the target project if you like, but keep the
version suffixes so you can migrate later.

---

## 6. Patterns every game follows

### 6.1 Browser store (copy this for any new game)

```ts
"use client";
import { useSyncExternalStore } from "react";

const storageKey = "statoz.mygame.v1";
type Stats = { games: number; wins: number; xp: number };
const nothingPlayed: Stats = Object.freeze({ games: 0, wins: 0, xp: 0 });   // also the server snapshot

let cachedRaw: string | null = null;            // useSyncExternalStore compares by reference,
let cachedValue: Stats = nothingPlayed;          // so the parse is cached on the raw string
const listeners = new Set<() => void>();

function readRaw() { try { return window.localStorage.getItem(storageKey); } catch { return null; } }
function coerce(v: unknown): Stats { /* validate every field, fall back to defaults */ return { ...nothingPlayed, ...(v as object) }; }
function getSnapshot(): Stats {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try { cachedValue = raw === null ? nothingPlayed : coerce(JSON.parse(raw)); } catch { cachedValue = nothingPlayed; }
  return cachedValue;
}
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => { if (e.key === storageKey || e.key === null) onChange(); };   // cross-tab
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(onChange); window.removeEventListener("storage", onStorage); };
}
function write(next: Stats) {
  try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  cachedRaw = null; listeners.forEach((l) => l());
}
export const useStats = () => useSyncExternalStore(subscribe, getSnapshot, () => nothingPlayed);
export const readStats = () => (typeof window === "undefined" ? nothingPlayed : getSnapshot());
export const useIsHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);
```

### 6.2 Real-time games (Hoop Duel, Final Over, Tennis, Grand Prix)

```
pure engine (rules, seeded RNG, no React)  ──step(intent, dt)──▶ events
game/loop object: fixed timestep accumulator (1/120 s; Final Over 1/60 s)
                  frame clamp (1/30 s) · edge consumption (press/release reach one substep)
                  juice (camera, shake, slow-mo, stings) as plain fields
React seam:  useState(() => new Game(config))          // one instance; survives Strict Mode
             useLoop(game, paint, active)              // rAF → game.step(dt) → paint(canvas)
             useHud(game)                              // useSyncExternalStore + quantised projection + signature cache
             useEvents(game, handler)                  // ref-backed handler, subscribe once
             useControls(game)                         // memoised input API
UI: <canvas> (DPR-scaled, absolute inset-0) + HUD/controls/overlays as React layers on top
```

### 6.3 Session orchestration

- **Lobby ↔ session swap.** A rematch increments a `session` counter used as the
  session's `key`, so the engine, canvas and timers remount fresh. No reset
  effects.
- **Random draws only in the browser** (lazy `useState` initialisers or click
  handlers), never during server render or at module scope.
- **Settle once.** Guard settlement with a `useRef` flag *and* make the store and
  the coin payout idempotent by a unique id (`useId()`, a match id, or
  `Date.now()` + random).
- **Leaving mid-match** abandons the attempt: no record, no reward.
- **Reduced motion:** every game checks `usePrefersReducedMotion()` and shortens
  or skips shake, slow-mo, cinematics and timed beats.
- **Wide screens:** the canvas games cap their play column (Tennis 520 px, Grand
  Prix 560 px) or cap the world scale by viewport height (Hoop Duel). Layouts use
  `min-h-dvh` and `env(safe-area-inset-*)`.
