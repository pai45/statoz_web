# Profile — implementation guide

The player's "dossier", plus everything reachable from it:

- **`/profile`:** a hero with the banner, avatar, level, XP meter, mastery chips,
  shareable player tag and friends count. Below it are the clubs the player
  follows, an Oz Coin tracker, an achievements showcase, three stat bands
  (PREDICTS, PICKS, GAMES), a deck-readiness card, a time-zone picker and the
  settings / log-out rows.
- **`/profile/xp`:** level summary, XP balance chart and the XP activity feed.
- **`/profile/history/{games,predict,pick}`:** three history archives.
- **`/cards`:** the owned card collection (it lives in this feature).
- **`/profile/talk-to-statoz`:** four support channels with a compose form.

There is no backend. The player's **identity** (name, avatar, banner, followed
clubs, player tag, time zone) is one record in `localStorage`. Every **number** is a
live projection of stores that other features own: game XP and records, the
economy, the card collection and predictions. Nothing is copied. The **history
archives** and the **PREDICTS / PICKS bands are demo fixtures**: they show the
same data for every account (see §11).

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. Sources:

- `src/features/profile/` (≈8.7k lines, ≈1.9k of them CSS modules): screens,
  hero, editors, overlays, the identity store, the XP projection and ledger, the
  achievement catalogue, support channels, time zones.
- `src/mocks/profile/`: `history.ts` (≈540 lines of archive fixtures) and
  `xp-history.ts` (copy for XP-ledger rows).
- `src/domain/progression/`: the level curve, the 12 XP tracks and the ledger
  filter / chart rules.
- Routes under `src/app/(platform)/profile/` and `src/app/(platform)/cards/page.tsx`.

> - The rival dossier overlay and `usePlayerStanding` also live in this feature.
>   They are documented with their main consumer in [`leaderboard.md`](./leaderboard.md).
> - Shop avatars, banners and frames (which the hero wears) are in [`shop.md`](./shop.md).
> - Decks, the card catalogue and the store pattern are in
>   [`shared_game_platform.md`](./shared_game_platform.md) and
>   [`starter_pack.md`](./starter_pack.md).

---

## At a glance

| Route | Page file | Screen | Auth |
|---|---|---|---|
| `/profile` | `src/app/(platform)/profile/page.tsx` | `ProfileScreen` | `AuthBoundary` ("view your profile") |
| `/profile/xp?track=<ProgressTrack>` | `…/profile/xp/page.tsx` | `XpProgressScreen` in `<Suspense fallback={null}>` (it reads `useSearchParams`) | `AuthBoundary` |
| `/profile/history` | `…/profile/history/page.tsx` | `redirect("/profile/history/games")` | n/a |
| `/profile/history/games` · `/predict` · `/pick` | `…/history/<section>/page.tsx` | `ProfileHistoryScreen section="…"` | `AuthBoundary` |
| `/cards` | `src/app/(platform)/cards/page.tsx` | `AllCardsScreen` | `AuthBoundary` |
| `/profile/talk-to-statoz` | `…/talk-to-statoz/page.tsx` | `TalkToStatoz` | Public |
| `/profile/talk-to-statoz/[channel]` | `…/talk-to-statoz/[channel]/page.tsx` | `TransmissionCompose`. Uses `generateStaticParams` (4 channels), `generateMetadata` and `notFound()` | Public |

| | |
|---|---|
| Layout | `(platform)` route group: top bar, breadcrumbs, side rail on `lg`, bottom nav on phones. For a guest, the **PROFILE** nav item opens the log-in dialog instead of navigating |
| Public API (`@/features/profile`) | Screens: `ProfileScreen`, `XpProgressScreen`, `ProfileHistoryScreen`, `AllCardsScreen`, `TalkToStatoz`, `TransmissionCompose`. Support data: `supportChannels`, `supportChannelFor`, `channelNumber`. Standing: `usePlayerStanding`, `playerDisplayName`. Rivals: `RivalDossierOverlay`, `rivalDossier`. Identity: `useProfileIdentity`, `readProfileIdentity`, `useIsHydrated`, `loadOrCreatePlayerTag`, `saveProfileSetup`, `resetProfileIdentity`. Types: `ProfileIdentity`, `HistorySection`, … |
| Owns in `localStorage` | `statoz.profile.v1` (identity) and `statoz.xp-ledger.v1` (XP history rows) |
| Reads | `statoz.economy.v1` (coins, transactions, owned/equipped cosmetics, cards), the decks store, every game's stats store (through `useGameCareer`), `statoz.predictions.v1`, `statoz.friends.v1` |
| Ads | `AdSlot placement="profile-dossier"` (in the dossier column), `"history-feed"` (history pages) |
| Not a route | `src/app/(platform)/profile/achievements/` holds only a `.gitkeep`. The full achievement catalogue is an overlay |

---

## 1. Where every number comes from

| UI | Source | Real or demo |
|---|---|---|
| Display name | `identity.displayName \|\| "PLAYER ONE"` | Real |
| Avatar | `identity.avatarId`. If it is an owned player card (`economy.owned.avatarIds`), use `portraitForCard(card)`, else `avatarOptionById(id).src` (6 onboarding faces) | Real |
| Banner | `identity.bannerId`. If it is an owned shop banner, use `<BannerArt>`, else `profileBannerOptionById(id)` → `<BannerVisual>` (4 onboarding banners) | Real |
| Avatar frame ring | `economy.equipped.frameId` → `shopFrames[…].color` | Real |
| Level, XP meter, mastery chips | `usePlayerProgress()` (§1.2) | Real |
| Player tag | `identity.playerTag`, minted on the first `/profile` visit | Real |
| Friends pill | `useFriendCounts()` → `{ total, online }` | Real |
| Following band | `identity.primarySport / followedLeagueIds / favoriteTeams` + `followableLeagues` mock | Real |
| Oz Coin tracker | `economy.coins` + `economy.transactions` | Real |
| Achievements | `progress.achievements` (`AchievementStats`) | Real (but some stats are hard-coded 0; §11) |
| **PREDICTS band** | `predictionHistoryRecords` fixture | **Demo:** always 10 / 72% / 13 |
| **PICKS band** | `pickHistoryRecords` fixture | **Demo:** always 10 / 67% / 6 |
| GAMES band | `progress.career` (`useGameCareer`) | Real |
| ALL DECKS card | `useDecks()` → `activeDeck(decks).loadouts[sport]` | Real |
| Time zone | `identity.timeZoneId` | Real (but nothing else reads it; §11) |
| History archives | `@/mocks/profile` fixtures | **Demo** |

### 1.1 The identity store (`state/profile-identity.ts`)

One record under `statoz.profile.v1`. It uses the same versioned-key, frozen-default,
cached-parse `useSyncExternalStore` pattern as every other store (see the shared
doc).

```ts
export type ProfileIdentity = {
  displayName: string;
  avatarId: string;                         // onboarding face id OR an owned player-card id
  bannerId: string;                         // onboarding banner id OR an owned shop banner id
  primarySport: Sport;
  followedLeagueIds: string[];
  favoriteTeams: Record<string, string>;    // leagueId → teamId
  playerTag: string | null;                 // "XXXX-XXXX", minted once in the browser
  timeZoneId: string | null;                // IANA id, or "device"; null until chosen
};

const noIdentity = Object.freeze({ displayName: "", avatarId: "", bannerId: "",
  primarySport: "football", followedLeagueIds: [], favoriteTeams: {}, playerTag: null, timeZoneId: null });
```

- **Parsing:** each field is narrowed on its own. Wrong types fall back to the
  default, `displayName` is trimmed, and unparseable JSON reads as `noIdentity`.
  The server snapshot is always `noIdentity`.
- **Writes:** `patch(changes)` merges into the current snapshot and writes the whole
  record, then notifies. A `storage` listener (also for `key === null`) keeps other
  tabs in step.

| Function | Exported from index | Used by |
|---|---|---|
| `useProfileIdentity()` / `readProfileIdentity()` | ✓ | Profile, match feed, match circle, streaks, pitch duel, matchmaking, referrals |
| `useIsHydrated()` | ✓ | `useSyncExternalStore(noop, () => true, () => false)`: false on the server and the first client render |
| `loadOrCreatePlayerTag()` | ✓ | Profile (in an effect after hydration), referral screen |
| `saveProfileSetup(setup)` | ✓ | Onboarding finish: name, avatar, banner, sport, leagues, teams in one write |
| `resetProfileIdentity()` | ✓ | Writes `noIdentity`; leaves every other store alone |
| `saveAvatar`, `saveBanner`, `saveTimeZone`, `saveFollowing` | internal | The profile's own editors |

**Player tag** (`src/shared/utils/player-tag.ts`): 8 characters from a 31-letter
alphabet with no `I L O 0 1`, split `XXXX-XXXX`. It is made by an LCG that is
bit-identical to the app:

```ts
const tagAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function tagFromSeed(seed: number): string {
  let state = (seed ^ 0x5f3759df) & 0x7fffffff;
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    if (i === 4) out += "-";
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    out += tagAlphabet[state % tagAlphabet.length];
  }
  return out;
}
export const randomPlayerTag = () => tagFromSeed(Math.floor(Math.random() * 0x7fffffff));
export const playerTagForName = (name: string) => tagFromSeed(seedHash(name));   // rivals
```

`loadOrCreatePlayerTag` mints a tag only when none is stored. It must run in an
effect, never during render, because the random seed would differ between the
server and the client.

### 1.2 The XP projection (`state/player-progress.ts`)

```ts
export type PlayerProgress = {
  xpByTrack: TrackXp;          // Partial<Record<ProgressTrack, number>>, zeros never stored
  totalXp: number;
  level: number;
  band: LevelProgress;         // { level, intoLevel, levelSpan, toNextLevel, fraction }
  tracks: ProgressTrack[];     // tracks with XP > 0, in display order
  career: CareerRecord;        // { played, won, winRate, bestStreak, currentStreak }
  achievements: AchievementStats;
};

export function usePlayerProgress(): PlayerProgress {
  const games = useGameCareer();          // @/features/games: aggregates every game store
  const economy = useEconomy();
  const predictions = usePredictions();
  return useMemo(() => {
    const predicting = predictionCareer(predictions);
    const collection = collectionFromIds(economy.owned.playerCardIds, economy.owned.actionCardIds);
    const xpByTrack = { ...games.xpByTrack };
    if (collection.xp > 0) xpByTrack.cardsMeta = collection.xp;     // owning cards earns XP
    if (predicting.xp > 0) xpByTrack.prediction = predicting.xp;    // settled prediction cards
    const totalXp = totalTrackXp(xpByTrack);
    const band = levelProgress(totalXp);
    return { xpByTrack, totalXp, level: band.level, band, tracks: earnedTracks(xpByTrack),
             career: { played: games.played, won: games.won, winRate: games.winRate,
                       bestStreak: games.bestStreak, currentStreak: games.currentStreak },
             achievements: { /* see §2.5 */ } };
  }, [economy, games, predictions]);
}
export const trackLevel = (xp: TrackXp, track: ProgressTrack) => levelFromXp(xp[track] ?? 0);
```

Nothing is stored here. When a game records a win, the profile reflects it with no
sync step. **Level curve** (`domain/progression/level.ts`): reaching level L costs
`50·L·(L−1)` XP in total (0, 100, 300, 600, 1000 …).
`levelFromXp(xp) = max(1, floor((50 + √(2500 + 200·xp)) / 100))`.

**`useGameCareer()`** (`src/features/games/state/game-career.ts`) is where game
numbers come from:

| Track | Comes from | Counts toward played / won / streaks |
|---|---|---|
| `pitchDuel` | `statoz.pitch-duel.v1` xp | ✓ played, wins, best/current streak |
| `shootout` | `statoz.shootout.v1` xp | ✓ played, wins (also `shootoutWins`) |
| `finalOver` | `statoz.finalover.v1` xp | ✓ chases, wins |
| `hoopDuel` | `statoz.hoopduel.v1` xp | ✓ games, wins, streaks (also `basketballWins`) |
| `tennis` | sum of `statoz.tennis.v1` **mastery** XP | ✓ sets played/won, streaks (also `tennisAchievements`) |
| `grandPrix` | `statoz.grandprix.v1` xp | ✓ races, wins, streaks |
| `quiz` | `statoz.quiz.v1` (derived) | XP only |
| `guessPlayer` | `statoz.guessplayer.v1` xp | XP only (best streak counts) |
| `footballChess`, `bingo` | **never set** (those games do not persist XP) | n/a |
| `prediction` | `predictionCareer(predictions).xp` | n/a |
| `cardsMeta` | `collectionFromIds(…).xp` | n/a |

`winRate = round(won / played · 100)`. `bestStreak` and `currentStreak` are the max
across modes.

### 1.3 Tracks (`domain/progression/track.ts`)

`progressTracks` sets the display order. The short labels are used on the mastery
chips and the full labels elsewhere:

| Track | Short | Display |
|---|---|---|
| pitchDuel | PITCH | PITCH DUEL |
| shootout | SHOOTOUT | PENALTY SHOOTOUT |
| footballChess | CHESS | FOOTBALL CHESS |
| quiz | QUIZ | QUIZ |
| bingo | BINGO | FOOTBALL BINGO |
| guessPlayer | GUESS | GUESS PLAYER |
| finalOver | FINAL OVER | FINAL OVER |
| hoopDuel | HOOP | HOOP DUEL |
| grandPrix | GP | GRAND PRIX |
| tennis | TENNIS | TENNIS RALLY |
| prediction | PREDICT | PREDICTIONS |
| cardsMeta | CARDS | CARDS / META |

---

## 2. The dossier (`components/profile-screen.tsx`)

```
┌ ProfileHero ─────────────────────────────────────────────────────────────┐
│ banner (206px; lg 240px) ............................... [✎ banner]    │
│  ┌avatar┐                                                                │
│  │  ✎   │  ┌ ProfilePanel ──────────────────────────────── [LVL 7] ─┐   │
│  └──────┘  │ PLAYER ONE                       MASTERY                │   │
│            │ OPERATIVE // ID 0001             [PITCH L3][HOOP L2]…   │   │
│            │ XP ████████░░░ 340 / 700        K7QM-2XRA ⧉  [FRIENDS 3 ●2 ›] │
│            └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
┌ main column ───────────────────────────────┐ ┌ sidebar (lg: 20rem) ─────┐
│ FollowingBand        (delay   0 ms)        │ │ LoadoutCard     (280 ms) │
│ OzCoinTracker        (60)                  │ │ TimeZoneCard    (320)    │
│ AchievementShowcase  (100)                 │ │ ProfileActions  (360)    │
│ AdSlot profile-dossier (130)               │ └──────────────────────────┘
│ StatBand PREDICTS    (160)  → /profile/history/predict                    │
│ StatBand PICKS       (200)  → /profile/history/pick                       │
│ StatBand GAMES       (240)  → /profile/history/games                      │
└────────────────────────────────────────────┘
AvatarEditor / BannerEditor overlays (when editing)
```

- **Width:** `max-w-160` (40rem) on phones and `lg:max-w-260` (65rem) on large
  screens. Below `lg` everything is one column. At `lg` it becomes
  `grid-cols-[minmax(0,1fr)_20rem]`, which puts the telemetry in the reading column
  and the things you act on in the sidebar.
- **Section entrance:** each section is wrapped in `Section` with a
  `--enter-delay`. The `.enter` animation is 380 ms
  `cubic-bezier(0.16,1,0.3,1)` from `opacity 0; translateY(10px)` with
  `animation-fill-mode: backwards` (never `both`; see §2.10).
- **Glow rule:** only the level chip, the XP meter and the player's own avatar are
  "lit" (bloom or gradient). Every other surface is a matte `ProfilePanel`.

### 2.0 Auth (`@/features/auth` → `AuthBoundary`)

```tsx
export function ProfileScreen() {
  return (
    <AuthBoundary intent="view your profile"
                  message="Log in to see your profile, history, achievements, and loadouts."
                  returnTo="/profile">
      <ProfileDossier />
    </AuthBoundary>
  );
}
```

`AuthBoundary` renders one of three things:

- `"hydrating"` (always on the server): a "CHECKING ACCOUNT..." placeholder.
- `"guest"`: a lock card reading `// ACCOUNT REQUIRED`, `LOG IN TO <INTENT>`, with
  a **LOG IN** link to `loginHref(returnTo)` and **BACK TO SPORTS** to `/`.
- Signed in: its children.

Every authed profile page uses it. Your port needs an equivalent.

### 2.1 Hero (`components/profile-hero.tsx`, `components/level-badges.tsx`)

- **Geometry (phone = app):**
  - The banner is `absolute h-51.5` (206px), `lg:h-60`.
  - The panel starts `pt-30` (120px) down, `lg:pt-33`.
  - The avatar straddles both at `left-7 top-18` (28/72px), in a 104px box with a
    96px face. On `lg` it is 128/120px.
  - The banner fades into the page with a bottom gradient to
    `--ds-color-background-primary`.
- **Edit buttons:** 32px pencil squares on the banner (top right) and the avatar
  (top right). They open the editors (§2.2).
- **Avatar:** `next/image` (`publicAsset(src)`, `fill`, `object-top`) inside
  `AvatarFrameRing` from the shop. It has a 2px cyan border, a hard drop shadow and
  a cyan bloom.
- **`LevelChip`:** `LVL n`, with a cyan edge, gradient fill and drop shadow. It
  links to `/profile/xp`. The rival dossier reuses it.
- **Name and subtitle:** the name is 24px display type. The subtitle is the fixed
  string **`OPERATIVE // ID 0001`**.
- **`XpMeter band`:** `XP … intoLevel / levelSpan` over a 6px `Progress` bar
  (`value = band.fraction`).
- **Mastery strip:** one chip per earned track, e.g. `PITCH L3`, linking to
  `/profile/xp?track=<track>`. It scrolls sideways. With no tracks it reads
  "PLAY A MODE TO START A TRACK".
- **Player tag pill:** shows the tag (or `••••-••••` until it is minted). Tapping it
  runs `navigator.clipboard.writeText(tag)` and shows a cyan `COPIED` that fades
  after 1.6 s. A clipboard failure is silently ignored.
- **Friends pill:** links to `/friends`, with a violet total count and a green-dot
  online count (online count hidden at 0).

### 2.2 Avatar and banner editors (`components/identity-editors.tsx`)

Both editors are full-size `ProfileOverlay`s that hold the choice locally and
commit only on the footer button, so backing out keeps the saved value.

| Editor | Title | Options | Commit |
|---|---|---|---|
| `AvatarEditor` | CUSTOMISE PROFILE | 6 onboarding faces (`avatarOptions`) + every owned player card that has a portrait. 3-column `SelectableTile` radiogroup with a live 110px preview | **DONE** → `saveAvatar(id)` then `equipCosmetic("avatar", id)` |
| `BannerEditor` | CHOOSE YOUR BANNER | 4 onboarding banners (South Africa, Green Red, Korea, Czech) + owned shop banners. Tiles at a 2.35:1 aspect | **CONTINUE** → `saveBanner(id)` then `equipCosmetic("banner", id)` |

`equipCosmetic` ignores ids the economy does not own, so picking a free onboarding
face leaves `economy.equipped.avatarId` unchanged. The identity record is what is
displayed (§11).

### 2.3 Following band and clubs editor (`components/following-band.tsx`, `following-editor.tsx`)

The band shows a primary-sport chip, then a crest chip (`Monogram`) per followed
league **that has a chosen team**, plus an edit button. With none picked it reads
"Pick the teams and clubs you follow."

**EDIT CLUBS** (full overlay; it reuses onboarding's `SportPills` and
`LeaguePills`, then a team grid):

- Choosing a **different sport clears** all follows and teams. A player follows
  one sport's leagues at a time.
- Toggling a league on follows it, preselects its first team and makes it active.
  Toggling it off removes its team as well.
- Picking a team also follows its league.
- **SAVE** → `saveFollowing({ primarySport, followedLeagueIds, favoriteTeams })`,
  stored in the order the sport lists its leagues, not tap order.

Followable leagues (`src/mocks/onboarding/followable-leagues.ts`):

| Sport | Leagues (short code) |
|---|---|
| football | EPL, LAL, SEA, BUN, LI1 |
| cricket | T20I |
| motorsport | F1 |
| basketball | NBA |
| tennis | ATP, WIM (**WIM has no teams**) |

The home match feed reads `favoriteTeams` to surface "your clubs".

### 2.4 Oz Coin tracker (`components/oz-coin-tracker.tsx` + `.module.css`)

- **Chart:** an `InteractiveLineChart` (gold, 11rem tall) of each transaction's
  `balanceAfter` in time order. With no transactions it shows one point at the
  current balance. The **ALL / WEEK / DAY** tabs count back from the *latest*
  transaction. A sparse range keeps the last 2 points so the line never vanishes.
  Tapping or dragging the chart selects a point, and the readout below shows
  `BALANCE n OZ` for it (default: the latest point).
- **Stats:** BALANCE, EARNED (sum of positive deltas excluding `openingBalance`)
  and SPENT (sum of negative deltas). Values use compact format (`48.2K`) and are
  green or red when non-zero.
- **HISTORY overlay ("OZ COIN HISTORY"):**
  - Filters: ALL / EARNED / SPENT, newest first.
  - Each row shows the title, `subtitle · 14 SEPT, 18:05` (formatted in **UTC**), a
    coloured `+n`/`−n` (gold for the opening balance) and `n BAL`.
  - Empty states: "NO COIN HISTORY YET", or "NO COIN MOVES MATCH THIS FILTER".
- The economy keeps the newest **250** transactions. Kinds are `openingBalance`,
  `reward`, `purchase`, `topUp` and `grant`.

### 2.5 Achievements (`data/achievements.ts`, `components/achievement-showcase.tsx`)

A badge is **never stored**. Unlock state is `measure(stats) >= target`, computed
live from `AchievementStats`:

```ts
// assembled in usePlayerProgress
achievements = {
  level, totalXp,
  matchesPlayed: games.played, matchWins: games.won, bestMatchStreak: games.bestStreak,
  cleanSheets: 0,                                     // not built on the web
  shootoutWins: games.shootoutWins, basketballWins: games.basketballWins,
  tennisAchievements: games.tennisAchievements,       // ids like "clean-hold"
  predictionsMade: predicting.made, correctPredictions: predicting.correct,
  picksPlaced: 0, picksWon: 0, pickStreak: 0, pickProfit: 0,   // not built on the web
  ownedCards: collection.totalCards, platinumOwned: collection.platinumOwned,
  coins: economy.coins,
};
```

**The catalogue (33 badges).** It is a one-for-one port of the app: same ids,
titles, tiers and targets. Matches, progression and collection fold into the
**GAMES** group, and predictions and picks get their own groups.

| Group | Badge (id) | Tier | Unlocks when |
|---|---|---|---|
| GAMES | First Blood (`first_blood`) | bronze | matchWins ≥ 1 |
| | Hat-Trick Hero (`hat_trick`) | bronze | matchWins ≥ 3 |
| | On Fire (`on_fire`) | silver | bestMatchStreak ≥ 3 |
| | Clean Sheet (`clean_sheet`) | silver | cleanSheets ≥ 1 (**always 0**) |
| | Shootout Ace (`shootout_ace`) | silver | shootoutWins ≥ 1 |
| | First Bucket (`first_bucket`) | silver | basketballWins ≥ 1 |
| | Court King (`court_king`) | gold | basketballWins ≥ 5 |
| | Clean Hold, Break Through (`tennis_clean_hold`, `tennis_break_through`) | bronze | tennis achievement `clean-hold` / `break-through` earned |
| | Unbreakable, Ace High | silver | `unbreakable` / `ace-high` |
| | Rally Architect, Net Authority, Comeback Set, Tiebreak Nerve | gold | `rally-architect` / `net-authority` / `comeback-set` / `tiebreak-nerve` |
| | All Styles, Champion | platinum | `all-styles` / `champion` |
| | Veteran (`veteran`) | silver | matchesPlayed ≥ 10 |
| | Unstoppable (`unstoppable`) | gold | bestMatchStreak ≥ 5 |
| | Centurion (`centurion`) | gold | matchesPlayed ≥ 50 |
| | Rising Star / Pro / Legend | bronze / silver / platinum | level ≥ 5 / 10 / 25 |
| | Collector (`collector`) | bronze | ownedCards ≥ 25 |
| | Platinum Pull (`platinum_pull`) | platinum | platinumOwned ≥ 1 |
| | Treasury (`treasury`) | gold | coins ≥ 1000 |
| PREDICTION | First Call (`first_prediction`) | bronze | predictionsMade ≥ 1 |
| | Analyst (`analyst`) | silver | predictionsMade ≥ 10 |
| | Sharp Eye (`sharp_eye`) | silver | correctPredictions ≥ 10 |
| PICKS | First Position, Market Mover, Hot Hand, In Profit | bronze, silver, gold, silver | picksPlaced ≥ 1, picksWon ≥ 5, pickStreak ≥ 3, pickProfit > 0 (**all always 0**) |

Each badge also has an `icon` (a `GlyphName`, e.g. `sports_soccer`,
`local_fire_department`) and a `description`.

Helpers:

- `isUnlocked`
- `achievementProgress` (0..1)
- `achievementCurrent` (clamped to the target)
- `unlockedAchievementCount`
- `achievementsForGroup`
- `unlockedCountForGroup`
- `previewAchievements(stats, n)`: all unlocked badges first, then locked ones by
  progress descending.

**UI:**

- **Showcase card:** `unlocked / 33` and the first **4** preview badges. Badges
  land with `.badgeIn`, a 420 ms overshoot (`cubic-bezier(0.34,1.56,0.64,1)`) from
  `scale(0.82)`, staggered 90 ms.
- **`AchievementBadge`:** a 74px-wide chamfered plate tinted by tier
  (`rarityVar(tier)`), or a muted border when locked. A thin progress bar shows
  while the badge is in progress.
- **Catalogue overlay ("ACHIEVEMENTS"):** GAMES / PREDICTION / PICKS tabs with
  per-group counts, in a grid of 4 columns (5 at `sm`).
- **Detail overlay:** titled "UNLOCKED" or "IN PROGRESS", in the tier colour. It
  shows the badge, description, tier pill, `current / target` and a progress bar.
  The rival dossier renders the same showcase against a rival's stats.

### 2.6 Stat bands (`components/stat-band.tsx`)

```ts
<StatBand title accent icon stats={ProfileStat[]} streak? historyHref? />
type ProfileStat = { label: string; value?: number; text?: string; suffix?: string };
```

- The header shows the accent title, then a gold flame streak badge with the count
  (only when `streak > 0`, aria-label "n in a row"), then a **HISTORY ›** link.
- Below it are three cells. Each numeric `value` counts up with `useCountUp`
  (600 ms easeOutCubic, skipped under reduced motion).

| Band | Accent | Cells | Source |
|---|---|---|---|
| PREDICTS | cyan | PLAYED, ACCURACY %, CORRECT | Fixtures: `PLAYED` = all 10 records. `ACCURACY` and `CORRECT` use only won/lost records: correct ÷ answered |
| PICKS | lime | PICKS, WIN RATE %, ACTIVE | Fixtures: won ÷ (won + lost); ACTIVE = live + pending + unresolved |
| GAMES | orange | MATCHES, WIN %, BEST RUN | `career`. Streak badge = `career.currentStreak` |

The app's third GAMES cell is DRAWS. The web shows BEST RUN because no web game can
end level.

### 2.7 ALL DECKS card (`components/loadout-card.tsx`)

Readiness is `isLoadoutComplete(activeDeck(decks).loadouts[sport])` for each of the
5 sports. The card shows:

- `ready/5` and a progress bar.
- A subtitle naming the last ready sport ("// BASKET SQUAD READY").
- Per-sport chips linking to `/decks/<sport>`.

With all five ready, the card turns success-green and reads "EVERY SPORT LOADOUT IS
LOCKED AND READY". The edge is always cyan at 52%.

### 2.8 Time zone (`components/time-zone-card.tsx`, `data/time-zones.ts`)

- The card is titled "SET UP YOUR LOCAL TIME ZONE". Its subtitle is "Choose your
  local time zone", or `Device · Asia/Kolkata · UTC+05:30`, or the chosen zone's
  `label · offset`. A chosen zone gives the card a cyan edge.
- The picker sheet lists **"device"** plus **37** fixed zones, from Pago Pago
  (UTC−11:00) to Kiritimati (UTC+14:00), including the :30 and :45 offsets. Each
  shows a radio icon.
- Choosing one runs `saveTimeZone(id)`.
- `deviceTimeZoneDescription()` reads `Intl.DateTimeFormat().resolvedOptions().timeZone`
  and `getTimezoneOffset()`. It runs **only in the browser**, through a
  `useSyncExternalStore` whose server snapshot is empty, so SSR never prints the
  server's zone.

### 2.9 Actions and settings (`components/profile-actions.tsx`)

There are four rows: **All Cards** → `/cards`, **How To Play** → `/how-to-play`,
**Talk to StatOz 1:1** → `/profile/talk-to-statoz`, and **Settings**, which opens a
sheet. The sheet has one destructive row, **Log out**, which opens a dialog:

> **LOG OUT OF STATOZ?** Your profile, coins, cards, matches, and progress will be
> hidden but remain saved in this browser for your next sign-in.
> [CANCEL] [LOG OUT >]

**LOG OUT** → `signOut()` then `router.replace("/")`. `signOut` deletes only
`statoz.auth.v2` and broadcasts a `storage` event with `key: null`, so every store
re-reads. Data stays put.

The local auth shim keeps each account's data separate:

- On sign-in, `switchPlayerData(email)` copies the current values of 15 player keys
  to `statoz.account.<email>.<key>` backups for the previous owner.
- It then restores the new account's backups into the live keys and records the
  owner in `statoz.account-data-owner.v1`.

The list of keys that get swapped is `playerStorageKeys` in
`src/features/auth/state/auth-session.ts`. It is **incomplete** (§11).

### 2.10 Shared primitives

**`ProfilePanel`** (`components/profile-panel.tsx`) is the dossier's surface: a
chamfered `--ds-clip-panel` plate. Because a clip path crops CSS borders, the edge
is a layer behind the fill, and the fill is inset 1px. The hard shadow sits on the
**unclipped wrapper** as a filter:

```tsx
<div className={interactive ? styles.pressable : ""}
     style={{ filter: "drop-shadow(0 5px 0 var(--ds-color-fixture-shadow))" }}>
  <div aria-hidden className="absolute inset-0"  style={{ clipPath: "var(--ds-clip-panel)", background: borderColor ?? "var(--ds-color-border-default)" }} />
  <div aria-hidden className="absolute inset-px" style={{ clipPath: "var(--ds-clip-panel)", background: "var(--ds-color-background-secondary)" }} />
  <div className="relative" style={{ clipPath: "var(--ds-clip-panel)" }}>{children}</div>
</div>
```

**`ProfileOverlay`** (`components/profile-overlay.tsx`) is the one shell for every
sheet and dialog: settings, time zone, clubs, avatar and banner editors, log out,
the achievement catalogue and detail, the coin history and the rival dossier.

- **Portalled into `document.body`.** The dossier is full of transforms, filters
  and animations, and `position: fixed` would otherwise anchor to the nearest one.
  This is also why every entrance uses `animation-fill-mode: backwards`.
- **Placement:** docked to the bottom on phones (`.sheet`, 240 ms rise) and centred
  from 40rem up (scale-in from 0.97).
- **Sizes:**

  | `size` | Height | Width (≥ `sm`) |
  |---|---|---|
  | `"sheet"` | `max-h 86dvh` (80dvh at `sm`) | 125 |
  | `"dialog"` | hugs content, `max-h 86dvh` | 95 |
  | `"full"` | `92dvh` (88dvh at `sm`) | 160 |

- **Closing:** Escape, the scrim (a sibling button, so panel clicks never need
  `stopPropagation`) or the × button.
- **Focus and scroll:** focuses the panel on open. It locks body scroll and
  restores the *previous* `overflow` value, so nested overlays work.
- **Layout:** an optional `footer` is pinned under the scrolling body. The header
  shows the accent title and an optional icon.
- Returns `null` before hydration.

---

## 3. XP progress (`/profile/xp`, `components/xp-progress-screen.tsx`)

`?track=` is validated against `progressTracks` and preselects a track filter. The
screen is wrapped in `AuthBoundary` (`returnTo="/profile/xp"`).

| Area | Content |
|---|---|
| Level summary | Level, the XP meter, and `n XP TO LEVEL L+1` (`band.toNextLevel`) |
| XP HISTORY chart | ALL / WEEK / DAY tabs. `xpLedgerForRange` cuts back from the latest row and keeps ≥ 2 points. `xpBalanceValues` plots `balanceAfter` in time order, or `[totalXp]` when empty |
| Totals | EARNED (positive deltas excluding opening balances), LOST |
| Filters | ALL · EARNED · LOST · GAMES · PREDICTIONS · REWARDS, each with a count (`matchesXpFilter`). Then the earned tracks as toggle chips (tap again to clear) |
| Feed | Newest first. A glyph per source (e.g. `match` → `sports_soccer`, `pack` → `collections_bookmark`), the title, `details · timestamp` and a signed delta. Empty: "No XP activity yet. Play a match, make a prediction, or open a pack." |

Filter rules (`domain/progression/ledger.ts`):

- **GAMES:** sources match, shootout, quiz, footballChess, superOver, basketball,
  tennis, grandPrix, finalOver, guessPlayer and bingo.
- **REWARDS:** pack, dailyDrop, streakReward and cardUnlock.
- **PREDICTIONS:** the `prediction` source.

### 3.1 The XP ledger (`state/xp-ledger.ts`, key `statoz.xp-ledger.v1`)

Games store **cumulative** XP, not transactions. The ledger turns them into rows by
diffing the per-track totals against the balances it last saw:

```ts
type StoredXpLedger = { version: 1; balances: TrackXp; entries: XpLedgerEntry[] };
type XpLedgerEntry = { id; timestamp; delta; balanceAfter;
                       type: "earn" | "loss" | "openingBalance";
                       source: XpTransactionSource; track: ProgressTrack; title; details? };

function syncLedger(xpByTrack: TrackXp) {
  const current = getSnapshot();
  const changed = progressTracks.filter((t) => (current.balances[t] ?? 0) !== (xpByTrack[t] ?? 0));
  if (changed.length === 0) return;
  const firstImport = current.entries.length === 0 && totalTrackXp(current.balances) === 0;
  // one row per changed track: delta = after − before, running balanceAfter (floored at 0),
  // type = firstImport ? "openingBalance" : delta > 0 ? "earn" : "loss",
  // source/title/details from xpHistoryEventTemplates[track] (src/mocks/profile/xp-history.ts):
  //   e.g. pitchDuel → { source: "match", title: "PITCH DUEL PROGRESS" } — "PROGRESS" becomes "XP" after the first import
  write({ version: 1, balances: { ...xpByTrack }, entries: [...additions.reverse(), ...current.entries].slice(0, 250) });
}

export function useXpLedger(xpByTrack: TrackXp): XpLedgerEntry[] {
  const ledger = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const fingerprint = progressTracks.map((t) => `${t}:${xpByTrack[t] ?? 0}`).join("|");
  useEffect(() => { syncLedger(xpByTrack); }, [fingerprint]);
  return ledger.entries;
}
```

Stored rows are validated field by field on read: the track, source and type must
be known, and the timestamp must parse. `useXpLedger` is called **only on this
page**, so the ledger only catches up while `/profile/xp` is open (§11).

---

## 4. History archives (`/profile/history/*`, `components/profile-history.tsx`)

There is one screen with a `section` prop. Its header has a back arrow, an eyebrow
and a title, and a `PROFILE ›` link. A sport `UnderlineTabs` strip follows
(football first, kept in local state). Its sections:

| Section | Title | Eyebrow | Accent | Summary cells | Filters |
|---|---|---|---|---|---|
| `predict` | MY MATCHES HISTORY | PREDICT // ARCHIVE | violet | MATCHES, ACCURACY (this sport, **all** records), RANK (**fixed "122"**) | ALL · WON · LOST · LIVE · PENDING · UNRESOLVED (with counts) |
| `pick` | MY PICKS HISTORY | PICK // LEDGER | lime | PICKS, EXPOSURE (unsettled stakes), PROFIT (settled payout − stake, ±) | the same, plus REVIEW (=unresolved) and REFUND (=voided) |
| `games` | MATCH ARCHIVE | GAMES // CAREER LOG | cyan | W · D · L and win rate, with a distribution bar | n/a |

- **Prediction card:** the match-up (via `matchById(matchId)`, linking to
  `/matches/<id>`), a status tag, `POTENTIAL +n XP`, "c of q answers correct" and a
  note.
- **Pick card:** the market, the outcome with its probability, `STAKE n OZ`, and
  `MAX n OZ` (or "STAKE RETURNED" for a refund).
- **Game card:** a button over a faint `GameScene` illustration of the game. It
  opens a dialog titled **MATCH RESULT // ARCHIVED** that shows PLAYER vs OPPONENT
  scores, the result, the note, the opponent, when it was played and the RUN
  (streak). Escape or a scrim click closes it.
- An `AdSlot placement="history-feed"` sits in the body. Empty states include "NO
  QUIZZES YET" and "NO GAMES ARCHIVED YET".

**Data (`src/mocks/profile/history.ts`), all fixtures:**

```ts
export type HistorySection = "predict" | "pick" | "games";
export type HistoryStatus = "won" | "lost" | "live" | "pending" | "unresolved" | "voided";
export type PredictionHistoryRecord = { id; sport; matchId; status; submittedAt; answered; questions; correct; potentialXp; note };
export type PickHistoryRecord = { id; sport; matchId; marketId; market; outcome; status; submittedAt; stakeOz; probability; payoutOz; note };
export type GameHistoryRecord = { id; sport; game: GameId; opponent; result: "won" | "draw" | "lost"; playedAt;
  playerScore: string; opponentScore: string; streak; note; isDemo?; sourceResultLabel?; sourceClassification?;
  xpDelta?; badge?; position?: { place; field }; rounds?: { round; scenario; outcome; playerAttacking }[] };
```

- `predictionHistoryRecords`: 10 records across all five sports.
- `pickHistoryRecords`: 10 records.
- `gameHistoryRecords = mergeGameHistory(stored, demos)`: **39 rows**.
  - 11 hand-written "stored" rows (one per game, quizzes included).
  - 28 generated `isDemo` rows from `demoSeeds`.
  - Deduplicated by id and capped at 12 per game.
- `achievementGameHistoryRecords` filters out the demos. Nothing consumes it yet.

The ids point at the real match catalogue, so a repository can replace the fixtures
without changing the card contract.

---

## 5. All Cards (`/cards`, `components/all-cards-screen.tsx`)

The owned collection, behind `AuthBoundary` (`returnTo="/cards"`):

- **Sport tabs** (resetting the filter to ALL), then role filter chips per sport:

  | Sport | Filters |
  |---|---|
  | football | ALL, ATK, DEF, GK, ACT |
  | cricket | ALL, BAT, BOWL |
  | basketball | ALL, G, W, BIG |
  | tennis | ALL |
  | motorsport | ALL, F1, F2, NASCAR, INDY |

- **Grid:** `economy.owned.playerCardIds` for that sport, by **rating descending**,
  rendered as `PlayerCard size="md"` with sport-specific markings. Football action
  cards (`ActionCard`) are appended when the filter is ALL or ACT. Empty:
  "NO <SPORT> CARDS YET".
- **Detail overlay:** portalled, with Escape, a body scroll lock and the stats.
  **SHARE** uses `navigator.share({ title, text })`, falling back to the clipboard,
  with text like `"Messi · 94 OVR · PLATINUM"`.

---

## 6. Talk to StatOz (`components/talk-to-statoz.tsx`, `transmission-compose.tsx`, `data/support-channels.ts`)

> In-depth guide: [`talk_to_statoz.md`](./talk_to_statoz.md). It covers all
> channel copy, validation, the send-off timeline, and connecting the form to a
> real inbox. This section is a summary.

- **Hub:** a back link to `/profile`, "TALK TO STATOZ // 1:1 DIRECT LINE", and
  "OPEN A CHANNEL — Pick a channel. We read every transmission." Below that are
  four `DirectoryCard`s, `CHANNEL 01…04`. A **FOLLOW US ON** panel links to
  Instagram, Reddit and YouTube.

  | id | Title | Accent | Subtitle |
  |---|---|---|---|
  | `bug` | Bug | danger | // CHANNEL 01 · DEFECT SIGNAL |
  | `feature` | Feature Request | cyan | // CHANNEL 02 · NEW BUILD |
  | `mismatch` | Score / Data Mismatch | orange | // CHANNEL 03 · DATA SYNC |
  | `shoutout` | Shoutout | gold | // CHANNEL 04 · FAN SIGNAL |

  `channelNumber` is the array index, so append channels and never reorder them.
- **Compose (`/profile/talk-to-statoz/<id>`):** the channel's hint, then a
  **summary** input and a **details** textarea, both required. Trying to send with
  one empty marks that field with a text error, not just a red edge. The
  docked **TRANSMIT** button plays a send-off (badge slam, "TRANSMISSION SENT"),
  then `router.push("/profile/talk-to-statoz")` after 2.2 s.
- **Nothing is sent anywhere.** It is an honest stub (§11).

---

## 7. Who else uses profile code

| Consumer | Uses |
|---|---|
| Onboarding (`features/onboarding/components/onboarding-screen.tsx`) | `saveProfileSetup` at the end of first-run setup. The profile in turn reuses onboarding's avatars, banners, followable leagues, `SportPills`, `LeaguePills` and `BannerVisual` |
| Leaderboard, match TOPS tab | `usePlayerStanding`, `RivalDossierOverlay`, `rivalDossier` (see `leaderboard.md`) |
| Friends arena, referral screen | `RivalDossierOverlay`, `usePlayerStanding`, `useProfileIdentity`, `loadOrCreatePlayerTag`, `useIsHydrated` |
| Pitch Duel, matchmaking fighters | `useProfileIdentity`, `playerDisplayName` (the player's banner name and face) |
| Match feed, match circle | `useProfileIdentity` (favourite clubs) |
| Streaks screen and celebration | `useProfileIdentity` |
| **Inbound links** | The nav PROFILE item. Leaderboard rows and the your-rank bar → `/profile`. The friends arena and the how-to-play hub → `/profile`. The Final Over and Hoop Duel lobbies' **MATCH HISTORY** → `/profile/history/games`. The breadcrumbs (`PROFILE / ALL CARDS`, `/ XP PROGRESS`, `/ HISTORY`, `/ TALK TO STATOZ`) |

---

## 8. File manifest

| Path (under `src/features/profile/`) | Lines | Role |
|---|---:|---|
| `index.ts` | 47 | Public API |
| `types.ts` | 120 | `ProfileIdentity`, `CareerRecord`, `AchievementStats`, `Achievement`, `ProfileStat`, `TimeZoneOption` |
| `state/profile-identity.ts` | 226 | Identity store, player-tag mint, `useIsHydrated` |
| `state/player-progress.ts` | 113 | `usePlayerProgress` projection, `trackLevel` |
| `state/player-standing.ts` | 62 | `usePlayerStanding` (for boards) |
| `state/xp-ledger.ts` | 225 | `statoz.xp-ledger.v1`, `syncLedger`, `useXpLedger` |
| `data/achievements.ts` | 435 | 33-badge catalogue + helpers |
| `data/rival-dossier.ts` | 160 | Deterministic rival scouting |
| `data/support-channels.ts` | 88 | 4 channels, `supportChannelFor`, `channelNumber` |
| `data/time-zones.ts` | 88 | 37 zones, `deviceTimeZoneId`, `deviceTimeZoneDescription` |
| `components/profile-screen.tsx` | 261 | Dossier layout, auth, editor wiring, fixture-derived bands |
| `components/profile-hero.tsx` | 476 | Banner, avatar, name, XP, mastery, tag, friends |
| `components/level-badges.tsx` | 90 | `LevelChip`, `XpMeter` |
| `components/identity-editors.tsx` | 174 | `AvatarEditor`, `BannerEditor` |
| `components/following-band.tsx` | 178 | Clubs strip |
| `components/following-editor.tsx` | 202 | EDIT CLUBS overlay |
| `components/oz-coin-tracker.tsx` + `.module.css` | 265 + 161 | Coin chart, stats, history overlay |
| `components/achievement-showcase.tsx` | 408 | Showcase, badge, catalogue, detail |
| `components/stat-band.tsx` | 141 | Telemetry band |
| `components/loadout-card.tsx` | 155 | ALL DECKS |
| `components/time-zone-card.tsx` | 217 | Time-zone card + picker |
| `components/profile-actions.tsx` | 244 | Nav rows, settings, log out |
| `components/profile-panel.tsx` | 69 | Panel surface |
| `components/profile-overlay.tsx` | 190 | Sheet/dialog shell (portal) |
| `components/profile.module.css` | 138 | Entrances, badge-in, overlay motion, pressable, copied |
| `components/xp-progress-screen.tsx` + `xp-progress.module.css` | 354 + 161 | `/profile/xp` |
| `components/profile-history.tsx` + `profile-history.module.css` | 895 + 1144 | `/profile/history/*` |
| `components/all-cards-screen.tsx` + `.module.css` | 148 + 11 | `/cards` |
| `components/talk-to-statoz.tsx` + `.module.css` | 85 + 318 | Hub (CSS shared with compose) |
| `components/transmission-compose.tsx` | 246 | Compose + send-off |
| `components/rival-dossier.tsx` | 416 | `RivalDossierOverlay` |

The following also belong to the port:

- `src/mocks/profile/` (`history.ts`, `xp-history.ts`, `index.ts`).
- `src/domain/progression/` (`level.ts`, `track.ts`, `ledger.ts`, `index.ts`).
- `src/shared/utils/player-tag.ts`.
- The route files listed in *At a glance*.

There are no static assets of its own. Faces are `public/assets/avatars/*.webp`.
Banners come from onboarding and the shop.

---

## 9. Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/features/auth`: `AuthBoundary`, `signOut` (+ `useAuthSession`, `useRequireAuth` in the nav) | Gating, log out | Replace with your auth. `AuthBoundary` must treat SSR as "hydrating" |
| `@/features/games`: `useGameCareer`, `GameScene`, `gameEntryFor` | Career numbers and XP tracks; history art and titles | `useGameCareer` imports every game's store. Trim it to the games you port |
| `@/features/economy`: `useEconomy`, `equipCosmetic`, `EconomyTransaction` | Coins, transactions, owned/equipped cosmetics and cards | See `shop.md` §4 |
| `@/features/packs`: `collectionFromIds`, `allPlayerCards`, `playerCardForId`, `actionCardForId`, `portraitForCard` | Collection XP and achievements, card avatars, `/cards` | |
| `@/features/predictions`: `usePredictions`, `predictionCareer` | PREDICT track, prediction badges | No-op it (`{ xp: 0, made: 0, correct: 0 }`) if you have no predictions |
| `@/features/shop`: `AvatarFrameRing`, `BannerArt`, `shopBanners`, `shopFrames` | Hero cosmetics, editor options | |
| `@/features/onboarding`: `avatarOptions`, `avatarOptionById`, `profileBannerOptions`, `profileBannerOptionById`, `BannerVisual`, `followableLeagueById`, `followableLeaguesForSport`, `SportPills`, `LeaguePills` | Faces, banners, clubs editor | |
| `@/features/cards-decks`: `useDecks`, `activeDeck`, `isLoadoutComplete` (+ `activeLoadout` in the dossier) | ALL DECKS, CHALLENGE | |
| `@/features/friends`: `useFriendCounts` (+ `useFriends`, `toggleFriend`, `isFriend`, `FriendRequestSent` in the dossier) | Friends pill, ADD FRIEND | |
| `@/features/matches`: `SportIcon`, `matchById` | Tabs, prediction/pick match-ups | |
| `@/features/ads`: `AdSlot` | Two placements | Optional |
| `@/domain/progression`, `@/domain/sports`, `@/domain/cards`, `@/domain/matches` | Curve, tracks, ledger rules, sports, card types, `SportTeam` | Copy `progression` wholesale |
| `@/design-system`: `Progress`, `InteractiveLineChart`, `UnderlineTabs`, `SelectableTile`, `Button`, `Monogram`, `Glyph`/`GlyphName`, `DirectoryCard`, `PlayerCard`, `ActionCard`, `NoDataState`, icons, `accentVar`, `feedbackVar`, `paletteVar`, `rarityVar`, `withAlpha` | All UI | `InteractiveLineChart` is the largest piece to bring along: an SVG line with a draggable selected point and `valueText` for screen readers |
| `@/shared/hooks`: `useCountUp`. `@/shared/utils`: `formatInt`, `formatOzCompact`, `formatKickoffDate`, `formatKickoffTime`, `seedHash`, player-tag utils. `@/shared/config`: `publicAsset` | Numbers, dates, asset paths | `publicAsset` prefixes a base path. Identity is fine if you have none |
| `next/image`, `next/link`, `next/navigation` (`useRouter`, `useSearchParams`, `redirect`, `notFound`), `react-dom` (`createPortal`) | | `useSearchParams` → Suspense on `/profile/xp`. The dynamic `[channel]` page uses `params` as a **Promise** (`await params`, typed `PageProps<"/profile/talk-to-statoz/[channel]">`) in this Next version |
| CSS: `--ds-clip-panel`, `--ds-clip-field`, `--ds-color-fixture-shadow`, `--ds-color-overlay-scrim`, `--ds-color-overlay-plate`, `ds-tabular`, Tailwind theme utilities | Shapes, shadows, scrims | From the design-system tokens |

---

## 10. Porting steps

1. Copy `src/features/profile/`, `src/mocks/profile/`, `src/domain/progression/`
   and `src/shared/utils/player-tag.ts`.
2. Provide the outside modules above. The minimum for a working dossier:
   - auth (`AuthBoundary`, `signOut`)
   - `useGameCareer` (trimmed to your games)
   - `useEconomy` / `equipCosmetic`
   - `collectionFromIds`
   - `usePredictions` (or a stub)
   - the onboarding options
   - the shop cosmetics (or stubs: `AvatarFrameRing` can be a plain wrapper)
   - `useDecks`, `useFriendCounts`
   - the design-system pieces
3. Add the routes:

   ```tsx
   // app/(platform)/profile/page.tsx
   import { ProfileScreen } from "@/features/profile";
   export const metadata = { title: "Profile | StatOz" };
   export default function ProfilePage() { return <ProfileScreen />; }

   // app/(platform)/profile/xp/page.tsx — needs Suspense for useSearchParams
   export default function XpProgressPage() {
     return <Suspense fallback={null}><XpProgressScreen /></Suspense>;
   }

   // app/(platform)/profile/history/page.tsx
   export default function ProfileHistoryIndexPage() { redirect("/profile/history/games"); }
   // app/(platform)/profile/history/{games,predict,pick}/page.tsx → <ProfileHistoryScreen section="games" /> …

   // app/(platform)/profile/talk-to-statoz/[channel]/page.tsx
   export function generateStaticParams() { return supportChannels.map((c) => ({ channel: c.id })); }
   export default async function TransmissionPage({ params }: PageProps<"/profile/talk-to-statoz/[channel]">) {
     const { channel } = await params;
     const found = supportChannelFor(channel);
     if (!found) notFound();
     return <TransmissionCompose channel={found} />;
   }
   // app/(platform)/cards/page.tsx → <AllCardsScreen />
   ```

   Check `node_modules/next/dist/docs/` for your Next version's `params`,
   `PageProps` and `redirect` semantics before copying these.
4. Have onboarding call `saveProfileSetup(...)` on finish. Without it the profile
   reads "PLAYER ONE", the default face and an empty clubs band, which still works.
5. **Verify:**
   - A guest sees the lock card on `/profile`, `/profile/xp`, the history pages and
     `/cards`.
   - Signed in: a tag appears after the first paint and stays the same after a
     reload, and copying it shows COPIED.
   - Play a Pitch Duel. The level, the `PITCH Lx` chip and GAMES MATCHES update
     with no reload, and `/profile/xp?track=pitchDuel` lists the new XP row.
   - Buy a banner in the shop and pick it in CHOOSE YOUR BANNER. The hero switches
     and a reload keeps it.
   - Edit clubs, save, and see the crests on the band and your clubs in the match
     feed.
   - Log out, sign in as a second email, and the profile is empty. Sign back in as
     the first email, and it is restored.

### Going to a real backend

- **Identity:** a `GET/PATCH /me/profile` with the same `ProfileIdentity` shape.
  Mint the player tag on the server and make it unique. Keep `useIsHydrated` only
  for client-only values (device zone, clipboard).
- **Numbers:** have the server return `PlayerProgress` (per-track XP, career,
  achievement stats), computed from settled results. Client stores are editable.
  Keep the projection shape so the UI is unchanged.
- **XP and coin history:** write a ledger row when XP or coins are actually
  awarded, with the real timestamp and source. Drop `syncLedger`'s
  diff-on-visit approach.
- **Achievements:** keep them derived from stats (no stored unlocked flag), or
  store unlock timestamps if you need "unlocked on …".
- **Archives:** replace `@/mocks/profile` with paginated endpoints returning the
  same record types. The card components need no changes. Feed the PREDICTS/PICKS
  bands from the same endpoints so the band and the archive agree.
- **Talk to StatOz:** POST `{ channel, summary, details, playerTag, appVersion }`
  to a support inbox or ticketing tool, then show the send-off only on success.
- **Log out and accounts:** the per-email `localStorage` swap disappears once data
  lives on the server.

---

## 11. Known gaps and gotchas (as of this snapshot)

- **PREDICTS and PICKS bands and every history archive are fixtures.**
  - Every account, including a brand-new one, sees PREDICTS **10 · 72% · 13** and
    PICKS **10 · 67% · 6**.
  - The games archive shows 39 bundled results (28 labelled "Bundled demonstration
    result…"), never the player's own games. That holds even though Pitch Duel and
    others keep their own histories, and the Final Over and Hoop Duel lobbies link
    "MATCH HISTORY" there.
- **The profile and the archive disagree.**
  - The profile's accuracy uses settled records across all sports (72%). The
    predict archive uses all of one sport's records, including unsettled answers
    (football 46%).
  - The predict archive's RANK is the fixed string "122".
  - The fixture records also carry `xpDelta`, `rounds`, `position` and `badge`,
    which no UI renders.
- **The picks and clean-sheet badges can never unlock.** `picksPlaced`, `picksWon`,
  `pickStreak`, `pickProfit` and `cleanSheets` are hard-coded to 0, while the PICKS
  band right below claims 10 picks.
- **XP history is reconstructed, not recorded.** The ledger only syncs while
  `/profile/xp` is open. Five games played between visits become one row per track,
  timestamped at the visit. The very first visit imports everything as "opening
  balance" rows, which are excluded from EARNED.
- **Account switching leaks some stores.** `playerStorageKeys` in the auth shim
  omits:
  - `statoz.xp-ledger.v1`
  - `statoz.grandprix.v1`
  - `statoz.predictions.v1`
  - `statoz.friends.v1`
  - `statoz.footballbingo.v1`
  - `statoz.matchcircle.v1`
  - `statoz.referrals.v1`

  A second account on the same browser therefore inherits the first account's
  Grand Prix XP and prediction XP (which change its level), its friends count and
  its XP history.
- **The time zone is stored but unused.** No other feature reads
  `identity.timeZoneId`, so kick-off times ignore it. The coin history even
  formats its timestamps in UTC, while the XP feed uses the device zone.
- **Hard-coded subtitle:** the hero reads `OPERATIVE // ID 0001` for everyone,
  even though the player has a real tag.
- **Overlay focus is not trapped.** The overlay's comment says the page behind is
  inert, but nothing sets `inert` or traps focus. Tab can reach the page under the
  scrim, and focus is not returned to the button that opened the overlay.
- **Clubs editor limits:**
  - Only one sport's leagues can be followed, because switching sport in the
    editor clears every pick.
  - Wimbledon (`WIM`) has no teams, so following it never shows on the band.
- **Two sources of truth for the avatar and banner.** The hero reads
  `identity.avatarId` / `bannerId`. `economy.equipped.avatarId` / `bannerId` are
  written only for owned items and never read, so they go stale when a free face
  or banner is picked.
- **Football Chess and Bingo never earn profile XP.** Their tracks exist but their
  stores do not persist XP. Tennis contributes mastery XP rather than match XP.
- **Stale comments:**
  - `support-channels.ts` says "five channels"; there are four.
  - `identity-editors.tsx` says the web has no shop or frame catalogue; it has
    both, and frames are equipped from the shop.
  - `achievements.ts` lists predictions and the coin economy as unshipped; both are
    measured.
  - `history/page.tsx` mentions a "top-bar streak target"; the top bar links to
    `/streaks`.
- **Empty route folders:** `src/app/(platform)/profile/achievements/` exists with
  only a `.gitkeep`.
- **Talk to StatOz:** transmissions go nowhere, and the social links point at
  `instagram.com`, `reddit.com` and `youtube.com` home pages, not StatOz accounts.
- **State lost in URLs:**
  - The `/profile/xp` log-in `returnTo` drops `?track=`.
  - The history sport tab isn't in the URL, so it always reopens on football.
- **Hydration is intentional.** The server and first paint render "CHECKING
  ACCOUNT...". The identity reads empty until hydrated, and the tag shows
  `••••-••••` until the post-hydration effect mints it. Don't read `localStorage`
  during render to "fix" a flash.
