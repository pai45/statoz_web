# Leaderboard — implementation guide

The "where you stand" screen. One page ranks a field of players by sport, with two
board types:

- **MATCHES**: a **PLAYERS** board or a national **TEAMS** board, each over a
  **WEEKLY / SEASON / ALL-TIME** period.
- **GAMES**: one board per game mode, ranked by wins.

A league dial (Premier League, IPL, NBA, F1 …) sits above both. The top three
stand on a podium, everyone else is a row, and the player's own rank is docked so
it never scrolls away. Tapping a rival opens their **dossier**, a head-to-head
scouting card with CHALLENGE and ADD FRIEND buttons. A separate search screen finds
a rival by name.

There is no backend. The field is **23 fabricated rivals**. Each is just a display
name plus one canonical XP number, and every other figure about them is derived
deterministically from those two seeds: face, level, career, dossier, and the score
on each board. The signed-in player is spliced into the field at their **real XP**,
read from the browser. Every board is a different arithmetic "lens" on the same
XP, not a separate table. The doc ends with what to change for a real backend.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. Sources:

- `src/features/leaderboard/` (≈1.97k lines): screens, board assembly, scoring,
  rank components, CSS module.
- `src/mocks/leaderboard/` (≈150 lines): the rival roster and the 16 national teams.
- `src/features/profile/`: `state/player-standing.ts` (the player's row),
  `data/rival-dossier.ts` (≈160 lines, the deterministic scouting) and
  `components/rival-dossier.tsx` (≈416 lines, the overlay).
- `src/app/(platform)/leaderboard/page.tsx` and `…/leaderboard/search/page.tsx`.

> The design tokens, `accentVar`/`withAlpha`/`feedbackVar`/`hudChamferPath`,
> `@/domain/sports`, `@/domain/progression` and the localStorage store pattern are
> documented in [`shared_game_platform.md`](./shared_game_platform.md). Equipped
> frames and owned avatars come from the economy described in [`shop.md`](./shop.md).

---

## At a glance

| | |
|---|---|
| Routes | `/leaderboard` (`src/app/(platform)/leaderboard/page.tsx`), `/leaderboard/search` (`…/leaderboard/search/page.tsx`). Both wrap their screen in `<Suspense>` because the screens read `useSearchParams` |
| Layout | `(platform)` route group: top bar, breadcrumbs (`HOME / LEADERBOARD`), side rail on `lg`, bottom nav on phones (the nav item is labelled **TOP**) |
| Entry components | `LeaderboardScreen`, `LeaderboardSearchScreen` from `@/features/leaderboard` |
| Other public exports | `rivalRoster`, `rivalSeedByName`, `isPro` (re-exported from the mocks), `isProSeed`, `resolveRival`, `rivalIsOnline`, `rivalLevelFor`, types `LeaderboardEntry`, `RivalSeed` |
| Deep link | `/leaderboard?type=<matches\|games>&sport=<football\|cricket\|basketball\|tennis\|motorsport>&mode=<GameId>&board=<players\|teams>&scope=<weekly\|season\|allTime>&league=<leagueId>` |
| Inbound links | Bottom nav / rail "TOP"; **VIEW LEADERBOARD** button (`GameLeaderboardCta`) in 10 game lobbies, which opens `?type=games&sport=…&mode=<that game>`; back arrow from the search screen |
| Persistence | **None of its own.** It reads the auth session, profile identity, XP (games + card collection + predictions) and economy (owned avatars, equipped frame). Filters live in React state mirrored to the URL |
| Auth | The board is **public**. A guest sees the field without themselves, and tapping any row raises the log-in dialog. A signed-in player is ranked among the rivals and can open dossiers |
| Ads | One `AdSlot placement="leaderboard-rail"` (rectangle, desktop-only) in the sidebar |

---

## 1. Screen anatomy (`components/leaderboard-screen.tsx`)

```
                                         [🔍 FIND PLAYER]   → /leaderboard/search?returnTo=<current board URL>
[ FOOTBALL | CRICKET | BASKET | TENNIS | MOTORSPORT ]       UnderlineTabs, each sport icon in its accent
[ MATCHES | GAMES ]                                         UnderlineTabs
[ PREMIER LEAGUE ][ LALIGA ][ SERIE A ][ BUNDESLIGA ]       LeagueDial (per sport)
┌─ board body (key = `${type}-${board}-${scope}-${mode}-${league}`) ────────────┐
│ main column                              │ <aside> (lg: sticky sidebar, 20rem)  │
│   RankPodium   #1 wide gold card         │   LeaderboardFilters                 │
│                #2 accent │ #3 orange     │   RankUserBar        (lg only)       │
│   RankRow × n  dealt in from the left    │   AdSlot leaderboard-rail            │
└──────────────────────────────────────────────────────────────────────────────┘
[ YOUR RANK  #7  PLAYER ONE ……… 3,912 xp ]  RankUserBar docked above the bottom nav (phone only)
RivalDossierOverlay                          when a rival is opened
```

### Layout and breakpoints

- **Phone:** one column, `max-w-160` (40rem), 16px gutters. The `<aside>` comes
  first in the DOM, so the filters sit **above** the podium.
- **`lg` and up:** `grid-cols-[minmax(0,1fr)_20rem]`, `max-w-260` (65rem). The
  aside moves to column 2 (`lg:col-start-2 lg:row-start-1`) and becomes
  `lg:sticky lg:top-5`. The user bar renders inside it, so it stays in view
  without docking.
- **Docked user bar (phone):** `sticky z-10 mt-auto lg:hidden` with
  `bottom: calc(var(--platform-nav-height) + env(safe-area-inset-bottom))`. The
  `(platform)` layout publishes `--platform-nav-height: 5.25rem` because the bottom
  nav is itself sticky and floats over the page. If your shell has no such
  variable, define one or the bar will sit under the nav.
- The sport accent (`accentVar(sportModuleFor(sport).accent)`) tints everything.
  The values are football **cyan**, cricket **white**, basketball **gold**,
  tennis **lime** and motorsport **racing**. The accent also goes to the league
  dial through `--leaderboard-accent`.

### Component split and auth

```tsx
export function LeaderboardScreen() {
  const session = useAuthSession();
  if (session.status === "authenticated") return <PersonalizedLeaderboard />;
  return <LeaderboardBoard />;                // guest *and* still-hydrating
}

function PersonalizedLeaderboard() {
  const player = usePlayerStanding();         // only signed-in players pay for this read
  return <LeaderboardBoard player={player} authenticated />;
}
```

The server render and first paint are always the guest board. When the session
hydrates as authenticated, `LeaderboardBoard` **remounts** under a different parent
and re-reads its state from the URL. That loses nothing, because the URL is kept in
sync (below).

### State and the URL

All filter state is local `useState`, initialised from the query string with
validation and mirrored back on every change:

| State | Initial value from the URL | Fallback |
|---|---|---|
| `sport` | `?sport` if in `sportOrder` | `"football"` |
| `type` | `"games"` only if `?type=games` | `"matches"` |
| `board` | `"teams"` only if `?board=teams` | `"players"` |
| `scope` | `?scope` if `weekly\|season\|allTime` | `"weekly"` |
| `mode` | `?mode` if it is in `sportGameDecks[initialSport]` | the sport's first game |
| `selectedLeague` | `Record<Sport, leagueId>`. `?league` applies to the initial sport only, and only if valid | each sport's first league |
| `openRival` | none | `null` |

```ts
useEffect(() => {
  const params = new URLSearchParams({ type, sport, mode, board, scope, league: selectedLeague[sport] });
  router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
}, [board, mode, router, scope, selectedLeague, sport, type]);
```

- Changing sport keeps `mode` if the new sport has that game, otherwise it resets
  to the sport's first game.
- The league is remembered **per sport**, so switching away and back restores it.
- The URL always carries all six params, even those the active board ignores
  (`mode` on MATCHES, `board`/`scope` on GAMES).

### Body re-keying

The body is keyed by `type-board-scope-mode-league`, so any filter change mounts a
new element. It plays the `boardIn` entrance, and every `ScoreText` counts up again
from zero. A sport change re-keys it too, because the selected league id (and often
the mode) changes with the sport.

---

## 2. Data model (`types.ts`)

```ts
export type LeaderboardType = "matches" | "games";
export type MatchesBoard = "teams" | "players";
export type TournamentScope = "weekly" | "season" | "allTime";
export type GameMode = GameId;                      // from @/features/games/types (18 ids)

/** One fabricated rival: a display name plus a canonical XP. */
export type RivalSeed = {
  name: string;
  base: number;          // canonical XP — the only number a rival really has
  movement: number;      // >0 climbed, <0 dropped, 0 held
  isNew?: boolean;
  badge?: string;        // "PRO" marks a veteran
};

/** A national team on the TEAMS board. */
export type TeamSeed = {
  team: SportTeam;       // { id, name, shortName, color }
  score: number;
  movement: number;
  isBacked?: boolean;    // the side the player backs
};

/** One row on any rank board (also used by the match-detail TOPS tab). */
export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;         // whatever the active board measures
  movement: number;
  isNew: boolean;
  badge?: string;
  isUser: boolean;
  team?: SportTeam | null;   // set on a team row: crest instead of face, no dossier
  xp: number;            // canonical XP, independent of board — the dossier's seed
  subtitle?: string;
};

export type ScoreMeta = { unit: string };   // "XP" | "W" | "PTS"
```

### 2.1 The rival roster (`mocks/leaderboard/rivals.ts`)

23 seeds, already sorted by `base` descending. `rivalSeedByName(name)` is an exact,
case-sensitive lookup. Levels use the shared curve (`50·L·(L−1)` XP to reach
level L), so the field spans **level 6 to 9**.

| # | Name | Base XP | Move | Flags |
|---:|---|---:|---:|---|
| 1 | jarvis | 3910 | −1 | PRO |
| 2 | Vortex | 3905 | +2 | |
| 3 | NeoStrike | 3901 | −1 | PRO |
| 4 | PhantomX | 3897 | +1 | |
| 5 | Blaze | 3893 | +4 | |
| 6 | Titan | 3889 | −2 | |
| 7 | EchoZero | 3885 | +1 | PRO |
| 8 | Reaper | 3881 | −3 | |
| 9 | NovaQ | 3878 | +2 | |
| 10 | Falcon9 | 3874 | −1 | |
| 11 | Striker | 3872 | +5 | NEW |
| 12 | Diwakar | 3860 | −2 | |
| 13 | monika | 3830 | +1 | PRO |
| 14 | Raja2000 | 3740 | −1 | |
| 15 | Invincible51 | 3670 | +4 | |
| 16 | rocky | 3380 | −2 | |
| 17 | Mirage | 3120 | +1 | |
| 18 | Zenith | 2980 | −1 | NEW |
| 19 | Ghost | 2810 | +2 | |
| 20 | Drift | 2640 | −3 | |
| 21 | Volt | 2470 | +1 | |
| 22 | Comet | 2300 | −1 | |
| 23 | Rookie7 | 1980 | 0 | NEW |

The source app had a 24th seed, `pai` at 3,870 XP, fixed at #12 as a stand-in for
the player. The web removed it and splices in the real player instead (§4).

### 2.2 National teams (`mocks/leaderboard/national-teams.ts`)

16 sides in fixture order. Crest colours are hex literals: they are the real
national colours, not palette tokens. **Argentina is `isBacked`.**

| Team (short) | Score | Move | | Team (short) | Score | Move |
|---|---:|---:|---|---|---:|---:|
| France (FRA) | 1877 | +2 | | Germany (GER) | 1730 | 0 |
| Spain (ESP) | 1876 | −1 | | Croatia (CRO) | 1717 | +1 |
| Argentina (ARG) ★ | 1875 | −1 | | Mexico (MEX) | 1706 | +1 |
| England (ENG) | 1813 | 0 | | United States (USA) | 1698 | +2 |
| Portugal (POR) | 1764 | +1 | | Uruguay (URU) | 1687 | −1 |
| Brazil (BRA) | 1761 | −1 | | Colombia (COL) | 1684 | +1 |
| Netherlands (NED) | 1756 | 0 | | Japan (JPN) | 1672 | 0 |
| Morocco (MAR) | 1738 | +1 | | Belgium (BEL) | 1735 | 0 |

### 2.3 Leagues (`leagues.ts`)

```ts
export const leaderboardLeagues: Record<Sport, LeaderboardLeague[]> = {
  football:   [epl "PREMIER LEAGUE", laliga "LALIGA", serie-a "SERIE A", bundesliga "BUNDESLIGA"],
  cricket:    [ipl "IPL", t20i "T20I", bbl "BIG BASH"],
  basketball: [nba "NBA", euroleague "EUROLEAGUE", wnba "WNBA"],
  motorsport: [f1 "FORMULA 1", f2 "FORMULA 2", nascar "NASCAR", indy "INDYCAR"],
  tennis:     [atp "ATP", wta "WTA"],
};
```

These ids exist only for the leaderboard. They are **not** the ids in
`src/mocks/leagues` or the match feed.

### 2.4 Game modes per sport (`sportGameDecks` in `src/mocks/games/sport-decks.ts`)

| Sport | Modes on the GAMES board (first one is the default) |
|---|---|
| football | pitch-duel, penalty-shootout, football-chess, football-quiz, football-bingo, guess-player |
| cricket | final-over, cricket-quiz, cricket-guess-player |
| basketball | hoop-duel, basketball-quiz, basketball-guess-player |
| tennis | tennis-rally, tennis-quiz, tennis-guess-winner |
| motorsport | grand-prix-dash, motorsport-quiz, guess-driver |

Chip labels are `gameRegistry[id].title.toUpperCase()`.

---

## 3. Scoring: boards are lenses (`scoring.ts`)

Everything here is pure. A board never stores its own numbers. It projects each
entrant's one XP through the active selection:

```ts
export const leaderboardTypeOrder: LeaderboardType[] = ["matches", "games"];
export const matchesBoardOrder: MatchesBoard[] = ["players", "teams"];
export const tournamentScopeOrder: TournamentScope[] = ["weekly", "season", "allTime"];

/** 31-multiplier string hash kept inside 31 bits (portable to Dart). */
export function jsSafeHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 0x7fffffff;
  return hash;
}

/** A deterministic −320 … +379 offset. */
export function leagueAdjustedScore(base: number, leagueId: string): number {
  return base + (jsSafeHash(leagueId) % 700) - 320;
}

export function scoreMetaFor(type: LeaderboardType, isTeamBoard: boolean): ScoreMeta {
  if (isTeamBoard) return { unit: "PTS" };
  return { unit: type === "games" ? "W" : "XP" };
}

export function scoreFor(type, base, scope, mode, leagueId): number {
  switch (type) {
    case "matches":   // a season is six weeks of play, all-time is twenty-seven
      return leagueAdjustedScore(scope === "weekly" ? base : scope === "season" ? base * 6 : base * 27, leagueId);
    case "games":     // a rough win count with a per-mode nudge of −4 … +4
      return Math.max(0, Math.round(base / 55) + (jsSafeHash(mode) % 9) - 4);
  }
}
```

The `leagueId` argument that `useBoardEntries` actually passes is
`` `${leagueId}:${entrant name}` ``. The offset is therefore **per entrant and per
league**, not one shift for the whole league (see the gaps in §12).

| Board | Who is ranked | Order | Score shown | Unit |
|---|---|---|---|---|
| MATCHES · PLAYERS · WEEKLY | 23 rivals (+ you) | XP desc | `xp + offset(league:name)` | XP |
| MATCHES · PLAYERS · SEASON | same | XP desc | `xp·6 + offset` | XP |
| MATCHES · PLAYERS · ALL-TIME | same | XP desc | `xp·27 + offset` | XP |
| MATCHES · TEAMS · (any scope) | 16 national teams | fixture order | `score` (×1/×6/×27) `+ offset(league:team)` | PTS |
| GAMES · `<mode>` | 23 rivals (+ you) | XP desc | `max(0, round(xp/55) + nudge(mode))` | W |

The sport changes the accent, the mode chips, the league dial and the row subtitle
(`"<BADGE or SPORT> // BEST LEAGUE"`). It does **not** change the field: the same
23 names appear on every sport.

---

## 4. Assembling a board (`state/use-board-entries.ts`)

```ts
export type BoardSelection = {
  type; board; scope; mode; sport; leagueId;
  player?: PlayerStanding | null;   // omitted for guests
};
export type BoardState = {
  entries: LeaderboardEntry[];
  meta: ScoreMeta;
  user: LeaderboardEntry | null;    // the row to pin, or null
  isTeamBoard: boolean;
};

export function useBoardEntries({ type, board, scope, mode, sport, leagueId, player = null }): BoardState {
  const isTeamBoard = type === "matches" && board === "teams";
  const personalized = player !== null;

  return useMemo(() => {
    const meta = scoreMetaFor(type, isTeamBoard);

    if (isTeamBoard) {
      const entries = nationalTeams.map((seed, index) => ({
        rank: index + 1,
        name: seed.team.name,
        score: scoreFor(type, seed.score, scope, mode, `${leagueId}:${seed.team.name}`),
        movement: seed.movement, isNew: false,
        badge: seed.team.shortName,
        isUser: personalized ? seed.isBacked ?? false : false,   // Argentina, signed-in only
        team: seed.team, xp: 0,
      }));
      return { entries, meta, user: entries.find((e) => e.isUser) ?? null, isTeamBoard };
    }

    const field = rivalRoster.map((seed) => ({
      name: seed.name, xp: seed.base, movement: seed.movement,
      isNew: seed.isNew ?? false, badge: seed.badge, isUser: false,
    }));

    if (player?.ready) {                       // never before the browser record is read
      field.push({ name: player.displayName, xp: player.totalXp,
                   movement: 0, isNew: false, badge: undefined, isUser: true });
    }

    field.sort((a, b) => b.xp - a.xp);          // stable: ties keep the rival first

    const entries = field.map((seed, index) => ({
      rank: index + 1, name: seed.name,
      score: scoreFor(type, seed.xp, scope, mode, `${leagueId}:${seed.name}`),
      movement: seed.movement, isNew: seed.isNew, badge: seed.badge,
      isUser: seed.isUser, xp: seed.xp, team: null,
      subtitle: `${seed.badge ?? sport.toUpperCase()} // BEST LEAGUE`,
    }));
    return { entries, meta, user: entries.find((e) => e.isUser) ?? null, isTeamBoard };
  }, [type, scope, mode, sport, leagueId, isTeamBoard, personalized, player]);
}
```

Rules worth keeping:

- **The player is ranked on real XP, not pinned.** Below 1,980 XP they are last
  (#24). To reach #1 they need more than 3,910.
- **Nothing is ranked before hydration.** `player.ready` is false on the server and
  the first client paint, so the field stands alone and the player's row then
  appears. There is no hydration mismatch.
- The player's movement is always `0` ("—"). Nothing tracks week-to-week change yet.

### 4.1 `PlayerStanding` (`features/profile/state/player-standing.ts`)

The narrow summary the board needs. It avoids reaching into the identity, progress
and economy stores directly.

```ts
export type PlayerStanding = {
  displayName: string;   // identity.displayName || "PLAYER ONE"
  avatarSrc: string;     // owned player-card portrait if the avatar id is one, else the onboarding avatar
  totalXp: number;       // usePlayerProgress().totalXp
  level: number;
  ready: boolean;        // useIsHydrated()
  frameColor?: string;   // color of the equipped shop frame (economy.equipped.frameId → shopFrames)
};
```

`totalXp` is the sum of the player's progression tracks: every game's XP (via
`useGameCareer().xpByTrack`), plus `cardsMeta` (XP from the owned card
collection), plus `prediction` (settled prediction cards). Anything that changes
those stores re-ranks the board live, because each store notifies through
`useSyncExternalStore`.

---

## 5. Interactions

### 5.1 Opening a row

```ts
function open(entry: LeaderboardEntry) {
  if (entry.team) return;                               // team rows are inert
  if (!authenticated) {
    requireAuth({ intent: "compare profiles",
                  message: "Log in to compare your standing with other players.",
                  returnTo: "/leaderboard" });
    return;
  }
  if (entry.isUser) { router.push("/profile"); return; }
  const seed = rivalSeedByName(entry.name);
  if (!seed) return;
  setOpenRival({ name: seed.name, rank: entry.rank, xp: seed.base, pro: isPro(seed) });
}
const onOpen = isTeamBoard ? undefined : open;          // no onOpen → rows render as plain divs
```

- `requireAuth` comes from `useRequireAuth()`. It needs `<AuthProvider>` above the
  page (it throws otherwise), which this repo mounts in `src/app/layout.tsx`. The
  provider shows `AuthGateDialog`, and its "continue" button goes to the login
  route with `returnTo`.
- Tapping the user bar always goes to `/profile`, except on a team board, where the
  bar has no handler.
- The dossier renders only while `openRival && authenticated`. Its `userRank` is
  the player's rank on the **current** board, or the rival's own rank when the
  player is not on it.

### 5.2 Filters (`components/leaderboard-filters.tsx`)

- **MATCHES:** two `ChipRow`s of equal-width chips (`role="group"`):
  `PLAYERS | TEAMS` and `WEEKLY | SEASON | ALL-TIME`.
- **GAMES:** a horizontal strip of mode chips. It scrolls sideways with the
  scrollbar hidden on a phone, and wraps on `lg`. Idle chips are transparent
  (`plateFill(panel, 0)`).
- Chips are `<button aria-pressed>` around a `RankPlate cut={8}`. Active chips
  have an accent fill (14–16%) and an accent edge. Idle chips have a muted text
  and a 35–40% border.

### 5.3 League dial (`components/league-dial.tsx`)

A `role="tablist"` rail of `role="tab"` buttons, 132px minimum width and 38px
minimum height each, with `scroll-snap-type: x mandatory`.

- **Keyboard:** ←/→/Home/End select a tab and move focus to it. Only the selected
  tab has `tabIndex=0` (roving tabindex).
- **Pointer:** drag-to-scroll with `setPointerCapture`. The cursor is `grab` at
  rest and `grabbing` while dragging.
- On every selection change, the selected tab is scrolled to the centre
  (`scrollIntoView({ inline: "center" })`).
- The selected tab shows an accent border and accent text on a 10% accent
  `color-mix` background.

### 5.4 Rival dossier (`features/profile/components/rival-dossier.tsx`)

`<RivalDossierOverlay name rank xp pro userRank onClose />` is a full-size
`ProfileOverlay` (violet, "RIVAL DOSSIER"). Every figure in it is derived from
`rivalDossier({ name, xp, pro })` and nothing is stored. Contents, top to bottom:

1. **Hero:** the face (`avatarForName`), `OPERATIVE // RANK 07`, a level chip and
   XP meter, and a PRO chip.
2. **Actions:**
   - **CHALLENGE** (focal button): if `isLoadoutComplete(activeLoadout(decks, "football"))`,
     it closes the overlay and pushes `/play/pitch-duel?vs=<name>&level=<rival level>`
     (see [`pitch_duel.md`](./pitch_duel.md)). Otherwise it shows "Build a match
     deck to challenge a rival." for 1.8 s.
   - **ADD FRIEND / FRIEND ✓:** `toggleFriend(name)` in the friends store. Adding
     plays the `FriendRequestSent` animation. Removing shows "<name> removed from
     friends".
3. **VS YOU:** RANK (lower is better), LEVEL and WIN %. The delta is shown as
   `▲ n` in success colour when you lead, `▼ n` in orange when you trail, or "—" on
   a tie.
4. **Achievement showcase:** the player's own achievement catalogue, measured
   against the rival's fabricated stats.
5. **Stat bands:**
   - GAMES: matches, win %, draws, with a best-streak line.
   - PREDICTS: played, accuracy, correct.
   - PICKS: picks, win rate, active.

**Scouting (`features/profile/data/rival-dossier.ts`).** The dossier uses an
xorshift RNG seeded by `seedHash(name)`. Each step is masked to 31 bits, which
keeps it bit-identical to the Dart app. A `strength` value biases every figure, so
a higher-ranked rival really reads as stronger:

```ts
const strength = clamp((xp - 1900) / 2200, 0, 0.95);
matchesPlayed   = 24 + round(strength*90) + next(16);
winRate         = clamp(44 + round(strength*30) + next(11) - 5, 32, 84);
matchWins       = round(matchesPlayed * winRate / 100);
draws           = round(matchesPlayed * (0.10 + next(8)/100));
bestStreak      = 2 + round(strength*6) + next(3);
predictionsMade = 14 + round(strength*60) + next(18);
predictionAccuracy = clamp(40 + round(strength*34) + next(11) - 5, 28, 88);
picksPlaced     = 8 + round(strength*36) + next(12);
pickWinRate     = clamp(38 + round(strength*30) + next(11) - 5, 28, 82);
ownedCards      = 14 + round(strength*70) + next(20);
level           = levelProgress(xp).level;
```

The order of `next()` calls is part of the contract. Reordering the lines changes
every rival's numbers.

---

## 6. Search (`components/leaderboard-search-screen.tsx`)

`/leaderboard/search?returnTo=<url>`. The back arrow uses `returnTo` only if it
starts with `/leaderboard`, otherwise `/leaderboard`. The header reads
`PLAYER SEARCH // COMPLETE LOCAL FIELD`.

```ts
export function searchRivals(query: string, selfName: string): Result[] {
  if (query.length < 2) return [];
  const words = query.split(" ").filter(Boolean);
  return rivalRoster
    .map((seed, index) => ({ ...seed, rank: index + 1 }))          // roster position, not board rank
    .filter((seed) => seed.name.toLocaleLowerCase() !== selfName.trim().toLocaleLowerCase()
                   && words.every((word) => seed.name.toLocaleLowerCase().includes(word)))
    .sort((left, right) => {
      const score = (name: string) => (name === query ? 0 : name.startsWith(query) ? 1 : 2);
      return score(left.name.toLocaleLowerCase()) - score(right.name.toLocaleLowerCase())
          || left.name.toLocaleLowerCase().localeCompare(right.name.toLocaleLowerCase());
    });
}
```

- The query is normalised with `trim().toLocaleLowerCase().replace(/\s+/g, " ")`.
  Every word must appear in the name. Results rank exact match first, then prefix
  match, then substring, alphabetically within each group.
- States:
  - `< 2` characters: "Find a rival", or "Add one more signal" after one character.
  - No hits: "No rival found".
  - Otherwise an `aria-live="polite"` list of `AccentPanel` rows
    (`#rank`, name, `n XP`, OPEN DOSSIER).
- A result opens the same `RivalDossierOverlay`. Closing it puts focus back in the
  input on the next frame.
- The search **does not check auth**. Guests can open dossiers here (see §12).

`resolveRival(query)` in `roster.ts` is a **different** matcher, used by the friends
arena's "add by tag or username". It tries an exact name (case-insensitive), then
an exact player tag (`playerTagForName(name)` with dashes removed, compared to
`normaliseTag(query)`), then a substring of at least 2 characters. It returns the
first hit or `undefined`.

---

## 7. UI system

### 7.1 `RankPlate` and `plateFill` (`components/rank-plate.tsx`)

Every podium card, row, chip, tag and pill is one chamfered plate. The top-left and
bottom-right corners are cut and the other two are square:
`clipPath: hudChamferPath(cut, 0)`. Because a clip path crops a CSS border away,
the edge is a **layer behind** the fill, with the fill inset 1px:

```tsx
export function plateFill(color: string, amount: number): string {
  // translucent tints resolved against the page ground, so the edge layer never shows through
  return `color-mix(in srgb, ${color} ${amount * 100}%, var(--ds-color-background-primary))`;
}

export function RankPlate({ cut, background, borderColor, interactive, className, style, children }) {
  const clip = { clipPath: hudChamferPath(cut, 0) };
  return (
    <div className={["relative", interactive ? styles.pressable : "", className].join(" ")} style={style}>
      {borderColor ? <span aria-hidden className="absolute inset-0" style={{ ...clip, background: borderColor }} /> : null}
      <span aria-hidden className={borderColor ? "absolute inset-px" : "absolute inset-0"} style={{ ...clip, background }} />
      <div className="relative">{children}</div>
    </div>
  );
}
```

`background` **must be opaque** (use `plateFill`), or the edge layer bleeds
through. The cut sizes used are:

| Element | Cut (px) | Fill / edge |
|---|---:|---|
| Champion card (#1) | 18 | panel 84% / gold 42% |
| Runner-up cards (#2, #3) | 13 | panel 58% / colour 26% |
| Row (rival) | 12 | panel 34% / **no edge** |
| Row (you) | 12 | accent 10% / accent 50% |
| Your-rank bar | 18 | accent 10% / accent 34% |
| Empty-state CTA | 10 | solid accent |
| Filter chip, countdown pill | 8 | see §5.2 |
| Tag pill (YOU, PRO, team code) | 4 | colour 16% / colour 70% |

### 7.2 Podium (`components/rank-podium.tsx`)

It renders only when there are at least 3 entries. When there are fewer, the screen
lists everyone as rows.

- **#1:** a full-width **gold** card. It shows an 86px avatar ringed in gold, then
  `#1` with a crown (`PremiumIcon`) and the movement badge, the name (`text-xl`),
  the subtitle and the badge tag. A 24px count-up score and its unit sit at the end.
- **#2 / #3:** two columns. #2 uses the **board accent** and #3 is always
  **orange**, so the placings stay distinct even when the accent is gold. Each shows
  `#n` and movement, a 66px avatar, the name and a 13px score with its unit.
- Every card is a `<button aria-label="<name>, rank <n>">` when `onOpen` is set.

### 7.3 Row (`components/rank-row.tsx`)

The row shows `#rank` (34px column), a 48px avatar, the name, a tag, the movement
badge with the subtitle, and a 16px score in the accent with its unit. Only the
player's own row has an accent fill, an edge, a cyan `YOU` tag and a highlighted
avatar ring. Other badges (PRO, team code) are violet tags.

### 7.4 Your-rank bar (`components/rank-user-bar.tsx`)

The bar shows a 54px highlighted avatar, the label ("Your rank") with movement,
`#rank` at 28px with the name, the subtitle, and a 21px score with a lower-case
unit. It has optional props the match-detail tab uses:

- `rankText`: replaces `#n`, e.g. `#--` or `UNRANKED`, at 20px.
- `showScore={false}`
- `ctaLabel`: e.g. `JOIN`, which replaces the score with an outlined call to action.

### 7.5 Small parts (`components/rank-parts.tsx`)

- **`RivalAvatar`:** an octagon `Avatar` whose source is
  `src ?? avatarForName(name).src`. `avatarForName` picks one of the 6 onboarding
  faces by `seedHash(name) % 6`, so a rival has the same face everywhere. The ring
  colour is `frameColor ?? ring ?? (highlight ? cyan : border)`. A team renders a
  `Monogram` crest in the team colour instead.
- **`RankTag`:** the tiny chamfered label used for YOU, PRO and team codes.
- **`MovementBadge`:**

  | Value | Label | Colour |
  |---|---|---|
  | `isNew` | `NEW` | gold |
  | `movement > 0` | `▲n` | success |
  | `movement < 0` | `▼n` | danger |
  | `0` | `—` | muted |

  It also sets an `aria-label` ("Up 2" and so on).
- **`ScoreText`:** `useCountUp(value)`, a 600 ms easeOutCubic count from 0. It
  renders the final value at once under `prefers-reduced-motion` or when the value
  is 0. Formatting is `formatInt` (`Intl.NumberFormat("en-US")`). To restart the
  count, change the `key`; every caller keys it on score and unit, and rows and
  runner-up cards add the rank.
- **`formatBoardCountdown(ms)`:** returns `04h 12m` above an hour, `12m 05s` below
  it, and `00m 00s` at or under zero.
- **`CountdownPill`:** an orange pill with a clock icon. The match-detail tab uses
  it.

### 7.6 Motion (`components/leaderboard.module.css`)

| Class | Effect |
|---|---|
| `.dealIn` | 320 ms `cubic-bezier(0.33,1,0.68,1)`, from `opacity 0, translateX(-48px)`, delayed by `--enter-delay`. Podium cards are delayed 0 / 70 / 140 ms, and row *i* by `(i+3)·70` ms |
| `.boardIn` | 280 ms, from `opacity 0, translateY(0.6rem)`. Plays on every body re-key |
| `.pressable` | 150 ms hover lift of −1px. Set by `RankPlate interactive` |
| `.railScroll` | Hides the mode strip's scrollbar |
| `.leagueDial …` | Dial layout, snap and selected state |

Use `animation-fill-mode: backwards`, **never `both`/`forwards`**. A retained
`transform` creates a containing block, and the dossier's `position: fixed` scrim
would then anchor to the row instead of the viewport.

### 7.7 Empty state (`components/leaderboard-empty.tsx`)

The empty state shows "NO MATCH RANKING YET" or "NO GAME SCORES YET", each with a
CTA to `/`. It cannot be reached with a fixed field (§12), but keep it for a real
backend.

---

## 8. Who else uses leaderboard pieces

| Consumer | Uses | Notes |
|---|---|---|
| **Match detail TOPS tab** (`features/matches/components/match-leaderboard-tab.tsx`) | `RankPodium`, `RankRow`, `RankUserBar`, `CountdownPill`, `formatBoardCountdown`, `LeaderboardEntry`, `RivalDossierOverlay` | One board per prediction quiz. Rivals come from match fixtures and are ranked by `rankedBoard` (points desc). The player joins only once their card is **settled**, with `boardPointsFor(correct,total,answered) = round(620·correct/total) + 6·answered`. The user bar has three states: ranked; `#--` with "n / m LOCKED · PENDING"; `UNRANKED` with a JOIN button. A `LOCKS IN` countdown runs until kickoff. The stagger is capped at 10 rows |
| **Friends arena** (`features/friends/components/friends-arena.tsx`) | `rivalRoster`, `rivalSeedByName`, `isPro`, `resolveRival`, `rivalLevelFor`, `RivalAvatar`, `RivalDossierOverlay` | A friends-only board over the same roster. The player's rank is `count(base > totalXp) + 1`. Rivals are challenged with the same Pitch Duel link |
| **Friends store** (`features/friends/state/friends-store.ts`) | `rivalIsOnline(name) = seedHash(name) % 20 < 11` | About 55% of rivals read as online. Stable per name, so the count does not flicker |
| **Game lobbies** | `GameLeaderboardCta` (`features/games/components/game-leaderboard-cta.tsx`) → `/leaderboard?type=games&sport=<s>&mode=<id>` | Pitch Duel, Penalty Shootout, Football Chess, Football Bingo, Guess Player (one per sport), Quiz (`<sport>-quiz`), Final Over, Hoop Duel, Tennis Rally, Grand Prix (`grand-prix-dash`) |
| **Shell** | `shared/config/navigation.ts` (`{ id: "leaderboard", label: "TOP", href: "/leaderboard" }`), `platform-nav.tsx` (trophy icon), `platform-breadcrumbs.tsx` | |
| **Matchmaking** (`games/shared/components/matchmaking/use-matchmaking-fighters.ts`) | `avatarForName` | An opponent name wears the same face as on the board |

---

## 9. File manifest

| Path | Lines | Role |
|---|---:|---|
| `src/app/(platform)/leaderboard/page.tsx` | 14 | Metadata + `<Suspense><LeaderboardScreen/></Suspense>` |
| `src/app/(platform)/leaderboard/search/page.tsx` | 10 | Metadata + `<Suspense><LeaderboardSearchScreen/></Suspense>` |
| `src/features/leaderboard/index.ts` | 20 | Public API |
| `src/features/leaderboard/types.ts` | 61 | Board, seed and entry types |
| `src/features/leaderboard/leagues.ts` | 11 | League dial ids and labels per sport |
| `src/features/leaderboard/scoring.ts` | 64 | Tab orders, `jsSafeHash`, `leagueAdjustedScore`, `scoreFor`, `scoreMetaFor` |
| `src/features/leaderboard/roster.ts` | 62 | `isProSeed`, `resolveRival`, `rivalLevelFor`, `rivalIsOnline` |
| `src/features/leaderboard/state/use-board-entries.ts` | 133 | Builds a board from the field + the player |
| `src/features/leaderboard/state/use-board-countdown.ts` | 57 | Ticking countdown to local midnight (**unused**) |
| `src/features/leaderboard/components/leaderboard-screen.tsx` | 304 | Screen, auth split, URL sync, layout, dossier |
| `src/features/leaderboard/components/leaderboard-filters.tsx` | 190 | Chip rows and mode strip |
| `src/features/leaderboard/components/league-dial.tsx` | 27 | League tablist rail |
| `src/features/leaderboard/components/leaderboard-search-screen.tsx` | 43 | Search screen + `searchRivals` |
| `src/features/leaderboard/components/leaderboard-empty.tsx` | 85 | Empty state |
| `src/features/leaderboard/components/rank-plate.tsx` | 81 | `RankPlate`, `plateFill` |
| `src/features/leaderboard/components/rank-parts.tsx` | 216 | Avatar, tag, movement, score, countdown |
| `src/features/leaderboard/components/rank-podium.tsx` | 247 | Top three |
| `src/features/leaderboard/components/rank-row.tsx` | 129 | Row |
| `src/features/leaderboard/components/rank-user-bar.tsx` | 150 | Your-rank card |
| `src/features/leaderboard/components/leaderboard.module.css` | 88 | Motion, pseudo-states, dial |
| `src/mocks/leaderboard/index.ts` | 2 | Barrel |
| `src/mocks/leaderboard/rivals.ts` | 48 | `rivalRoster`, `isPro`, `rivalSeedByName` |
| `src/mocks/leaderboard/national-teams.ts` | 100 | `nationalTeams` |
| `src/features/profile/state/player-standing.ts` | 62 | `PlayerStanding`, `usePlayerStanding`, `playerDisplayName` |
| `src/features/profile/data/rival-dossier.ts` | 160 | `rivalDossier` scouting |
| `src/features/profile/components/rival-dossier.tsx` | 416 | `RivalDossierOverlay` |
| `src/features/games/components/game-leaderboard-cta.tsx` | 19 | Lobby → board button |

There are no static assets of its own. Rival faces are the six onboarding portraits
in `public/assets/avatars/*.webp`.

---

## 10. Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `next/navigation`: `useRouter`, `useSearchParams` | URL sync, deep links, search `returnTo` | `useSearchParams` → **wrap each page in `<Suspense>`**, or `next build` fails on the static route. `router.replace(url, { scroll: false })` |
| `next/link` | FIND PLAYER, back arrow, empty-state CTA | |
| `@/features/auth`: `useAuthSession`, `useRequireAuth` | Guest vs signed-in, log-in prompt | `useAuthSession()` → `{ status: "hydrating" \| "guest" \| "authenticated" }`. `useRequireAuth()` → `(req) => boolean`, which opens your log-in dialog. Needs a provider at the root |
| `@/features/profile`: `usePlayerStanding`, `PlayerStanding`, `RivalDossierOverlay` | The player's row, the dossier | Replace `usePlayerStanding` with your user summary (`ready` must be false during SSR). The dossier pulls in profile UI (`ProfileOverlay`, `StatBand`, `AchievementShowcase`, level badges), `@/features/friends` and `@/features/cards-decks`. Port it, or swap it for a simpler profile sheet |
| `@/features/onboarding`: `avatarForName` | Deterministic rival faces | Any `(name) => { src }` |
| `@/features/ads`: `AdSlot` | Sidebar ad | Optional, delete |
| `@/features/matches`: `SportIcon` | Sport tab icons | Any `({ sport, size }) => svg` |
| `@/mocks/games`: `sportGameDecks`, `gameRegistry` | Mode chips, mode validation | Needs `Record<Sport, GameId[]>` and a title per game |
| `@/domain/sports`: `sportOrder`, `sportModuleFor`, `Sport` | Tabs, accents | |
| `@/domain/matches`: `SportTeam` | Team rows | `{ id, name, shortName, color }` |
| `@/domain/progression`: `levelProgress` | Dossier level | `50·L·(L−1)` curve |
| `@/design-system`: `UnderlineTabs`, `Avatar`, `Monogram`, `SearchField`, `NoDataState`, `AccentPanel`, icons (`SearchIcon`, `PremiumIcon`, `ScheduleIcon`, `FootballIcon`, `GameIcon`, `ArrowLeftIcon`, `PersonSearchIcon`, `SignalOffIcon`, `TrophyIcon`), `accentVar`, `feedbackVar`, `withAlpha`, `hudChamferPath` | All UI | See the shared doc for the helper code |
| `@/shared/hooks`: `useCountUp` (+ `usePrefersReducedMotion`) | Score count-up | Code in §7.5 |
| `@/shared/utils`: `seedHash`, `formatInt`, `playerTagForName`, `normaliseTag` | Hashing, number format, tags | `seedHash` = `(Math.imul(h,31)+c) & 0x7fffffff`. Note that it differs from `jsSafeHash` (`% 0x7fffffff`), so keep both as written |
| CSS: `--platform-nav-height`, `--ds-*` tokens, `ds-tabular` class, the Tailwind theme (`text-muted`, `border-line-muted`, `font-display`, `tracking-ultra` …) | Docking, colours, type | |

---

## 11. Porting steps

1. Copy `src/features/leaderboard/`, `src/mocks/leaderboard/`, and from profile
   `state/player-standing.ts`, `data/rival-dossier.ts` and
   `components/rival-dossier.tsx` (or a stub), plus
   `src/features/games/components/game-leaderboard-cta.tsx`.
2. Provide the outside modules above. The minimum set is an auth session hook, a
   `requireAuth` dialog, a `usePlayerStanding` equivalent, `sportGameDecks` and
   `gameRegistry`, the design-system pieces and `useCountUp`.
3. Add the routes:

   ```tsx
   // app/(platform)/leaderboard/page.tsx
   import { Suspense } from "react";
   import { LeaderboardScreen } from "@/features/leaderboard";
   export const metadata = { title: "Leaderboard | StatOz" };
   export default function LeaderboardPage() {
     return <Suspense><LeaderboardScreen /></Suspense>;
   }
   // app/(platform)/leaderboard/search/page.tsx — same, with LeaderboardSearchScreen
   ```

   Check the App Router docs in your `node_modules/next/dist/docs/` for the version
   you are on. `useSearchParams` without a Suspense boundary is a build error on
   statically rendered routes.
4. Make sure the layout publishes `--platform-nav-height`, or drop the phone dock
   and always render the user bar inline.
5. Add a nav entry and drop `<GameLeaderboardCta sport="…" gameId="…" />` into each
   game lobby.
6. **Verify:**
   - As a guest, `/leaderboard` shows 23 rows (podium + 20), and tapping one opens
     the log-in prompt.
   - Signed in with 0 XP, you appear at **#24** with a cyan `YOU` tag and the
     docked bar reads `#24`. Earn XP in any game, come back, and your rank moves.
   - `?type=games&sport=basketball&mode=hoop-duel` opens the Hoop Duel chips with
     the gold accent, and the URL keeps all six params after you change filters.
   - TEAMS shows Argentina as your row.
   - FIND PLAYER → typing `ne st` finds NeoStrike, and the back arrow restores the
     board you came from.

### Going to a real backend

- **Field:** replace `rivalRoster`/`nationalTeams` with an API that returns ranked
  `LeaderboardEntry[]` for `(sport, league, type, board, scope, mode)`. Keep the
  `LeaderboardEntry` shape and every rank component works unchanged. Paginate, or
  return the top N plus an "around me" window, and always include the caller's own
  row (with a true rank even off-page) for the user bar.
- **Scores:** compute them on the server from settled results: XP per period for
  MATCHES and real wins per mode for GAMES. Delete `scoreFor`/`leagueAdjustedScore`
  rather than keeping the lens arithmetic. Client XP lives in `localStorage` and is
  trivially editable, so never rank on it.
- **Movement:** diff against the previous period's snapshot on the server.
- **Period end:** the board countdown already exists (`useBoardCountdown`,
  `CountdownPill`). Feed it the real period end instead of local midnight.
- **Search and dossier:** search should hit a server endpoint. The dossier should
  load real stats, and `rivalDossier` should go.
- **Rendering:** the board can then be server-rendered, with filters as
  `searchParams` and the player row added client-side as now. Keep the "rank
  nobody before you know who they are" rule.

---

## 12. Known gaps and gotchas (as of this snapshot)

- **MATCHES board scores are not in rank order.** Rows are sorted by XP, but the
  displayed score adds a per-entrant offset (`jsSafeHash("<league>:<name>") % 700 − 320`).
  - On WEEKLY · PREMIER LEAGUE, the first five rows show **4,053 / 3,881 / 3,758 /
    3,832 / 4,095 XP**. There are 8 places where a lower rank shows a higher score;
    SEASON has 5 and ALL-TIME has 3.
  - The TEAMS board has the same issue: 4th-placed England shows 1,634 PTS while
    6th-placed Brazil shows 1,811 and 7th-placed Netherlands 2,131 (6 inversions).
  - To fix it, either sort by the projected score, or make the offset depend on the
    league only.
- **GAMES board wins are not real wins.** Everyone's "W" is
  `round(xp/55) ± a per-mode constant`, and that includes the player, whose real
  record in that mode is never read. Because the nudge is identical for every
  entrant, the top 9 rivals all show the same 71 W on Pitch Duel (the
  next four show 70).
- **The field is the same everywhere.** All sports and leagues show the same 23
  names in the same order. The league only shifts the numbers, and the subtitle
  always says `// BEST LEAGUE`.
- **The TEAMS board is football's national teams for every sport,** including
  cricket, tennis and motorsport. Argentina is hard-coded as the backed side.
- **Movements are fixtures.** The player's movement is always "—".
- **Search ranks are roster positions.** `rank = roster index + 1` ignores where the
  player sits, so a rival ranked below you shows one place higher in search than on
  the board. The search dossier also passes `userRank = rival's rank`, so VS YOU
  RANK always reads as a tie.
- **Search ignores auth.** A guest can open dossiers there but not from the board,
  and the dossier's VS YOU then compares against the guest's local stats.
- **The guest log-in `returnTo` is `/leaderboard`,** which drops the current
  filters. The current URL (which is already in sync) would be better.
- **The match-detail dossier is scouted from quiz points.** The TOPS tab passes
  `xp = points` (a few hundred), so the same rival (e.g. `jarvis`) reads at a much
  lower level and with a thinner career there than on `/leaderboard`. The rival
  names are also duplicated in `src/mocks/matches/detail-rivals.ts`, which can
  drift from `rivalRoster`.
- **Ties rank differently.** On the board, a rival with exactly your XP ranks above
  you (stable sort, player pushed last). In the friends arena (`base > totalXp`),
  you rank above them.
- **Dead code:**
  - `useBoardCountdown` is never used.
  - `LeaderboardEmpty` cannot be reached (the field is never empty), and both of
    its CTAs point to `/`.
  - `RankRow`'s gold numerals for ranks ≤ 3 never show, because a board with 3 or
  more entries puts the top three on the podium.
  - Several comments are stale: `leaderboard-filters.tsx` still describes "MATCH
    DAY"/"TOURNEY" boards, `types.ts` says "four modes", and
    `use-board-entries.ts` says "twenty-three names carry six different boards".
- **The row stagger has no cap.** With 24 entrants, the last row starts 1.61 s after
  the body mounts, on every filter change. The match TOPS tab caps its stagger at
  10 rows.
- **The URL is rewritten on mount.** The first effect `router.replace`s whatever
  came in with the canonical six-param URL, so every load costs one extra
  (history-free) navigation.
- **The hydration sequence is intentional.** The server and first paint render the
  guest board. Then the session resolves, `LeaderboardBoard` remounts under
  `PersonalizedLeaderboard`, and the player's row slides in and re-ranks the list.
  Don't "fix" this by reading `localStorage` during render.
- **`src/mocks/leaderboard` imports types from `@/features/leaderboard/types`.**
  The import is type-only so it compiles, but the repo's mock-data rules
  (`.codex/skills/statoz-mock-data/SKILL.md`) prefer such fixture contracts in
  `src/domain`. Move `RivalSeed`/`TeamSeed` there if you restructure.
