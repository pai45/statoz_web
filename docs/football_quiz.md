# Football Quiz (Knowledge Arena) — implementation guide

A multiple-choice trivia ladder. Football Quiz is one of five sport quizzes served
by **one shared module**, `SportQuiz`. The sport comes from the game id the
launcher passes (`football-quiz` → `football`). Each sport has **four modes**
(EASY, MEDIUM, HARD, GLOBAL). Each mode is a ladder of **50 numbered sets × 10
questions**, unlocked in order. A set costs **25 coins** to open (and to replay).
Every correct answer pays XP by mode, and the best score per set earns 0–3
mastery stars. There is no fail state: finishing a set always clears it and
unlocks the next.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. Sources:

- `src/features/games/quiz/` (≈4.3k lines): screens, ladder rules, question
  loading, progress.
- `src/mocks/games/quiz/` (≈120 lines): mode labels, accents, glyphs, blurbs,
  band names.
- `public/assets/quiz/football_{easy,medium,hard,global}.json` (≈400 KB for
  football; ≈2 MB for all 20 files): the question database.

> Shared pieces (launcher, economy, progression, design-system helpers, landing ad,
> `useCountUp`, `formatInt`, `publicAsset`) are in
> [`shared_game_platform.md`](./shared_game_platform.md). The quiz does **not**
> require a deck, so there is no starter pack gate.

---

## At a glance

| | |
|---|---|
| Game id | `football-quiz` (siblings: `cricket-quiz`, `basketball-quiz`, `tennis-quiz`, `motorsport-quiz`) |
| Sport | `football` |
| Route | `/play/quiz/football` |
| Entry component | `SportQuiz` from `src/features/games/quiz/index.ts`. Props: `{ game: GameId; entry: GameEntry }` |
| Requires deck | No |
| Rendering | DOM + CSS module |
| Question data | `fetch()`ed per mode on demand from `/assets/quiz/<sport>_<mode>.json`, cached in memory |
| Persistence | `localStorage["statoz.quiz.v1"]`: per sport → per mode → per set `{ completed, bestCorrect, attempts }` |
| Economy | **Spends** 25 coins per set entry (`spendCoins`). No coin payout |
| XP | Not stored. Derived from the best scores: Σ `bestCorrect × modeReward` (that is the `quiz` career track) |

---

## How it plays

```
Lobby (4 mode tiles: EASY · MEDIUM · HARD · GLOBAL, with cleared/stars per mode)
  └─ pick mode → fetch that mode's JSON → Ladder (50 set tiles, grouped in 5 bands)
        └─ tap an unlocked set → Briefing (cost 25 coins, reward per answer, best so far)
              └─ START (spendCoins) → Play: 10 questions
                    pick option → LOCK IN → "signal lock" scan (210 ms) → verdict
                    → auto-advance after 3 s (except the last question) → …
              └─ Reveal: score, stars gained, NEW BEST, "SET N+1 UNLOCKED", XP count-up,
                         per-question review; a flawless 10/10 earns the pack-reveal ray burst
                    REPLAY (→ Briefing again) | DONE (→ Ladder)
```

### Football mode copy

| Mode | Label | Blurb | XP per correct | Accent | Glyph |
|---|---|---|---:|---|---|
| `easy` | EASY | FOOTBALL BASICS | 1 | lime | `sports_soccer` |
| `medium` | MEDIUM | CLUBS & CUPS | 2 | orange | `emoji_events` |
| `hard` | HARD | DEEP-CUT TRIVIA | 4 | danger | `local_fire_department` |
| `global` | GLOBAL | WORLD FOOTBALL | 5 | violet | `public` |

Band names (sets 1–10, 11–20, …): FOUNDATION, PROSPECT, CONTENDER, SPECIALIST,
LEGEND.

### Ladder rules (`state/ladder.ts`, pure)

```ts
starsFor(bestCorrect) = bestCorrect >= 10 ? 3 : bestCorrect >= 7 ? 2 : bestCorrect > 0 ? 1 : 0
isSetUnlocked(set)    = set === 1 || sets[set - 1].completed
visualState           = mastered (3★) | cleared | upcoming (beyond the authored data) | locked | available
recordRun(progress, mode, set, correct) → {
  progress: completed = true, bestCorrect = max(prev, correct), attempts + 1,
  outcome:  { newlyCleared, stars, starsGained, bestBefore }   // drives the reveal's beats
}
nextChallenge = the first unlocked, uncompleted set within the authored range
```

---

## Question data format

`public/assets/quiz/football_easy.json`:

```json
{
  "sport": "football",
  "mode": "easy",
  "version": 1,
  "bands": {
    "1": [ { "p": "How many players from each team start a football match on the pitch?",
             "o": ["9", "10", "11", "12"], "a": 2 }, … 100 entries ],
    "2": [ … 100 ], "3": [ … ], "4": [ … ], "5": [ … ]
  }
}
```

- `p` is the prompt, `o` the options (≥ 2), and `a` the zero-based correct index.
- Band `k` holds the 100 questions for sets `10(k−1)+1 … 10k`. Flattening the bands
  in order gives a 500-question pool, and set `n` is
  `pool.slice((n−1)·10, n·10)`. The deal is **deterministic**: the same set always
  shows the same questions in the same order.
- Loading (`state/question-bank.ts`) is defensive. A missing or malformed file
  caches an empty pool, and parsing **stops at the first short or malformed band**
  so a half-authored band can never shift the questions of a published set.
  `authoredSetCount` (pool length / 10) tells the ladder which sets to show as
  "SOON".
- Question ids are positional: `football_easy_q001`, …
- Concurrent `ensureLoaded` calls share one in-flight fetch.

```ts
export function assetPathFor(sport: Sport, mode: QuizMode) {
  return publicAsset(`/assets/quiz/${sport}_${mode}.json`);   // respects NEXT_PUBLIC_BASE_PATH
}
```

---

## File manifest

| Path | Lines | Role |
|---|---:|---|
| `features/games/quiz/index.ts` | 7 | `SportQuiz`, `useQuizStats`, `QuizStats` |
| `features/games/quiz/types.ts` | 76 | `QuizMode`, `TriviaQuestion`, set/mode progress, visual state, `AnswerResult`, `SetOutcome` |
| `features/games/quiz/constants.ts` | 44 | `setCount 50`, `questionsPerSet 10`, `setsPerBand 10`, `entryCost 25`, `twoStarScore 7`, `quizModes`, `modeRewards` |
| `features/games/quiz/state/question-bank.ts` | 176 | `ensureLoaded`, `poolFor`, `authoredSetCount`, `buildQuizSet`, `labelFor` |
| `features/games/quiz/state/ladder.ts` | 155 | Pure ladder rules |
| `features/games/quiz/state/quiz-progress.ts` | 245 | Store: `useQuizRecord`, `progressForSport`, `recordSetResult`, `useQuizStats`, `quizStatsFrom`, `resetQuizProgress` |
| `features/games/quiz/components/sport-quiz.tsx` | 329 | Orchestrator: lobby / ladder / play / reveal + briefing sheet + header with coins |
| `features/games/quiz/components/quiz-lobby.tsx` | 453 | Mode tiles with progress and stars |
| `features/games/quiz/components/quiz-ladder.tsx` | 384 | 50-set ladder grouped by band, next-challenge focus |
| `features/games/quiz/components/quiz-set-tile.tsx` | 185 | A set tile per visual state |
| `features/games/quiz/components/quiz-briefing.tsx` | 257 | Entry sheet: cost, reward, best, START (disabled if coins < 25) |
| `features/games/quiz/components/quiz-play.tsx` | 641 | The 10-question run (phases `picking → resolving → resolved`), streak, XP, exit confirm |
| `features/games/quiz/components/quiz-option.tsx` | 176 | Answer option button states |
| `features/games/quiz/components/signal-lock.tsx` | 197 | Verdict scan animation; `scanEndMs = 210`, `autoAdvanceMs = 3000` |
| `features/games/quiz/components/quiz-reveal.tsx` | 481 | End-of-run reveal: stars, unlock, XP count-up, flawless celebration |
| `features/games/quiz/components/quiz-debrief.tsx` | 103 | Per-question review list |
| `features/games/quiz/components/quiz.module.css` | 379 | Styles |
| `mocks/games/quiz/modes.ts` | 95 | `modeLabels`, `modeAccent`, `modeGlyph`, `modeBlurb`, re-exports `modeRewards`, `quizModes` |
| `mocks/games/quiz/bands.ts` | 23 | `bandNames`, `bandForSet`, `firstSetOfBand` |

---

## Key flows in `SportQuiz`

```ts
const sport = sportForGame(game);                       // "football-quiz" → "football"

async function openMode(mode) {
  await ensureLoaded(sport, mode);                      // fetch + cache JSON
  setAuthored((m) => ({ ...m, [mode]: authoredSetCount(sport, mode) }));
  setView({ name: "ladder", mode });
}

function confirmEntry() {                               // from the briefing sheet
  const paid = spendCoins({ id: `quiz-${sport}-${mode}-${setNumber}`, coins: 25,
                            title: "FOOTBALL QUIZ ENTRY", subtitle: `${modeLabels[mode]} SET ${setNumber}` });
  if (!paid.ok) return;
  startSet(mode, setNumber);                            // buildQuizSet → view "play"
}

// QuizPlay.onFinish({ results, correct, earnedXp, bestStreak }):
const outcome = recordSetResult(sport, mode, setNumber, correct);   // saved *before* the reveal reads it
setView({ name: "reveal", …, outcome, xpBefore: totalXp });
```

`totalXp` (for the reveal's level bar) is
`totalTrackXp(useGameCareer().xpByTrack) + collectionFromIds(owned cards).xp`, which
is the player's whole profile XP.

### Play loop details (`quiz-play.tsx`)

- Picking an option only selects it. **LOCK IN** commits it.
- The streak and XP HUD deliberately do **not** move during the 210 ms scan, so
  the verdict is not leaked early.
- Under reduced motion, the verdict lands instantly and there is no auto-advance.
- Exiting mid-run asks for confirmation once any answer is locked. The run is not
  recorded, and the entry coins are not refunded.

---

## Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/domain/sports` → `Sport`, `sportModuleFor` | Sport labels and accent | |
| `@/mocks/games` → `sportForGame` | Game id → sport | `football-quiz` → `"football"` |
| `@/mocks/games/quiz` | Labels, accents, glyphs, blurbs, bands | Copy `src/mocks/games/quiz/` |
| `@/features/economy` → `spendCoins`, `useEconomy` | Entry fee, wallet in the header | `spendCoins` must return `{ ok: boolean }` |
| `../../state/game-career` → `useGameCareer` | Total XP for the reveal | **Imports every game's stats store.** If you port only the quiz, replace it with your own `() => ({ xpByTrack: { quiz: useQuizStats().xp } })` |
| `@/features/packs` → `collectionFromIds`, `PackRevealBackdrop`, `RayBurst`, `DailyDrop` | Card XP for the level bar; flawless celebration; lobby tile | Effects are optional |
| `@/domain/progression` → `totalTrackXp`, `levelProgress` | Level bar | |
| `@/shared/hooks` → `useCountUp`, `usePrefersReducedMotion` | XP count-up, motion | |
| `@/shared/utils` → `formatInt` | Coin formatting | `n.toLocaleString("en-US")` |
| `@/shared/config` → `publicAsset` | JSON URL with basePath | |
| `@/design-system` → `accentVar`, `feedbackVar`, `withAlpha`, icons (`ArrowLeftIcon`, `BrandIcon`, `CloseIcon`, `LockIcon`, `QuizIcon`, `BoltIcon`, …), `Glyph`, `Button`, chamfer helpers | UI | |
| `../../components/game-launcher` → `GameLauncherProps` | Prop type | `{ game: GameId; entry: GameEntry }` |
| `../../shared/components/game-landing-ad`, `../../shared/hooks/use-game-return` | Ad, back | |

---

## Porting steps

1. Copy `src/features/games/quiz/`, `src/mocks/games/quiz/`, and
   `public/assets/quiz/football_*.json` (add the other sports' files if you want
   those quizzes).
2. Provide the outside modules. Decide how to handle `useGameCareer` (see above).
3. Register `football-quiz` → `SportQuiz` with `href: "/play/quiz/football"` and
   **no** `requiresDeck`. The other four quizzes are the same component with their
   own ids and hrefs.
4. If your app is served under a sub-path, set `NEXT_PUBLIC_BASE_PATH` so
   `publicAsset` prefixes the JSON URL.
5. Verify: open EASY (Network tab: one `football_easy.json` request), enter set 1
   (coins −25), answer 10 questions, and get 10/10 for three stars and the flawless
   burst. Set 2 should now be unlocked, and `statoz.quiz.v1.football.byMode.easy.sets["1"]`
   should be `{ completed: true, bestCorrect: 10, attempts: 1 }`.

## Invariants and gotchas

- Never reorder or edit questions inside a published band. Set contents are
  positional, so stars earned against old questions would silently refer to new
  ones. Append new bands instead.
- Quiz XP is **derived**, not stored. Re-scoring a set can only raise
  `bestCorrect`, so XP only goes up.
- The spend id is not unique per attempt (`quiz-<sport>-<mode>-<set>`).
  `spendCoins` does not de-duplicate, so every entry charges. That is intended.
