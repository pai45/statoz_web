# Flutter construct to web equivalent

Lookup table for the `converter` skill. Rows are ordered roughly by how often
each construct appears in the StatOz Flutter source, so the common conversions
come first within each group.

## Layout

| Flutter | Web |
| --- | --- |
| `Column`, `Row` | `flex` with `flex-col` / `flex-row` |
| `MainAxisAlignment`, `CrossAxisAlignment` | `justify-*`, `items-*` |
| `Expanded`, `Flexible` | `flex-1`, `grow`, `shrink` |
| `SizedBox` between children | the parent's `gap-*` |
| `SizedBox` as a fixed box | explicit `w-*` / `h-*` |
| `Spacer` | `flex-1` on the gap, or `ms-auto` on what follows |
| `Padding`, `EdgeInsets` | `p-*` from the spacing scale |
| `Stack` + `Positioned` | `relative` parent, `absolute` children |
| `Align`, `Center` | `place-items-*`, `mx-auto` |
| `SingleChildScrollView` | `overflow-y-auto` |
| `ListView`, `ListView.builder` | `map` over the data; virtualize only if the list is genuinely long |
| `GridView`, hand-rolled bento packers | CSS Grid, `grid-auto-flow: dense` |
| `IntrinsicHeight` | grid or flex stretch, which is the default |
| `AspectRatio` | `aspect-[w/h]` |
| `SafeArea` | `env(safe-area-inset-*)` |
| `MediaQuery.of(context).size` | CSS media queries or container queries, **not** JavaScript width state |
| `LayoutBuilder` | container queries |

Flutter's fixed widths — a bento capped at some pixel value, a card sized for a
phone — are phone assumptions, not design decisions. Reflow them.

## Color and paint

| Flutter | Web |
| --- | --- |
| `Color.withValues(alpha: x)` | `color-mix(in srgb, <token> N%, transparent)`, or `withAlpha()` from `tokens/elevation.ts` |
| `Color(0x…)` referenced directly | resolve to an existing semantic token first; see the skill's colors procedure |
| `BoxDecoration` | some combination of `background`, `border`, `box-shadow`, and `clip-path` |
| `BoxDecoration.gradient` | `linear-gradient()` from `tokens/gradients.ts` |
| `LinearGradient`, `RadialGradient` | `linear-gradient()`, `radial-gradient()` |
| `BoxShadow` | `box-shadow`; accent glows come from `glow()` in `tokens/elevation.ts` |
| `Opacity` | `opacity-*` |
| `BackdropFilter` | `backdrop-filter` |
| `ShaderMask` | `background-clip: text`, or a mask image |

`withValues(alpha:)` is by far the most frequent conversion in this codebase.
It never justifies a new hex value — it is an existing token at a percentage.

## Shape

StatOz cuts corners instead of rounding them, so most shape work is clip paths
rather than radii.

| Flutter | Web |
| --- | --- |
| `BorderRadius.circular` | `--ds-radius-*`, reserved for pills and meters |
| `ClipPath` + `CustomClipper` | `clip-path: polygon(...)` from a `--ds-clip-*` token |
| `ClipOval` | `rounded-full` |
| `ClipRRect` | `overflow-hidden` plus a radius |

A new chamfer is added in two places at once: the measurement and its exported
path string in `tokens/shape.ts`, and the matching `--ds-clip-*` polygon in
`styles/tokens.css`. The comment in `tokens.css` says the two are kept in sync;
keep that true.

`CustomPainter` splits three ways depending on what it actually draws:

- pure geometry — a chamfer, a hairline, a glow — becomes `clip-path`,
  a border, or a `box-shadow`;
- a real illustration becomes inline SVG under `src/design-system/icons/`;
- genuinely dynamic per-frame drawing becomes `<canvas>` inside a client
  component, and only then.

## Typography

| Flutter | Web |
| --- | --- |
| `Cyber.display(size)` | `font-display` plus a size token plus a tracking token |
| `Cyber.body(size)` | `font-sans` plus a size token |
| `fontFamily: 'Orbitron'` / `'Onest'` | `font-display` / `font-sans`; both are loaded through `next/font/google` in `src/app/layout.tsx` |
| `fontSize: n` | the nearest step in `tokens/typography.ts` — add a step rather than an arbitrary value |
| `FontWeight.w900` | `font-black` |
| `letterSpacing: n` | a `tracking-*` token |
| `height: n` | a `leading-*` token — check it is mapped, see pitfalls |
| tabular figures | the `.ds-tabular` class in `globals.css` |
| `TextOverflow.ellipsis` | `truncate` |
| `maxLines: n` | `line-clamp-n` |

## Icons

Roughly a thousand `Icons.*` call sites exist in the Flutter source. They are
Material icons, so the web port uses real Material Symbols path data — never a
hand-drawn approximation, and never an icon package.

| Flutter | Web |
| --- | --- |
| `Icons.foo_rounded` | the **rounded** Material Symbols cut |
| `Icons.foo_outlined` | the **outlined** cut |
| `Icons.foo` | the filled cut, unless the app clearly shows an outline |
| any of the above | one inlined `<path>` in `design-system/icons/glyphs.tsx` |
| multi-color art from `assets/icons/` | copy to `public/assets/icons/`, register in `brandAssets` in `icons/brand.tsx`, render through `<BrandIcon>` |

Glyphs render through the shared `Icon` base in `icons/icon.tsx`: fill-based,
`currentColor`, viewBox `0 -960 960 960`, hidden from assistive technology
unless given a `title`. A stroke-drawn glyph overrides `fill` and `stroke`
itself.

Two-tone and multi-color brand art cannot be tinted by `currentColor`, which is
why it stays an `<Image>` rather than being inlined. Monochrome brand art can be
inlined and tinted like any glyph.

## Interaction

| Flutter | Web |
| --- | --- |
| `GestureDetector`, `InkWell`, `TextButton` | a real `<button>` or `<Link>` — keyboard reachable, not a `div` with a handler |
| `onTap` navigating somewhere | `<Link href>` |
| `MouseRegion` | `hover:` |
| `Focus`, `FocusNode` | native focus order plus `:focus-visible` |
| `Tooltip` | an `overlays/` tooltip, or `title` for plain text |
| `HapticFeedback.*`, `SystemSound.*`, audio players | dropped — no web equivalent |

Hover and focus-visible states are additions the port must make. The Flutter
source will not contain them, and their absence is not fidelity.

Keep interactive targets at 44 pixels or larger. When a whole card is clickable,
prefer a stretched overlay link over wrapping the content, so the content stays
flow-level and the markup stays valid — see `signal-panel.tsx`.

## State and animation

| Flutter | Web |
| --- | --- |
| `StatelessWidget` | a Server Component |
| `StatefulWidget` | a Server Component holding the data, with `"use client"` around only the interactive slice |
| `setState` | `useState` inside that client boundary |
| `AnimationController`, `Tween` | a CSS transition or `@keyframes` |
| `AnimatedContainer`, `AnimatedOpacity` | `transition-*` |
| `TweenAnimationBuilder` | `@keyframes` |
| `Hero` | no equivalent; use a shared layout so the element is not remounted |
| `ScrollController` offsets | `position: sticky`, or scroll-driven animations |

Do not reproduce controller lifecycles. Two hundred `AnimationController`
instances in the Flutter source correspond to perhaps a dozen CSS transitions on
the web.

All motion sits under the `prefers-reduced-motion` damper already present in
`src/app/globals.css`. Anything that pulses or glides needs no extra guard, but
verify it actually stills.

## Navigation

| Flutter | Web |
| --- | --- |
| `Navigator.push`, named routes | `<Link href>`, or `router.push` when it must be imperative |
| `BottomNavigationBar` | the existing `nav-rail` component with its `orientation` prop |
| `TabBar`, `TabBarView` | `gliding-tabs` or `underline-tabs`, with `role="tablist"` |
| `showDialog` | a component under `design-system/components/overlays/`, built on `<dialog>` |
| `showModalBottomSheet` | a drawer under `overlays/` |
| `Scaffold` | a route-group `layout.tsx` |
| `AppBar` | a shell component such as `platform-top-bar` |

Routes become public only when they receive a `page.tsx`. Linking to a path that
has none is fine; creating the page to satisfy a link is not.

## Data and formatting

| Flutter | Web |
| --- | --- |
| bloc or cubit | props from a Server Component, or feature-local `state/` |
| `FutureBuilder` | an async Server Component plus `loading.tsx` or Suspense |
| `StreamBuilder` | a client subscription inside the owning feature |
| repository or service class | `src/server`, or a feature `data/` adapter |
| model class | `src/domain` when shared, the feature's `types.ts` when not |
| `intl` `DateFormat` | `Intl.DateTimeFormat` with an explicitly pinned `timeZone` |
| `NumberFormat` | `Intl.NumberFormat`, or the helpers in `src/shared/utils/format.ts` |

Date and number formatting runs on both the server and the client. Without a
pinned `timeZone` the two disagree and React reports a hydration mismatch.
`src/shared/utils/format.ts` already pins it; reuse those helpers.

## Accessibility the port has to add

The Flutter source will not carry these. Write them during the conversion, not
afterwards.

- Tab strips get `role="tablist"`, roving `tabindex`, and arrow-key movement.
- Navigation items get `aria-current`.
- Icon-only controls get an `aria-label`.
- Decorative art gets `alt=""` and is hidden from assistive technology.
- Interactive targets stay at 44 pixels or larger.
- Focus is visible; the ring is defined once in `globals.css`.

## Pitfalls

Each of these has already cost time on a previous port.

- **`AppTheme` names are not semantics.** They record where a color was first
  used. Resolve to hex and match against the token layer instead.
- **Several Flutter constants share one hex.** The `Cyber` facade aliases
  freely. Collapse them onto the single token that exists rather than adding
  near-duplicates.
- **Team and brand colors are data.** They belong in a feature's `data/`
  directory, not in the palette.
- **Fonts fail silently.** A font family named in tokens but never loaded falls
  back without an error, so `font-display` renders identically to `font-sans`.
  Verify the family actually renders.
- **An unmapped token fails just as silently.** A `--ds-*` variable defined in
  `tokens.css` but absent from the `@theme inline` block generates no Tailwind
  utility, and nothing complains. The `--ds-leading-*` family is currently in
  this state: `leading-compact` and `leading-body` appear across the components
  and produce nothing, while `leading-tight` happens to work only because
  Tailwind ships a default of that name at a different value. Check the mapping
  before trusting a token-named utility.
- **Two files resolving to the same route** is a build-time conflict, not a
  warning. Delete the loser.
- **`const module = …`** trips the `@next/next/no-assign-module-variable` lint
  rule. Rename the variable.
- **`//` inside JSX text** is parsed as a comment. Wrap it as `{" // "}`.
- **Stale `.next` types** can fail a type-check after a route file is deleted.
  Remove the directory and rebuild.
