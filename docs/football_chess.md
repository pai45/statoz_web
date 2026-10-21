# 5v5 Football Chess — implementation guide

A two-minute, turn-based tactical duel on a **3 × 4 grid**. Each side fields four
outfielders (in a chosen 5-a-side formation) and a keeper standing in the goal
off-grid. Sides alternate **one action per turn**: move, dribble, pass, shoot,
press, tackle or slide. Outcomes roll against card ratings. A coin toss decides
the kickoff. The match clock runs 120 s, and the player gets a soft 10-second
decision timer per move (when it expires, a random legal move is played for
them). The CPU runs a one-ply expectimax-style search that also reads the player's
habits.

Unlike the arcade games, this one is **pure React**: no canvas and no rAF loop.
The board is DOM/CSS, state is a `useReducer`, and the beats are timeouts.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. The source of truth is
`src/features/games/football-chess/` (≈4.7k lines).

> Shared pieces (launcher route, matchmaking gate, economy, decks, design-system
> helpers, `shared/engine/opponent.ts`, `random-source.ts`, opponent names, landing
> ad) are in [`shared_game_platform.md`](./shared_game_platform.md). The first-launch
> card gate is in [`starter_pack.md`](./starter_pack.md).

---

## At a glance

| | |
|---|---|
| Game id | `football-chess` |
| Sport | `football` |
| Route | `/play/football-chess` |
| Entry component | `FootballChess` from `src/features/games/football-chess/index.ts` |
| Requires deck | Yes: football loadout of 2 attackers, 2 defenders and a keeper (the action cards are not used here) |
| Rendering | DOM grid + CSS module animations |
| State | `useReducer(matchReducer)`. Pure, with injected randomness: `{ play, decide }` streams |
| Persistence | `localStorage["statoz.footballchess.v1"]` (W/D/L, streaks, formation) |
| Rewards | Coins via `settleCoinReward` (win 50 / draw 20 / loss 10). XP is computed and shown but **not persisted** (no `footballChess` career track yet) |
| Static assets | none |

---

## Rules

### Board

- Columns 0–2, rows 0–3. Rows 0–1 are the player's half (bottom), rows 2–3 the
  opponent's. Keepers stand off-grid at `(1, −1)` (the player's) and `(1, 4)`.
- Adjacency is 8-directional, and distance is **Chebyshev** (a diagonal step
  counts as 1).
- Squad order is always `[atk, atk, def, def, gk]`. Piece ids are
  `p0..p3, pk, o0..o3, ok`.

### Formations (`data/formations.ts`), player's half, squad order

| id | Label | Code | Cells (col,row) for atk0, atk1, def0, def1 |
|---|---|---|---|
| `box` | BOX | 2-2 | (0,1) (2,1) (0,0) (2,0) |
| `diamond` | DIAMOND | 1-2-1 | (0,1) (2,1) (1,0) (1,1) |
| `attacking` | HIGH LINE | 2-1-1 | (1,1) (0,1) (2,1) (1,0) |
| `defensive` | LOW BLOCK | 1-1-2 | (1,1) (1,0) (0,0) (2,0) |

The opponent's formation is drawn at random per match and mirrored (`row → 3 − row`).
The kickoff ball goes to the kicking side's most forward and most central
outfielder.

### Actions (`engine/rules.ts`)

| Verb | Who | Effect |
|---|---|---|
| `move` | Any outfielder with an empty neighbour | Step one cell; the carrier takes the ball with them |
| `dribble` | Carrier, adjacent opponent | Win `0.55 + Δrating·0.02` (0.2–0.9) → swap cells and keep the ball; lose → turnover |
| `pass` | Carrier | To a teammate along a clear straight lane (row, column or true diagonal; no L-shapes). A keeper may pass to anyone |
| `shoot` | Carrier in the attacking half | Goal chance below; a miss gives a `save` (keeper's ball) or a `blocked` (the defender nearest its own goal gets it) |
| `press` | Defender at distance ≥ 2 | Step one cell closer to the carrier; never wins the ball |
| `tackle` | Defender adjacent to the carrier | Win `0.5 + Δrating·0.02 + 0.18 × extra adjacent teammates (max 3)` (0.15–0.9); safe on a miss; 2-turn cooldown |
| `slide` | Defender adjacent | Win `0.62 + Δrating·0.02` (0.2–0.92), landing beside the carrier; a miss carries a 30% foul chance → yellow; a second yellow → red, benched for 2 turns; 3-turn cooldown |

Keepers can only pass, and only while holding the ball.

**Shot probability:**

```ts
const distance = side === "player" ? 4 - row : row + 1;
let p = distance <= 1 ? 0.55 : 0.3;
p *= 0.45 ** shotBlockers;                               // defenders in the shooter's column toward goal
p *= 1 + (shooter.rating - keeper.rating) * 0.012;
return clamp(p, 0.03, 0.92);
```

### Match flow (`engine/match.ts`)

```
toss ─callToss(heads|tails)→ (coin flip) ─beginPlay→ playerTurn | opponentTurn
playerTurn  ─tapCell/chooseAction→ resolving ─(resolutionAnimated after 430 ms)→ next side's turn
opponentTurn ─(cpuMove after 650 ms "thinking")→ resolving → …
goal → goalScored ─(goalReset after 1200 ms)→ kickoff to the side that conceded
clock 120 s → fullTime     (ticks every 100 ms only during either side's turn)
decision timer 10 s (player turn) → autoAct: a random legal player action
```

At the start of a side's turn, that side's bench timers and tackle/slide cooldowns
tick down by 1.

**Player input model:** tapping a piece selects it and arms `move` by default
(highlighting legal cells). The action bar then offers that piece's legal verbs.
`move`, `dribble` and `pass` need a target tap; the others resolve immediately.
Tapping the selected piece again deselects it.

### Reducer actions

```ts
type MatchAction =
  | { type: "callToss"; call: "heads" | "tails" } | { type: "beginPlay" }
  | { type: "tapCell"; cell: BoardCell } | { type: "chooseAction"; verb: BoardActionType } | { type: "deselect" }
  | { type: "resolutionAnimated" } | { type: "goalReset" } | { type: "cpuMove" }
  | { type: "tick" } | { type: "setPaused"; paused: boolean };
```

Guards return the same state reference instead of throwing. Every emission bumps
`eventTick`, which the presentation keys its animations on.

### Two randomness streams

```ts
type MatchRandom = { play: RandomSource; decide: RandomSource };
```

`play` rolls every outcome (toss, dribbles, shots, tackles, fouls, auto-acts, the
opponent formation). `decide` is used **only** to break exact ties between CPU
moves, so the CPU's "thinking" can never consume a gameplay roll. Both are
`Math.random` in production. Pass seeded generators for tests.

### CPU (`engine/cpu.ts`)

For every legal opponent action, `expectedOutcomes` enumerates each probabilistic
branch (win and lose, goal and save/block, foul and no foul). Each branch is scored
by `valueAfterCpuOutcome`, which includes the **player's best immediate reply**,
and `contextualActionBias` adds situational nudges. `boardUtility` values
possession (+150 / −165), progress toward goal (44/row), passing options, shot
equity (×290 for, ×340 against), crowding, bookings, benches and cooldowns. It also
**reads the player's recent verbs** from the move log and crowds out whatever they
keep doing (dribbles → more adjacent defenders, passes → fewer lanes, and so on).
Ties within 0.001 are drawn from `decide`.

---

## File manifest

| Path (under `src/features/games/football-chess/`) | Lines | Role |
|---|---:|---|
| `index.ts` | 9 | Public API: `FootballChess`, `FootballChessProps` |
| `types.ts` | 324 | Sides, verbs, events, phases, formations, cells and grid helpers, `BoardPiece`, `BoardState`, selectors |
| `constants.ts` | 44 | `matchSeconds = 120`, `decisionSeconds = 10`, tick 100 ms, beats (CPU think 650, resolution 430, goal 1200, piece move 340, toss 1500/1300) |
| `data/formations.ts` | 21 | `formationCells` |
| `engine/rules.ts` | 569 | `initialBoard`, `kickoffReset`, legal options, probabilities, `applyAction`, `missedShotOutcome` |
| `engine/match.ts` | 586 | `ChessMatch`, `buildMatch`, `matchReducer`, `isFinished`, `playerWon`, `isDraw`, `ballIsAt` |
| `engine/cpu.ts` | 459 | `cpuChooseAction`, `scoreCpuAction`, `expectedOutcomes`, `boardUtility` |
| `state/use-match.ts` | 107 | `useMatch(options, sources)`: reducer + clock interval + CPU/resolution/goal timeouts; `useMatchRandom()` |
| `state/football-chess-progress.ts` | 205 | Store, `recordFootballChess`, `calculateFootballChessXp`, `saveFormation` |
| `components/football-chess.tsx` | 320 | Orchestrator: lobby → matchmaking → session; settles at full time |
| `components/chess-board.tsx` | 430 | The grid, pieces (card art), highlights, last-move tint, ball |
| `components/chess-chrome.tsx` | 390 | `ChessHud`, `ActionBar`, `DecisionTimer`, `GoalFlash`, `CentreFlash`, `OpponentToast` |
| `components/toss-phase.tsx` | 189 | Coin toss overlay (heads/tails call, spin, hold) |
| `components/chess-result.tsx` | 266 | Full-time result: score, goals timeline, XP, coins, play again |
| `components/chess-lobby.tsx` | 272 | Formation picker, record, play CTA, leaderboard, daily drop |
| `components/football-chess.module.css` | 547 | Board, pieces, flashes, keyframes |

---

## Orchestration (`components/football-chess.tsx`)

```
FootballChess
 ├─ lobby        <ChessLobby/> + <GameLandingAd/>   (also while the squad is invalid)
 ├─ matchmaking  <GameMatchGate goLabel="KICK OFF!" title="5V5 FOOTBALL CHESS"/>
 └─ playing      <FootballChessSession key={session}/>
```

- **Squad:** `activeLoadout(decks, "football")` → `[attackers[0], attackers[1], defenders[0], defenders[1], keeper]`,
  resolved against `footballPlayerCards`. Anything short of a full five returns
  `null`, and the CTA stays disabled.
- **Rival** (drawn on the press, in the browser): level = `5 + U{−1..2}` (the player
  level is fixed at 5 because the mode banks no XP yet). The squad is
  `generateShootoutOpponent(level, footballAttackers, footballDefenders, footballGoalkeepers).shooters`,
  which picks cards near the target rating `min(95, 66 + 2·level)` from a shuffled
  window, plus `randomOpponentName()`.
- **Full time** (guarded by a `recorded` ref): `recordFootballChess(won, draw, margin)`
  returns the XP, and the coin reward is
  `settleCoinReward({ id: "football-chess-<now>-<rand>", coins: 50 | 20 | 10, … })`.

```ts
export function calculateFootballChessXp(won, draw, goalMargin) {
  if (won) return Math.min(26, 14 + Math.min(Math.max(goalMargin - 1, 0), 99) * 3);
  if (draw) return 6;
  return 2;
}
```

Store `statoz.footballchess.v1`:
`{ wins, losses, draws, currentStreak, bestStreak, formation }`.

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/features/cards-decks` → `activeLoadout`, `useDecks` | Football loadout | |
| `@/features/economy` → `settleCoinReward` | Coins | |
| `@/features/packs` → `footballAttackers`, `footballDefenders`, `footballGoalkeepers`, `footballPlayerCards`, `DailyDrop` | Squad lookup, CPU pools, lobby tile | |
| `@/domain/cards` → `PlayerCard` | `card.rating` drives every roll; `shortName` and portrait shown on pieces | |
| `@/design-system` → `accentVar`, `feedbackVar`, `withAlpha`, `Glyph`, `Button`, … | UI | |
| `../../shared/engine/random-source` → `RandomSource` | `() => number` | One-line type |
| `../../shared/engine/opponent` → `generateShootoutOpponent` | CPU squad | Copy the file (shared doc has the full code) |
| `../../shared/data/opponent-names` → `randomOpponentName` | Rival name | |
| `../../shared/components/matchmaking`, `../../shared/components/game-landing-ad`, `../../shared/hooks/use-game-return`, `../../shared/state/use-reduced-motion` | Queue, ad, back, toss motion | |

---

## Porting steps

1. Copy `src/features/games/football-chess/` and `src/features/games/shared/`.
2. Provide the outside modules (see the shared doc).
3. Register `football-chess` → `FootballChess` at `/play/football-chess` with
   `requiresDeck: true`.
4. (Optional) Add a `footballChess` XP field to the store and to your career
   aggregation if you want the XP to count.
5. Verify: complete the toss, select a piece (move cells highlight), pass along a
   lane, shoot from the attacking half, and let the 10 s timer run out (an
   auto-move should be played). At 0:00 the result should show, and coins should
   credit once.

## Invariants and gotchas

- Keep `matchReducer` pure. All timers live in `useMatch`, and the reducer only
  reacts to `tick`, `cpuMove`, `resolutionAnimated` and `goalReset`.
- The draw order inside rolled actions is part of the contract (for seeded tests).
- Cells are value objects. Always compare with `sameCell` or `cellKey`, never `===`.
- The board widens to a horizontal layout at `lg`, while the HUD and the action
  bar stay at `max-w-120` (≈ 480 px).
