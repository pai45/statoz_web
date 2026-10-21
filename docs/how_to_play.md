# How To Play — implementation guide

The rules reference. A hub lists one card per mode that has a guide (**seven**:
Predict, Pick, Pitch Duel, Penalty Shootout, Bingo Grid, Football Chess and Hoop
Duel). Each card opens a reference page with the same structure:

- what the mode is for
- three facts at a glance
- the numbered steps of play ("HOW IT WORKS")
- the rules that aren't steps ("GOOD TO KNOW")

A small help button lets any surface link straight to one mode's guide.

It is all static content. There is no state, no storage and no client-side
JavaScript: every component here is a **Server Component**, and every page is
generated at build time. The guide text is copied **word for word from the Flutter
app**. Several guides no longer match how the web games actually play; §4 lists
each mismatch.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. Sources (≈1.1k lines):

- `src/features/how-to-play/` (1,099 lines): the guide copy (`data/guides.ts`,
  413), types, hub, guide page, help button, CSS module.
- `src/app/(platform)/how-to-play/page.tsx` and `…/how-to-play/[mode]/page.tsx`.

> - The hub cards (`DirectoryCard`, `GlyphTile`) and the panels (`AccentPanel`) are
>   the same design-system pieces as Talk to StatOz. They are described in
>   [`talk_to_statoz.md`](./talk_to_statoz.md) §4.
> - The rules each guide summarises are documented in full in the game docs:
>   [`pitch_duel.md`](./pitch_duel.md), [`football_chess.md`](./football_chess.md)
>   and [`hoop_duel.md`](./hoop_duel.md).

---

## At a glance

| | |
|---|---|
| Routes | `/how-to-play` (hub), `/how-to-play/<predict\|pick\|pitch-duel\|penalty-shootout\|football-bingo\|football-chess\|hoop-duel>` (guide). Unknown slugs → `notFound()` |
| Layout | `(platform)` route group (top bar, breadcrumbs, nav). Each screen also has its own back header |
| Breadcrumbs | `HOME / HOW TO PLAY`, then `HOME / HOW TO PLAY / <MODE>`. Mode labels come from `segmentLabels` in `platform-breadcrumbs.tsx` (`football-bingo` → "BINGO GRID", `pitch-duel` → "PITCH DUEL", …) |
| Auth | None (public) |
| Persistence | None |
| Client JS | None. No component in the feature is a client component |
| Public API (`@/features/how-to-play`) | `HowToPlayHub`, `HowToPlayGuide`, `HowToPlayButton`, `guides`, `guideFor`, types `HowToPlayMode`, `ModeGuide`, `GuideStat`, `GuideStep`, `GuideFact`, `GuideAccent` |

**Inbound links:**

| From | Link | Where the guide's back arrow goes |
|---|---|---|
| Profile → **How To Play** row (`profile-actions.tsx`) | `/how-to-play` | Hub back → `/profile` |
| Picks screen header (`picks-screen.tsx`) | `<HowToPlayButton mode="pick" />` → `/how-to-play/pick` | Guide back → hub, not Picks |
| Hoop Duel lobby (`hoop-duel-lobby.tsx`) | a plain `<Link href="/how-to-play/hoop-duel">HOW TO PLAY</Link>` | Guide back → hub, not the lobby |
| Pitch Duel lobby | **Not linked.** Its HOW TO PLAY button opens its own in-game explainer (`pitch-duel-how-to.tsx`) | n/a |
| Penalty Shootout, Football Bingo and Football Chess lobbies, and the match / predict screens | **Not linked** | n/a |

---

## 1. Data model (`types.ts`)

```ts
/** The modes that carry a guide, in hub order. Slugs match the game ids so a lobby can link to its own guide. */
export type HowToPlayMode =
  | "predict" | "pick"
  | "pitch-duel" | "penalty-shootout" | "football-bingo" | "football-chess" | "hoop-duel";

/** Any palette name: accents, plus feedback colours (bingo lives and the hoop-duel shot clock use "danger"). */
export type GuideAccent = PaletteName;

export type GuideStat = { icon: GlyphName; label: string; sub: string; accent: GuideAccent };  // one cell of the 3-up strip
export type GuideStep = { title: string; body: string };                                        // one numbered move
export type GuideFact = { icon: GlyphName; label: string; body: string };                       // a rule that isn't a step

export type ModeGuide = {
  id: HowToPlayMode;
  title: string;      // hub card title and the guide's title, e.g. "PITCH DUEL"
  tagline: string;    // hub card one-liner
  subtitle: string;   // guide header "// SUB LINE"
  purpose: string;    // a sentence or two; also the page's meta description
  icon: GlyphName;
  accent: GuideAccent;
  stats: GuideStat[];  // always 3 in the shipped data (the strip is a 3-column grid)
  steps: GuideStep[];  // 5–6
  facts: GuideFact[];  // 1–3
};
```

```ts
// data/guides.ts
export const guides: ModeGuide[] = [ /* seven guides, hub order */ ];

export function guideFor(mode: string): ModeGuide | undefined {
  return guides.find((guide) => guide.id === mode);
}
```

Guides are keyed by **slug**, not by position. The app keys them by enum index
and warns to only ever append; with slugs, the order controls only how the hub
lists them. `guideFor` takes any string, because route params are untyped.

---

## 2. The seven guides

The guides are listed in hub order. The copy is in `data/guides.ts`, word for word
from the app. Port that file as-is rather than retyping it. The tables below give
each guide's shape and step titles; the bodies are in the source.

| # | `id` | Title | Accent | Icon | Tagline (hub) | Subtitle | Steps | Facts |
|---|---|---|---|---|---|---|---:|---:|
| 1 | `predict` | PREDICT | cyan | `quiz` | Answer the match quiz, earn XP | `// MATCH QUIZ · XP ONLY` | 5 | 3 |
| 2 | `pick` | PICK | lime | `show_chart` | Take a position on outcome markets | `// OUTCOME MARKETS · OZ COINS` | 5 | 3 |
| 3 | `pitch-duel` | PITCH DUEL | violet | `sports_soccer` | Tactical 4-round card duel | `// TACTICAL 4-ROUND DUEL` | 6 | 3 |
| 4 | `penalty-shootout` | PENALTY SHOOTOUT | orange | `my_location` | Sudden-death spot kicks | `// SUDDEN-DEATH SPOT KICKS` | 5 | 3 |
| 5 | `football-bingo` | BINGO GRID | orange | `grid_on` | Match the player to the intersecting clubs | `// DAILY 3X3 GRID` | 6 | 3 |
| 6 | `football-chess` | FOOTBALL CHESS | cyan | `grid_view` | Tactical 5v5 Grid Duel | `// TURN-BASED MATCH` | 5 | 1 |
| 7 | `hoop-duel` | HOOP DUEL | gold | `sports_basketball` | Street 1-on-1 arcade basketball | `// REAL-TIME DUEL · XP ONLY` | 6 | 3 |

| `id` | Overview strip (label · sub · accent) | Steps | Good to know |
|---|---|---|---|
| `predict` | ONE AT A TIME · question per page · cyan · BOOSTERS · 2× and 1.5× · orange · XP ONLY · never coins · violet | Open Matches → Answer the quiz → Boost your best calls → Lock at kickoff → Reveal the results | XP, never coins · Edit until kickoff · Review, not replay |
| `pick` | FILTERS · sport + market · lime · PRICED · per outcome · cyan · OZ COINS · your stake · gold | Browse markets → Read the card → Tap an outcome price → Set your amount → Confirm the pick | Match market · Binary event · Futures |
| `pitch-duel` | 4 ROUNDS · attack ×2 · defend ×2 · violet · PLAYER + ACTION · each round · cyan · XP & COINS · on a win · gold | Build a legal deck → Toss for role → Read the scenario → Pick player + action → Strike the Shot Meter → Resolve and repeat | Power formula · Risky actions · Tied at full time |
| `penalty-shootout` | 5 KICKS EACH · then sudden death · orange · L · C · R · aim your shot · cyan · RATINGS MATTER · tip each duel · lime | Set your lineup → Pick a direction → Beat the keeper → Trade kicks → Sudden death | Ratings tip the duel · Early finish · Standalone mode |
| `football-bingo` | 9 CELLS · 3x3 daily puzzle · orange · 5 LIVES · don't tap wrong · **danger** · DAILY · new grid tomorrow · cyan | Check the Active Player → Match the criteria → Tap to place → Watch your lives → Buy a lifeline → Complete the grid | Daily Refresh · Lifeline cost (25 Oz Coins) · Archive mode |
| `football-chess` | 3X4 GRID · tight tactical pitch · cyan · 5V5 SQUAD · 4 outfield + 1 keeper · lime · COOLDOWNS · manage your tackles · orange | Move & Pass → Dribble → Press & Tackle → Slide Tackle → Shoot to Score | XP Only |
| `hoop-duel` | 2 HALVES · 45s + halftime sub · gold · 12s CLOCK · shoot before it dies · **danger** · HEAT · fill it to ignite · orange | Move & Drive → Shoot on the meter → Finish inside → Create space → Defend with timing → Crash the boards | Heat · Roster of 3 · XP Only |

The app's `Cyber.red` (#e31f26), used once for the bingo lives counter, maps to
the existing `danger` token.

---

## 3. Routes

```tsx
// src/app/(platform)/how-to-play/page.tsx
import type { Metadata } from "next";
import { HowToPlayHub } from "@/features/how-to-play";

export const metadata: Metadata = {
  title: "How to Play | StatOz",
  description: "Every playable mode explained: predictions, outcome markets, the card duel, the shootout, the bingo grid, football chess, and hoop duel.",
};

export default function HowToPlayPage() {
  return <HowToPlayHub />;
}
```

```tsx
// src/app/(platform)/how-to-play/[mode]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guideFor, guides, HowToPlayGuide } from "@/features/how-to-play";

export function generateStaticParams() {
  return guides.map((guide) => ({ mode: guide.id }));
}

export async function generateMetadata({ params }: PageProps<"/how-to-play/[mode]">): Promise<Metadata> {
  const { mode } = await params;
  const guide = guideFor(mode);
  if (!guide) return { title: "How to Play | StatOz" };
  return { title: `${guide.title} | How to Play | StatOz`, description: guide.purpose };
}

export default async function HowToPlayGuidePage({ params }: PageProps<"/how-to-play/[mode]">) {
  const { mode } = await params;
  const guide = guideFor(mode);
  if (!guide) notFound();
  return <HowToPlayGuide guide={guide} />;
}
```

- In this Next version, `params` is a **Promise**, and `PageProps<"/how-to-play/[mode]">`
  is the generated route type. Check `node_modules/next/dist/docs/` for your
  version.
- `generateStaticParams` follows `guides`, so a new guide gets its page with no
  route change.
- For a static export (`output: "export"`, which this repo uses when
  `GITHUB_PAGES=true`), consider `export const dynamicParams = false`. The
  static-exports guide lists the default `dynamicParams: true` as unsupported.

---

## 4. Do the guides match the web games?

The copy was ported word for word from the app, but some of the web games were
built differently. I checked each guide's concrete claims against the web code.
Fix the copy, or the game, before shipping a port.

| Guide | Claim in the guide | What the web build does | Verdict |
|---|---|---|---|
| **Pitch Duel** | "Build a legal deck: 2 attackers, 2 defenders, **1 goalkeeper**, and 6 action cards." | The deck is exactly 2 ATT + 2 DEF + 6 actions. The keeper is not used (`pitch-duel.tsx` → `deckFromLoadout`) | ✗ Wrong |
| | "The power gap becomes a goal, save, block, **miss, foul, or red card**." | `PitchDuelOutcome = "goal" \| "saved" \| "blocked"` | ✗ Wrong |
| | Fact: "Risky actions carry a **12% chance of a foul or a red card**." | `risky` only makes the CPU less likely to choose the card (a −4 penalty when it ranks cards). There is no foul or card roll | ✗ Wrong |
| | Fact: "A level match after 4 rounds goes to a **penalty shootout**." | A level match ends as a **Draw** (+4 XP, 25 coins) | ✗ Wrong |
| | Stat: "XP & COINS · on a win" | Coins on every result (50 / 25 / 10). XP can be **negative** on a loss | ~ Partly |
| | "Perfect timing adds up to +20 power", 4 alternating rounds, scenarios | As described | ✓ |
| **Football Chess** | Fact: "**XP Only.** This mode rewards XP for progression. Coins stay in the shop." | It pays coins (50 win / 20 draw / 10 loss) via `settleCoinReward`. The XP is shown but **never saved**, so there is no `footballChess` track on the profile | ✗ Wrong (both halves) |
| | 3×4 grid, 4 outfield + 1 keeper, move/pass/dribble/press/tackle/slide/shoot, slide foul risk, cooldowns | As described (`boardCols = 3`, `boardRows = 4`; slide miss → 30% foul) | ✓ |
| **Hoop Duel** | Subtitle "REAL-TIME DUEL · **XP ONLY**" and fact "XP Only — coins stay in the shop" | It pays coins: 50 for a win, 10 for a loss (`hoop-duel.tsx`) | ✗ Wrong |
| | 45 s halves, 12 s shot clock, heat for 15 s or after 6 unanswered points, an opponent score ends heat, roster of 3 | `halfSeconds = 45`, `shotClockSeconds = 12`, `heatDuration = 15`, `unanswered` tracking, roster of exactly 3 | ✓ |
| **Penalty Shootout** | "You score when your direction differs from the keeper's dive." | Wrong-way dive → **95%** goal. Correct dive → 8–45% goal depending on the shooter − keeper rating gap (`engine/odds.ts`) | ~ Simplified |
| | 5 each, early finish, sudden-death pairs, ratings matter | As described (`shootoutKicks = 10`, `earlyOut`, pair-wise sudden death) | ✓ |
| **Bingo Grid** | 5 lifelines, a lifeline costs 25 Oz Coins, daily grid, view-only archive | `startingLifelines = 5`, `lifelineCost = 25`, per-day progress + archive store | ✓ |
| **Predict** | 2× and 1.5× boosters, edit until kickoff, REVEAL RESULTS, XP only | `PredictionMultiplierId = "x2" \| "x15"` with `applyMultiplier`; `REVEAL RESULTS` in `quiz-review.tsx` | ✓ |
| **Pick** | Filters by market type, the stake moves in price steps and stays within the balance | Filters ALL / MATCHES / EVENT / FUTURES (the guide says "All Picks"). `StakeStepper step={price} max={balance}` | ✓ (label nit) |

Related: Pitch Duel's own in-game explainer (`pitch-duel-how-to.tsx`) has FAQs that
say "Cards can be reused unless a player gets a red card." On the web, each card
is used once per match and there are no red cards. Fix it alongside the hub guide.

---

## 5. The hub (`components/how-to-play-hub.tsx`)

```
‹  HOW TO PLAY                          (19px display, cyan; back → /profile)
   // PICK A MODE TO LEARN

SEVEN WAYS TO PLAY STATOZ              (count spelled from guides.length)
Predict fixtures, take market picks, duel with cards, trade spot kicks,
or take on the arcade modes. Tap a mode for its quick guide.

┌ DirectoryCard (accent = guide accent) ───────────────────────────┐
│ [glyph 52px]  PREDICT                                          › │
│               Answer the match quiz, earn XP                     │
│               [5 STEPS]                                          │
└──────────────────────────────────────────────────────────────────┘
… one card per guide: 1 column, 2 columns from 64rem
```

```tsx
const counts = ["NO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"];
// <p className={styles.introLabel}>{counts[guides.length] ?? guides.length} WAYS TO PLAY STATOZ</p>

{guides.map((guide) => (
  <li key={guide.id}>
    <DirectoryCard
      href={`/how-to-play/${guide.id}`}
      accent={paletteVar(guide.accent)}
      icon={guide.icon}
      title={guide.title}
      tagline={guide.tagline}
      meta={`${guide.steps.length} STEPS`}
    />
  </li>
))}
```

- The heading's number is generated from `guides.length`, so it can't go stale.
  Past ten it falls back to digits ("11 WAYS…").
- The intro sentence below it is written by hand, so it can go stale (§10).
- Each card's `meta` tag is its step count.

---

## 6. A guide page (`components/how-to-play-guide.tsx`)

The root publishes `--guide-accent: paletteVar(guide.accent)` through
`accentStyle()` from `guide-parts.tsx`.

```
‹  PITCH DUEL                           (title in the guide accent; back → /how-to-play)
   // TACTICAL 4-ROUND DUEL

┌ AccentPanel ─────────────────────────────────────────────┐   ← introBlock
│ [glyph 48px]  PITCH DUEL                                 │
│               Turn your card collection into a four-…    │   (purpose)
└──────────────────────────────────────────────────────────┘
┌─────────────┐┌─────────────┐┌─────────────┐                    overview strip: 3 StatCells,
│   ⟲         ││   ▤         ││   🏆        │                    each in its OWN accent
│  4 ROUNDS   ││PLAYER+ACTION││ XP & COINS  │
│attack ×2 ·… ││ each round  ││  on a win   │
└─────────────┘└─────────────┘└─────────────┘
┌ AccentPanel ─────────────────────────────────────────────┐   ← stepsBlock
│ HOW IT WORKS                                             │   (SectionLabel, 70% cyan)
│ [1] Build a legal deck                                   │   <ol>, StepTile
│     2 attackers, 2 defenders, …                          │
│ [2] Toss for role …                                      │
└──────────────────────────────────────────────────────────┘
┌ AccentPanel ─────────────────────────────────────────────┐   ← factsBlock
│ GOOD TO KNOW                                             │
│ ◆ Power formula                                          │   <ul>, FactTile
│   Card rating + action power + scenario bonus + …        │
│ ───────── hairline (cyan→violet fade) ─────────          │   between facts
│ ◆ Risky actions …                                        │
└──────────────────────────────────────────────────────────┘
```

| Part | Markup | Style |
|---|---|---|
| `StatCell` | `<div>` with `--stat-accent` = the stat's own palette colour, a 22px `Glyph`, the label and a sub line | 1px border at 35% stat accent, a 7% wash, centred. Label 9px display/900, sub 9px muted. `.overview` is `repeat(3, minmax(0,1fr))`, gap 8px |
| `StepTile` | `<li>` with a 28px square number (`aria-hidden`) and an `<h3>` title + body | Number: border at 50% guide accent, 14% wash, guide-accent digits (12px display/700, tabular). Title 12.5px display/700, body 12px subtle |
| `FactTile` | A 16px glyph in the guide accent and an `<h3>` label + body | Label 11.5px display/700, body 11.5px muted |
| `SectionLabel` | `<p>` in upper case | 10px display/700, mega tracking, cyan at 70% |
| `.hairline` | `<hr>` before every fact after the first | 2px, `linear-gradient(transparent → cyan 90% → violet 75% → transparent)`. It is the only gradient on these pages, which are otherwise flat by design (no gradients, no glow) |

The `<ol>` already numbers the steps for screen readers; the visible number is
decorative and marked `aria-hidden`. React keys are `step.title`, `fact.label`
and `stat.label`, so keep those unique within a guide.

### Desktop layout

On phones everything reads straight down: intro, strip, steps, facts. From
`width >= 64rem` the page becomes a two-column grid. The steps, which are the
longest part, get the right column to themselves:

```css
.guidePage {
  grid-template-columns: minmax(0, 21.25rem) minmax(0, 1fr);
  grid-template-areas:
    "intro steps"
    "facts steps";
  align-content: start;
}
.introBlock { grid-area: intro; }
.factsBlock { grid-area: facts; }
.stepsBlock { grid-area: steps; }
```

The DOM order (intro, steps, facts) is the phone order, so the reading order for
screen readers doesn't change between layouts. `.page` and `.guidePage` cap at
65rem, centred, with 24px side padding.

---

## 7. The help button (`components/how-to-play-button.tsx`)

```tsx
export function HowToPlayButton({ mode, accent, className }: {
  mode: HowToPlayMode;
  accent?: PaletteName;   // override when the host surface runs its own colour
  className?: string;
}) {
  const guide = guideFor(mode);
  const label = guide ? `How to play ${guide.title}` : "How to play";
  return (
    <Link href={`/how-to-play/${mode}`} aria-label={label} title={label}
          className={[styles.helpButton, className].filter(Boolean).join(" ")}
          style={accentStyle(accent ?? guide?.accent ?? "cyan")}>
      <QuizIcon size={18} />
    </Link>
  );
}
```

`.helpButton` is a 32px square with an 18px quiz icon. It has a 1px border at 40%
accent, an 8% wash and accent icon colour. On hover it scales to 1.05 and
brightens by 1.12 (140 ms). Keyboard focus shows a 2px accent outline offset by
2px. Under reduced motion there is no transition and no hover scale. It is
deliberately secondary (flat, never glowing). The only current user is the Picks
header.

---

## 8. File manifest

| Path | Lines | Role |
|---|---:|---|
| `src/app/(platform)/how-to-play/page.tsx` | 13 | Hub route + metadata |
| `src/app/(platform)/how-to-play/[mode]/page.tsx` | 29 | Static params, per-guide metadata, `notFound()` |
| `src/features/how-to-play/index.ts` | 12 | Public API |
| `src/features/how-to-play/types.ts` | 64 | `HowToPlayMode`, `ModeGuide`, `GuideStat`, `GuideStep`, `GuideFact`, `GuideAccent` |
| `src/features/how-to-play/data/guides.ts` | 413 | The seven guides (the app's copy, word for word), `guideFor` |
| `src/features/how-to-play/components/how-to-play-hub.tsx` | 94 | Hub |
| `src/features/how-to-play/components/how-to-play-guide.tsx` | 147 | Guide page, `StatCell`, `StepTile`, `FactTile` |
| `src/features/how-to-play/components/how-to-play-button.tsx` | 42 | `HowToPlayButton` |
| `src/features/how-to-play/components/guide-parts.tsx` | 24 | `accentStyle`, `SectionLabel` |
| `src/features/how-to-play/components/how-to-play.module.css` | 303 | Hub and guide layout, strip, steps, facts, hairline, help button, desktop grid |

Outside the feature, the How To Play rows live in:

- `src/features/profile/components/profile-actions.tsx` (the profile row)
- `src/features/picks/components/picks-screen.tsx` (the button)
- `src/features/games/basketball/components/hoop-duel-lobby.tsx` (the link)
- `src/features/shell/components/platform-breadcrumbs.tsx` (the labels)

There are no static assets: the icons are design-system glyphs.

---

## 9. Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `next/link`, `next/navigation` (`notFound`) | Cards, back links, help button, unknown slugs | |
| `@/design-system`: `DirectoryCard`, `GlyphTile`, `AccentPanel`, `Glyph`, `ChevronLeftIcon`, `QuizIcon`, `paletteVar`, types `GlyphName`, `PaletteName` | All UI | `paletteVar(name)` → `var(--ds-color-accent-<name>)` for accents, `var(--ds-color-<name>)` for feedback colours (`danger`). Every `icon` in `guides.ts` must exist in your glyph registry (`quiz`, `style`, `bolt`, `military_tech`, `edit`, `history`, `show_chart`, `tune`, `sell`, `paid`, `sports_soccer`, `trending_up`, `sync_alt`, `emoji_events`, `insights`, `warning`, `my_location`, `format_list_numbered`, `swap_horiz`, `shield`, `flash_on`, `grid_on`, `grid_view`, `favorite`, `timer`, `groups`, `workspace_premium`, `sports_basketball`, `schedule`, `local_fire_department`) |
| CSS tokens: `--ds-color-accent-{cyan,violet}`, `--ds-color-text-{default,subtle,muted}`, `--ds-font-display`, `--ds-tracking-{tight,label,wide,ultra,mega}`, `--ds-leading-{body,tight}` | Styling | From `tokens.css` |
| Tailwind utilities (`max-w-260`, `bg-background`, `text-default`, `text-muted`, `hover:bg-overlay-subtle`, `font-display`) | Headers | |

---

## 10. Porting steps

1. Copy `src/features/how-to-play/` and the two route files. Copy
   `DirectoryCard`/`GlyphTile`/`AccentPanel` too if your design system lacks them.
2. **Fix the copy that doesn't match your games** (§4) before shipping. The guides
   are data, so it is a text edit in `guides.ts`.
3. Link the hub from your profile or settings, and drop
   `<HowToPlayButton mode="…" />` into each lobby that has a guide.
4. If you export statically, add `export const dynamicParams = false` to the
   `[mode]` page.
5. **Verify:**
   - The hub reads "SEVEN WAYS TO PLAY STATOZ", with seven cards showing 5 or 6
     STEPS (two columns on a wide screen).
   - `/how-to-play/hoop-duel` shows the gold title, a red "12s CLOCK" cell, six
     numbered steps on the right at desktop width, and three facts separated by
     cyan-to-violet hairlines.
   - `/how-to-play/nope` returns the 404 page.
   - The build output lists eight prerendered pages: the hub plus the seven
     guides.

### Adding a guide for another mode

1. Add the slug to `HowToPlayMode`. Use the game's own id (e.g. `"final-over"`,
   `"tennis-rally"`, `"grand-prix-dash"`) so its lobby can link with
   `<HowToPlayButton mode="final-over" />`.
2. Add a `ModeGuide` to `guides` at the position the hub should list it: 3 stats,
   5–6 steps, up to 3 facts. Use palette names for accents and registry names for
   icons.
3. Add a breadcrumb label in `segmentLabels` if the default (slug with dashes
   replaced by spaces, upper-cased) reads badly.
4. Update the hub's metadata description and its hand-written intro sentence;
   only the count updates itself.

Nothing else changes: `generateStaticParams`, the spelled-out count, the step
count and the page layout are all driven by the data.

---

## 11. Known gaps and gotchas (as of this snapshot)

- **Guides describe rules the web games don't have.** The details are in §4:
  - Pitch Duel claims a keeper, fouls, red cards and a shootout on a draw.
  - Football Chess and Hoop Duel claim "XP only" but both pay coins, and Football
    Chess's XP isn't even saved.
  - Pitch Duel's in-game FAQ repeats the red-card rules.
- **Only five of the eighteen games have a guide** (the other two guides are the
  Predict and Pick surfaces). There are none for:
  - Final Over, Tennis Rally and Grand Prix
  - the five sport quizzes
  - the five guess modes (Guess Player, Cricket Guess Player, Basketball Guess
    Player, Tennis Guess Winner, Guess Driver)

  The hub's metadata description lists exactly the seven covered modes.
- **Lobbies rarely link to their guide.**
  - Only Picks uses `HowToPlayButton`.
  - Hoop Duel uses a plain link.
  - Pitch Duel opens its own separate explainer.
  - Shootout, Bingo and Chess have no link at all.
- **No way back to where you came from.** A guide's back arrow always goes to the
  hub, and the hub's always goes to `/profile`. A player who opened the Pick guide
  from Picks, or Hoop Duel's from its lobby, takes two "back" taps and ends up on
  the profile instead of where they started. Passing a `returnTo` (validated like
  the leaderboard search's) would fix it.
- **The intro sentence is hand-written.** "Predict fixtures, take market picks,
  duel with cards, trade spot kicks, or take on the arcade modes" will go stale
  when guides are added. Only the count updates itself.
- **Label nit:** the Pick guide says "All Picks, Matches, Event, or Futures"; the
  screen's chips read ALL / MATCHES / EVENT / FUTURES.
- **Duplicated CSS.** `how-to-play.module.css` and `talk-to-statoz.module.css`
  repeat the same hub rules (`.page`, `.intro`, `.introLabel`, `.introBody`,
  `.headerRow`, `.headerTitle`). When porting both, consider one shared directory
  stylesheet.
- **Text-based React keys.** Keys are step titles, fact labels and stat labels, so
  two steps with the same title in one guide would collide.
