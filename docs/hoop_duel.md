# Hoop Duel — implementation guide

A street 1-on-1 arcade basketball duel: two 45-second halves (plus sudden-death
overtime) against a CPU, played side-on on a single canvas. The player fields the
three-athlete basketball deck from their starter pack, picks a difficulty, and plays
with a move pad plus one contextual ACTION button whose meaning changes with the
situation (shoot, finish, release, defend, block, rebound).

This guide describes the implementation in `statoz_web_pai` so it can be ported
into another Next.js (App Router) project. The source of truth is
`src/features/games/basketball/` (≈9.6k lines). Copy that folder; use this guide to
understand it and to wire the outside dependencies.

> Shared pieces (launcher route, matchmaking gate, economy, decks, progression,
> design-system helpers) are documented once in
> [`shared_game_platform.md`](./shared_game_platform.md). The first-launch card gate
> is in [`starter_pack.md`](./starter_pack.md).

---

## At a glance

| | |
|---|---|
| Game id | `hoop-duel` |
| Sport | `basketball` |
| Route | `/play/basketball` (via the catch-all `/play/[...slug]`) |
| Entry component | `HoopDuel` from `src/features/games/basketball/index.ts` |
| Requires deck | Yes: 3 basketball players (guard / wing / big) + a starter id |
| Rendering | One `<canvas>` (2D context) + React HUD overlays |
| Simulation | Pure TS engine, fixed 120 Hz substeps, seeded LCG RNG |
| Persistence | `localStorage["statoz.hoopduel.v1"]` |
| Rewards | XP into its own track (`hoopDuel`), coins via `settleCoinReward` (50 win / 10 loss) |
| Static assets | `public/assets/games/hoop-duel/hoop-arena.jpg` (lobby backdrop) |
| npm deps | none beyond `react`, `next` |

---

## How it plays

- **Court:** a single x-axis in metres (`0 … 12.6`), hoop on the right at
  `rimX = 11.6`, rim height 3.05 m, 3-pt arc 6.75 m from the rim. The ball also has
  a height axis `h`.
- **Match flow:** half 1 (45 s) → halftime (substitute + stamina rest) → half 2 →
  if tied, overtime where the **next basket wins**. Shot clock is 12 s.
- **Possession:** the first half's possession is a coin flip, the second half
  flips it, and overtime is random. After a basket the conceding side checks the
  ball at `checkSpotX = 3.2`, with the defender reset to `5.6`.
- **Controls (touch):** a left/right move pad (a double-tap is a burst drive; a
  double-tap mid-drive is a spin), and an ACTION pad (tap, hold, release, or swipe
  left inside it for a step-back).
- **Controls (keyboard):** ←/→ move (double-tap = burst), Shift+← = step-back,
  Space or K = ACTION.
- **Contextual ACTION cue**, derived purely from engine state
  (`engine.actionCueFor(team)`):

| Cue | When | What the input does |
|---|---|---|
| `shoot` | You hold the ball | Hold ≥ 0.12 s to gather; release in the lime window |
| `finish` | Moving, within 2.4 m of the rim | Tap = layup, hold while driving inside the dunk gate = dunk |
| `release` | A shot meter is running | Release on the apex |
| `defend` | Defending | Tap = steal lunge, hold = stance |
| `block` | Shooter gathering/rising/faking | Release a hold (≥ 0.16 s) to jump |
| `rebound` | Ball loose with a visible landing marker | Tap to jump at the marker |

- **Systems on top:** stamina (drains per action, regenerates when calm), heat
  ("on fire" for 15 s after 1.0 heat; +12% shot, wider perfect window, faster),
  repeat-shot penalty (scoring from the same zone twice stacks a 0.9× penalty, up to
  2 stacks), ankle breakers, posters, buzzer-beaters, and put-back windows after
  offensive boards.
- **Difficulty** (`rookie` | `pro` | `allStar`) changes only the CPU's perception
  latency, timing jitter, deliberate-mistake rate (epsilon), pump-fake bite chance,
  and steal cooldown. The CPU never gets a better shot.

---

## Architecture

```
types.ts / tuning.ts / constants.ts     pure vocabulary + numbers (no React)
        │
engine/engine.ts   BasketballEngine     the rules: step(playerIntent, cpuIntent, dt) → events
engine/ai.ts       BasketballAI         produces the same BasketballIntent a thumb would
engine/random.ts   BasketballRandom     31-bit LCG, seedable
engine/game-loop.ts HoopDuelGame        fixed-step accumulator, edge consumption, "juice"
        │                               (camera, shake, slow-mo, stings, particles)
state/use-hoop-duel-engine.ts           React seam: rAF loop + throttled HUD snapshot
state/hoop-duel-progress.ts             localStorage career store (useSyncExternalStore)
        │
components/hoop-duel.tsx                orchestrator: lobby ↔ session, phases, rewards
components/hoop-duel-arena.tsx          the <canvas>; draws per frame from game state
components/renderer/*.ts                canvas painters (court, rig, ball, effects, marker)
components/hoop-duel-{hud,controls,overlays,result,lobby}.tsx   React UI
```

Rules for keeping this structure intact:

1. **The engine is the only rule-holder.** The AI and the player feed the same
   `BasketballIntent` type into `engine.step`, so the CPU cannot cheat structurally.
2. **Nothing per-frame goes through React state.** The rAF loop steps the game and
   paints the canvas directly. The HUD subscribes through `useSyncExternalStore`
   to a *quantised projection* of the engine, so frames that change nothing visible
   cost no render.
3. **Fixed timestep.** Wall time is clamped to 1/30 s and accumulated, then spent in
   1/120 s substeps, so a release lands on the same tick on any refresh rate.
4. **Edge consumption.** Press, release, burst and swipe are *edges*: only the first
   substep of a frame receives them, otherwise one release would fire several shots.

---

## File manifest

| Path (under `src/features/games/basketball/`) | Lines | Role |
|---|---:|---|
| `index.ts` | 9 | Public API: `HoopDuel`, `HoopDuelProps` |
| `types.ts` | 386 | Athlete, match config, intents, events, box score, grade + XP formulas |
| `tuning.ts` | 264 | Every rule constant (court, clocks, shot model, defense, stamina, heat, AI) |
| `constants.ts` | 68 | Presentation timings and input thresholds only |
| `engine/engine.ts` | 1676 | The simulation (`BasketballEngine`, `AthleteBody`, `TeamSim`) |
| `engine/ai.ts` | 490 | CPU: delayed perception buffer, offense plans, defense, rebounds |
| `engine/game-loop.ts` | 544 | `HoopDuelGame`: fixed step, input edges, camera/shake/slow-mo/stings/bursts |
| `engine/random.ts` | 43 | `BasketballRandom` LCG + `drawSeed()` |
| `state/use-hoop-duel-engine.ts` | 234 | `useHoopDuelGame`, `useHoopDuelLoop`, `useHoopDuelHud`, `useHoopDuelEvents`, `useHoopDuelControls` |
| `state/hoop-duel-progress.ts` | 235 | Career stats store, `recordHoopDuel`, `saveDifficulty`, `markHintsSeen` |
| `data/athletes.ts` | 163 | Derives the 11 sim ratings + height from a basketball `PlayerCard` |
| `data/liveries.ts` | 58 | 13 team kits; `rivalLiveryId` guarantees a different CPU kit |
| `data/looks.ts` | 141 | Deterministic hair/build/gear/jersey number from athlete id |
| `components/hoop-duel.tsx` | 367 | Orchestrator + `HoopDuelSession` + `buildMatch` |
| `components/hoop-duel-arena.tsx` | 160 | Canvas sizing (DPR), per-frame paint order |
| `components/renderer/geometry.ts` | 93 | World→screen projection (`courtProjection`, `worldToScreen`, camera bounds) |
| `components/renderer/court.ts` | 1077 | `CourtScene`: skyline, arena, floor, hoop, net, shot clock |
| `components/renderer/rig.ts` | 1002 | Stick-rig athletes, poses per `BodyState`, hair, "YOU" marker |
| `components/renderer/ball.ts` | 143 | Ball position/dribble + heat trail |
| `components/renderer/effects.ts` | 184 | `ParticleField` (pooled, 120 cap), impact cinematic zoom |
| `components/renderer/marker.ts` | 94 | Rebound landing marker |
| `components/renderer/palette.ts` | 202 | Reads `--ds-*` CSS tokens once (with hex fallbacks) for canvas colours |
| `components/hoop-duel-hud.tsx` | 368 | Score bar, clocks, `ShotMeter`, `StaminaRail`, `StingLayer` |
| `components/hoop-duel-controls.tsx` | 445 | Move pad, ACTION pad (pointer events), keyboard controls |
| `components/hoop-duel-overlays.tsx` | 367 | Halftime substitution, overtime stinger, quit dialog |
| `components/hoop-duel-result.tsx` | 326 | Staged result reveal: grade, box score, XP count-up |
| `components/hoop-duel-lobby.tsx` | 174 | Lobby: level band, difficulty picker, play CTA, leaderboard, daily drop |
| `components/hoop-duel.module.css` | 318 | Lobby/HUD/overlay styling and keyframes |

---

## Core data types

```ts
// types.ts (abridged)
export type BasketballDifficulty = "rookie" | "pro" | "allStar";
export type ShotZone = "dunk" | "layup" | "close" | "mid" | "three";
export type ReleaseGrade = "perfect" | "good" | "early" | "late";
export type BasketballTrait = "quickRelease" | "deepRange" | "rimPressure" | "glassCleaner";

export type BasketballAthlete = {
  id: string; name: string; ovr: number; teamName: string; teamCode: string;
  position: string; cardRole: "guard" | "wing" | "big";
  archetype: "balancedGuard" | "sharpshooter" | "slasher" | "interiorPower";
  trait: BasketballTrait; tagline: string; heightM: number;
  speed: number; handling: number; inside: number; mid: number; three: number;
  dunk: number; defense: number; steal: number; block: number; rebound: number; stamina: number;
};

export type BasketballMatchConfig = {
  playerRoster: BasketballAthlete[]; playerStarterIndex: number;
  cpuRoster: BasketballAthlete[];    cpuStarterIndex: number;
  difficulty: BasketballDifficulty; seed: number; showHints: boolean;
  teamId: string; cpuTeamId: string;          // livery ids, always different
};

/** One tick of input. The AI produces exactly this. */
export type BasketballIntent = {
  moveAxis: number;        // -1 away from hoop … +1 toward hoop
  burst: boolean;          // edge: double-tap
  actionDown: boolean;     // held
  actionPressed: boolean;  // edge
  actionReleased: boolean; // edge
  heldSeconds: number;     // hold duration at release (or so far)
  swipeBack: boolean;      // edge: step-back
};
```

Events (`BasketballEventType`) are the only way the engine talks outward:
`basketMade`, `shotMissed`, `steal`, `block`, `rebound`, `shotClockViolation`,
`heatStarted`, `heatEnded`, `ankleBreaker`, `poster`, `perfectRelease`,
`halfEnded`, `overtimeStarted`, `matchEnded`, `dunk`, `shotReleased`,
`buzzerBeater`, `spinMove`, `crossover`, …

### Athletes from cards

The engine needs 11 granular ratings plus a height; the card only carries an OVR,
a role and an archetype label in `trait`. `data/athletes.ts` derives them with
fixed per-role deltas, clamped to 25…99:

| Rating | guard | wing | big |
|---|---:|---:|---:|
| speed | +5 | +2 | −12 |
| inside | −5 | +1 | +8 |
| mid | +2 (+5 if sharpshooter) | +1 (+5) | −2 |
| three | +3 (+8 if sharpshooter) | +1 (+8) | −10 |
| dunk | −12 | +3 | +7 |
| defense | −4 | +2 | +5 |
| steal | +2 | +1 | −6 |
| block | −25 | −6 | +10 |
| rebound | −15 | +1 | +10 |
| handling | +7 (+8 shooter) | +2 | −10 |

Heights: guard 1.91 m (1.96 if position includes "F"), wing 2.03 m (2.06 if "PF"),
big 2.11 m (with special cases for Wembanyama and Porziņģis). Height feeds reach,
contests and rebounds. The trait is fixed per archetype: sharpshooter → `deepRange`,
balanced guard → `quickRelease`, slasher → `rimPressure`, interior power →
`glassCleaner`.

If the new project has its own basketball cards, keep `athleteFromCard`. It only
needs `id, name, rating, role ∈ {basketballGuard, basketballWing, basketballBig},
position, trait (archetype label), country, countryCode`.

---

## The engine: key rules

### Step order (per 1/120 s substep)

```ts
step(player: BasketballIntent, cpu: BasketballIntent, dt: number): BasketballEvent[] {
  this.events = [];
  if (this.playPhase === "awaiting" || this.playPhase === "finished") return this.events;
  this.advanceTimers(dt);
  if (this.playPhase === "deadReset") { this.stepDeadReset(dt); return this.events; }
  const intents = [player, cpu];
  for (let t = 0; t < 2; t += 1) {
    if (this.ball.holder === t) this.resolveOffense(this.bodies[t], intents[t]);
    else this.resolveDefense(this.bodies[t], intents[t]);
    this.integrateMovement(this.bodies[t], intents[t], dt);
  }
  this.separateBodies();
  this.stepBall(dt);
  this.stepClocks(dt);
  return this.events;
}
```

`playPhase` is `awaiting` (before a half and at half breaks) → `live` →
`deadReset` (0.9 s walk-back after a basket or violation) → `finished`.

### Offense resolution (priority order)

1. **Spin:** burst while already driving (costs 10 stamina, exposes the ball for 0.1 s).
2. **Burst drive:** 0.9 s at 1.5× speed.
3. **Step-back:** swipe back → slides 0.9 m away and sets up a jump shot.
4. **Dunk / layup:** hold while driving inside the dunk gate (1.5 m, or 2.2 m with
   `rimPressure`). It is a dunk only if `dunk ≥ 72`, stamina ≥ 35 and the lane is
   clear; otherwise it is a layup.
5. **Gather:** hold ≥ 0.12 s (not mid-drive) to start the jump-shot meter.
6. **Release:** grade the timing against the apex (see below).
7. **Tap:** put-back if inside the put-back window, otherwise a layup on the move
   near the rim, otherwise a pump fake.

### Release grading

The apex sits at 42% of a 0.75 s jump (36% with `quickRelease`). The perfect
half-window is:

```ts
perfectHalfWindow(body) {
  const rating = ratingFor(body.spec, this.zoneFor(body.d));
  const contest = this.contestOn(body);
  let half = 0.06                                         // perfectHalfWindowBase
    * (0.7 + 0.5 * clamp((rating - 50) / 50, 0, 1))
    * lerp(0.7, 1.0, clamp(body.stamina01 / 0.6, 0, 1))   // tired players get a narrower window
    * (1 - 0.25 * contest);
  if (heatActive) half *= 1.25;
  if (trait === "quickRelease") half *= 1.15;
  return half;
}
// |offset| ≤ half → perfect; ≤ half + 0.14 → good; else early/late by sign.
// Releasing during the gather (before the jump starts) is always "early".
```

### Shot model (multiplicative, then clamped)

```ts
makeProbability(body, zone, grade, purpose) {
  base = zoneBase(zone)                       // layup .58 · close .50 · mid .46 · three .40
       + (rating - 70) * 0.004
       - max(0, d - zoneRef) * 0.03;          // zeroed for threes with deepRange
  if (purpose === "putback") base += 0.10;
  timing  = perfect 1.3 | good 1.0 | early/late 0.55;
  contest = 1 - 0.55 * clamp(contestOn(body), 0, 1);   // halved effect on rimPressure layups
  balance = moving jumper 0.85 · stepback ≤ 0.92;
  stamina = lerp(0.85, 1.0, clamp(stamina01 / 0.6, 0, 1));
  heat    = heatActive ? 1.12 : 1;
  repeat  = 0.9 ** repeatStacks;
  return clamp(base * timing * contest * balance * stamina * heat * repeat,
               0.02, grade === "perfect" ? 0.93 : 0.88);
}
```

A dunk that is not blocked always scores. Contest is
`proximity(gap / 2.2) × arms (stance/contest 1.0, block-jump 1.3, else 0.5) × height factor`.

### Defense

- **Tap (< 0.12 s)**, resolved in order: rebound jump (if the ball is loose or
  descending) → grounded contest (if the shooter is up and within 2.2 m) → steal lunge.
- **Steal roll** happens once, during the lunge's active frames (0.08–0.2 s), within
  1.1 m: `p = clamp(0.35 + (steal-70)*0.005 + exposed?0.25 − protected?0.65 − (handling-70)*0.003, 0.03, 0.85)`.
- **Hold** near the handler = stance (slower movement, contest arms up).
- **Release a hold (≥ 0.16 s)** against a shooter threat = block jump. It connects
  if the jump started within the block sync window and the reach covers the gap.
  Against dunks it is a separate roll (`0.35 + (block − dunk) × 0.004`, clamped 0.05–0.75).
- **Ankle breaker:** a crossover within 1.3 m of an over-committed defender staggers them.

### Rebounds, clocks, end of half

- A missed shot becomes `loose` with a published landing prediction (that is when
  the "rebound" cue appears). Contested grabs compare a `reboundScore` (distance,
  rating, height, apex timing, box-out, `glassCleaner`).
- A loose ball nobody recovers within 3.5 s is scooped by the nearest player.
- **Buzzer-beater rule:** if the half clock hits 0 while a shot is in the air or
  the ball is loose off a live shot, the half waits for that ball to resolve.
- At the end of half 2, a tie emits `halfEnded{ needsOvertime: true }`. In
  overtime, the first basket calls `endMatch`.

### Seeded RNG

```ts
export class BasketballRandom {
  private state: number;
  constructor(seed: number) { this.state = (seed & 0x7fffffff) || 0x2545f49; }
  nextDouble() { this.state = (Math.imul(1103515245, this.state) + 12345) & 0x7fffffff;
                 return this.state / 0x80000000; }
  nextBool() { return this.nextDouble() < 0.5; }
  nextInt(max: number) { return Math.min(max - 1, Math.max(0, Math.floor(this.nextDouble() * max))); }
}
export function drawSeed() { return Math.floor(Math.random() * 2 ** 31); } // browser only
```

The same seed plus the same two intent streams replays the same match.

---

## The loop (`engine/game-loop.ts`)

`HoopDuelGame` wraps the engine and the AI and owns everything that is
presentation-only but simulation-timed:

```ts
step(rawSeconds: number): void {
  const wallDt = Math.min(rawSeconds, 1 / 30);             // maxFrameSeconds
  if (!this.paused) {
    let simDt = wallDt;
    if (this.slowMoT > 0) { this.slowMoT = Math.max(0, this.slowMoT - wallDt); simDt = wallDt * 0.25; }
    this.accumulator += simDt;
    const frameEvents: BasketballEvent[] = [];
    let first = true;
    while (this.accumulator >= 1 / 120) {                  // substepSeconds
      this.accumulator -= 1 / 120;
      frameEvents.push(...this.stepOnce(first));           // only the first substep gets edges
      first = false;
    }
    if (frameEvents.length > 0) { this.handleEvents(frameEvents); /* notify event listeners */ }
  }
  this.decayFx(wallDt); this.syncCamera(wallDt); /* … */ this.notifyState();
}
```

The input API the controls call is `setMoveAxis(axis)`, `tapBurst()`,
`actionPressed()`, `actionReleased()`, `swipeBack()`, `cancelTouches()` and
`setPaused(bool)`. Match flow is driven by `startHalf(i)`,
`substitutePlayer(rosterIndex)`, `cpuAutoSubstitute()`, `halftimeRest()` and
`summary()`.

`handleEvents` maps engine events to "juice": a sting banner (`+3`, `BLOCKED!`,
`ANKLE BREAKER!`, `YOU'RE ON FIRE!`…), camera shake, slow-mo, an impact zoom, net
sway, crowd hype, and particle bursts. Slow-mo and shake are skipped when
`reducedMotion` is true.

---

## React seam (`state/use-hoop-duel-engine.ts`)

```ts
const game  = useHoopDuelGame(config, reducedMotion); // lazy useState → one instance, Strict-Mode safe
const hud   = useHoopDuelHud(game);                    // quantised snapshot via useSyncExternalStore
const input = useHoopDuelControls(game);               // memoised, stable identity
useHoopDuelEvents(game, onEvents);                     // ref-backed, never resubscribes
useHoopDuelLoop(game, paint, active);                  // rAF: game.step(dt) then paint(...)
```

The HUD projection rounds stamina and heat to hundredths and the meter to 1/200
steps, builds a signature string, and returns the cached object when nothing
visible changed. Keep this pattern. Rendering React at 120 Hz is the main
performance trap in a port.

---

## Orchestration (`components/hoop-duel.tsx`)

```
HoopDuel
 ├─ view "lobby"    → <HoopDuelLobby/>  (also shown while the roster is invalid)
 └─ view "playing"  → <HoopDuelSession key={session}/>   // a rematch = new key = fresh engine
        phase: intro → playing → halftime → playing → (overtimeBreak → playing) → finished → result
```

- **Roster:** `activeLoadout(decks, "basketball").playerIds` → exactly 3 athletes,
  or `null` (the lobby then shows "squad not ready"). The starter is the highest OVR.
- **`buildMatch`** (runs once, in the browser, inside a lazy `useState`): the CPU
  draws 3 random athletes from the full ~180 roster, a random starter, a fresh seed,
  `showHints = !stats.hintsSeen`, and a rival livery different from the player's
  equipped jersey.
- **Intro:** `<GameMatchGate goLabel="TIP OFF!" …/>` sits over the warm canvas, and
  `onReady` calls `game.startHalf(0)`.
- **Halftime:** `HalftimeOverlay` lets the player substitute (it shows each
  bench player's stamina), then calls `halftimeRest()`, `cpuAutoSubstitute()` and
  `startHalf(1)`. Hints are marked seen.
- **`matchEnded`:** a `settled` ref guards against double payout.
  `recordHoopDuel(summary)` returns the XP; `settleCoinReward({ id: "hoop-duel-<useId>", coins: won ? 50 : 10, … })`.
  After `resultDelayMs` (900 ms) the result overlay appears.
- **Quitting mid-match** pauses the game and asks for confirmation. An abandoned
  match records nothing.

### Scoring formulas

```ts
export function calculateBasketballXP({ won, margin, overtime }) {
  if (!won) return overtime ? 6 : 4;
  const base = Math.min(26, 16 + margin * 2);
  return overtime ? Math.min(26, base + 2) : base;
}

// Grade D→S: win +3; FG% ≥60 +2 / ≥45 +1; ≥3 perfect releases +1;
// blocks+steals ≥3 +2 / ≥1 +1; turnovers ≥4 −1; win by ≥8 +1.
// ≥8 S · ≥6 A · ≥4 B · ≥2 C · else D
```

---

## Persistence (`state/hoop-duel-progress.ts`)

Key: `statoz.hoopduel.v1`. Shape:

```ts
type HoopDuelStats = {
  games; wins; losses; otGames; currentStreak; bestStreak; mostPoints; bestMargin;
  totalDunks; totalBlocks; totalPerfects; hintsSeen: boolean;
  difficulty: "rookie" | "pro" | "allStar";   // the lobby choice persists immediately
  xp: number;
};
```

The store pattern is shared by every game: a versioned key, a frozen default that
doubles as the server snapshot, a cached parse keyed by the raw string (so
`useSyncExternalStore` compares by reference), a defensive `coerce`, a cross-tab
`storage` event listener, and try/catch around every storage call. Exports:
`useHoopDuelStats`, `readHoopDuelStats`, `recordHoopDuel`, `saveDifficulty`,
`markHintsSeen`, `winRate`, `resetHoopDuelProgress` and `useIsHydrated`.

If the target project has a profile or career page,
`src/features/games/state/game-career.ts` reads `useHoopDuelStats()` (for `xp`,
`games`, `wins` and streaks). Port it or drop it.

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/features/cards-decks` → `activeLoadout`, `useDecks` | The player's 3-athlete roster | Any store that returns `{ playerIds: string[]; starterId }` for basketball works |
| `@/features/economy` → `settleCoinReward`, `useEconomy` | Coin payout; equipped jersey id | `settleCoinReward` must be idempotent by `id` |
| `@/features/packs` → `basketballPlayerCards` | The roster the athletes are derived from | Any `PlayerCard[]` with basketball roles |
| `@/domain/cards` → `PlayerCard`, `PlayerRole` | Types | See shared doc |
| `@/domain/progression` → `levelFromXp`, `levelProgress` | Lobby level band, matchmaking badge | 20-line pure functions (shared doc) |
| `@/design-system` → `accentVar`, `feedbackVar`, `withAlpha`, `Glyph`, `GlyphName`, `IconProps` | HUD/controls styling, icons | Shims in shared doc |
| `@/shared/config/base-path` → `publicAsset` | Lobby background URL | Prefix for `basePath`; identity function if none |
| `@/mocks/games` → `GameEntry` | Prop type only | |
| `@/features/games/components/game-leaderboard-cta` | Lobby "VIEW LEADERBOARD" link | Optional |
| `../../shared/components/matchmaking` → `GameMatchGate`, `matchmakingFighter`, `useMatchmakingPlayer` | Queue → rival → countdown | Copy `games/shared/components/matchmaking/` |
| `../../shared/hooks/use-game-return` | Back button = `router.back()` | |
| `../../shared/state/use-reduced-motion` | Disables slow-mo/shake | |
| `../../shared/data/opponent-names` | Rival name | |

Canvas colours are read once from CSS custom properties
(`--ds-color-accent-*`, `--ds-color-background-*`, `--ds-font-display`, …) with
hard-coded hex fallbacks in `renderer/palette.ts`. The canvas renders correctly
even if the new project does not define those tokens, but the HUD (Tailwind
classes plus `var(--ds-…)`) needs them. See the shared doc.

---

## Porting steps

1. Copy `src/features/games/basketball/` to the same path (or adjust imports).
2. Copy `src/features/games/shared/` (matchmaking, hooks, data, engine utils) if
   not already ported for another game.
3. Provide `@/domain/cards`, `@/domain/progression`, `@/design-system` helpers,
   `@/shared/config/base-path`, and the economy/decks/packs functions listed above
   (the shared doc has minimal shims if you are not bringing the whole platform).
4. Copy `public/assets/games/hoop-duel/hoop-arena.jpg`.
5. Make sure `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }` and that the
   design tokens CSS is imported in `globals.css`.
6. Register the game: add `"hoop-duel"` to `GameId`, add a registry entry with
   `href: "/play/basketball"` and `requiresDeck: true`, and map it to `HoopDuel` in
   the launcher's `renderers` table. Or render `<HoopDuel game="hoop-duel" entry={…}/>`
   from any client page.
7. The page must be a client boundary (`"use client"` is already at the top of
   every component). Render it full-viewport, outside any app chrome. The game uses
   `min-h-dvh` and absolute layers.
8. Verify by opening the route, clearing `localStorage`, claiming the basketball
   starter pack, playing one half, checking that the halftime substitution works,
   finishing, and checking that `statoz.hoopduel.v1` updated and coins were credited
   once.

## Invariants and gotchas

- Never call `Math.random()` or draw a seed during server render. `buildMatch` runs
  inside a lazy `useState` initialiser in a client component that only mounts after
  hydration.
- A rematch must remount (`key={session}`) rather than reset the engine in place.
- Keep `resetSeconds (0.9) > reactSeconds (0.8)` so both athletes are idle when play
  resumes.
- The canvas must be resized with `devicePixelRatio` and the projection updated
  through `game.setViewport(w, h)`. The projection caps pixels-per-metre by
  viewport height so wide screens reveal more floor instead of enlarging athletes.
- Blur and visibility changes must call `cancelTouches()`, or a held key stays
  stuck down.
