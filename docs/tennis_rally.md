# Tennis Rally — implementation guide

A one-set arcade tennis match against a seeded rival, drawn on a canvas with a
fake-perspective court (far baseline at the top, the player at the bottom). The
player uses two thumb pads: a **movement pad** (drag to run, flick to sprint) and a
**shot pad** (press to load, drag to shape the shot, release to hit). Serving uses
a sweeping serve meter. The set is first to 6 games by 2, with a tiebreak at 6–6.
Tennis pays per-athlete **mastery XP**, coins scaled by difficulty, and
achievements, and it can **resume** a match the player walked away from.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. The source of truth is
`src/features/games/tennis/` (≈7k lines).

> Shared pieces (launcher route, matchmaking gate, economy, decks, progression,
> design-system helpers, landing ad) are in
> [`shared_game_platform.md`](./shared_game_platform.md). The first-launch card gate
> is in [`starter_pack.md`](./starter_pack.md).

---

## At a glance

| | |
|---|---|
| Game id | `tennis-rally` |
| Sport | `tennis` |
| Route | `/play/tennis` |
| Entry component | `TennisRally` from `src/features/games/tennis/index.ts` |
| Requires deck | Yes: tennis loadout `playerId` (one athlete) |
| Rendering | `<canvas>` in a play column capped at **520 px** wide, plus a React HUD |
| Simulation | `TennisEngine`, fixed 1/120 s steps, 31-bit LCG (`TennisRandom`), fully snapshot-able |
| Persistence | `localStorage["statoz.tennis.v1"]` (career + settings + **resume snapshot**) |
| Rewards | Mastery XP per athlete (that is the `tennis` career track); coins via `settleCoinReward` (`tennis:<matchId>`) |
| Static assets | none |
| npm deps | none |

Only **Quick Match** is live. The engine still declares `tournament`,
`endlessRally`, `targetPractice` and `training` because it is a line-for-line port
of a Flutter engine that branches on them, but no screen launches those modes. The
difficulty is always `"pro"` in the live flow (the picker belonged to a hub that
was never shipped).

---

## How it plays

### Court and physics (metres)

`courtHalfWidth = 4.115` (singles), `courtHalfLength = 11.885`, `serviceLine = 6.4`,
`netHeight = 0.914`, `gravity = −9.8`. The player (team 0) is on `y > 0`, the rival
on `y < 0`.

### Serving

- Press or hold the shot pad to start the **serve meter**, which sweeps 0→1→0. It
  sweeps more slowly on a second serve (1.25 s vs 1.05 s), which is the only second
  serve safety net.
- Release: `accuracy = 1 − |meter − 0.82| / 0.82`;
  `quality = clamp(accuracy·0.72 + serveRating·0.28 + (2nd serve ? 0.14 : 0), 0, 1)`.
  The aim error is `(1 − quality) × (1st ? 2.7 : 1.6)`, and poor timing
  (`quality < 0.45`) sails long.
- Serve aim (`serveAim` −1 wide / 0 body / 1 T) comes from the drag direction.
- Lets, faults, double faults and aces are all modelled.

### Rally

- **Can hit** only if the ball is live, on your side, not last hit by you, within
  reach (`0.75 + reach/100 × 0.65` m) and at a height of 0.18–2.8 m.
- A press **queues** a shot. Contact happens when the ball enters reach.
- **Timing:** within 0.34 m and queue age ≤ perfect window →
  `perfect`. The window is
  `(0.075 + control/2200) × (0.72 + 0.28·stamina) × (focus point ? 1.1 : 1)`.
  Beyond 1.05 m it is `early` or `late` (depending on whether the ball is still
  approaching), a queue older than 0.45 s is `early`, and otherwise it is `good`.
- **Shot type** is decided in order, with position winning over gesture:

| Condition | Shot |
|---|---|
| High ball (z > 2.05) and near the net | `smash` |
| Near the net and no bounce yet | `volley` |
| Stretched (> 0.95 m) or late | `defensive` |
| Drag down hard (aimY < −0.55) | `dropShot` |
| Drag down (aimY < −0.16) | `slice` |
| Drag up hard (aimY > 0.55) | `lob` |
| Drag up (aimY > 0.16) | `topspin` |
| Held ≥ 0.28 s | `power` |
| Otherwise | `normal` |

- Each shot has a flight duration, a depth target and a stamina cost (power
  0.68 s/6.5, smash 0.54 s/9, lob 1.36 s/3.2, drop shot to a depth of 2.8 m …).
  The ball is launched with **solved ballistics** (`setFlight(targetX, targetY, duration)`),
  so it lands where it was aimed, plus a seeded spread:
  `max(0.04, timingError + tiredError + riskyShotError − control·0.38)`.
- **CPU difficulty never bends physics.** The AI obeys the same movement, reach
  and stamina rules. Difficulty appears only as its reaction delay and as a
  probability of flubbing a return it *could* reach (`opponentMissesReturn`:
  based on its ratings, stretch, fatigue, timing and incoming shot pressure, ×1.25
  rookie / ×1 pro / ×0.78 all-star, clamped to 0.015–0.42).
- Rally milestones at 5, 10 and 20 shots grant focus.

### Scoring (`engine/scoring.ts`)

Standard tennis: 0/15/30/40, deuce and advantage, and games to 6 by 2. Serve
alternates each game, and an `endChange` event fires when the total games played is
even (2, 4, 6 …). At 6–6 there is a tiebreak to 7 by 2, with the server rotating via
`tieBreakServer` and ends changing every 6 points. `isBreakPointFor` and `isSetPointFor` are answered by **playing the
point on a copy** rather than duplicating the rules.

### Controls

| Touch | Keyboard |
|---|---|
| Left pad drag = move, quick flick = sprint | `W A S D` move, `Shift` sprint |
| Right pad press = load, drag = shape, release = hit | Arrows shape, `Space` hold and release to hit |
| Pause button | `Esc` |

Settings (persisted): left-handed (swaps the pads), control scale 0.8–1.25, control
opacity 0.45–1, movement assist, reduced motion and haptics.

---

## Architecture

```
types.ts / constants.ts       vocabulary, ratings, intent, events, score state, reward/grade/mastery maths
data/athletes.ts              100 TennisAthlete records (9 sub-ratings + archetype), keyed by card id
        │
engine/random.ts              TennisRandom LCG + signed()
engine/scoring.ts             TennisScoring (immutable-ish state machine for points/games/tiebreak)
engine/simulation.ts          TennisEngine: bodies, ball, serve, contact, flight, points, stats, snapshot/restore
engine/ai.ts                  TennisAI: delayed observations → TennisIntent (same shape as the player's)
engine/tennis-game.ts         TennisRallyGame: fixed step, edge consumption, trail, camera kick, stings
        │
state/use-tennis-engine.ts    useTennisGame, useTennisLoop, useTennisHud, useTennisEvents, useTennisCommands
state/tennis-progress.ts      career/settings/resume store, settleTennisMatch (idempotent by matchId)
        │
components/tennis-rally.tsx   lobby → matchmaking → TennisMatch (key=session); pause/settings/quit/result
components/tennis-arena.tsx   canvas + renderer/{court, actors, ball, geometry, palette}
components/tennis-{hud,controls,overlays,lobby}.tsx
```

---

## File manifest

| Path (under `src/features/games/tennis/`) | Lines | Role |
|---|---:|---|
| `index.ts` | 9 | Public API: `TennisRally`, `TennisRallyProps` |
| `types.ts` | 572 | Modes, ratings, settings, config, score state + `pointLabel`, intent, events, stats, summary, `performanceScore`, `grade`, `calculateTennisReward`, `masteryLadder` |
| `constants.ts` | 124 | Court metres, step sizes, play column width, presentation beats, pad measures, serve band |
| `data/athletes.ts` | 134 | 100 athletes (ATP + WTA), **ids must match tennis `PlayerCard.id`s** |
| `engine/random.ts` | 33 | `TennisRandom`, `signed()` |
| `engine/scoring.ts` | 199 | `TennisScoring`, `tieBreakServer` |
| `engine/simulation.ts` | 1446 | `TennisEngine`, `TennisBody`, `TennisBall`, `ballInsideSingles`, `serveInsideBox` |
| `engine/ai.ts` | 209 | `TennisAI` (+ `toSnapshot/restore`), `aiSeedSalt` |
| `engine/tennis-game.ts` | 376 | `TennisRallyGame`, `MatchSnapshot`, stings, trail |
| `state/use-tennis-engine.ts` | 256 | React seam |
| `state/tennis-progress.ts` | 360 | Store + `settleTennisMatch`, `saveResumeSnapshot`, `clearResumeSnapshot`, `saveTennisSettings`, `saveTennisPairing` |
| `components/tennis-rally.tsx` | 431 | Orchestrator + `TennisMatch` |
| `components/tennis-arena.tsx` | 159 | Canvas sizing and paint loop |
| `components/renderer/geometry.ts` | 78 | Fake perspective: depth 0..1 lerps y (17%→80% of height) and half-width |
| `components/renderer/court.ts` | 236 | Court, lines, net (with pulses) |
| `components/renderer/actors.ts` | 165 | Players (swing poses by shot) |
| `components/renderer/ball.ts` | 79 | Ball, shadow, trail |
| `components/renderer/palette.ts` | 131 | Token reads with fallbacks |
| `components/tennis-controls.tsx` | 569 | `MovementPad`, `ShotPad`, keyboard, `KeyboardLegend` |
| `components/tennis-hud.tsx` | 390 | Scoreboard, serve meter, stamina/focus rails, `TennisStingLayer` |
| `components/tennis-overlays.tsx` | 584 | Pause, settings, quit, result (grade, stats, reward, achievements) |
| `components/tennis-lobby.tsx` | 346 | Athlete, mastery band, sets won, streak, RESUME/PLAY, leaderboard, daily drop |
| `components/tennis.module.css` | 132 | Styles |

---

## Key implementation details

### Fixed step and edges (`engine/tennis-game.ts`)

This is the same pattern as Hoop Duel. The frame time is clamped to 1/30 s and
accumulated, then spent in 1/120 s substeps. Only the first substep of a frame
receives `shotPressed` and `shotReleased`; later substeps see only `shotDown`.
Input API:

```ts
game.setMove(x, y, sprint)                       // movement pad / WASD
game.shotStarted()                               // press
game.shotReleasedWith(aimX, aimY, holdSeconds)   // release with the drag vector
game.cancelTouches(); game.setPaused(bool); game.applySettings(settings)
game.summary(); game.toSnapshot()                // MatchSnapshot = engine + AI + config
```

### Resume

`TennisEngine` and `TennisAI` both implement `toSnapshot()` and `restore()`.
`TennisMatch` saves a snapshot:

- on `pagehide` (which fires on mobile when `beforeunload` does not),
- on unmount,
- on pause, and
- when the tab becomes hidden (it also pauses the game).

The lobby shows **RESUME** when the saved snapshot belongs to the current athlete.
Quitting or restarting clears it, and a settled match never saves.

### Settlement (once per match id)

```ts
// on the first "setEnded" event:
game.setPaused(true);
const summary = game.summary();
const reward  = settleTennisMatch(summary, athlete.archetype, athlete.archetype === "serveAndVolley");
settleCoinReward({ id: `tennis:${summary.matchId}`, coins: reward.coins, title: "TENNIS RALLY", subtitle: won ? "WIN" : "LOSS" });
// result overlay after resultDelayMs
```

`settleTennisMatch` ignores a `matchId` it has already settled (it keeps the last
256). It updates sets, streaks, aces, rally bests, break stats and per-athlete
`masteryXp`, and grants these achievements: `clean-hold`, `break-through`,
`unbreakable`, `ace-high`, `rally-architect`, `net-authority`, `comeback-set`,
`tiebreak-nerve`, `all-styles`.

### Reward and grade

```ts
performanceScore = result(20 win | 10 close | 4) + difficulty(2/6/10) + serve%·15
                 + clamp(8 + winners − 2·UE, 0, 15) + breaks(≤10) + perfect·2(≤10)
                 + longestRally/2(≤10) + stamina(≤5) + shot variety(≤5)        // 0..100
grade: ≥90 S · ≥78 A · ≥64 B · ≥48 C · else D

xp    = 12 + (won ? 10 : 0) + [difficultyBonus(0/4/8) + gradeXp(S10 A7 B4 C2) + perfBonus(≤8)]   // bracket dropped when farming
coins = won ? (farming ? 10 : {rookie 20, pro 30, allStar 40}) : 0
mastery = 20 + (won ? 20 : 0) + gradeMastery(S20 A15 B10 C5) + min(10, shotTypesUsed·2)
farming = same player:opponent:difficulty on rookie, 4th time in a row
masteryLadder: levels 1–10, level L costs L × 100 XP
```

Match XP is not persisted. The `tennis` career track is the sum of `masteryXp`
(that is what `useGameCareer` reads).

### Athletes

`data/athletes.ts` is a hand-authored table of 100 athletes, each with 9
sub-ratings (`speed, acceleration, power, control, serve, stamina, volley, spin, reach`)
and an archetype (`allRounder | powerBaseliner | speedDefender | serveAndVolley | spinSpecialist | allCourtRival`).
`tennisAthleteById(id)` falls back to the first athlete, so **the tennis
`PlayerCard` ids in your packs must match these ids** (`jannik-sinner`,
`aryna-sabalenka`, …), or every player becomes Sinner. The rival is a uniform
pick from `tennisPlayerCards`, excluding the player.

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/features/cards-decks` → `activeLoadout`, `useDecks` | Tennis `playerId` | |
| `@/features/economy` → `settleCoinReward` | Coins | Idempotent by id |
| `@/features/packs` → `tennisPlayerCards`, `DailyDrop` | Names, rival pool; lobby tile | ids must match `data/athletes.ts` |
| `@/domain/cards` → `PlayerCard` | Type | |
| `@/domain/progression` → `levelFromXp` | Matchmaking badge from total mastery | |
| `@/design-system` → `accentVar`, `feedbackVar`, `withAlpha`, `hudChamferPath`, `Glyph`, `Button` | UI | |
| `@/mocks/games` → `GameEntry` | Prop type | |
| `@/features/games/components/game-leaderboard-cta` | Lobby | Optional |
| `../../shared/components/matchmaking` → `GameMatchGate`, `matchmakingFighter` | Queue → countdown | Both banners use `matchmakingFighter(name)` (athlete names) |
| `../../shared/components/game-landing-ad` → `GameLandingAd` | Ad anchor under the lobby | Needs `GameLandingAdProvider` above it (the launcher provides it) or delete the line |
| `../../shared/hooks/use-game-return`, `../../shared/state/use-reduced-motion` | Back, motion | |

---

## Porting steps

1. Copy `src/features/games/tennis/` and `src/features/games/shared/`.
2. Make sure your tennis cards use the athlete ids in `data/athletes.ts`, or extend
   that table for your roster.
3. Provide the outside modules (see the shared doc).
4. Register `tennis-rally` → `TennisRally` at `href: "/play/tennis"` with
   `requiresDeck: true`.
5. Verify: claim the tennis starter, start a match, play a few points, then
   background the tab. It should pause, and reopening the lobby should offer
   RESUME. Finish a set and check that `statoz.tennis.v1.settledMatchIds` holds the
   id and the coins were credited once.

## Invariants and gotchas

- Keep the 520 px play column. The renderer's pixel sizes (net, ball, lines) are
  not scaled.
- `canHit` must keep the `lastHitter` guard, or a body inside reach re-launches the
  ball on consecutive steps.
- Snapshots are plain JSON (numbers, strings, arrays). Keep new engine fields
  serialisable and add them to `toSnapshot`/`restore`, or resume silently drops
  them.
- The match id is the payout guard: `tennis-${Date.now()}-${random}`. Never reuse
  it across matches.
