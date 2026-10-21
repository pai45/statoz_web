# Starter Pack — implementation guide

The first-launch card gate. The first time a player opens a game that fields a
deck (`requiresDeck: true`), the launcher rolls **that sport's starter pack**,
plays a full-screen pack-opening cinematic, grants the cards, seeds a valid
loadout from them, and only then mounts the game. It happens once per sport,
recorded per browser.

| Sport | Unlocks | Contents | Odds |
|---|---|---|---|
| football | Pitch Duel, Penalty Shootout, Football Chess | 2 attackers + 2 defenders + 1 keeper + **6 action cards** (3 attack + 3 defence) | Each card drawn at 55 / 35 / 4 / 1 (bronze / silver / gold / platinum) |
| cricket | Final Over | 5 bronze batters | Bronze only |
| basketball | Hoop Duel | 1 guard + 1 wing + 1 big | 70 / 25 / 5 / **0** (no platinum) |
| tennis | Tennis Rally | 1 bronze player | Bronze only |
| motorsport | Grand Prix Dash | 1 bronze driver | Bronze only |

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. Sources:

- `src/features/packs/` (≈6k lines including 1.8k of generated portrait maps):
  rolling, reveal UI, claim state, catalog.
- `src/features/games/components/game-launcher.tsx`: the gate.
- `src/features/economy/state/economy-store.ts` → `claimStarterPack` (persistence).
- `src/features/cards-decks/state/deck-store.ts` → `seedLoadoutFromClaim` /
  `loadoutFromClaim`.
- `src/mocks/packs/*`: the card pools (football 180, cricket 180, basketball 180,
  tennis 100, racing 105, actions 64).

> The other platform pieces (design tokens, `PlayerCard`/`ActionCard` design-system
> components, economy and decks store patterns) are in
> [`shared_game_platform.md`](./shared_game_platform.md).

---

## 1. The gate (`game-launcher.tsx`)

```tsx
export function GameLauncher({ game, entry }: GameLauncherProps) {
  return (
    <AuthBoundary intent="play" returnTo={entry.href} fullScreen message={`Log in to play ${entry.title}…`}>
      <GameLandingAdProvider>
        <AuthenticatedGameLauncher game={game} entry={entry} />
      </GameLandingAdProvider>
    </AuthBoundary>
  );
}

function AuthenticatedGameLauncher({ game, entry }: GameLauncherProps) {
  const sport = sportForGame(game);
  const hydrated = useIsHydrated();          // false on the server and the first client render
  const claimed = useIsPackClaimed(sport);
  const decks = useDecks();

  // Storage is unreadable on the server: the prerendered frame names the game and nothing else.
  if (!hydrated) return <GameOpening entry={entry} />;

  if (entry.requiresDeck && !claimed) {
    return <StarterPackGate game={game} entry={entry} sport={sport} />;
  }
  if (entry.requiresDeck && !isLoadoutComplete(activeLoadout(decks, sport))) {
    return <DeckRequired sport={sport} entry={entry} />;   // link to /decks/<sport>?returnTo=<href>
  }
  return <GameSurface game={game} entry={entry} />;
}

/** Mounted only after hydration, so the roll happens exactly once and only in the browser. */
function StarterPackGate({ game, entry, sport }: GameLauncherProps & { sport: Sport }) {
  const [reveal] = useState(() => rollStarterPackFor(sport));   // lazy: one roll per mount
  const [opened, setOpened] = useState(false);
  if (opened) return <GameSurface game={game} entry={entry} />;
  return (
    <StarterPackReveal
      reveal={reveal}
      onComplete={() => { claimPack(sport, reveal); setOpened(true); }}
    />
  );
}
```

Key decisions:

- **No roll during render on the server.** A pack drawn there would differ from
  the client's and cause a hydration mismatch. The `hydrated` gate plus a lazy
  `useState` makes the roll happen once, in the browser.
- **The claim happens at the end of the reveal**, not when it starts. If the
  player closes the tab mid-reveal, the next visit rolls a fresh pack.
- `DeckRequired` covers the case where a claim exists but the active deck profile
  is incomplete (for example after switching deck slots).

---

## 2. Rolling (`features/packs/rolling.ts` + `data/starter-packs.ts`)

All rolls accept a `RandomSource = () => number` (default `Math.random`), so tests
can pass a seeded generator.

### Football: rarity-targeted draws without repeats

```ts
export const starterPackTierWeights = { bronze: 55, silver: 35, gold: 4, platinum: 1 };

// The tier a card counts as for the draw is derived from its NUMBERS, not card.tier:
export function packRarityForRating(rating: number) {         // players
  return rating >= 90 ? "platinum" : rating >= 86 ? "gold" : rating >= 80 ? "silver" : "bronze";
}
export function packRarityForPower(power: number) {           // actions
  return power >= 22 ? "platinum" : power >= 16 ? "gold" : power >= 10 ? "silver" : "bronze";
}

export function rollPackRarity(random = Math.random): CardTier {
  const roll = random(); let cumulative = 0;
  for (const tier of ["platinum", "gold", "silver", "bronze"] as const) {   // rare first
    cumulative += starterPackTierWeights[tier] / 95;
    if (roll < cumulative) return tier;
  }
  return "bronze";
}

/** Draw one card of the rolled tier; if none is left, take the NEAREST tier by ordinal distance. */
function drawByRarity<T>(pool: T[], rarityOf: (c: T) => CardTier, taken: Set<T>, random): T {
  const available = pool.filter((c) => !taken.has(c));
  const target = cardTiers.indexOf(rollPackRarity(random));
  const distance = (c: T) => Math.abs(cardTiers.indexOf(rarityOf(c)) - target);
  const nearest = Math.min(...available.map(distance));
  const candidates = available.filter((c) => distance(c) === nearest);
  const pick = candidates[Math.floor(random() * candidates.length)];
  taken.add(pick);
  return pick;
}
```

`rollFootballStarterPack` draws 2 strikers, 2 defenders and 1 keeper, then 6
actions split evenly between `attackActionCards` and `defenseActionCards` (an odd
count gives the extra one to a random side). No card repeats within a pack, and
`special` actions never appear in a starter pack.

### Basketball: one per court role, with its own odds and fallback

```ts
export const starterPackOdds = { bronze: 70, silver: 25, gold: 5, platinum: 0 };

export function rollFrom<T>(pool: T[], tierOf: (t: T) => CardTier, odds, random): T | null {
  if (pool.length === 0) return null;
  const wanted = pickWeighted(odds, random);
  for (const tier of [wanted, "platinum", "gold", "silver", "bronze"] as const) {   // fixed preference
    const matches = pool.filter((item) => tierOf(item) === tier);
    if (matches.length > 0) return matches[Math.floor(random() * matches.length)];
  }
  return pool[Math.floor(random() * pool.length)];
}
// rollBasketballStarterPack: for role of [guard, wing, big] → rollFrom(non-platinum cards of that role)
```

### Cricket, tennis, motorsport: bronze only

```ts
function drawUniqueBronze(pool, count, random, failure) {
  const available = pool.filter((c) => c.tier === "bronze");
  if (available.length === 0) throw new Error(failure);
  const picked = [];
  while (picked.length < count && available.length > 0)
    picked.push(...available.splice(Math.floor(random() * available.length), 1));
  return picked;
}
// cricket: 5 from cricketBattingCards · tennis: 1 from tennisPlayerCards · motorsport: 1 from racingPlayerCards
```

### Pack XP

```ts
export function packXp(players: PlayerCard[], actions: ActionCard[]) {
  return players.reduce((s, c) => s + c.rating, 0)
       + actions.reduce((s, c) => s + Math.max(15, 30 + c.power), 0);
}
```

### Dressing the reveal (`rollStarterPackFor(sport, random?) → PackRevealData`)

| Sport | `brandLabel` | `headline` | `ctaLabel` | Summary | Group actions | Max animated players |
|---|---|---|---|---|---|---:|
| football | PITCH DUEL | `STARTER\nPACK` | ENTER THE GAME | `N CARDS ADDED TO YOUR COLLECTION` | yes | 5 |
| cricket | FINAL OVER | `CRICKET\nSTARTER` | ENTER FINAL OVER | `N CARDS ADDED TO YOUR COLLECTION` | no | 3 |
| basketball | HOOP DUEL | `HOOP\nSTARTER` | ENTER HOOP DUEL | `N CARDS ADDED TO YOUR ROSTER DECK` | no | 3 |
| tennis | TENNIS RALLY | `TENNIS\nSTARTER` | ENTER TENNIS RALLY | `YOUR FIRST PLAYER IS SIGNED` | no | 1 |
| motorsport | GRAND PRIX DASH | `PIT LANE\nSTARTER` | ENTER GRAND PRIX DASH | `YOUR FIRST DRIVER IS SIGNED` | no | 1 |

`statusLabel` is always `UNLOCKED`, and `levelsGained` is always `[]`.

> Note: with `groupActionCards: false` every card flips individually, so cricket
> flips all 5 batters even though `maxAnimatedPlayerCards` is 3. The cap only
> applies when actions are grouped (`revealAnimatedItems`).

---

## 3. Claiming (persistence and deck seeding)

```ts
// features/packs/state/claimed-packs.ts
export function claimPack(sport: Sport, reveal: PackRevealData): void {
  const claim = {
    claimedAt: new Date().toISOString(),
    playerCardIds: reveal.playerCards.map((c) => c.id),
    actionCardIds: reveal.actionCards.map((c) => c.id),
  };
  claimStarterPack(sport, claim);                                    // economy store
  seedLoadoutFromClaim(sport, claim.playerCardIds, claim.actionCardIds);  // deck store
}
export const useIsHydrated = useIsEconomyHydrated;
export function useIsPackClaimed(sport) { return useEconomy().starterClaims[sport] !== undefined; }
```

**Economy** (`localStorage["statoz.economy.v1"]`). `claimStarterPack` is
idempotent: an existing claim for that sport is a no-op. It merges the ids into
`owned.playerCardIds` / `owned.actionCardIds`, stores `starterClaims[sport]`, and
appends a `grant` transaction (`STARTER PACK · FOOTBALL`, delta 0). A legacy key,
`statoz.packs.v1`, is merged on read.

**Decks** (`localStorage["statoz.decks.v2"]`). The claim becomes the first valid
loadout:

```ts
export function loadoutFromClaim(sport, players, actions = []) {
  if (sport === "football")   return { sport, attackers: players.slice(0, 2), defenders: players.slice(2, 4),
                                       keeperId: players[4] ?? null, actionCardIds: actions.slice(0, 6) };
  if (sport === "cricket")    return { sport, batterIds: players.slice(0, 5) };
  if (sport === "basketball") { const ids = players.slice(0, 3); return { sport, playerIds: ids, starterId: ids[0] ?? null }; }
  if (sport === "tennis")     return { sport, playerId: players[0] ?? null };
  return { sport, driverId: players[0] ?? null };
}
```

This depends on the **order** the roll produces: football is
`[atk, atk, def, def, gk]` and basketball is `[guard, wing, big]`. The deck store
also self-repairs. On every read, any sport with a claim but an incomplete loadout
is re-seeded from the claim (`claimSeeded`).

`isLoadoutComplete` per sport: football 2/2/keeper/6 actions, cricket 5 batters,
basketball 3 players with the starter among them, tennis 1 player, motorsport 1
driver.

---

## 4. The reveal UI (`StarterPackReveal`)

```
intro ──(3.0 s hold + 380 ms white-out, or SKIP)──▶ reveal (one CardUnpack per animated card, ProgressDots, SKIP)
      ──▶ actions (football only: all 6 action cards on one page, CONTINUE)
      ──▶ summary ("SQUAD ASSEMBLED!", summary label, +XP, player shelf, action shelf, CTA → fade 420 ms → onComplete)
```

**Intro:** the brand label, a gradient headline (`--ds-gradient-pack-headline`),
the orange status word, one "mystery slot" per animated card popping in from
720 ms at 130 ms intervals, and a breathing "PREPARING YOUR SQUAD…". It is all
CSS keyframes with per-element delay and duration custom properties
(`--rise-delay`, `--rise-duration`, `--rise-from`, `--pop-delay`).

**`CardUnpack`** (one card) runs entirely as CSS animations, with React only
swapping what is mounted on four timers:

| Stage | Duration |
|---|---|
| Pack slides in → breathes → shakes | 400 + 400 + 300 ms |
| White-out flash (the card swaps in at its peak) | 150 ms |
| Card flips → settles | 600 + 450 ms |
| Rarity word drops (platinum gets 2 × 800 ms shimmer) | 300 ms |
| Hold | 500 ms |
| Idle levitate → auto-advance (or tap anywhere) | 1500 ms |
| Dismiss | 300 ms |

On landing it also fires a shockwave, seeded confetti, a holo foil sweep, and
rotating god-rays (silver and up), plus an **OVR count-up** that slams in
(750 ms count, 1000 ms hold). Under `prefers-reduced-motion` the schedule shrinks
to 100 / 400 / 800 / 50 ms, because CSS can still the animations but cannot shorten
a timer.

The timings live in `features/packs/constants.ts`. Any value used by both the
component and the stylesheet is passed as a CSS custom property, so the two
cannot drift.

**Card faces** come from the design system: `<PlayerCard>` and `<ActionCard>`
(sizes `sm`/`md`/`lg`), via `RevealCardFace`. Role accents: attacker/batsman/wing
cyan, defender/bowler/big violet, goalkeeper/guard gold, tennis lime, drivers
racing red. Portraits resolve through `portraitForCard(card)`: `card.portraitSrc`,
then the two generated maps of `/assets/shop/portraits/...webp`.

---

## File manifest

| Path | Lines | Role |
|---|---:|---|
| `features/games/components/game-launcher.tsx` | ≈190 | Gate, `StarterPackGate`, `DeckRequired`, `GameOpening` |
| `features/packs/index.ts` | 113 | Public API |
| `features/packs/types.ts` | 150 | `PackRevealItem`, `PackResult`, `StarterPack`, `PackRevealData`, item helpers, `revealAnimatedItems`, `revealGroupedActionItems` |
| `features/packs/rolling.ts` | 404 | All rarity maths and per-sport rolls |
| `features/packs/constants.ts` | 77 | Reveal timeline |
| `features/packs/data/starter-packs.ts` | 121 | `rollStarterPackFor` + per-sport copy |
| `features/packs/state/claimed-packs.ts` | 42 | `claimPack`, `useIsPackClaimed`, `useClaimedPacks`, `useIsHydrated`, `resetClaimedPacks` |
| `features/packs/components/starter-pack-reveal.tsx` | 476 | Intro / reveal / actions / summary |
| `features/packs/components/starter-pack-reveal.module.css` | 98 | Rise/pop/breathe/white-out/fade keyframes, gradient headline |
| `features/packs/components/card-unpack.tsx` | 412 | One card's reveal (+ `useCountUp` for OVR) |
| `features/packs/components/card-unpack.module.css` | 313 | Pack, flash, flip, settle, idle, dismiss, rarity, shimmer, OVR |
| `features/packs/components/reveal-effects.tsx` | 381 | `PackRevealBackdrop`, `RayBurst`, `Shockwave`, `Confetti` (seeded), `HoloSweep`, `tierGlow`, `tierVar` |
| `features/packs/components/reveal-effects.module.css` | 212 | Effect keyframes |
| `features/packs/components/pack-chrome.tsx` | 141 | `PackSkipButton`, `ProgressDots`, `MysterySlot`, `SummaryGroupHeader`, `BottomCtaBar` |
| `features/packs/components/reveal-card-face.tsx` | 100 | `RevealCardFace` (player or action) |
| `features/packs/components/pack-reveal-sequence.tsx` | 66 | Generic one-card-at-a-time reveal (shop and daily drop) |
| `features/packs/components/daily-drop.tsx` (+ css) | 97 | Lobby "DAILY DROP" (free card every 24 h, odds 40/40/16/4) |
| `features/packs/data/{catalog,collection,daily-drop,portraits}.ts` | ≈160 | Lookups, collection XP, daily roll, portrait resolution |
| `features/packs/data/portrait-assets*.generated.ts` | 1820 | Card id → portrait path maps |
| `mocks/packs/*.ts` | ≈900 | Card pools (football attackers/defenders/goalkeepers; cricket batting/bowling; basketball; tennis; racing; 64 actions from 16 blueprints × 4 tiers with power × 0.6 / 0.8 / 1.0 / 1.2) |

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/domain/cards` → `PlayerCard`, `ActionCard`, `CardTier`, `cardTiers`, `cardTierRank`, `playerRoleLabels`, `playerRoleSports` | Types and ranks | See the shared doc for the full types |
| `@/domain/sports` → `Sport` | Keys | |
| `@/features/economy` → `claimStarterPack`, `useEconomy`, `useIsEconomyHydrated`, `resetStarterClaims`, `claimDailyDrop` | Persistence | |
| `@/features/cards-decks` → `seedLoadoutFromClaim`, `activeLoadout`, `isLoadoutComplete`, `useDecks` | Deck seeding and the gate | |
| `@/design-system` → `Button`, `TrophyIcon`, `Glyph`, `glyphRegistry`, `PlayerCard`, `ActionCard`, `cardCuts`, `playerCardWidths`, `rarityPack` | Card faces and pack shell | The biggest UI dependency. Port the two card components or substitute your own |
| CSS tokens `--ds-color-rarity-{bronze,silver,gold,platinum}-{light,base,deep}`, `--ds-gradient-pack-headline`, `--ds-color-accent-*`, `--ds-text-*`, `--ds-tracking-*` | Effects and typography | `tokens.css` |
| `@/shared/hooks` → `useFullScreenMoment` (daily drop only) | Hides chrome | Optional |
| `@/features/auth` → `AuthBoundary` (launcher) | Login wall | Remove if your app has no auth |

---

## Porting steps

1. Copy `src/features/packs/` and `src/mocks/packs/`. Portrait art
   (`public/assets/shop/portraits/**`) is **343 MB** and optional: without it,
   `portraitForCard` still returns paths, so either copy the folder or empty the
   two `portrait-assets*.generated.ts` maps. Cards with no portrait fall back to
   their glyph face.
2. Port or replace the economy and decks stores. At minimum you need
   `claimStarterPack`, `useEconomy().starterClaims`, `useIsEconomyHydrated`,
   `seedLoadoutFromClaim`, `activeLoadout`, `isLoadoutComplete` and `useDecks`
   (minimal versions are in the shared doc).
3. Port `game-launcher.tsx`, or put the same gate in front of whichever game
   component you mount:

   ```tsx
   if (!hydrated) return <Opening/>;
   if (requiresDeck && !claimed) return <StarterPackGate …/>;
   if (requiresDeck && !isLoadoutComplete(activeLoadout(decks, sport))) return <DeckRequired …/>;
   return <Game …/>;
   ```

4. Make sure the design tokens (`tokens.css`) and the Orbitron and Onest fonts are
   loaded. The reveal relies heavily on `--ds-*` variables.
5. Verify: clear `localStorage`, open `/play/pitch-duel`, and check that the intro
   shows 5 mystery slots, each player flips, the 6 actions appear grouped, and the
   summary shows "11 CARDS ADDED…". After ENTER THE GAME, `statoz.economy.v1.starterClaims.football`
   exists and `statoz.decks.v2` holds a complete football loadout. Reload and the
   pack must **not** show again. To test other sports' odds deterministically, call
   `rollStarterPackFor(sport, seededRandom)` in a unit test.

## Invariants and gotchas

- The order of cards in a roll is load-bearing for `loadoutFromClaim`. If you
  change the roll, change the seeding.
- `drawByRarity` buckets by **rating/power thresholds**, not by `card.tier`. A card
  printed "gold" with an 85 rating draws as silver.
- `drawUniqueBronze` throws if a pool has no bronze cards. Keep at least `count`
  bronze cards in the cricket, tennis and racing pools.
- Never roll during a server render or at module scope.
