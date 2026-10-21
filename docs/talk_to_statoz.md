# Talk to StatOz — implementation guide

The player's direct line to the team, reached from the profile's **"Talk to StatOz
1:1"** row. A hub lists four **channels**: Bug, Feature Request, Score / Data
Mismatch and Shoutout. Each opens a compose screen with a one-line **summary** and
a **details** box. **TRANSMIT** plays a 2.2-second "TRANSMISSION SENT" animation
and returns to the hub.

**Nothing is sent anywhere.** The source app marks this as a "local stub, no
backend yet", and the web port keeps it an honest stub instead of inventing a
destination. §9 describes how to connect it to a real inbox, for both a server
deployment and the static GitHub Pages build.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. It is small (≈780 lines in total) and has no
state beyond the form:

- `src/features/profile/data/support-channels.ts` (88 lines): the four channels and
  their copy.
- `src/features/profile/components/talk-to-statoz.tsx` (85): the hub. It is a
  Server Component.
- `src/features/profile/components/transmission-compose.tsx` (246): the compose
  form and the send-off. It is a Client Component.
- `src/features/profile/components/talk-to-statoz.module.css` (318): hub layout,
  console fields and send-off animation.
- `src/app/(platform)/profile/talk-to-statoz/page.tsx` (13) and
  `…/talk-to-statoz/[channel]/page.tsx` (29).

> It lives inside the profile feature and is summarised in
> [`profile.md`](./profile.md) §6. Design tokens and `accentVar`/`feedbackVar`/`withAlpha`
> are covered in [`shared_game_platform.md`](./shared_game_platform.md).

---

## At a glance

| | |
|---|---|
| Routes | `/profile/talk-to-statoz` (hub), `/profile/talk-to-statoz/<bug\|feature\|mismatch\|shoutout>` (compose). Unknown slugs → `notFound()` |
| Layout | `(platform)` route group. The shell's top bar and breadcrumbs stay above each screen's own back header |
| Breadcrumbs | `HOME / PROFILE / TALK TO STATOZ`, then on compose `… / BUG REPORT`, `FEATURE REQUEST`, `DATA MISMATCH` or `SHOUTOUT` (from `segmentLabels` in `platform-breadcrumbs.tsx`) |
| Nav highlight | **PROFILE** (the nav matches the longest `href` prefix) |
| Inbound link | Only the profile's settings list: `ProfileActions` → `NavLink` "Talk to StatOz 1:1" (headset icon) → `/profile/talk-to-statoz` |
| Auth | **None.** The routes are public, but the only link to them is on the profile page, which requires login |
| Persistence | None. Drafts live in component state and are lost on navigation |
| Public exports (`@/features/profile`) | `TalkToStatoz`, `TransmissionCompose`, `supportChannels`, `supportChannelFor`, `channelNumber`, types `SupportChannel`, `SupportChannelId` |
| Rendering | Hub and compose pages are statically generated: the hub has no dynamic input, and compose uses `generateStaticParams` for the 4 ids. Only the compose body hydrates as a client component |

---

## 1. Flow

```
/profile ── "Talk to StatOz 1:1" ──▶ /profile/talk-to-statoz          (hub)
                                        │  tap a channel card
                                        ▼
                         /profile/talk-to-statoz/<id>                  (compose)
                                        │  TRANSMIT
                     ┌──────────────────┴────────────────────┐
           summary or details empty                both filled
                     │                                        │
     inline errors (live from now on)          <TransmissionSent> overlay, 2.2 s
                     │                                        │
              fix and TRANSMIT again          router.push("/profile/talk-to-statoz")
```

Both screens have a back chevron. The hub's goes to `/profile` and compose's goes
to the hub. Leaving compose discards the draft without asking.

---

## 2. Channels (`data/support-channels.ts`)

```ts
export type SupportChannelId = "bug" | "feature" | "mismatch" | "shoutout";

export type SupportChannel = {
  id: SupportChannelId;
  title: string;
  tagline: string;          // the hub card's one-line description
  composeSubtitle: string;  // the compose header's "// SUB LINE"
  composeHint: string;      // what to write, said once at the top of the form (also the page's meta description)
  summaryHint: string;      // summary placeholder
  detailsHint: string;      // details placeholder
  icon: GlyphName;          // a design-system glyph name
  accent: PaletteName;      // an accent or feedback colour name → paletteVar()
};

export const supportChannels: SupportChannel[] = [ /* below */ ];

export function supportChannelFor(id: string): SupportChannel | undefined {
  return supportChannels.find((channel) => channel.id === id);
}

/** "01".."04": the array position, zero-padded. */
export function channelNumber(channel: SupportChannel): string {
  return String(supportChannels.indexOf(channel) + 1).padStart(2, "0");
}
```

The copy is the app's, word for word; it sets the tone players answer in. The
**array order is the channel number**: append new channels, never reorder or insert
them.

| # | `id` | Title | Accent | Icon | Tagline (hub) |
|---|---|---|---|---|---|
| 01 | `bug` | Bug | `danger` | `bug_report` | Something broke, crashed, or refused to load. |
| 02 | `feature` | Feature Request | `cyan` | `auto_awesome` | A mode, tool, or unlock you want on the pitch. |
| 03 | `mismatch` | Score / Data Mismatch | `orange` | `sync_alt` | Wrong score, odds, lineup, or live feed drift. |
| 04 | `shoutout` | Shoutout | `gold` | `favorite` | Love a moment, mode, or beat? Send it up. |

| `id` | Compose subtitle | Compose hint | Summary placeholder | Details placeholder |
|---|---|---|---|---|
| `bug` | `// CHANNEL 01 · DEFECT SIGNAL` | Tell us what you tapped, what you expected, and what actually happened. | Short summary of the bug | Steps to reproduce, screens, match IDs… |
| `feature` | `// CHANNEL 02 · NEW BUILD` | Pitch the feature. What would it unlock for you? | Name the feature | How should it work? Why does it matter? |
| `mismatch` | `// CHANNEL 03 · DATA SYNC` | Flag the fixture, market, or stat that doesn't match reality. | Match / market that looks wrong | What did you see vs what should it be? |
| `shoutout` | `// CHANNEL 04 · FAN SIGNAL` | Tell us what slapped. We live for these. | What made you cheer? | Share the moment — mode, card, streak, vibe… |

---

## 3. Routes

```tsx
// src/app/(platform)/profile/talk-to-statoz/page.tsx
import type { Metadata } from "next";
import { TalkToStatoz } from "@/features/profile";

export const metadata: Metadata = {
  title: "Talk to StatOz | StatOz",
  description: "The 1:1 direct line: report a bug, request a feature, flag a data mismatch, or send a shoutout.",
};

export default function TalkToStatozPage() {
  return <TalkToStatoz />;
}
```

```tsx
// src/app/(platform)/profile/talk-to-statoz/[channel]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supportChannelFor, supportChannels, TransmissionCompose } from "@/features/profile";

export function generateStaticParams() {
  return supportChannels.map((channel) => ({ channel: channel.id }));
}

export async function generateMetadata({ params }: PageProps<"/profile/talk-to-statoz/[channel]">): Promise<Metadata> {
  const { channel } = await params;
  const found = supportChannelFor(channel);
  if (!found) return { title: "Talk to StatOz | StatOz" };
  return { title: `${found.title} | Talk to StatOz | StatOz`, description: found.composeHint };
}

export default async function TransmissionPage({ params }: PageProps<"/profile/talk-to-statoz/[channel]">) {
  const { channel } = await params;
  const found = supportChannelFor(channel);
  if (!found) notFound();
  return <TransmissionCompose channel={found} />;
}
```

- In this Next version, `params` is a **Promise** and must be awaited.
  `PageProps<"…">` is the globally generated route type. Check
  `node_modules/next/dist/docs/` for your version before copying.
- The page passes the **whole channel object** to the client component. It is
  plain serialisable data: strings only, with `icon` and `accent` as names, not
  components.
- The app sets `output: "export"` when `GITHUB_PAGES=true` (`next.config.ts`). The
  static-exports guide lists dynamic routes with `dynamicParams: true` (the
  default) as unsupported there. If your port exports statically, add
  `export const dynamicParams = false` so any slug outside the four 404s at build
  time instead of relying on a runtime render.

---

## 4. The hub (`components/talk-to-statoz.tsx`)

A Server Component with no `"use client"`. It renders links and static markup only.

```
‹  TALK TO STATOZ                       (19px display, cyan)
   // 1:1 DIRECT LINE                   (9px, muted)

OPEN A CHANNEL                          (11px cyan label)
Pick a channel. We read every transmission.

┌ DirectoryCard (accent = channel colour) ─────────────────────────┐
│ [glyph 52px]  Bug                                              › │
│               Something broke, crashed, or refused to load.      │
│               [CHANNEL 01]                                       │
└──────────────────────────────────────────────────────────────────┘
… one card per channel (1 column; 2 columns from 64rem)

FOLLOW US ON
Highlights, hot takes, and the next drop.
[ INSTAGRAM ] [ REDDIT ] [ YOUTUBE ]    (target="_blank" rel="noreferrer")
```

- **Header:** `max-w-260` (65rem), with a 36px back link to `/profile` labelled
  "Back to profile".
- **Cards:**
  `<DirectoryCard href={`/profile/talk-to-statoz/${id}`} accent={paletteVar(accent)} icon title tagline meta={`CHANNEL ${channelNumber(channel)}`} />`
  inside a `<ul>`.
- **Layout:** `.page` is a `minmax(0,1fr)` grid. A plain `1fr` would size the
  column to the longest unbroken tagline and overflow on phones. From
  `width >= 64rem` it is capped at 65rem and centred, and `.channelGrid` becomes
  two columns.
- **Social panel:** three equal 48px-tall outlined buttons. On hover or keyboard
  focus the border turns cyan and the text brightens.

### `DirectoryCard` and `GlyphTile` (`src/design-system/components/data-display/directory-card/directory-card.tsx`)

The same card the How To Play hub uses. It is a `next/link` around an
`AccentPanel`:

- a `GlyphTile` (a square with a 12% accent wash, a 45% accent border and the glyph
  at half its size)
- the title (`--ds-text-base`, display font)
- the tagline (`--ds-text-compact`, subtle)
- an optional `meta` plate (accent text on a 12% wash with a 40% border)
- a chevron at 80% accent

Hover lifts it 2px and brightens it by 10%. Under `motion-reduce` it doesn't move.
The focus outline is in the accent colour.

**`AccentPanel`** (`…/accent-panel/accent-panel.tsx`) is a flat elevated plate,
square across the top with both bottom corners cut 12px
(`bottomCutPath(shape.panelCut)`), inside a 1px edge at 50% accent. The edge is a
clipped layer behind the fill, inset 1px, because a clip path crops real borders.
It takes an optional `glow` for a blurred bloom; this section never uses it.

---

## 5. The compose screen (`components/transmission-compose.tsx`)

`"use client"`. It receives `channel: SupportChannel` and publishes
`--channel-accent: paletteVar(channel.accent)` on its root.

```
‹  BUG                                  (channel title, upper case, in the accent)
   // CHANNEL 01 · DEFECT SIGNAL

┌ AccentPanel ──────────────────────────────────────────────┐
│ [glyph 48px]  BUG                                         │
│               Tell us what you tapped, what you expected… │
└───────────────────────────────────────────────────────────┘
SUMMARY
[ Short summary of the bug                                ]   <input type="text">
DETAILS
[ Steps to reproduce, screens, match IDs…                 ]   <textarea rows=6>
[                                                         ]
                       (flex spacer on phones)
[ TRANSMIT  ➤ ]                          Button size="lg" fullWidth accent={channel accent}
```

### 5.1 State and submit

```tsx
const [summary, setSummary] = useState("");
const [details, setDetails] = useState("");
const [submittedEmpty, setSubmittedEmpty] = useState(false);   // "show errors from now on"
const [sent, setSent] = useState(false);

const summaryEmpty = submittedEmpty && summary.trim() === "";
const detailsEmpty = submittedEmpty && details.trim() === "";

function transmit() {
  if (summary.trim() === "" || details.trim() === "") {
    setSubmittedEmpty(true);
    return;
  }
  setSent(true);                 // ← the whole "send". Nothing leaves the browser.
}

<form noValidate onSubmit={(event) => { event.preventDefault(); transmit(); }}>
```

### 5.2 Validation rules

- **Both fields are required.** Whitespace-only counts as empty. Values are
  checked trimmed but never rewritten.
- **No errors before the first attempt.** The first TRANSMIT with an empty field
  turns `submittedEmpty` on, and from then on each field shows its error **live**:
  the error goes away as soon as the field has a non-space character and comes back
  if it is cleared.
- Messages:
  - Summary: **"Add a one-line summary."**
  - Details: **"Tell us the rest — we need the details."**
- Pressing Enter in the summary input submits the form (implicit submission), so it
  validates too. Enter in the textarea adds a new line.
- `noValidate` turns off browser bubbles. There is no `required`, `minLength` or
  `maxLength`.

### 5.3 `TransmissionField`

A label-led, **square** field. It is deliberately not the system's chamfered
`InputField` (that one belongs to the login form; this is a "console line").

```tsx
function TransmissionField({ label, hint, value, onValue, error, rows }) {
  const id = useId();
  const messageId = `${id}-message`;
  const shared = {
    id, value, placeholder: hint,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? messageId : undefined,
    className: [styles.field, error ? styles.fieldError : ""].filter(Boolean).join(" "),
    onChange: (event: { target: { value: string } }) => onValue(event.target.value),
  };
  return (
    <div className={styles.fieldBlock}>
      <label className={styles.fieldLabel} htmlFor={id}>{label.toUpperCase()}</label>
      {rows ? <textarea {...shared} rows={rows} /> : <input {...shared} type="text" />}
      {error ? <p className={styles.fieldMessage} id={messageId} role="alert">{error}</p> : null}
    </div>
  );
}
```

Accessibility: the label is tied to the field by `htmlFor`/`useId`. An invalid
field gets `aria-invalid` and `aria-describedby` pointing at a `role="alert"`
message, so the error is spoken, not just shown as a red edge as in the app.

| Class | Style |
|---|---|
| `.field` | 100% wide, `min-height: 46px`, 12px padding, 1px default border, background `color-mix(primary 45%, transparent)`, 13px body font, `resize: vertical` |
| `.field:focus-visible` | cyan border at 1.4px, no outline |
| `.fieldError` (also on focus) | danger border |
| `.fieldLabel` | 10px display, weight 700, ultra tracking, muted |
| `.fieldMessage` | 11.5px, danger |

### 5.4 Layout

- **Phone:** `.composePage` is a flex column (gap 18px, padding
  `14px 16px calc(20px + safe-area)`). `.transmitDock` has `margin-top: auto`, so
  TRANSMIT sits at the bottom of the screen within thumb reach, like the app's
  pinned button.
- **`width >= 64rem`:** the form is capped at `44rem` and centred, and the dock's
  `margin-top` resets to 0. On a desktop the button follows the form instead of
  floating at the bottom of a tall empty column.
- The header row is capped at `max-w-260` and is not part of the form.

---

## 6. The send-off (`TransmissionSent`)

```tsx
function TransmissionSent({ accent, channelTitle, onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={styles.sentScrim} style={{ "--channel-accent": accent }} role="status" aria-live="polite">
      <span aria-hidden className={styles.sentTexture} />          {/* CRT scanlines */}
      <div className={styles.sentStack}>
        <span className={styles.sentBadge}>
          <span aria-hidden className={styles.sentFlash} />
          <span className={styles.sentSeal}><CheckIcon size={36} /></span>
        </span>
        <div className={styles.sentText}>
          <p className={styles.sentHeadline}>TRANSMISSION SENT</p>
          <p className={styles.sentChannel}>{channelTitle.toUpperCase()}</p>
          <p className={styles.sentBody}>Signal locked. We’ll take it from here.</p>
        </div>
      </div>
    </div>
  );
}
// rendered by the compose screen as:
{sent ? <TransmissionSent accent={accent} channelTitle={channel.title}
                          onDone={() => router.push("/profile/talk-to-statoz")} /> : null}
```

The app runs the send-off on one 2.2-second animation controller. Here each beat is
a CSS keyframe, and JavaScript only owns the navigation timer.

| Time | Beat | CSS |
|---|---|---|
| 0 ms | Full-screen scrim at 92% page colour (`z-index: 70`) with scanlines: a 1px `rgb(0 0 0 / 14%)` line every 3px | `.sentScrim`, `.sentTexture` |
| 0 → 260 ms | Radial accent flash (65% → transparent) fades 0.7 → 0 behind the badge | `sent-flash`, linear |
| 0 → 480 ms | The stack (120px badge holding a 72px round seal with a 2px accent ring, an accent glow and a 36px check) pops from `scale(0.3)` to `1` with overshoot, held 9% above centre | `sent-pop`, `cubic-bezier(0.2, 1.5, 0.4, 1)` |
| 350 → 710 ms | Text fades in: **TRANSMISSION SENT** (18px, accent), the channel title (11px, muted, mega tracking), then "Signal locked. We'll take it from here." (13px) | `sent-text`, `ease-out 350ms` delay |
| 1716 → 2200 ms | The scrim holds at full opacity until 78%, then fades out | `sent-scrim`, 2200 ms linear |
| 2200 ms | The timer fires `router.push("/profile/talk-to-statoz")` | JS |

- **Reduced motion** (`prefers-reduced-motion: reduce`): every send-off animation
  is turned off and the flash is hidden. The overlay stays static until the
  navigation at 2.2 s.
- **Screen readers:** `role="status" aria-live="polite"` announces the text once.
- The scrim has **`pointer-events: none`**, so the form underneath stays clickable
  during the send-off (§10).

---

## 7. File manifest

| Path | Lines | Role |
|---|---:|---|
| `src/app/(platform)/profile/talk-to-statoz/page.tsx` | 13 | Hub route + metadata |
| `src/app/(platform)/profile/talk-to-statoz/[channel]/page.tsx` | 29 | Static params, per-channel metadata, `notFound()` |
| `src/features/profile/data/support-channels.ts` | 88 | Channel type, the four channels, `supportChannelFor`, `channelNumber` |
| `src/features/profile/components/talk-to-statoz.tsx` | 85 | Hub (Server Component) |
| `src/features/profile/components/transmission-compose.tsx` | 246 | Compose form, `TransmissionField`, `TransmissionSent` |
| `src/features/profile/components/talk-to-statoz.module.css` | 318 | Hub grid, social panel, console fields, dock, send-off keyframes, desktop and reduced-motion rules |
| `src/features/profile/components/profile-actions.tsx` | (row only) | The entry row: `<NavLink icon={<HeadsetIcon/>} label="Talk to StatOz 1:1" href="/profile/talk-to-statoz" />` |
| `src/features/shell/components/platform-breadcrumbs.tsx` | (entries only) | The `talk-to-statoz` cases and the `bug` / `feature` / `mismatch` / `shoutout` labels |
| `src/design-system/components/data-display/directory-card/directory-card.tsx` | 132 | `DirectoryCard`, `GlyphTile` |
| `src/design-system/components/data-display/accent-panel/accent-panel.tsx` | 66 | `AccentPanel` |

There are no static assets: the icons are design-system glyphs.

---

## 8. Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `next/link`, `next/navigation` (`useRouter`, `notFound`) | Back links, cards, return after send, unknown slugs | |
| `@/design-system`: `DirectoryCard`, `GlyphTile`, `AccentPanel`, `Button` (`accent`, `size="lg"`, `fullWidth`, `trailingIcon`), icons `ChevronLeftIcon`, `CheckIcon`, `SendIcon`, `Glyph` with names `bug_report`, `auto_awesome`, `sync_alt`, `favorite` | All UI | Any icon set works if you change `icon` to your own type. `Button`'s `lg` size is 52px tall (`h-13`) |
| `@/design-system`: `paletteVar(name)` and the `PaletteName` / `GlyphName` types | Accent colour per channel | `paletteVar` returns `var(--ds-color-accent-<name>)` for accents or `var(--ds-color-<name>)` for feedback colours. Hard-coded CSS colours work too |
| `withAlpha`, `bottomCutPath`, `shape.panelCut` (inside `AccentPanel` / `DirectoryCard`) | Panel edge and wash | See the shared doc |
| CSS tokens: `--ds-color-accent-cyan`, `--ds-color-danger`, `--ds-color-text-{default,subtle,muted}`, `--ds-color-border-{default,muted}`, `--ds-color-background-{primary,elevated}`, `--ds-font-display`, `--ds-font-body`, `--ds-tracking-{tight,label,wide,ultra,mega}`, `--ds-leading-{body,tight}`, `--ds-text-{base,compact,nano}` | Styling | From `tokens.css` |
| Tailwind utilities: `max-w-260`, `bg-background`, `text-default`, `text-muted`, `hover:bg-overlay-subtle`, `font-display` | Headers | Tailwind v4 `@theme` names |

---

## 9. Porting steps

1. Copy `support-channels.ts`, `talk-to-statoz.tsx`, `transmission-compose.tsx`
   and `talk-to-statoz.module.css`. Also copy `DirectoryCard`/`GlyphTile`/`AccentPanel`
   if your design system has no equivalents.
2. Add the two route files from §3. If you build with `output: "export"`, add
   `export const dynamicParams = false` to the `[channel]` page.
3. Link to `/profile/talk-to-statoz` from your profile or settings, and add the
   breadcrumb labels if your shell has breadcrumbs.
4. **Verify:**
   - The hub shows four cards numbered 01–04 (two columns on a wide screen).
   - `/profile/talk-to-statoz/nope` returns the 404 page.
   - On Bug, pressing TRANSMIT with both fields empty shows both errors. Typing in
     the summary clears only its error, and the details error stays until the
     details are filled.
   - Fill both and press TRANSMIT: the check pops in, the text fades in, and after
     about 2.2 s you are back on the hub.
   - With reduced motion turned on in the OS, the same flow runs with no
     animation.

### Connecting it to a real inbox

Decide what a transmission carries. A suggested payload:

```ts
type SupportTransmission = {
  id: string;                 // client-made idempotency key: one per draft, so a double tap is one ticket
  channel: SupportChannelId;
  summary: string;            // trimmed, suggested max 120 chars
  details: string;            // trimmed, suggested max 4000 chars
  playerTag: string | null;   // readProfileIdentity().playerTag — unverified context, not identity
  route: string;              // where they came from, if you pass it in (e.g. ?from=/matches/epl_cfc_new)
  appVersion: string;
  userAgent: string;
  sentAt: string;             // ISO
};
```

Then pick a transport that matches how you deploy:

**A. Server deployment (`next start`, Vercel, etc.).** Use a Server Action. Put it
in a `"use server"` file and import it into the client component:

```ts
// src/features/profile/actions/send-transmission.ts
"use server";

import { supportChannelFor } from "@/features/profile/data/support-channels";   // not the barrel: it re-exports client components

export type SendResult = { ok: true } | { ok: false; message: string };

export async function sendTransmission(input: SupportTransmission): Promise<SendResult> {
  // Server Functions can be reached by a direct POST — validate everything here, never trust the client.
  if (!supportChannelFor(input.channel)) return { ok: false, message: "Unknown channel." };
  const summary = input.summary.trim();
  const details = input.details.trim();
  if (!summary || summary.length > 120) return { ok: false, message: "Add a one-line summary." };
  if (!details || details.length > 4000) return { ok: false, message: "Tell us the rest — we need the details." };
  // rate-limit by IP / tag here; dedupe on input.id
  const response = await fetch(process.env.SUPPORT_WEBHOOK_URL!, {        // ticketing tool, email service, Slack…
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, summary, details }),
  });
  return response.ok ? { ok: true } : { ok: false, message: "Signal lost. Try again in a moment." };
}
```

**B. Static export (`GITHUB_PAGES=true` → `output: "export"`).** Server Actions and
Route Handlers that read the request are **not supported** in a static export (per
the static-exports guide in `node_modules/next/dist/docs/`). POST from the browser
to an external endpoint you control (a serverless function or a form service). Put
its URL in a `NEXT_PUBLIC_…` variable and keep every secret on that service's
side, not in the bundle.

**Client changes for either option:**

```tsx
const draftId = useRef<string>(crypto.randomUUID());
const [pending, setPending] = useState(false);
const [failure, setFailure] = useState<string | null>(null);

async function transmit() {
  if (summary.trim() === "" || details.trim() === "") { setSubmittedEmpty(true); return; }
  if (pending) return;                                   // no double submit
  setPending(true);
  setFailure(null);
  const result = await sendTransmission({ id: draftId.current, channel: channel.id, summary, details, /* … */ });
  setPending(false);
  if (result.ok) setSent(true);                          // the send-off now means "received"
  else setFailure(result.message);                       // show under the dock with role="alert"; keep the draft
}
// Button: disabled={pending}, label "TRANSMITTING…" while pending
```

Also:

- Keep the hub's "We read every transmission." copy only once someone actually
  does.
- If players should see replies, the "1:1" promise needs an inbox (a list of past
  transmissions with their status) under this hub.
- The web's auth is a local shim with no server session, so the server cannot
  verify who sent a message. Treat `playerTag` as a hint, and use rate limits or a
  CAPTCHA for anonymous traffic.

---

## 10. Known gaps and gotchas (as of this snapshot)

- **It is a stub that says it isn't.** TRANSMIT only sets `sent = true`. Even so,
  the hub says "We read every transmission." and the send-off says "Signal locked.
  We'll take it from here."
- **The form stays live under the send-off.** `.sentScrim` has
  `pointer-events: none` and nothing sets `inert`, so during the 2.2 s TRANSMIT
  can be pressed again and the fields edited. Harmless today, but with a backend
  that is a double submit, so add the `pending` guard above.
- **The navigation timer can restart.** `onDone` is a new inline arrow on every
  render of the compose screen, and the timer effect depends on it. Typing behind
  the scrim re-renders the screen and restarts the 2.2 s timer. The CSS fade does
  not restart, so the scrim goes transparent and the jump back to the hub comes
  late. Wrap `onDone` in `useCallback` (or store it in a ref) when porting.
- **Drafts are not kept.** The back chevron, a breadcrumb or a reload discards the
  draft without warning, and there is no saved draft.
- **No context is captured.** There are no length limits, attachments,
  screenshots, contact email, app version or originating screen. The Bug channel
  asks for "match IDs" and the Mismatch channel for "the fixture, market, or stat",
  but neither has a structured field or a deep link from the match page that would
  pre-fill one.
- **Focus isn't managed.** A failed submit doesn't move focus to the first invalid
  field; the alert is announced, but focus stays on TRANSMIT. A successful send
  doesn't move focus to the status overlay.
- **No auth gate.** The routes are public while their only entry point (the
  profile) is login-only. That is fine for support, but a real endpoint must expect
  anonymous posts.
- **Placeholder social links.** FOLLOW US ON points at the `instagram.com`,
  `reddit.com` and `youtube.com` home pages, not StatOz accounts.
- **Stale bits:**
  - `support-channels.ts` says "The five channels"; there are four.
  - The breadcrumbs define a `feedback: "FEEDBACK"` label with no matching channel
    or route.
- **Channel numbers are array positions.** Inserting a channel anywhere but the end
  renumbers every card and subtitle after it.
