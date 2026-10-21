# Grand Prix Dash — implementation guide

A top-down arcade race on a portrait scrolling road: the player's car plus 19 CPU
cars, 1, 3 or 5 laps on one of five circuits. The race starts with a **five-light
reaction start** (a jump start costs a 2 s throttle cut; a fast reaction earns a
launch boost). Then the player steers, throttles and brakes through corners
whose safe speeds must be respected, drafts in slipstreams, and passes the field.
Finishing position pays XP (multiplied by race length), a personal best adds a
bonus, and staying beached too long is a DNF.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. The source of truth is
`src/features/games/grand-prix/` (≈5.7k lines).

> Shared pieces (launcher route, economy, decks, progression, design-system
> helpers, landing ad, `useCountUp`) are in
> [`shared_game_platform.md`](./shared_game_platform.md). The first-launch card gate
> is in [`starter_pack.md`](./starter_pack.md).

---

## At a glance

| | |
|---|---|
| Game id | `grand-prix-dash` |
| Sport | `motorsport` |
| Route | `/play/grand-prix` |
| Entry component | `GrandPrix` from `src/features/games/grand-prix/index.ts` (the index also exports `useGrandPrixStats`, `readGrandPrixStats`, `resetGrandPrixProgress`, `GrandPrixStats`) |
| Requires deck | Yes: motorsport loadout `driverId` (one driver; identity only) |
| Rendering | `<canvas>` in a column capped at **560 px**: a top-down road scrolling under a fixed player row |
| Simulation | `GrandPrixEngine`, fixed 1/120 s substeps, seeded RNG (two streams: grid and in-race decisions) |
| Persistence | `localStorage["statoz.grandprix.v1"]` |
| Rewards | XP into the `grandPrix` track; coins via `settleCoinReward` (50 for P1, otherwise 10) |
| Cosmetics | 7 liveries owned and equipped through the economy (`equipCosmetic("livery", id)`) |
| Static assets | none |
| npm deps | none |

There is no matchmaking gate. The grid and the lights are the intro.

---

## How it plays

### Physics (1D lap distance + lateral offset; metres, m/s)

| Constant | Value | Meaning |
|---|---:|---|
| `topSpeed` | 88 | ≈ 316 km/h |
| `accel` / `coast` / `brake` | 26 / 10 / 44 | m/s² |
| `trackHalfWidth` / `wallLateral` | 4.5 / 6.5 | Asphalt edge; the wall is a hard clamp |
| `grassTopSpeedFactor` / `grassDrag` | 0.55 / 22 | Off-road penalty |
| `steerRate` | 7.5 | Lateral m/s at full lock |
| `bendCompression` | 0.21 | The car drifts to the **outside** of bends by the same ratio the renderer bends the road |
| `scrub` | 2.2 | Speed lost per second per m/s over a corner's safe speed |
| `wallHitSpeedFactor` / `wallSpinMinSpeed` / `spinSeconds` | 0.35 / 30 / 0.8 | Corner wall impact → spin |
| Slipstream | gap 4–28 m, aligned within 1.8 m → +8% top speed | Straights only |
| `stuckSpeed` / `stuckTimeout` | 14 / 10 s | Below 14 m/s for 10 s → DNF |
| `fieldSize` | 20 | Player starts P8–P16 (random) |
| `jumpStartCutSeconds` | 2.0 | Throttle cut for a jump start |

- **Corners** reach physics only through `safeSpeed`. Overspeed scrubs speed but
  never pushes the car sideways. The car only leaves its line when steered, or
  when the bend slides away under a car that is not steering into it.
- **Contacts:** a car hitting from behind loses 22 m/s², the car hit loses
  10 m/s², and overlapping cars push apart at 12 m/s.

### Start sequence (`state/use-start-sequence.ts`)

Grid hold 1.2 s → five lamps, one per second → dark after a random 0.2–1.5 s.
Throttle before dark is a **jump** start (2 s throttle cut). After dark, the
reaction time grades the launch:

| Reaction | Grade | Rolling speed | Accel × | Boost |
|---|---|---:|---:|---:|
| < 150 ms | perfect | 14 | 1.5 | 3.0 s |
| < 300 ms | great | 10 | 1.35 | 2.5 s |
| < 500 ms | good | 7 | 1.2 | 2.0 s |
| ≥ 500 ms or no throttle for 2 s | slow | 2 | 1.0 | — |

Under reduced motion the reaction test is skipped and the car takes an average
launch. CPU reactions are sampled from strength: `140 + (1−s)·160 + U·(120 + (1−s)·240)` ms.

### CPU drivers

- Strength is `cpuSmartness(level) = min(1, playerLevel / 12)` with per-car spread,
  plus `paceJitter` (±top speed) and `cornerNoise`.
- **Braking:** a stopping-distance lookahead to the next corner within 450 m
  (`(v² − target²) / (2·brake) + 0.15·v ≥ distance`). Weak drivers *believe* the
  safe speed is up to 35% higher, so they arrive hot and lose time to scrub.
- **Steering:** follows the racing line (the apex inside through corners, the
  middle on straights), occasionally covers an attacker on straights (strong
  drivers only), and pulls to the free side (which doubles as an overtake) or
  lifts when a slower car is directly ahead.

### Circuits (`data/circuits.ts`)

| id | Name | Character | ★ |
|---|---|---|---:|
| `harbourStreet` | HARBOUR STREET | STREET (low wall thresholds, hard to pass) | 4 |
| `desertMile` | DESERT MILE | SPEEDWAY (long straights, heavy slipstream) | 2 |
| `emeraldPark` | EMERALD PARK (default) | BALANCED | 3 |
| `mountainPass` | MOUNTAIN PASS | TECHNICAL | 4 |
| `coastalSprint` | COASTAL SPRINT | FLOWING | 3 |

Each circuit is a list of `straight(len)`, `corner({…})` and `chicane({…})`
sections with `safeSpeed` (m/s), `wallThreshold` and a drawn `bend`. Every circuit
opens with a long straight (which the CPU braking lookahead relies on when it wraps
around the lap).

### Controls

| Touch (bottom pads) | Keyboard |
|---|---|
| ◀ ▶ steer plates | `←`/`A`, `→`/`D` |
| Throttle plate | `↑`/`W`/`Space` (the first press also registers the launch) |
| Brake plate | `↓`/`S` |
| — | `Esc` leaves the race (no record, no reward) |

Window blur calls `race.releaseAll()`.

---

## Architecture

```
types.ts / tuning.ts / constants.ts    circuits model, results, XP; physics numbers; presentation beats
data/{circuits,drivers,liveries}.ts    five circuits; CPU name generator; 7 liveries (+ cpuLiveries)
        │
engine/random.ts      raceRandom(seed), drawRaceSeed()
engine/geometry.ts    section lookup, smoothstep centerline (shared by physics and renderer)
engine/field.ts       CarState, buildField (grid), gradeLaunch, launchBoost, applyLaunch, positionOf
engine/engine.ts      GrandPrixEngine.tick(field, inputs, dt): physics, CPU, contacts, finishes
engine/race.ts        GrandPrixRace: fixed-step accumulator, held inputs, listeners (state/overtake/finish)
        │
state/use-race-engine.ts      useGrandPrixRace, useRaceView, useRaceControls, useOvertakes, useRaceFinish
state/use-start-sequence.ts   five lights + reaction grading
state/grand-prix-progress.ts  stats store, personal bests by circuit × laps
        │
components/grand-prix.tsx     lobby ↔ session (key=session); settle on finish; keyboard
components/grand-prix-arena.tsx + renderer/{projection, track, car, effects, palette}
components/{grand-prix-hud, grand-prix-controls, race-overlays, grand-prix-result, grand-prix-lobby, livery-locker}.tsx
```

The `GrandPrixRace` object holds everything per-frame. React hears only about
coarse beats: the view (position, lap, speed) through a cached
`useSyncExternalStore` snapshot, overtakes, and the finish. Contact sparks are
*drained* by the canvas (`race.takeContact()`) and never cause a React render.

---

## File manifest

| Path (under `src/features/games/grand-prix/`) | Lines | Role |
|---|---:|---|
| `index.ts` | 13 | Public API |
| `types.ts` | 237 | Circuit and section model, `GrandPrixResult`, `formatLapTime`, `grandPrixVerdict`, `calculateGrandPrixXp`, `grandPrixXpMultiplier` |
| `tuning.ts` | 95 | Physics constants, `cpuSmartness` |
| `constants.ts` | 89 | Light timings, toasts, canvas camera framing, `raceColumnMaxPx` |
| `data/circuits.ts` | 136 | 5 circuits, `grandPrixCircuit(id)` (falls back to emeraldPark) |
| `data/drivers.ts` | 83 | `generateDriverNames(count, random)` |
| `data/liveries.ts` | 64 | Livery colours, `cpuLiveries`, `ensureEquippedLiveryOwned` |
| `engine/random.ts` | 44 | Seeded RNG |
| `engine/geometry.ts` | 109 | `cumulativeSectionStarts`, `sectionAt`, `lapLocalDistance`, `centerlineX`, `raceCenterlineX` |
| `engine/field.ts` | 301 | Field model and launch rules |
| `engine/engine.ts` | 466 | `GrandPrixEngine` |
| `engine/race.ts` | 277 | `GrandPrixRace`, `RaceView` |
| `state/use-race-engine.ts` | 169 | React seam |
| `state/use-start-sequence.ts` | 128 | Lights and reaction test |
| `state/grand-prix-progress.ts` | 277 | Store, `isPersonalBest`, `recordGrandPrixRace`, `saveCircuit`, `saveLaps` |
| `components/grand-prix.tsx` | 404 | Orchestrator + `GrandPrixSession` |
| `components/grand-prix-arena.tsx` | 183 | Canvas and paint loop |
| `components/renderer/projection.ts` | 89 | World → screen (player row fixed at 68% height, 95 m of road ahead) |
| `components/renderer/track.ts` | 241 | Road sampled every 6 m, kerbs, grass, start line |
| `components/renderer/car.ts` | 307 | Top-down cars in liveries |
| `components/renderer/effects.ts` | 67 | Sparks |
| `components/renderer/palette.ts` | 169 | Token reads with fallbacks |
| `components/grand-prix-hud.tsx` | 122 | Position, lap, timer, speed |
| `components/grand-prix-controls.tsx` | 144 | Steer/throttle/brake plates (pointer events) |
| `components/race-overlays.tsx` | 220 | `LightsRig`, `LaunchFlash`, `LapFlash`, `OvertakeToast`, `StuckWarning` |
| `components/grand-prix-result.tsx` | 345 | Sequenced result (verdict, places gained, lap time, PB, XP count-up, level bar) |
| `components/grand-prix-lobby.tsx` | 554 | Circuit carousel, laps (SPRINT 1 / GRAND PRIX 3 / ENDURANCE 5 with XP ×), livery, record, start |
| `components/livery-locker.tsx` | 235 | Livery picker (owned only) |
| `components/grand-prix.module.css` | 176 | Styles |

---

## Key code

### Fixed step (`engine/race.ts`)

```ts
step(rawSeconds: number): void {
  if (!this.running) return;
  this.accumulator += Math.min(rawSeconds, 1 / 30);
  let changed = false;
  while (this.accumulator >= 1 / 120 && this.running) {
    this.accumulator -= 1 / 120;
    const events = this.engine.tick(this.field, this.playerInputs, 1 / 120);
    // overtakes → listeners (keeps the best one for the result's "MVP move")
    // wall/car contact → pendingContact (drained by the canvas)
    // playerCrossedLine → report({ position, lapTimeMs, bestOvertakeName, dnf: false })
    // playerStuckOut    → report({ position: 20, lapTimeMs: 0, dnf: true })
    changed = true;
  }
  if (changed) this.publish();
}
```

Two RNG streams: `raceRandom(seed)` builds the grid and names, and
`raceRandom(seed ^ 0x51f15eed)` drives in-race CPU decisions, so the grid you see
does not reveal what the drivers will do.

### Session setup (drawn once, in the browser)

```ts
const [setup] = useState<RaceSetup>(() => ({
  circuit: grandPrixCircuit(stats.lastCircuit),
  playerLivery: livery,
  playerLevel: levelFromXp(stats.xp),
  startPosition: 8 + Math.floor(Math.random() * 9),   // P8–P16
  seed: drawRaceSeed(),
  laps: stats.lastLaps,                               // 1 | 3 | 5
}));
```

`lights.grade` becoming non-null calls `race.start(grade)`, which applies the
launch to the player and samples CPU launches.

### Settlement (once)

```ts
useRaceFinish(race, (outcome) => {
  if (settled.current) return; settled.current = true;
  const personalBest = !outcome.dnf && isPersonalBest(current, circuitId, outcome.lapTimeMs, setup.laps);
  const xp = calculateGrandPrixXp(outcome.position, { personalBest, laps: setup.laps });
  recordGrandPrixRace({ position, lapTimeMs, circuit: circuitId, laps: setup.laps, xp });
  settleCoinReward({ id: `grand-prix-${useId}`, coins: position === 1 ? 50 : 10, title: "GRAND PRIX DASH",
                     subtitle: outcome.dnf ? "DNF" : `P${position}` });
  setResult({...});   // shown after resultDelayMs (900 ms)
});
```

### XP

```ts
base = P1 26 · P2 22 · P3 18 · P4–6 12 · P7–10 8 · else 4
xp   = base × (laps ≥ 5 ? 3 : laps ≥ 3 ? 2 : 1) + (personalBest ? 3 : 0)
verdict: P1 "win" · ≤3 "podium" · ≤10 "points" · else "finished"
```

### Stats store (`statoz.grandprix.v1`)

```ts
type GrandPrixStats = {
  races; wins; podiums; bestPosition; currentStreak; bestStreak;
  bestLapMsByCircuit: Record<string, number>;   // key: "emeraldPark" for 1 lap, "emeraldPark@3L" for 3 laps (bestKey)
  lastCircuit: GrandPrixCircuitId; lastLaps: number;          // the lobby choice persists
  xp: number;
};
```

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/features/cards-decks` → `activeLoadout`, `useDecks` | `driverId` (gate + driver name) | |
| `@/features/economy` → `useEconomy`, `equipCosmetic`, `settleCoinReward` | Owned/equipped livery, coins | Without a shop, give everyone `["gridLine"]` and make `equipCosmetic` a no-op or a local setter |
| `@/features/packs` → `racingPlayerCards`, `DailyDrop` | Driver lookup; lobby tile | |
| `@/domain/progression` → `levelFromXp`, `levelProgress` | CPU strength and result level bar | |
| `@/shared/hooks` → `useCountUp` | Result XP count-up | Small rAF hook (shared doc) |
| `@/design-system` → `accentVar`, `feedbackVar`, `withAlpha`, `Glyph`, `GlyphName`, `hudChamferPath`, … | UI | |
| `@/mocks/games` → `sportForGame`, `GameEntry` | Loadout link sport, prop type | |
| `@/features/games/components/game-leaderboard-cta` | Lobby | Optional |
| `../../shared/components/game-landing-ad`, `../../shared/hooks/use-game-return`, `../../shared/state/use-reduced-motion` | Ad, back, motion | |

---

## Porting steps

1. Copy `src/features/games/grand-prix/` and the needed parts of
   `src/features/games/shared/`.
2. Provide the outside modules (see the shared doc).
3. Register `grand-prix-dash` → `GrandPrix` with `href: "/play/grand-prix"` and
   `requiresDeck: true`.
4. **Fix the loadout return path** in `components/grand-prix.tsx`:
   `loadoutHref={`/decks/${sport}?returnTo=/play/grand-prix-dash`}` points at a
   route that does not exist (the registered href is `/play/grand-prix`). Use the
   entry's `href` instead.
5. Verify: start a sprint and test a jump start (throttle before dark → "JUMP
   START" with a 2 s cut). Drive off-road and stay stuck for 10 s, which should
   give a DNF with "GAME OVER". Finish a race and check that `bestLapMsByCircuit`
   updates and the coins land once.

## Invariants and gotchas

- `bendCompression` (physics) and the renderer's bend-per-metre must use the same
  ratio, or the car and the drawn road disagree about where the corner is.
- Keep the race column capped (`raceColumnMaxPx = 560`). A wider top-down scroller
  just shows more grass.
- `Esc` and back mid-race call `race.stop()` and discard the attempt. Do not
  settle on unmount.
