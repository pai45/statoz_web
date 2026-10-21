# Final Over — implementation guide

A three-over (18 legal balls) cricket run chase. A seeded attack of three bowlers
sends down deliveries with a line, length, pace and swing. The player times their
shot by **releasing a tap or swipe anywhere over the pitch**: the swipe direction
places the shot (off / straight / leg / behind) and an upward or fast flick lofts
it. After contact the camera cuts to a top-down field view, where AI fielders chase,
catch, drop or throw, and the player decides **RUN / HOLD / TURN BACK** against a
live run-out risk indicator. Reach the target before running out of balls or
wickets.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. The source of truth is
`src/features/games/final-over/` (≈10k lines). Copy that folder; use this guide to
understand it and wire the outside dependencies.

> Shared pieces (launcher route, matchmaking gate, economy, decks, progression,
> design-system helpers, `shared/engine/curves.ts`) are documented in
> [`shared_game_platform.md`](./shared_game_platform.md). The first-launch card gate
> is in [`starter_pack.md`](./starter_pack.md).

---

## At a glance

| | |
|---|---|
| Game id | `final-over` |
| Sport | `cricket` |
| Route | `/play/final-over` |
| Entry component | `FinalOver` from `src/features/games/final-over/index.ts` |
| Requires deck | Yes: cricket loadout `batterIds` (any ≥ 1 owned batter fields a side; they are cosmetic identity only) |
| Rendering | One `<canvas>` with two cross-faded cameras (batting view and field view) + React HUD |
| Simulation | `MatchController`: deterministic, fixed 60 Hz (16 667 µs) steps, SplitMix64 **BigInt** RNG |
| Persistence | `localStorage["statoz.finalover.v1"]` |
| Rewards | XP (tier-multiplied) into the `finalOver` track; coins via `settleCoinReward` (50 win / 10 loss) |
| Static assets | none (everything is drawn) |
| Requirements | `BigInt` support. `tsconfig` target ES2017 works because the code uses `BigInt("0x…")`, not `0x…n` literals |

---

## How it plays

- **Format:** 3 overs × 6 balls = 18 legal balls. No-balls and wides add 1 run and
  are re-bowled (a no-ball also grants a **free hit**). Max 3 no-balls and 5 wides
  per match. Wides are dead balls (no running).
- **Tiers** pick the target, the timing windows, the wickets in hand, the fielding
  quality and the OVERDRIVE price:

| Tier | Targets | Perfect / good / early-late / poor (ms) | Wickets | Catch (base / keeper) | OVERDRIVE segments | XP × |
|---|---|---|---:|---|---:|---:|
| `rookie` | 32 · 36 · 40 | 80 / 180 / 300 / 400 | 4 | .58 / .68 | 4 | 0.8 |
| `pro` | 44 · 48 · 52 · 56 | 65 / 150 / 245 / 330 | 3 | .68 / .76 | 5 | 1.0 |
| `elite` | 58 · 62 · 66 | 50 / 115 / 190 / 275 | 2 | .82 / .88 | 8 | 1.35 |

- **Bowlers:** one per over, shuffled per match from three profiles with
  learnable biases. VOLT (pace) attacks off stump and bowls yorkers, EDGE (seam)
  sits on a good length at middle, and DRIFT (spin) works leg side and short.
- **Objective** (one per match, seeded): hit 2 boundaries, score 6 runs in the
  first 3 legal balls, or complete a double. Completing it earns a star.
- **Stars on a win:** 1 + objective + (≥ 2 balls to spare **or** 0 wickets lost).
- **Combo and OVERDRIVE:** runs off the bat build a combo (max ×3), and each
  scoring delivery charges the OVERDRIVE meter (`1/2/3` for runs/four/six plus
  `combo − 1`). When the meter is full the player can arm a **power shot**
  (×1.18 power, +0.08 control).
- **Fielding:** 8 outfielders + keeper + bowler. The field cycles through 5
  layouts (BALANCED, OFF GUARD, LEG GUARD, STRAIGHT WALL, CLOSE ATTACK), one step
  per physical delivery. The fielders who would arrive first chase the ball
  (reaction delay + distance / speed).
- **Fair final ball:** on the last legal ball of a live chase needing ≤ 6, the
  delivery has no extras, a hittable line and length, and reduced pace.

### Controls

| Input | Action |
|---|---|
| Tap anywhere over the pitch | Straight drive along the ground |
| Swipe left / right | Off side / leg side |
| Swipe up | Straight (an upward front swipe > 26 px lofts it) |
| Swipe down | Behind (glance) |
| Fast flick (≥ 900 px/s) | Lofts, in any direction |
| `←` `→` `↑` `↓` | Off / leg / straight loft / behind |
| `Space` | Straight along the ground |
| `R` / `H` | Run / hold |
| `Esc` | Pause |
| On-screen RUN / HOLD / BACK plates | Run decisions (BACK only before 45% of the run) |

The **release timestamp** is what the engine grades: the swing is a
commit-on-release gesture, so a held press does nothing until the finger lifts.

---

## Architecture

```
types.ts            phases, vectors (field radius = 1), DeliverySpec, ContactOutcome, MatchState …
tuning.ts           GameplayTuning (+ rookie/pro/elite presets), target ladder, field layouts, tiers
constants.ts        presentation-only beats (shake, stings, swing pose, gesture thresholds)
        │
engine/random.ts            DeterministicRandom (SplitMix64, BigInt) + seedFor(match, ordinal, stream)
engine/delivery-generator.ts generateDelivery(): line/length/speed/swing/extras per delivery
engine/resolvers.ts          pure rules: timing, contact, ball flight, catches, run-outs, objectives, stars
engine/commands.ts           GameCommand + GameplayEvent discriminated unions
engine/match-controller.ts   MatchController: the sole gameplay authority (dispatch, step, events)
        │
state/use-match-engine.ts    useMatchController, useMatchLoop (rAF), useHudSnapshot, useMatchEvents, useMatchCommands
state/final-over-progress.ts localStorage career store, XP formula, grade
        │
components/final-over.tsx    orchestrator: lobby → matchmaking → session; settle rewards
components/final-over-arena.tsx  <canvas>; two cameras cross-faded through offscreen buffers
components/renderer/*        stadium, batting-view, field-view, rig (batter/bowler/fielders), effects
components/swing-surface.tsx the whole pitch is the bat (pointer + keyboard → SwingGesture)
components/final-over-{hud,controls,overlays,lobby}.tsx, result-cinematic.tsx
```

**Contract:** rendering sends `GameCommand`s and observes `MatchState` and
`GameplayEvent`s. It never mutates the score or the simulation.

---

## File manifest

| Path (under `src/features/games/final-over/`) | Lines | Role |
|---|---:|---|
| `index.ts` | 9 | Public API: `FinalOver`, `FinalOverProps` |
| `types.ts` | 531 | Domain vocabulary, vector maths, state selectors (`score`, `runsNeeded`, `canSwing` …) |
| `tuning.ts` | 459 | `GameplayTuning`, tier presets, `targetOptions`, `lineX`, `fieldLayouts`, `tierXpMultipliers` |
| `constants.ts` | 108 | Presentation timings, gesture thresholds, batting projection constants |
| `engine/random.ts` | 158 | `DeterministicRandom`, `seedFor`, `randomForStream`, `visualSeed` |
| `engine/delivery-generator.ts` | 143 | `generateDelivery` |
| `engine/resolvers.ts` | 531 | `resolveTiming`, `compatibility`, `resolveContact`, `launchBall`, `stepBall`, `boundaryValue`, `selectChasers`, `catchChance`, `riskForMargin`, `isRunOut`, `updateObjective`, `nextCombo`, `chargeFor`, `starsForWin` |
| `engine/commands.ts` | 115 | `GameCommand`, `GameplayEvent` |
| `engine/match-controller.ts` | 1409 | `MatchController`, `initialMatchState` |
| `state/use-match-engine.ts` | 318 | React seam (loop, HUD snapshot, events, commands) |
| `state/final-over-progress.ts` | 250 | Stats store, `calculateFinalOverXp`, `gradeFor`, `recordFinalOver`, `saveLobbySelection` |
| `data/bowlers.ts` | 58 | Three bowler profiles with weighted line/length maps (**key order matters**) |
| `data/kits.ts` | 89 | 8 kits (player picks via economy `kitId`; the opponent gets a contrasting one) + skin/hair looks |
| `components/final-over.tsx` | 589 | `FinalOver` + `FinalOverSession` |
| `components/final-over-arena.tsx` | 397 | Canvas, DPR sizing, camera blend, per-frame paint |
| `components/swing-surface.tsx` | 346 | `classifyBattingGesture`, pointer + keyboard input |
| `components/final-over-controls.tsx` | 384 | Run deck (RUN/HOLD/BACK with risk colouring), status strip |
| `components/final-over-hud.tsx` | 404 | Score/target/balls, ball strip, `OverdriveRail`, `StingLayer` |
| `components/final-over-overlays.tsx` | 219 | `BowlerReveal` (between overs), `PauseOverlay`, `QuitDialog` |
| `components/result-cinematic.tsx` | 350 | Staged result: verdict, stars, grade, XP count-up |
| `components/final-over-lobby.tsx` | 147 | Tier tiles, stats, play CTA, leaderboard, daily drop |
| `components/renderer/geometry.ts` | 104 | Batting projection (perspective to the bowler's end), bounce point |
| `components/renderer/stadium.ts` | 425 | Sky, stands, crowd dots (hype-reactive), hoardings |
| `components/renderer/batting-view.ts` | 516 | Pitch, stumps, batter/bowler, incoming ball, bounce marker |
| `components/renderer/field-view.ts` | 161 | Top-down ground, fielders, ball, runner |
| `components/renderer/rig.ts` | 1049 | Articulated athletes (swing poses, run-up cycle, fielding motions) |
| `components/renderer/effects.ts` | 206 | Rings, pulses, bursts per `EffectKind` |
| `components/renderer/palette.ts` | 244 | Reads `--ds-*` tokens once, with hex fallbacks |
| `components/final-over.module.css` | 305 | Styles and keyframes |

---

## Engine

### Phases

```
idle → matchIntro ─start→ deliveryPreparation (3.0 s) → bowlerRunUp (0.9 s) → incomingBall
   incomingBall ─(swing at/after expected contact, or grace expires)→ contact (0.45 s hold)
   contact ─made contact→ cameraTransition → fieldPlay → runDecision ⇄ runnersMoving ⇄ throwInProgress
   contact ─no contact→ deliveryResult
   … → deliveryResult (0.65 s) → betweenBalls (0.45 s) → deliveryPreparation …
   terminal: won | lost | quit      (paused is a side state)
```

### Determinism

```ts
// Every random decision draws from a named stream for that delivery.
export const randomStreams = ["delivery", "contact", "catchOutcome", "drop", "throwOutcome", "objective"] as const;
// seedFor(matchSeed, physicalOrdinal, stream) → bigint; new DeterministicRandom(seed)
```

`DeterministicRandom` is SplitMix64 implemented with masked 64-bit `BigInt`
arithmetic. Derived seeds exceed `Number.MAX_SAFE_INTEGER`, so **do not convert it
to `number` arithmetic**, or every draw diverges. The draw order inside each
resolver is part of the contract. The same seed and inputs always produce the same
over, whatever the frame rate.

### Fixed step

```ts
step(elapsedMicros: number): void {
  if (elapsedMicros <= 0 || this.state.phase === "paused") return;
  this.accumulatorMicros += Math.min(elapsedMicros, this.tuning.maximumFrameMicros); // 250 ms cap
  while (this.accumulatorMicros >= this.tuning.fixedStepMicros) {                    // 16 667 µs
    this.accumulatorMicros -= this.tuning.fixedStepMicros;
    this.fixedTick(this.tuning.fixedStepMicros);
  }
}
```

The React loop also clamps each frame to 1/30 s before converting to microseconds.

### Commands

```ts
type GameCommand =
  | { type: "start" } | { type: "selectElevation"; elevation } | { type: "selectDirection"; direction }
  | { type: "swing"; direction; elevation?; charge? }        // the commit point
  | { type: "activatePowerShot" } | { type: "startRun" } | { type: "holdBall" } | { type: "turnBack" }
  | { type: "pause" } | { type: "resume" } | { type: "restart"; seed?; target? }
  | { type: "appBackgrounded" } | { type: "quitToHome" };
```

Events (each carries `simulationMicros`) include `matchStarted`, `deliveryPrepared`,
`ballReleased`, `swingAccepted`, `powerShotActivated`, `extraAwarded`,
`contactResolved`, `cameraTransitionStarted`, `runStarted`, `runCompleted`,
`runnerTurnedBack`, `catchTaken`, `catchDropped`, `ballPickedUp`, `throwStarted`,
`runOut`, `boundary`, `wicket`, `deliveryCompleted`, `overComplete`,
`fieldLayoutChanged`, `paused`, `resumed`, `matchEnded` and `quitToHome`.

### Delivery generation (`generateDelivery`)

- Extras are rolled from ball 2 onward: a no-ball (2%) takes precedence over a
  wide (5%), both within the caps.
- **Line** is a weighted pick from the bowler's map (walked in insertion order).
  Wides get `wideOff`/`wideLeg`. `lineX`: wideOff −0.11, off −0.035, middle 0,
  leg 0.035, wideLeg 0.11 (field units).
- **Length** is a weighted pick, and a third identical yorker or bouncer in a row
  becomes full or good.
- Speed is 0.82–1.08 (×0.95 on ball 1), and swing is ±0.012.

### Contact (`resolveContact`)

```ts
timing = resolveTiming(errorMs, hasInput, tuning)   // perfect | good | early | late | poor | miss
// Missed, unreachable (|contactX| > batterReach), or no input → "miss" (bowled if in the stump channel and not short/wide)
technique = compatibility(delivery, direction, elevation)   // 0..1: play the line; keep yorkers down; loft short balls
control  = timingControl * (0.65 + 0.55 * technique) (+ powerShot bonus), clamp 0..1
edged    = random.nextBool(clamp(baseEdge(timing) + (1 - technique) * 0.12, 0, 0.75))
           // baseEdge: perfect .015 · good .06 · early/late .22 · poor .44
power    = timingPower * (0.8 + 0.42 * technique) * U(0.94, 1.06) [* 1.18 power shot] [* U(.35,.65) if edged]
angle    = nominal(direction) ± early/late pull ± spread(control) [± 18° if edged]
           // nominal: offSide −45°, straight 0°, legSide 45°, behind 180°
velocity = ground: 0.36 + 0.64·power ; loft: 0.42 + 0.59·power, vertical 0.55 + 0.45·power   (elite values; rookie/pro hit ~10%/5% harder)
```

### Ball in the field

- `stepBall` integrates position with drag along the ground, gravity in the air
  (1.65), and keeps 54% of speed after the first bounce.
- **Boundary:** the ball crosses radius 1. A loft that has not bounced is a **6**,
  otherwise a **4**. On an exact tie, the boundary beats a pickup, and a bounce
  beats a catch.
- **Catch chance:** `tier base (keeper or fielder, see the tier table) − 0.12 running − 0.12 if power > .85 + 0.06 edge + 0.08 arrived early`,
  clamped to 0.25–0.95.
- **Run-out:** the throw targets the end the runner is heading to (y = ±0.21).
  Travel time is `distance / throwSpeed + 0.1`. Out if
  `stumpBreakMicros < creaseMicros` (a tie is safe). A run takes 1.2 s, and
  turning back is allowed only before 45% progress. Max 3 runs.
- **Risk shown on the RUN plate:** `margin = throwArrival − creaseArrival`;
  > 0.22 s = `safe`, < −0.15 s = `danger`, otherwise `close`.

### Settling a delivery (`finalizeDelivery`)

History is committed first, then **win → wickets lost → balls exhausted** are
checked, in that order (a chase completed on the ball that lost the last wicket is
a win). A completed over rotates the bowler and emits `overComplete`, which the UI
turns into a bowler reveal card.

---

## React seam and orchestration

```ts
const controller = useMatchController(tierTuning[tier], seed, target); // lazy useState; startMatch inside
const hud        = useHudSnapshot(controller, tuning);                 // coarse cached snapshot
const commands   = useMatchCommands(controller);                       // memoised dispatchers
useMatchEvents(controller, onEvent);                                   // stings, effects, tallies
useMatchLoop(controller, paint, active);                               // rAF → controller.step(µs) → paint
```

`FinalOver` view flow: `lobby` → `matchmaking` (`GameMatchGate`, `goLabel="PLAY!"`,
with the rival name drawn on the press) → `playing` (`<FinalOverSession key={session}/>`).

`FinalOverSession`:

- Draws `{ seed, target }` once in the browser. The target is a random rung from
  `tierTargets[tier]`.
- Calls `commands.start()` on mount.
- Maps events to stings: PERFECT, SIX, FOUR, OUT, RUN OUT, DROPPED, POWER SHOT,
  NO BALL · FREE HIT, WIDE and FIELD SHIFT. It also maps them to canvas effects and
  to the tally (sixes, fours, best combo).
- Measures the control deck with a `ResizeObserver` so the pitch never sits under
  it.
- On `hud.over`, a `recorded` ref guards a single call to `recordFinalOver({...})`
  and `settleCoinReward({ id: "final-over-<useId>", coins: won ? 50 : 10 })`. After
  `resultDelayMs` (900 ms) it shows `FinalOverResult`.
- Squad: `activeLoadout(decks, "cricket").batterIds` resolved against
  `cricketBattingCards`. It is identity only (the names on screen); ratings do not
  affect play.
- Kit: the economy's equipped `kitId` if owned, otherwise `"voltage"`. The
  opponent's kit is chosen to contrast with it.

### XP, grade, stats

```ts
export function calculateFinalOverXp(o) {
  let xp = o.won ? 30 : 10;
  xp += o.runs;
  xp += o.stars * 8;
  if (o.objectiveCompleted) xp += 15;
  if (o.won) xp += o.ballsToSpare * 4;
  if (o.won && o.wickets === 0) xp += 10;
  return Math.round(xp * tierXpMultipliers[o.tier]);   // .8 / 1 / 1.35
}
// grade: lost → stars ≥ 2 ? "C" : "D"; won → 3★ & ≥2 spare "S" · 3★ "A" · 2★ "B" · else "C"
```

Store key `statoz.finalover.v1`:
`{ chases, wins, bestScore, bestStars, sixes, fours, bestCombo, hintsSeen, kitId, tier, xp }`.
The lobby tier choice is persisted through `saveLobbySelection(tier, kitId)`.

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/features/cards-decks` → `activeLoadout`, `useDecks` | Cricket squad (`batterIds`) | |
| `@/features/economy` → `settleCoinReward`, `useEconomy` | Coins, equipped/owned `kitId` | If you have no kit shop, pass `"voltage"` |
| `@/features/packs` → `cricketBattingCards`, `DailyDrop` | Squad lookup; lobby daily-drop tile | `DailyDrop` is optional |
| `@/domain/cards` → `PlayerCard` | Type | |
| `@/domain/progression` → `levelFromXp`, `levelProgress` | Lobby level band and badge | |
| `@/design-system` → `accentVar`, `feedbackVar`, `withAlpha`, `hudChamferPath`, `Glyph`, `Button`, … | HUD and overlays | |
| `@/mocks/games` → `GameEntry` | Prop type | |
| `@/features/games/components/game-leaderboard-cta` | Lobby link | Optional |
| `../../shared/components/matchmaking` | Queue → countdown | |
| `../../shared/hooks/use-game-return`, `../../shared/state/use-reduced-motion`, `../../shared/data/opponent-names` | Back, motion, rival | |
| `../../shared/engine/curves` → `easeInCubicCurve`, `easeOutCubicCurve`, `easeInOutCubicCurve` | Flutter-exact cubic Béziers for the swing/rig animation | Copy `shared/engine/curves.ts` |

---

## Porting steps

1. Copy `src/features/games/final-over/` and `src/features/games/shared/`.
2. Provide the outside modules above (see the shared doc for shims).
3. Register `final-over` → `FinalOver` with `href: "/play/final-over"` and
   `requiresDeck: true`.
4. Make sure the runtime supports `BigInt` (all evergreen browsers do). Keep
   `BigInt("0x…")` constructors if your TS target is below ES2020.
5. Verify by clearing storage, claiming the cricket starter pack, playing a rookie
   chase, and checking that a boundary shows SIX/FOUR, that the RUN plate turns red
   under a close throw, that the bowler reveal appears after ball 6, and that the
   stats key and coins update exactly once at the end.

## Invariants and gotchas

- Do not reorder the keys in `data/bowlers.ts` weight maps or the `randomStreams`
  array. Both change every seeded match.
- `resolveTiming` uses milliseconds, while the simulation uses **microseconds**.
  Keep the `* 1_000_000` / `Math.round` conversions where they are.
- The controller is intentionally **not disposed** on unmount (it lives in
  `useState`, so it survives Strict Mode's double effects). All listeners
  unsubscribe themselves.
- The `charge`/backlift branch is ported but unused: the shipped game never sends
  `charge`, so `backliftPower` returns 1.
- The swing is graded at **release**. If you add a "swing button", fire
  `commands.swing(...)` on pointer-up, not pointer-down.
