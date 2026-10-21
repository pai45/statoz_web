# Shop — implementation guide

The in-app market. One screen sells seven kinds of item across all five sports:
profile **avatars**, team **frames**, profile **banners**, game **kits** (cricket kits,
basketball jerseys, F1 liveries), **coin bundles**, card **packs**, and individual
**player cards**. Everything is paid in **Oz Coins** (the game currency), or through
a simulated **₹ INR** purchase that grants the item without taking payment. A
separate search screen indexes the whole catalogue.

There is no server. The catalogue is static TypeScript data, ownership and the
wallet live in the browser (`localStorage`), and "INR" checkouts are demo
confirmations. The doc ends with what to change for real payments.

This guide describes the implementation in `statoz_web_pai` so it can be ported to
another Next.js (App Router) project. Sources:

- `src/features/shop/` (≈3.1k lines): screens, tiles, overlays, CSS modules.
- `src/mocks/shop/` (≈640 lines): the catalogue (`catalog.ts`) and the 45 generated
  team frames (`frames.generated.ts`).
- `src/features/economy/` (≈660 lines): wallet, ownership, equip, purchases. Shared
  with every game.
- `src/features/packs/` (pack rolling, card catalogue, prices, reveal), documented in
  [`starter_pack.md`](./starter_pack.md).
- `public/assets/shop/` (coin art 1.1 MB, pack art 4.1 MB, banners 10 MB, portraits
  **343 MB**).

> The design tokens, `@/domain/cards`, `@/domain/sports`, and the economy store
> pattern are documented in [`shared_game_platform.md`](./shared_game_platform.md).

---

## At a glance

| | |
|---|---|
| Routes | `/shop` (`src/app/(platform)/shop/page.tsx`), `/shop/search` (`…/shop/search/page.tsx`) |
| Layout | `(platform)` route group: top bar, side rail or bottom nav (the shop is not fullscreen) |
| Entry components | `ShopScreen`, `ShopSearchScreen` from `@/features/shop` (which also exports `AvatarFrameRing`, `BannerArt`, and re-exports the whole catalogue) |
| Deep links | `/shop?tab=<avatars\|frames\|banners\|kits\|coins\|packs\|cards>&sport=<football\|cricket\|basketball\|tennis\|motorsport>` |
| Inbound links | Top bar "+" coin button → `/shop?tab=coins`; Grand Prix lobby → `/shop` ("LIVERY SHOP") |
| State | Local React state for UI. Everything owned goes through `@/features/economy` → `localStorage["statoz.economy.v1"]` |
| Currencies | Oz Coins (real, local); ₹ INR (**simulated**: confirm dialog, then the item is granted at 0 coins) |
| npm deps | none beyond `next` and `react` (`next/image`, `next/link`, `next/navigation`) |

---

## 1. Screen anatomy (`components/shop-screen.tsx`)

```
┌ SEARCH SHOP ──────────────────────────────────────────── (link to /shop/search)
├ [FOOTBALL] [CRICKET] [BASKETBALL] [TENNIS] [MOTORSPORT]   sticky, sport accent
├ [AVATAR] [FRAME] [BANNER] [KITS] [COINS] [PACKS] [CARDS]  sticky, top: 3.125rem
├ notice line (aria-live="polite"): "X added to your inventory." / "Not enough Oz Coins …"
├ <tab content>  max-w 1500px, filter chips + grid/strips of tiles
└ overlays: ConfirmDialog · ShopAcquireOverlay · CoinTopUpCelebration · PackRevealSequence
```

- **Sport** state comes from `?sport=` on first render (default `football`) and
  is not written back to the URL.
- **Category** comes from `?tab=` (matches an id, or a lower-cased label, default
  `avatars`). Changing it calls `history.replaceState` to update `?tab=` without a
  navigation. Changing either tab resets the filter chips to `ALL`.
- The whole shell sets `--shop-accent` to the active sport's accent
  (`accentVar(sportModuleFor(sport).accent)`). Filter chips, tabs and the category
  bar all read it.
- `ShopScreen` reads `useSearchParams()`, so the page wraps it in `<Suspense>` (that
  is what the Next.js build requires for a static route):

```tsx
// src/app/(platform)/shop/page.tsx
import { Suspense } from "react";
import { ShopScreen } from "@/features/shop";

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="grid min-h-96 place-items-center font-display text-sm font-black text-muted">LOADING MARKET…</div>}>
      <ShopScreen />
    </Suspense>
  );
}
```

---

## 2. The catalogue, category by category

| Tab | Source | Count | Price | Owned in (`economy.owned`) | Equipped where |
|---|---|---|---|---|---|
| Avatar | Player cards of the sport **that have a portrait** (`portraitAssets[card.id]`) | football 177 · cricket 118 · basketball 71 · tennis 47 · motorsport 22 | 25 coins | `avatarIds` (the card id) | Profile → avatar editor |
| Frame | `shopFrames` (generated) | 45: football 26, basketball 6, motorsport 6, cricket 4, tennis 3 | 150 coins | `frameIds` | **Shop** (EQUIP), shown as the ring around the profile avatar |
| Banner | `shopBanners` | 19 | 25 coins | `bannerIds` | Profile → banner editor |
| Kits | `colorProducts` (kits + jerseys + liveries) | cricket 8 · basketball 13 · motorsport 7 (football and tennis: empty state) | 100 coins (one free default each) | `kitIds` / `jerseyIds` / `liveryIds` | **Shop** (EQUIP), worn in Final Over / Hoop Duel / Grand Prix |
| Coins | `coinBundles` | 6 | ₹10 – ₹1000 (simulated) | adds to `coins` | — |
| Packs | `standardPacks` (racing: `racingPacks`) | 4 (motorsport: 3) | coins **or** ₹ | `playerCardIds` / `actionCardIds` | — (cards appear in decks) |
| Cards | `allPlayerCards` of the sport | football/cricket/basketball 180, tennis 100, motorsport 105 | formula below, coins **or** ₹ | `playerCardIds` | Deck editor |

### 2.1 Free defaults (the economy grants these to every new wallet)

```ts
avatarIds: ["adams", "bellingham", "raphinha", "camavinga", "ndiaye", "rodri"]   // onboarding avatars, not card ids
bannerIds: ["south_africa", "green_red", "korea", "czech"]
kitIds: ["voltage"]  jerseyIds: ["statoz"]  liveryIds: ["gridLine"]
equipped: { avatarId: "adams", bannerId: "south_africa", frameId: null, kitId: "voltage", jerseyId: "statoz", liveryId: "gridLine" }
coins: 1000
```

`coerceEconomy` re-merges these on every read, so they can never be lost.

### 2.2 Avatars

- Source: `allPlayerCards.filter(c => playerRoleSports[c.role] === sport && portraitAssets[c.id])`.
- Filter chips: `ALL` plus every country code present, sorted alphabetically.
- Tile: square portrait, short name, footer `25` coins or `OWNED`.
- Buying stores the **card id** in `avatarIds`. The profile's avatar editor lists
  purchased card portraits alongside the six onboarding avatars. Saving calls
  `saveAvatar(id)` (profile identity) **and** `equipCosmetic("avatar", id)`.

### 2.3 Frames (`mocks/shop/frames.generated.ts`)

Generated from the Flutter app's `followable_leagues.dart` by
`scripts/sync-shop-assets.mjs`. One frame per followable team:

```ts
{ id: "frame_liv", teamId: "liv", label: "Liverpool", shortLabel: "LFC",
  leagueId: "epl", sport: "football", color: "#c8102e", price: 150 }
```

Leagues: EPL 8, La Liga 6, Serie A 6, Bundesliga 6, NBA 6, Formula 1 6, cricket
league `23810` 4, ATP 3.

The tile shows an `AvatarFrameRing` in the team colour around a placeholder face.
The footer cycles **buy → EQUIP → EQUIPPED**. The equipped frame's colour is what
`profile-hero.tsx` and `player-standing.ts` draw around the player's avatar.

```tsx
// components/avatar-frame-ring.tsx: one team colour drives the band and the bevel
<AvatarFrameRing color={frame.color} glow={equipped} octagon?>
  {avatarImage}
</AvatarFrameRing>
// CSS: 4px band (colour mixed 45% toward white → 35% toward black) + 2px raised inner edge (25% toward white).
// Glow is opt-in: only the equipped instance, never a resting catalogue tile.
```

### 2.4 Banners (`shopBanners`)

```ts
type ShopBanner = { id; label; sport: Sport; price: number; colors: readonly [string, string]; accent: string; assetSrc?: string };
```

| Sport | Banners |
|---|---|
| football | NEBULA, STADIUM NIGHT (painted) |
| cricket | SOUTH AFRICA, GREEN RED (art: `profile_banner_*.png`, free defaults) |
| basketball | HARDWOOD (painted) |
| tennis | KOREA, CZECH (art, free defaults) |
| motorsport | SUNBURST (painted) + 11 F1 teams (Mercedes, Ferrari, McLaren, Red Bull Racing, Alpine, Racing Bulls, Haas, Williams, Audi, Aston Martin, Cadillac) with `shop_banner_<id>.webp` art |

`BannerArt` (`components/banner-art.tsx`) draws a banner anywhere (the shop strip,
the acquisition overlay, the profile hero):

- With `assetSrc`: a `next/image` fill, `object-cover`.
- Without: a two-colour linear wash, then a dust layer, accent slashes, a radial
  burst, and a round crest holding the sport's `SportIcon`.

There is no equip button in the shop. Banners are chosen in the profile's banner
editor (`saveBanner` + `equipCosmetic("banner", id)`).

### 2.5 Kits, jerseys, liveries (`colorProducts`)

```ts
type ColorProduct = { id; label; kind: "kit" | "jersey" | "livery"; sport: Sport; price: number; primary; secondary; accent };
```

| kind | Sport | Caption | Items (free default first) | Used by |
|---|---|---|---|---|
| `kit` | cricket | FINAL OVER KIT | VOLTAGE, EMBER, MERIDIAN, SOVEREIGN, MONSOON, SAFFRON, OBSIDIAN, CORAL | Final Over (`economy.equipped.kitId`) |
| `jersey` | basketball | HOOP DUEL JERSEY | STATOZ, LOS ANGELES, CHICAGO, BOSTON, GOLDEN STATE, MIAMI, NEW YORK, BROOKLYN, SAN ANTONIO, PHOENIX, MILWAUKEE, DALLAS, DENVER | Hoop Duel (`equipped.jerseyId`) |
| `livery` | motorsport | GRAND PRIX LIVERY | GRID LINE, SCARLET, SILVER ARROW, PAPAYA, MIDNIGHT, RACING GREEN, SKY BLUE | Grand Prix Dash (`equipped.liveryId`) |

The ids **must** match each game's own kit, jersey or livery tables
(`final-over/data/kits.ts`, `basketball/data/liveries.ts`, `grand-prix` livery ids).
The game reads the equipped id and falls back to its default if the id is not owned.

`KitPreview` draws the garment in CSS from the three colours: a shirt (body =
primary, contrast panel = secondary, trim = accent), or a top-down car for a
livery. The footer cycles **FREE/price → EQUIP → EQUIPPED**.

### 2.6 Coin bundles (`coinBundles`)

| id | Label | ₹ | Coins | Bonus | Tag | Accent | Art |
|---|---|---:|---:|---:|---|---|---|
| rookie | Rookie | 10 | 1,000 | — | | #cd7f32 | `/assets/shop/coins/rookie.png` |
| starter | Starter | 50 | 5,500 | +10% | | #c0c0c0 | `starter.png` |
| pro | Pro | 100 | 12,000 | +20% | POPULAR | #5cdfff | `pro.png` |
| elite | Elite | 250 | 32,500 | +30% | | #a855f7 | `elite.png` |
| champion | Champion | 500 | 70,000 | +40% | BEST VALUE | #ffd700 | `champion.png` |
| legendary | Legendary | 1000 | 150,000 | +50% | MAX PACK | #ff3df7 | `legendary.png` |

Buying opens the confirm dialog (`₹N SIMULATION`). On confirm it calls
`addCoinTopUp`, shows the `+N COINS` celebration, and sets a notice.

### 2.7 Packs (`standardPacks`, `racingPacks`)

```ts
type ShopPack = {
  id; label; coinPrice: number; inr: number; playerCount: number; actionCount: number;
  guarantee: string; accent: string; gradient?: boolean;   // gradient = rarest in its row (foil magenta, star, glow)
  odds: Record<CardTier, number>;
};
```

| Row | Pack | Coins | ₹ | Cards | Odds B / S / G / P | Art file |
|---|---|---:|---:|---|---|---|
| standard | Starter Pack | free | — | 5 players + 6 actions | (the sport's starter roll) | `starter.png` |
| standard | Bronze Pack | 150 | 50 | 1 + 2 | 65 / 28 / 6 / 1 | `bronze.png` |
| standard | Gold Pack | 400 | 400 | 2 + 2 | 35 / 45 / 16 / 4 | `gold.png` |
| standard | Elite Pack ★ | 900 | 1000 | 2 + 3 | 10 / 40 / 35 / 15 | `elite.png` |
| motorsport | Grid Pack | 150 | 50 | 1 driver | 65 / 28 / 6 / 1 | `bronze.png` (via `packArtIds`) |
| motorsport | Podium Pack | 400 | 400 | 2 drivers | 35 / 45 / 16 / 4 | `gold.png` |
| motorsport | Pole Pack ★ | 900 | 1000 | 3 drivers | 10 / 40 / 35 / 15 | `platinum.png` |

Football, cricket, basketball and tennis all show the standard row. A pack's
player cards come from **the selected sport**. Action cards come from the shared
64-card action pool (they are football-only in play, but the cricket, basketball
and tennis packs still contain them).

**Holo foil** (`packHolo`, `eliteHolo`): each pack has `{ colors, intensity, bands, speed }`.
`PackArt` lays `bands` copies of a diagonal gradient band over the art with
`mix-blend-mode: plus-lighter`, animated `translateX(-120% → 320%) skewX(-18deg)`
over `2200 / speed` ms and staggered by band. Rarer packs get more colours, more
bands, more brightness, and more speed. Packs without an entry use `eliteHolo` (the
full rainbow).

### 2.8 Player cards

```ts
// features/packs/data/catalog.ts
const tierMultiplier = { bronze: 1, silver: 3, gold: 8, platinum: 20 };
export function playerCardCoinPrice(card) { return Math.max(100, (card.rating - 65) * 100 * tierMultiplier[card.tier]); }
export function playerCardInrPrice(card)  { return Math.max(10, Math.ceil(playerCardCoinPrice(card) / 100)); }
// e.g. an 85-rated silver = 6,000 coins / ₹60; a 92-rated platinum = 54,000 coins / ₹540
```

Filter chips per sport:

| Sport | Chips |
|---|---|
| football | ALL, ATTACKERS, DEFENDERS, KEEPERS, BRONZE, SILVER, GOLD, PLATINUM |
| cricket | ALL, BATTERS, BOWLERS, + tiers |
| basketball | ALL, GUARDS, WINGS, BIGS, + tiers |
| tennis | ALL, ATP, WTA, + tiers (ATP/WTA currently match **every** card; see the gaps section) |
| motorsport | ALL, F1, F2, NASCAR, INDYCAR, + tiers |

The grid shows the **first 48** matches (motorsport shows all). Each tile is the
design-system `PlayerCard` (size `sm`) with an OWNED stamp once bought, and two
footer rails: coins, then ₹. The tile accent follows the tier:
bronze = inactive border, silver = cyan, gold = violet, platinum = gold.

---

## 3. Purchase flows

### 3.1 Cosmetics and single cards: `buyItem(request)`

```ts
type BuyRequest = { kind: EconomyItemKind; id: string; price: number; label: string;
                    accent: string; preview: ReactNode; simulatedInr?: boolean };

function buyItem(request: BuyRequest) {
  const run = () => resultNotice(purchaseItem({ kind, id, price, title: label, simulatedInr }), request);
  if (request.simulatedInr) {
    setConfirm({ title: label, price: `₹${formatInt(price)} SIMULATION`,
                 detail: "No real payment will be taken. This browser will receive the item.", action: run });
  } else {
    run();                                  // coin purchases are one tap, with no confirmation
  }
}

function resultNotice(result, request) {
  if (result.ok) {
    setAcquired({ key: `${kind}-${id}-${Date.now()}`, name: label, accent, coinsSpent: simulatedInr ? 0 : price, preview });
    setNotice(`${label} added to your inventory.`);
  } else {
    setNotice(result.reason === "owned" ? `${label} is already owned.` : "Not enough Oz Coins — top up in the Coins tab.");
  }
}
```

Every category passes a **preview** node that the acquisition overlay slams in:
the avatar portrait in a `ShopCardFrame`, the frame ring, the banner strip, the
kit garment, or the selected `PlayerCard`.

### 3.2 Coins: `buyCoins(bundle)`

Opens the confirm dialog. On confirm it calls
`addCoinTopUp({ id: bundle.id, coins, title })`, then `CoinTopUpCelebration` (a
1.5 s `+N COINS` toast), then sets a notice.

### 3.3 Packs: `openPack(pack, simulatedInr)`

```ts
const execute = () => {
  if (pack.id === "starter") {                                      // free, once per sport
    if (economy.starterClaims[sport]) return setNotice("This sport's Starter Pack is already claimed.");
    const starter = rollStarterPackFor(sport);                      // same roll as the game gate
    claimPack(sport, starter);                                      // grants cards + seeds the deck
    return setReveal(toReveal(starter.playerCards, starter.actionCards));
  }
  const players = allPlayerCards.filter((c) => cardSport(c) === sport);
  const pickedPlayers = Array.from({ length: pack.playerCount }, () => rollFrom(players, packRarityOfPlayer, pack.odds, Math.random)).filter(Boolean);
  const pickedActions = Array.from({ length: pack.actionCount }, () => rollFrom(allActionCards, packRarityOfAction, pack.odds, Math.random)).filter(Boolean);
  const result = purchasePack({ id: pack.id, price: simulatedInr ? pack.inr : pack.coinPrice, title: pack.label,
                                playerCardIds: pickedPlayers.map((c) => c.id), actionCardIds: pickedActions.map((c) => c.id), simulatedInr });
  if (!result.ok) return setNotice("Not enough Oz Coins — top up in the Coins tab.");
  setReveal(toReveal(pickedPlayers, pickedActions));
};
simulatedInr ? setConfirm({ …, action: execute }) : execute();
```

- `rollFrom` (`features/packs/rolling.ts`): roll a tier by the pack's odds, take a
  random card of that tier, and fall back through platinum → gold → silver →
  bronze if the tier is empty. **The tier is derived from the numbers**
  (`packRarityOfPlayer`: rating ≥ 90 platinum, ≥ 86 gold, ≥ 80 silver;
  `packRarityOfAction`: power ≥ 22 / 16 / 10), not from the printed `card.tier`.
- The cards are rolled **before** payment and committed atomically with it in
  `purchasePack`.
- `toReveal` sorts the pulls ascending by tier, then by rating or power, so the
  best card flips **last**.
- The reveal is `PackRevealSequence` (one `CardUnpack` per card, then a "N CARDS
  ADDED" summary with **BACK TO SHOP**). It is fullscreen at `z-[70]`. On complete
  it sets the notice "Pack contents added to your collection."

### 3.4 Equip: `equipCosmetic(kind, id)`

The shop exposes equip for `frame`, `kit`, `jersey` and `livery`. The economy
ignores the call unless the id is owned. Avatars and banners are equipped from the
profile screen.

### 3.5 Confirm dialog

A custom modal: a backdrop (mousedown on the backdrop closes it),
`role="dialog" aria-modal`, the title "// CONFIRM ACQUISITION", the item, the
price, and the detail copy. **CANCEL** has `autoFocus`, and **CONFIRM** closes the
dialog and then runs the action.

---

## 4. Economy contract (what the shop calls)

All in `src/features/economy/state/economy-store.ts`. The store pattern (versioned
key, cached parse, `useSyncExternalStore`, cross-tab `storage` events, an
in-memory fallback when storage throws) is described in the shared doc.

```ts
export type EconomyItemKind = "playerCard" | "actionCard" | "avatar" | "banner" | "frame" | "kit" | "jersey" | "livery";
export type PurchaseResult =
  | { ok: true; snapshot: EconomySnapshot }
  | { ok: false; reason: "owned" | "insufficient"; snapshot: EconomySnapshot };

const ownedKey = { playerCard: "playerCardIds", actionCard: "actionCardIds", avatar: "avatarIds", banner: "bannerIds",
                   frame: "frameIds", kit: "kitIds", jersey: "jerseyIds", livery: "liveryIds" };

/** One-off items: refuses if already owned; charges coins unless simulatedInr. */
export function purchaseItem({ kind, id, price, title, simulatedInr }): PurchaseResult {
  const current = readEconomy(); const key = ownedKey[kind];
  if (current.owned[key].includes(id)) return { ok: false, reason: "owned", snapshot: current };
  const cost = Math.max(0, Math.floor(price));
  if (!simulatedInr && current.coins < cost) return { ok: false, reason: "insufficient", snapshot: current };
  const delta = simulatedInr ? 0 : -cost;
  return { ok: true, snapshot: write({ ...current, coins: current.coins + delta,
    owned: { ...current.owned, [key]: [...current.owned[key], id] },
    transactions: transaction(current, { id: `purchase-${kind}-${id}-${Date.now()}`, kind: "purchase", delta,
      title: simulatedInr ? "DEMO PURCHASE" : "SHOP PURCHASE", subtitle: title }) }) };
}

/** Repeatable packs: pays and grants in one write; duplicate ids merge (mergeUnique). */
export function purchasePack({ id, price, title, playerCardIds, actionCardIds, simulatedInr }): PurchaseResult;

/** Simulated INR coin bundle: always succeeds. */
export function addCoinTopUp({ id, coins, title }): EconomySnapshot;   // transaction kind "topUp", "DEMO COIN TOP-UP"

/** Only owned items; a frame may be set to null (unequip). */
export function equipCosmetic(kind: "avatar" | "banner" | "frame" | "kit" | "jersey" | "livery", id: string | null): EconomySnapshot;

export function owns(kind: EconomyItemKind, id: string): boolean;
export function useEconomy(): EconomySnapshot;                         // never null; server snapshot = fresh wallet
```

Every write appends to `transactions` (newest first, capped at 250), and each entry
records `balanceAfter`. The profile and wallet screens read this as the purchase
history. Kinds: `openingBalance`, `reward`, `purchase`, `topUp`, `grant`.

---

## 5. UI system

### 5.1 `ShopCardFrame` and primitives (`components/shop-card.tsx` + `shop-card.module.css`)

Every tile in every category is built on one silhouette, so seven categories read as
one family:

- **Plate:** square top, both bottom corners cut by 12 px (`clip-path`). The accent
  edge is a painted layer with the fill inset inside it, because a clip path would
  crop a border.
- **Wash:** the accent fading to the page black. Strength is set by `tint` (default
  0.12; packs use 0.04 so their accent-coloured copy stays readable).
- **Weights:** `rest` (1 px edge), `elevated` (a hard offset "lift" shadow; used by
  coin tiles), `focal` (a heavier edge and the **only** glow on the surface; used for
  an equipped frame or the elite pack).
- **Entrance:** `shop-card-enter` (420 ms, translateY 14 → 0), staggered by
  `--item-index × 22 ms`. Disabled under `prefers-reduced-motion`.
- CSS variables: `--shop-accent`, `--shop-tint`, `--item-index`.

| Primitive | Role |
|---|---|
| `ShopCardFrame({ accent, focal?, elevated?, tint?, stamp?, index?, className? })` | The surface |
| `ShopHeaderStrip({ rarity?, rarityColor?, tag? })` | Optional thin top strip |
| `ShopTag({ label, accent, icon? })` | Small chip (`+20%`, `POPULAR`, …) |
| `ShopPricePill({ coins?, inr?, accent?, size? })` | Price read-out: Oz coin icon + amount, `·`, ₹ amount |
| `ShopActionButton({ label, filled, onSelect, icon?, accent?, height? })` | Filled or outline button |
| `ShopFooter({ onSelect?, label?, height?, tint?, children })` | The bottom rail. It is a button when `onSelect` is set, otherwise static |
| `ShopFooterLabel({ accent, dim?, children })` | `OWNED` / `EQUIP` / `EQUIPPED` / `FREE` / `LOG IN` / `CLAIMED` |
| `ShopStateStamp({ kind, accent })` | Tilted OWNED stamp over a dark veil (card tiles) |

### 5.2 Tiles and grids (`components/shop-tiles.tsx` + `shop-tiles.module.css`)

| Component | Layout |
|---|---|
| `TileGrid` | 3 columns → 4 at 30rem → 5 at 45rem → `auto-fill, minmax(9.5rem, 1fr)` from 64rem |
| `StripList` | One column, strips capped at 35rem wide, 148 px tall (banners, kits) |
| `PackGrid` | 2 columns, packs at aspect 1 : 1.42 |
| `CardGrid` | 2 columns, then 3 when there is room |
| `AvatarTile`, `FrameTile`, `CoinTile` | Portrait tiles at aspect 0.6 (3 : 5) |
| `BannerTile`, `KitTile` | Strips |
| `PackTile` (+ `PackArt`) | Art + holo + optional elite star, name, "N CARDS", then two rails (coins / ₹), one FREE rail (starter), or CLAIMED |
| `CardTile` | `PlayerCard` slot + two rails, or OWNED |
| `KitPreview` | CSS garment or car |
| `ShopEmptyFilter({ sport, label })` | "// EMPTY GRID" placeholder (e.g. football and tennis kits) |

### 5.3 Acquisition overlay (`components/shop-acquire-overlay.tsx`)

A fullscreen modal (`z-index: 70`) shown after every successful item purchase:

| t (ms) | Beat |
|---:|---|
| 0–280 | Vignette fades in (84% black) |
| 90–1490 | 26 accent particles burst out on a `<canvas>` (alternate reach 147 px / 115 px, ease-out, fading) |
| 130–690 | "ACQUIRED" label, and the preview **slams** in (overshoot curve), inside an accent glow |
| 300–720 | Item name banner slides up, with `−N` coins and the Oz coin icon if coins were spent |
| 510 | "TAP TO CONTINUE" |
| 690–1040 | Screen shake (±7 px, 3 cycles, decaying), written to `--acquire-shake` per frame |
| 2200 | Auto-dismiss (or tap anywhere, or Esc) |

It locks `body` scroll while open. Under reduced motion the canvas, particles and
shake are skipped. The dismiss callback is ref-guarded so it fires only once.

`CoinTopUpCelebration({ amount, onDone })` is a separate assertive live-region
toast, `+N COINS`, shown for 1.5 s.

---

## 6. Search (`components/shop-search-screen.tsx`)

An in-memory index built once at module load:

| Indexed | Kind label | Detail | Aliases | Link |
|---|---|---|---|---|
| Every player card | PLAYER CARD | `ARG // RW/CAM // 92` | shortName, country, countryCode, trait | `/shop?tab=cards&sport=<sport>&focus=<id>` |
| Every action card | ACTION CARD | `GOLD // +15 Attack Power` | category, effect | `/shop?tab=cards&focus=<id>` |
| Standard + racing packs | PACK | guarantee | id, guarantee | `/shop?tab=packs&sport=…&focus=<id>` |
| Frames | FRAME | `LFC // EPL` | shortLabel, teamId, leagueId | `/shop?tab=frames&sport=…&focus=<id>` |
| Kits / jerseys / liveries | KIT / JERSEY / LIVERY | `100 OZ` | id, kind | `/shop?tab=kits&sport=…&focus=<id>` |
| Banners | BANNER | `25 OZ` | id, label without spaces | `/shop?tab=banners&sport=…&focus=<id>` |

- **Matching:** the query is trimmed, lower-cased and whitespace-collapsed. It needs
  at least 2 characters. **Every word** must appear in the name, kind, detail or any
  alias.
- **Ranking:** exact name match, then name prefix, then the rest. Ties sort
  alphabetically.
- Results render as `AccentPanel` links in two columns, tinted by sport. Empty
  states use `NoDataState`.

---

## 7. Who else reads shop data

| Consumer | Reads |
|---|---|
| `features/profile/components/profile-hero.tsx` | `shopBanners` + `BannerArt` behind the name; `shopFrames` + `AvatarFrameRing` around the avatar; the purchased card portrait as the avatar |
| `features/profile/components/identity-editors.tsx` | Purchased avatars (`owned.avatarIds` ∩ cards with portraits) and purchased banners |
| `features/profile/state/player-standing.ts` | Equipped frame colour for leaderboard rows and dossiers |
| `features/shell/components/platform-top-bar.tsx` | `economy.coins` and the "+" link → `/shop?tab=coins` |
| Final Over / Hoop Duel / Grand Prix | `economy.equipped.kitId` / `jerseyId` / `liveryId` (and Grand Prix equips liveries from its own lobby) |
| Deck editor (`features/cards-decks`) | `owned.playerCardIds` / `actionCardIds` as the inventory to build loadouts from |

---

## 8. File manifest

| Path | Lines | Role |
|---|---:|---|
| `src/app/(platform)/shop/page.tsx` | 7 | Route; `<Suspense>` around `ShopScreen` |
| `src/app/(platform)/shop/search/page.tsx` | 8 | Route + metadata `Shop Search \| StatOz` |
| `src/features/shop/index.ts` | 5 | Public API (+ re-export of `@/mocks/shop`) |
| `src/features/shop/components/shop-screen.tsx` | 864 | `ShopScreen`: tabs, the seven tab bodies, purchase/coin/pack flows, previews, confirm dialog |
| `src/features/shop/components/shop-screen.module.css` | 29 | Shell, dialog backdrop, chamfer |
| `src/features/shop/components/shop-tiles.tsx` | 587 | Grids and the seven tile kinds, `PackArt`, `KitPreview`, `ShopEmptyFilter` |
| `src/features/shop/components/shop-tiles.module.css` | 478 | Grid breakpoints, tile internals, holo keyframes |
| `src/features/shop/components/shop-card.tsx` | 294 | `ShopCardFrame` + primitives |
| `src/features/shop/components/shop-card.module.css` | 283 | Plate, cut, wash, edge, weights, footer, stamp, frame ring |
| `src/features/shop/components/shop-acquire-overlay.tsx` | 174 | `ShopAcquireOverlay`, `CoinTopUpCelebration` |
| `src/features/shop/components/shop-acquire-overlay.module.css` | 211 | Overlay keyframes |
| `src/features/shop/components/shop-search-screen.tsx` | 40 | `ShopSearchScreen` |
| `src/features/shop/components/avatar-frame-ring.tsx` | 45 | `AvatarFrameRing` |
| `src/features/shop/components/banner-art.tsx` (+css 56) | 48 | `BannerArt` |
| `src/features/shop/data/frames.generated.ts` | 453 | **Unused duplicate** of `mocks/shop/frames.generated.ts` |
| `src/mocks/shop/index.ts` | 1 | `export * from "./catalog"` |
| `src/mocks/shop/catalog.ts` | 187 | Categories, banners, kits/jerseys/liveries, coin bundles, packs, holo specs, art ids |
| `src/mocks/shop/frames.generated.ts` | 453 | 45 team frames |
| `scripts/sync-shop-assets.mjs` | — | Copies Flutter art into `public/assets/shop/**` and regenerates the portrait map and frames (see the gaps section) |

### Static assets

```
public/assets/shop/coins/{rookie,starter,pro,elite,champion,legendary}.png      1.1 MB
public/assets/shop/packs/{starter,bronze,silver,gold,elite,platinum}.png         4.1 MB
public/assets/shop/banners/profile_banner_{south_africa,green_red,korea,czech}.png
public/assets/shop/banners/shop_banner_<f1-team>.webp  (11)                       10 MB total
public/assets/shop/portraits/<sport>/<NAME>.webp                                 343 MB (avatars + card art)
```

---

## 9. Outside dependencies to satisfy

| Import | Used for | Port notes |
|---|---|---|
| `@/features/economy` → `useEconomy`, `purchaseItem`, `purchasePack`, `addCoinTopUp`, `equipCosmetic`, `EconomyItemKind`, `EconomySnapshot` | Everything that changes state | Copy the economy feature, or implement the contract in §4 (the shared doc has a starting shim; add `purchaseItem`, `purchasePack` and `addCoinTopUp` from §4) |
| `@/features/packs` → `allPlayerCards`, `allActionCards`, `playerCardCoinPrice`, `playerCardInrPrice`, `portraitAssets`, `portraitForCard`, `rollFrom`, `packRarityOfPlayer`, `packRarityOfAction`, `rollStarterPackFor`, `claimPack`, `PackRevealSequence`, `PackRevealItem` | Card catalogue, pricing, rolling, reveal | See `starter_pack.md` |
| `@/domain/cards` → `cardTierRank`, `playerRoleLabels`, `playerRoleSports`, `ActionCard`, `CardTier`, `PlayerCard` | Types, role → sport | Shared doc |
| `@/domain/sports` → `Sport`, `sportModuleFor`, `sportOrder` | Sport tabs and accents | Shared doc |
| `@/features/matches` → `SportIcon` | Sport tab icons, banner crest | Any `({ sport, size }) => <svg/>` |
| `@/design-system` → `UnderlineTabs`, `PlayerCard`, `AccentPanel`, `NoDataState`, `SearchField`, `BrandIcon` (`ozCoins`), icons (`LockIcon`, `ProfileIcon`, `SearchIcon`, `StyleIcon`, `StarIcon`, `ShopIcon`, `SignalOffIcon`, `ArrowLeftIcon`), `accentVar`, `glyphRegistry`, `GlyphName` | UI | Port or map to your library |
| `@/shared/utils` → `formatInt` | `Intl.NumberFormat("en-US")` | |
| `@/shared/hooks` → `usePrefersReducedMotion` | Overlay motion | |
| CSS tokens (`--ds-color-*`, `--ds-font-display`, `--ds-text-*`, `--ds-tracking-*`) and Tailwind theme mapping | All styling | Shared doc §1 |
| `next/image` | Portraits, coin and pack art, banners | If you use `basePath` or static export, configure `images.unoptimized` (this repo does it for GitHub Pages) |

---

## 10. Porting steps

1. Copy `src/features/shop/`, `src/mocks/shop/`, and `public/assets/shop/{coins,packs,banners}`.
   Decide about `portraits/` (343 MB). Without it the Avatars tab still lists
   cards, but the images 404, so either copy the folder or empty
   `portrait-assets*.generated.ts`, which empties the Avatars tab.
2. Port `src/features/economy/` (or implement §4), and `src/features/packs/` +
   `src/mocks/packs/` (cards, pricing, rolling, reveal).
3. Add the routes: `app/<group>/shop/page.tsx` with the `<Suspense>` wrapper, and
   `app/<group>/shop/search/page.tsx`. Put them inside your normal app shell (they
   are not fullscreen).
4. Make the kit/jersey/livery ids in `catalog.ts` match whatever your games read.
   Drop any category you do not need by removing it from `shopCategories` and from
   the `content` switch in `ShopCatalog`.
5. Link a wallet or coin button to `/shop?tab=coins`.
6. Verify, starting from a fresh `localStorage`:
   - The wallet shows 1000.
   - **Frames** → buy Liverpool (−150), EQUIP; the profile avatar now has a red ring.
   - **Kits** (cricket) → buy EMBER (−100), EQUIP; Final Over wears it.
   - **Packs** → Bronze Pack with coins (−150); the reveal flips 3 cards; "Pack
     contents added…".
   - **Packs** → Starter Pack. It reveals once, then shows CLAIMED.
   - **Cards** → buy via ₹ → confirm dialog → OWNED at 0 coins spent.
   - **Coins** → Pro → confirm → +12,000 toast.
   - `/shop/search` → "lfc" → the Liverpool frame → opens the Frames tab on football.

### Going to real payments

The ₹ paths are **simulations by design**. Every `simulatedInr` branch
(`purchaseItem`, `purchasePack`, `addCoinTopUp`) grants without charging. For
production:

- Replace the confirm-then-grant step with a checkout session (Razorpay, Stripe, …)
  created by a **server** route handler. Grant only from a verified webhook.
- Move the wallet and `owned` to the server. The client store becomes a cache
  hydrated from an API. Today any player can edit `localStorage` to give
  themselves coins or items.
- Roll packs on the server too, so pulls cannot be re-rolled by refreshing before
  the write.

---

## 11. Known gaps and gotchas (as of this snapshot)

- **The guest path never triggers.** `ShopScreen` passes `useEconomy()` down, and
  that always returns a snapshot (a fresh wallet on the server). So every
  `guest={!economy}` is `false`: "LOG IN TO BUY" and the `LOG IN` rails never show,
  and the shop route has no `AuthBoundary`. Anyone can buy. Gate it with your auth
  if that matters.
- **`focus=` is ignored.** Search results link with `&focus=<id>`, but `ShopScreen`
  reads only `tab` and `sport`. The target item is not scrolled to or highlighted,
  and with the 48-card cap it may not be visible at all.
- **Action cards are searchable but not sold individually.** Their search links
  open the football Cards tab, which lists player cards only. Action cards come from
  packs, starters and the daily drop.
- **Cards tab cap.** Only the first 48 filtered cards render (except motorsport).
  There is no pagination or "show more".
- **Tennis ATP/WTA chips** fall through `cardMatchesFilter` to `true`, so they show
  every tennis card.
- **Duplicate pack pulls collapse.** `rollFrom` can return the same card twice in
  one pack. `purchasePack` merges ids, so the player owns fewer unique cards than
  the pack size, although the reveal shows both pulls.
- **Starter Pack tile copy is football's.** For every sport the tile says
  "11 CARDS" (from `playerCount: 5, actionCount: 6`), but opening it rolls that
  sport's real starter (5 cricket batters, 3 basketball players, 1 tennis player).
  The motorsport row (`racingPacks`) has no Starter Pack tile at all. The
  motorsport starter is only claimable through the game launcher gate.
- **Packs ignore your current collection.** Pulls are uniform within a tier, so
  repeat purchases increasingly hit cards already owned.
- **`scripts/sync-shop-assets.mjs` is stale.** It reads card catalogues from
  `src/features/packs/data/<sport>-cards.ts`, but they now live in
  `src/mocks/packs/`. It also expects the Flutter project at
  `../flutter_projects/card_game`. Fix the paths before re-running it.
- **`src/features/shop/data/frames.generated.ts`** is an identical, unused copy of
  `src/mocks/shop/frames.generated.ts`. Port only the mocks one.
- The sport tab is not reflected in the URL (only `tab` is), so a reload returns
  to the `?sport=` the page was opened with, or to football.
