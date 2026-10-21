# Pitch Duel — implementation guide

The featured football card duel. Four rounds against a CPU rival (or a challenged
friend), alternating **attack** and **defence**. Each round the player sees a
**scenario** (Counter Attack, Set Piece, Last Minute Pressure …), picks one of their
players and one action card (each can be used **once per match**), then strikes a
**power-surge meter** for +0 to +20. Totals decide it:
`rating + action power + scenario bonus + surge`. The higher attack total scores a
goal, the higher defence total denies it, and an exact tie is a coin flip.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. The source of truth is
`src/features/games/pitch-duel/` (≈2.9k lines). It is a DOM/CSS game with no
canvas.

> Shared pieces (launcher route, matchmaking gate, economy, decks, progression,
> design-system helpers, opponent names) are in
> [`shared_game_platform.md`](./shared_game_platform.md). The first-launch card gate
> (football starter: 5 players + 6 actions) is in [`starter_pack.md`](./starter_pack.md).

---

## At a glance

| | |
|---|---|
| Game id | `pitch-duel` |
| Sport | `football` |
| Route | `/play/pitch-duel` (challenge: `/play/pitch-duel?vs=<name>&level=<n>`) |
| Entry component | `PitchDuel` from `src/features/games/pitch-duel/index.ts` (also exports `usePitchDuelProgress`, `readPitchDuelProgress`, `resetPitchDuelProgress`, `resetPitchDuelTutorials` and the types) |
| Requires deck | Yes: football loadout with exactly **2 attackers, 2 defenders and 6 action cards** (the keeper is not used) |
| Rendering | DOM + a large CSS module (stadium backdrop, cards, overlays) |
| State | `useReducer(pitchDuelReducer)`; timing beats in effects |
| Persistence | `localStorage["statoz.pitch-duel.v1"]`: XP, W/played, streaks, tutorial flags, last 25 matches |
| Rewards | XP into the `pitchDuel` track (can go **negative** on a loss, floored at 0 total); coins: win 50 / draw 25 / loss 10; also records a daily streak activity |
| Static assets | `public/assets/games/pitch-duel/home-stadium.png`, `match-stadium.png` |

---

## Rules

### Match structure

```
lobby ─PLAY→ matchmaking (GameMatchGate "KICK OFF!") ─onReady→ startMatch
  toss: call heads/tails
    won  → tossResult: choose ATTACK or DEFEND first
    lost → tossResult: the CPU's choice is shown (auto-continue after 2.2 s)
  for round 1..4:
    roleReveal (1.35 s) → scenario briefing (2.6 s; CPU move is picked when play starts)
    play: pick 1 unused player (attackers when attacking, defenders when defending) + 1 unused action
          → STRIKE: power-surge meter → resolveRound
    roundResult → CONTINUE
  roles alternate each round: odd rounds = the initial role, even rounds = the opposite
finalResult: score, per-round recap, XP, coins, REMATCH / HOME
```

Under reduced motion, the beats shorten (120–180 ms) and the surge is rolled
randomly instead of shown as a meter.

### Scenarios (`data/scenarios.ts`, 7, never repeated within a match)

| id | Title | Attack bonus | Defence bonus |
|---|---|---:|---:|
| sc1 | Counter Attack | 8 | 3 |
| sc2 | 1v1 Final Third | 5 | 5 |
| sc3 | Set Piece Chance | 6 | 6 |
| sc4 | Last Minute Pressure | 10 | 2 |
| sc5 | Box Defense | 2 | 10 |
| sc6 | Wide Break | 7 | 4 |
| sc7 | Penalty Box Chaos | 8 | 8 |

### Resolution (`engine/pitch-duel-engine.ts`)

```ts
const cpuSurge = random() * 20;
const attackPower  = attacker.rating + attackAction.power  + scenario.attackBonus  + (playerAttacking ? playerSurge : cpuSurge);
const defensePower = defender.rating + defenseAction.power + scenario.defenseBonus + (playerAttacking ? cpuSurge : playerSurge);
const outcome = attackPower > defensePower ? "goal"
              : attackPower < defensePower ? "saved"
              : random() >= 0.5 ? "goal" : "blocked";
```

**Surge meter** (`ShotMeter` in `components/pitch-duel.tsx`): a marker ping-pongs
0→1→0 every 1.2 s. On strike,
`surge = round((1 − |pos − 0.5| / 0.5) × 20)`. The label reads PERFECT (< 0.1 from
centre), GOOD (< 0.24) or RISKY. Tap, Space or Enter strikes.

**Success preview** (`playerSuccessChance`): compares the player's total, without
surges, against the CPU's *average* eligible player and action. It returns
1 / 0.5 / 0, and the UI shows it as a favourable or unfavourable hint.

### CPU

- `cpuSmartness(level) = min(1, level / 12)`, and the target rating is
  `min(95, 66 + 2·level)`.
- **Deck:** 2 attackers + 2 defenders near the target rating (a shuffled window of
  the nearest `max(count·8, 12)`) and 6 actions. Each pick is the strongest
  remaining with probability `smartness`, otherwise random.
- **Per round:** the player is the best-rated with probability `smartness`,
  otherwise random. The action comes from the relevant category (`defense` when the
  player attacks, `attack` when the player defends, plus `special`). When the
  scenario favours the CPU (bonus > 8), it plays its strongest card with
  probability `smartness`. Otherwise it picks the best power minus a risk penalty
  (4 for risky cards).
- **Level:** the player's Pitch Duel level (`levelFromXp(progress.xp)`), or the
  `?level=` of a challenge.
- **Opponent name:** `opponentNames[(played + sessionId) % 500]`, or `?vs=`.

### XP and coins

```ts
export function pitchDuelXp(result, playerScore, opponentScore) {
  if (result === "Draw") return 4;
  if (result === "Victory") {
    const shutout = opponentScore === 0 ? 5 : 0;
    return Math.min(25, 10 + (playerScore - opponentScore) * 3 + shutout);
  }
  return Math.max(-15, -(5 + (opponentScore - playerScore) * 2));   // losses cost XP
}
// total = max(0, current + gained); coins: Victory 50 · Draw 25 · Defeat 10
```

`recordPitchDuel({ id, … })` is **idempotent by match id**: if the id is already in
the history it returns the stored result. It prepends a history entry (keeping 25),
updates W/played/streaks, and calls
`recordStreakActivity("pitchDuel", playedAt)`. The coin reward uses the same id.
Match ids are `pitch-duel-<Date.now()>-<rand>`, minted in `startMatch`.

### Tutorials

Each phase (`toss`, `scenario`, `play`, `round-result`, `final`, `shot-meter`)
shows a one-time `TutorialOverlay` until it is dismissed. While a tutorial is open,
the auto-advancing timers pause. `resetPitchDuelTutorials()` replays them, and the
lobby exposes a "replay tutorial" control. A full "How to play" screen is
`components/pitch-duel-how-to.tsx`.

---

## File manifest

| Path (under `src/features/games/pitch-duel/`) | Lines | Role |
|---|---:|---|
| `index.ts` | 14 | Public API |
| `types.ts` | 120 | Phases, scenario, move, round result, deck, state, actions, history, progress |
| `data/scenarios.ts` | 61 | The 7 scenarios |
| `engine/pitch-duel-engine.ts` | 327 | `generateOpponentDeck`, `chooseScenario`, `pickOpponentMove`, `initialPitchDuelState`, `resolveRound`, `pitchDuelReducer`, `playerSuccessChance`, `cpuSmartness`, `targetRatingForLevel` |
| `state/pitch-duel-progress.ts` | 198 | Store, `pitchDuelXp`, `recordPitchDuel`, tutorial flags, resets |
| `components/pitch-duel.tsx` | 731 | `PitchDuel` (deck gate, challenge params), `PitchDuelSession` (reducer + beats + settlement), and the inline views `MatchHeader`, `Toss`, `TossResult`, `RoleReveal`, `ScenarioBriefing`, `DuelBoard`, `ShotMeter`, `RoundResultView`, final result, `TutorialOverlay`, quit dialog |
| `components/pitch-duel-lobby.tsx` | 123 | Lobby: level band, record, history, PLAY, how-to, replay tutorial, leaderboard, daily drop |
| `components/pitch-duel-how-to.tsx` | 216 | Rules explainer |
| `components/pitch-duel.module.css` | 1098 | All styling (stadium layers, card fans, meter, overlays, keyframes) |

### Reducer actions

```ts
type PitchDuelAction =
  | { type: "matchStarted"; opponentName; opponentDeck }
  | { type: "tossResolved"; call; result; cpuAttacking }
  | { type: "roleChosen"; playerAttacking } | { type: "tossContinued" }
  | { type: "roleRevealed"; scenario } | { type: "playStarted"; opponentMove }
  | { type: "playerSelected"; cardId } | { type: "actionSelected"; cardId }
  | { type: "roundResolved"; result } | { type: "roundAdvanced" } | { type: "matchFinished" };
```

The reducer is pure. Every random roll (toss, CPU attacking choice, scenario, CPU
move, CPU surge) happens in the component or engine helpers and arrives as an
action payload.

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `next/navigation` → `useSearchParams` | `?vs=` / `?level=` challenges | **Wrap in `<Suspense>`** if the page is prerendered and `PitchDuel` renders on the server (see gotchas) |
| `@/features/cards-decks` → `activeLoadout`, `useDecks`, `FootballLoadout` | The 2+2+6 deck | |
| `@/features/packs` → `playerCardForId`, `actionCardForId`, `allActionCards`, `footballAttackers`, `footballDefenders`, `portraitForCard`, `DailyDrop` | Deck resolution, CPU pools, card art | |
| `@/domain/cards` → `ActionCard`, `PlayerCard`, `playerRoleLabels` | Types and labels | |
| `@/domain/progression` → `levelFromXp`, `levelProgress` | CPU level, lobby band | |
| `@/features/economy` → `settleCoinReward` | Coins | |
| `@/features/profile` → `useProfileIdentity`, `playerDisplayName` | Player banner name | Replace with your user profile |
| `@/features/onboarding` → `avatarOptionById` | Player banner avatar | Any `(id) => { src }` |
| `@/features/streaks/activity` → `recordStreakActivity` | Daily streak credit | Optional; make it a no-op |
| `@/design-system` → `Button`, `Glyph`, `glyphRegistry`, `GlyphName`, `ActionCard`/`PlayerCard` components, … | Card faces and UI | |
| `../../shared/data/opponent-names`, `../../shared/components/matchmaking`, `../../shared/hooks/use-game-return`, `../../shared/state/use-reduced-motion` | | |

---

## Porting steps

1. Copy `src/features/games/pitch-duel/`, `src/features/games/shared/`, and
   `public/assets/games/pitch-duel/*`.
2. Provide the outside modules (see the shared doc). Pitch Duel uses more of the
   platform than any other game: the profile identity, the avatar and the streaks.
3. Register `pitch-duel` → `PitchDuel` at `/play/pitch-duel` with
   `requiresDeck: true`.
4. If you mount `<PitchDuel/>` directly in a page (not behind a
   hydration-gated launcher), wrap it in `<Suspense fallback={…}>` because of
   `useSearchParams`, or `next build` fails on the static route.
5. Verify: claim the football starter (5 players + 6 actions), win the toss,
   choose attack, and play four rounds. Each player and action card should grey out
   once used. Roles should alternate, and the final result should credit
   XP/coins once (check `statoz.pitch-duel.v1.history[0].id`). Then open
   `/play/pitch-duel?vs=Kai%20Ito&level=9`, which should skip straight to
   matchmaking against Kai Ito at level 9.

## Invariants and gotchas

- **Suspense:** in this repo `PitchDuel` only mounts after hydration
  (`GameLauncher` renders a static "OPENING…" frame first), so `useSearchParams`
  never runs during prerender. A different mount point needs a Suspense boundary.
- XP can be negative per match. `useGameCareer` and leaderboards should read the
  stored total, never sum the history.
- `deckFromLoadout` requires exactly 2/2/6. A partially repaired deck sends the
  player back to the launcher's "LOADOUT REQUIRED" screen.
