---
name: converter
description: Convert a Flutter screen or widget from the StatOz app into Next.js UI, reusing existing design tokens and adding new ones only when the design introduces a value the token layer does not already express. Use when porting, replicating, or migrating a Flutter screen, widget, theme value, or asset to the web app.
---

# Flutter to Next.js converter

Port StatOz screens from the Flutter app into `statoz_web` so the result reads
as the same product, built the way the web builds things. Treat both
repositories as the living source of truth; this skill describes the procedure,
not the values.

Companion file: `flutter-to-web.md` in this directory holds the construct-by-
construct mapping table. Read it when translating a specific widget.

## Read both sides first

Flutter side — the screen file, every widget it composes, `lib/config/theme.dart`
(`AppTheme` and its `Cyber` facade), and any registry the screen reads such as
`lib/config/sport_modules.dart`.

Web side — `ARCHITECTURE.md`, `src/design-system/README.md`,
`src/design-system/components/README.md`, everything in
`src/design-system/tokens/`, `src/design-system/styles/tokens.css`, and the
`@theme inline` block in `src/app/globals.css`.

Do not start writing until you know what the token layer already provides. Most
of a port is lookup, not authorship.

## Port the result, not the widget tree

Flutter composes by nesting; the web has the cascade, grid, and pseudo-elements.
Reproduce the visual outcome and the interaction, then let the web reach it its
own way. A `Stack` of six `Positioned` children is often three CSS layers, and a
hand-rolled layout packer is usually one grid declaration.

`src/design-system/components/data-display/signal-panel/signal-panel.tsx` is the
worked example: Flutter's `_TrendSignalShell` became three stacked layers
sharing one clip-path token, with a stretched overlay for the hit area. Read it
before porting anything structural.

Some divergences are deliberate and should be made, not avoided:

- Flutter's fixed pixel widths are phone assumptions. Reflow instead of capping.
- Hover, `:focus-visible`, and keyboard traversal have no Flutter equivalent.
  The port is where they get written.
- Haptics, system sounds, and audio calls are dropped.

State each divergence when reporting the work, so the difference is a decision
rather than a discrepancy.

## Colors: match before you add

1. Resolve the Flutter reference down to a literal hex. `Cyber.x` is a facade
   over `AppTheme.y`, which is a raw `Color(0x…)`.
2. Search that hex in `src/design-system/tokens/colors.ts` and
   `src/design-system/styles/tokens.css`. If it is there, use the semantic name
   that already exists. Never introduce a second name for a color the palette
   already holds.
3. Only when the hex is genuinely absent, decide what kind of value it is:
   - a reusable visual decision — add one semantic token, to `colors.ts` **and**
     `tokens.css`, plus a `@theme inline` entry in `globals.css` when components
     need a Tailwind utility for it;
   - data, such as a team's brand color or a sponsor color — put it in the
     owning feature's `data/` directory. It is not part of the palette.
4. `Color.withValues(alpha:)` becomes `color-mix(in srgb, <token> N%,
   transparent)`, or `withAlpha()` from `tokens/elevation.ts`. An opacity is
   never a reason to add a hex.
5. Never restyle an existing token so one screen matches. Fix the screen.

`AppTheme` names describe where a color was first used, not what it means.
Do not mirror them into the web layer, and expect several of them to resolve to
the same hex — collapse those onto the single token that already exists.

## Every other element follows the same rule

| Flutter construct | Look here first | Add only when missing |
| --- | --- | --- |
| `TextStyle`, `Cyber.display()`, `Cyber.body()` | `tokens/typography.ts` | a size, tracking, or leading step |
| padding, `SizedBox`, gaps | `tokens/spacing.ts` | a spacing step |
| `BorderRadius`, `ClipPath`, `CustomClipper` | `tokens/shape.ts` | a chamfer plus its `--ds-clip-*` in `tokens.css` |
| `BoxShadow`, `Cyber.glow()` | `tokens/elevation.ts` | an elevation token |
| `LinearGradient` | `tokens/gradients.ts` | a gradient token |
| `Icons.*` | `design-system/icons/glyphs.tsx` | one inlined Material Symbols path |
| multi-color `assets/icons/*` | `design-system/icons/brand.tsx` | the asset in `public/assets/icons` and an entry in `brandAssets` |
| a reusable widget | `design-system/components/<category>/` | a kebab-case directory with a focused `index.ts` |
| a feature-aware widget | `features/<feature>/components/` | — |
| a model | `src/domain/` or the feature's `types.ts` | — |

## Keep TypeScript and CSS in lockstep

Every token exists twice: as a value in `src/design-system/tokens/*.ts` and as a
`--ds-*` custom property in `src/design-system/styles/tokens.css`. A token
present in only one of them is a bug — components read the CSS variable while
type-safety comes from the TypeScript export.

Export new token modules through `tokens/index.ts` and the design-system public
API.

A Tailwind utility is a third place, and it is the one that fails quietly. A
`--ds-*` variable that has no matching entry in the `@theme inline` block of
`globals.css` generates no class — a component written against it compiles,
lints, builds, and renders with the property simply absent. Before using a
utility named after a token, confirm the mapping exists; otherwise reference
`var(--ds-*)` directly, which always works.

## Place code by responsibility

| Code | Location |
| --- | --- |
| Reusable visual primitive | `src/design-system/components/<category>/<component>` |
| Color, spacing, type, shape, or elevation decision | `src/design-system/tokens` and `styles/tokens.css` |
| Feature-aware UI composition | `src/features/<feature>/components` |
| Route, layout, loading, or error boundary | `src/app` |
| Shared non-visual hook, provider, or utility | `src/shared` |
| Shared business type or rule | `src/domain` |
| Server integration or persistence | `src/server` |

`ARCHITECTURE.md` carries the Flutter migration map for whole directories, and
the dependency direction that governs imports: `design-system`, `domain`, and
`shared` must never import from `app` or `features`.

A component that knows about matches, picks, games, or profiles belongs to that
feature even when several screens use it. Do not create
`src/shared/components`.

## Validate the port

- Search the new files for raw hex values and one-off font stacks. A hit outside
  the token layer is a token you failed to reuse or failed to add.
- Confirm imports respect the dependency direction, and that no equivalent
  component already existed.
- Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Compare against the Flutter screen at 390, 768, and 1440 pixels wide. The
  phone width should read as the app; the wider ones should read as a
  deliberate web layout, not a stretched phone.
- Add focused tests when the repository has a suitable test setup. It currently
  has none — no test runner is installed and there is no `test` script — so do
  not invent one as part of a port.

## Do not

Add a component or icon library. Mirror `AppTheme` names into the web layer.
Restyle existing tokens or unrelated screens to make one port fit. Activate
placeholder routes. Reproduce `AnimationController` machinery one-for-one when
a CSS transition expresses the same motion.
