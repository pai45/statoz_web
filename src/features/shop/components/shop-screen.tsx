"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";

import { BrandIcon, LockIcon, PlayerCard, UnderlineTabs, accentVar, glyphRegistry, type GlyphName } from "@/design-system";
import { cardTierRank, playerRoleLabels, playerRoleSports, type ActionCard, type CardTier, type PlayerCard as PlayerCardData } from "@/domain/cards";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { equipCosmetic, addCoinTopUp, purchaseItem, purchasePack, useEconomy, type EconomyItemKind, type EconomySnapshot } from "@/features/economy";
import { SportIcon } from "@/features/matches";
import {
  allActionCards,
  allPlayerCards,
  PackRevealSequence,
  claimPack,
  packRarityOfAction,
  packRarityOfPlayer,
  playerCardCoinPrice,
  playerCardInrPrice,
  portraitAssets,
  portraitForCard,
  rollFrom,
  rollStarterPackFor,
  type PackRevealItem,
} from "@/features/packs";
import { formatInt } from "@/shared/utils";

import {
  coinBundles,
  colorProducts,
  racingPacks,
  shopBanners,
  shopCategories,
  shopFrames,
  standardPacks,
  type ColorProduct,
  type ShopCategory,
  type ShopPack,
} from "@/mocks/shop";

import styles from "./shop-screen.module.css";

const sportAccents: Record<Sport, string> = {
  football: accentVar("cyan"), cricket: accentVar("lime"), basketball: accentVar("gold"), tennis: accentVar("cyan"), motorsport: accentVar("racing"),
};

const roleAccents: Record<string, string> = {
  attacker: accentVar("cyan"), defender: accentVar("violet"), goalkeeper: accentVar("gold"), batsman: accentVar("cyan"), bowler: accentVar("violet"), basketballGuard: accentVar("gold"), basketballWing: accentVar("cyan"), basketballBig: accentVar("violet"), tennisSingles: accentVar("lime"), f1Driver: accentVar("racing"), f2Driver: accentVar("racing"), nascarDriver: accentVar("racing"), indycarDriver: accentVar("racing"),
};

function glyph(name: string): GlyphName { return name in glyphRegistry ? name as GlyphName : "bolt"; }
function cardSport(card: PlayerCardData): Sport { return playerRoleSports[card.role]; }
function tabFromQuery(value: string | null): ShopCategory {
  const match = shopCategories.find((entry) => entry.id === value || entry.label.toLowerCase() === value);
  return match?.id ?? "avatars";
}

type ConfirmState = { title: string; price: string; detail: string; action: () => void };

export function ShopScreen() {
  const session = useAuthSession();
  if (session.status === "authenticated") return <AuthenticatedShopScreen />;
  return <ShopCatalog economy={null} />;
}

function AuthenticatedShopScreen() {
  const economy = useEconomy();
  return <ShopCatalog economy={economy} />;
}

function ShopCatalog({ economy }: { economy: EconomySnapshot | null }) {
  const searchParams = useSearchParams();
  const requireAuth = useRequireAuth();
  const [sport, setSport] = useState<Sport>("football");
  const [category, setCategory] = useState<ShopCategory>(() => tabFromQuery(searchParams.get("tab")));
  const [filter, setFilter] = useState("ALL");
  const [notice, setNotice] = useState(
    economy
      ? "Browse the marketplace. INR purchases are simulations only."
      : "Browse the marketplace. Log in to acquire or equip items.",
  );
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [acquired, setAcquired] = useState<string | null>(null);
  const [reveal, setReveal] = useState<PackRevealItem[] | null>(null);
  const accent = sportAccents[sport];

  function changeCategory(index: number) {
    const next = shopCategories[index].id;
    setCategory(next); setFilter("ALL");
    const url = new URL(window.location.href); url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function resultNotice(result: ReturnType<typeof purchaseItem>, label: string) {
    if (result.ok) { setAcquired(label); setNotice(`${label} added to your inventory.`); }
    else setNotice(result.reason === "owned" ? `${label} is already owned.` : "Not enough Oz Coins. Open the Coins tab to top up.");
  }

  function buyItem(kind: EconomyItemKind, id: string, price: number, label: string, simulatedInr = false) {
    if (!economy) {
      requireAuth({
        intent: "buy",
        message: "Log in to acquire items and keep them in your StatOz collection.",
      });
      return;
    }
    const run = () => resultNotice(purchaseItem({ kind, id, price, title: label, simulatedInr }), label);
    if (simulatedInr) setConfirm({ title: label, price: `₹${formatInt(price)} SIMULATION`, detail: "No real payment will be taken. This browser will receive the item.", action: run });
    else run();
  }

  function equip(kind: EquipKind, id: string) {
    if (!economy) {
      requireAuth({
        intent: "equip items",
        message: "Log in to manage your StatOz loadout and cosmetics.",
      });
      return;
    }
    equipCosmetic(kind, id);
  }

  function buyCoins(bundle: (typeof coinBundles)[number]) {
    if (!economy) {
      requireAuth({
        intent: "get coins",
        message: "Log in to add Oz Coins to your local player account.",
      });
      return;
    }
    setConfirm({
      title: `${bundle.label} Coin Bundle`,
      price: `₹${formatInt(bundle.inr)} SIMULATION`,
      detail: `${formatInt(bundle.coins)} Oz Coins will be credited locally. No real payment will be taken.`,
      action: () => {
        addCoinTopUp({ id: bundle.id, coins: bundle.coins, title: bundle.label });
        setAcquired(`${formatInt(bundle.coins)} Oz Coins`);
      },
    });
  }

  function openPack(pack: ShopPack, simulatedInr: boolean) {
    if (!economy) {
      requireAuth({
        intent: "open packs",
        message: "Log in to claim packs and save their cards to your collection.",
      });
      return;
    }
    const execute = () => {
      if (pack.id === "starter") {
        if (economy.starterClaims[sport]) { setNotice("This sport's Starter Pack is already claimed."); return; }
        const starter = rollStarterPackFor(sport);
        claimPack(sport, starter);
        setReveal(toReveal(starter.playerCards, starter.actionCards));
        return;
      }
      const players = allPlayerCards.filter((card) => cardSport(card) === sport);
      const pickedPlayers = Array.from({ length: pack.playerCount }, () => rollFrom(players, packRarityOfPlayer, pack.odds, Math.random)).filter((card): card is PlayerCardData => Boolean(card));
      const pickedActions = Array.from({ length: pack.actionCount }, () => rollFrom(allActionCards, packRarityOfAction, pack.odds, Math.random)).filter((card): card is ActionCard => Boolean(card));
      const result = purchasePack({ id: pack.id, price: simulatedInr ? pack.inr : pack.coinPrice, title: pack.label, playerCardIds: pickedPlayers.map((card) => card.id), actionCardIds: pickedActions.map((card) => card.id), simulatedInr });
      if (!result.ok) { setNotice("Not enough Oz Coins. Open the Coins tab to top up."); return; }
      setReveal(toReveal(pickedPlayers, pickedActions));
    };
    if (simulatedInr) setConfirm({ title: pack.label, price: `₹${formatInt(pack.inr)} SIMULATION`, detail: "No real payment will be taken. Pack contents are stored only in this browser.", action: execute });
    else execute();
  }

  const content = category === "avatars" ? <AvatarGrid economy={economy} sport={sport} filter={filter} setFilter={setFilter} buy={buyItem} equip={equip} />
    : category === "frames" ? <FrameGrid economy={economy} sport={sport} buy={buyItem} equip={equip} />
      : category === "banners" ? <BannerGrid economy={economy} sport={sport} buy={buyItem} equip={equip} />
        : category === "kits" ? <KitGrid economy={economy} sport={sport} buy={buyItem} equip={equip} />
          : category === "coins" ? <CoinGrid guest={!economy} onBuy={buyCoins} />
            : category === "packs" ? <PackGrid economy={economy} sport={sport} onOpen={openPack} />
              : <CardsGrid economy={economy} sport={sport} filter={filter} setFilter={setFilter} buy={buyItem} />;

  return (
    <section className={`${styles.shell} relative isolate flex min-h-full flex-1 flex-col`} style={{ "--shop-accent": accent } as CSSProperties}>
      <UnderlineTabs tabs={sportOrder.map((entry) => ({ id: entry, label: sportModuleFor(entry).label.toUpperCase(), icon: <span className="flex items-center gap-2 px-3"><SportIcon sport={entry} size={18} /><span className="font-display text-2xs font-black tracking-wide">{sportModuleFor(entry).shortLabel}</span></span> }))} activeIndex={sportOrder.indexOf(sport)} onChange={(index) => { setSport(sportOrder[index]); setFilter("ALL"); }} accent={accent} label="Shop sports" minTabWidth={116} className="sticky top-0 z-10 bg-surface-nav/95" />
      <UnderlineTabs tabs={shopCategories.map((entry) => ({ id: entry.id, label: entry.label.toUpperCase() }))} activeIndex={shopCategories.findIndex((entry) => entry.id === category)} onChange={changeCategory} accent={accent} label="Shop categories" minTabWidth={92} className="sticky top-12.5 z-10 bg-surface-nav/95" />

      <div className="relative z-[1] mx-auto w-full max-w-[1500px] flex-1 px-3 py-4 sm:px-5 lg:px-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div><p className="font-display text-2xs font-black tracking-ultra text-muted">{"// "}{sportModuleFor(sport).label.toUpperCase()} MARKET</p><h2 className="mt-1 font-display text-xl font-black tracking-tight">{shopCategories.find((entry) => entry.id === category)?.label.toUpperCase()}</h2></div>
          {!economy ? <div className="flex items-center gap-2 border border-border-strong bg-surface-raised px-3 py-2 font-display text-2xs font-black tracking-wide text-muted"><LockIcon size={15} /> LOG IN TO BUY</div> : null}
        </div>
        <p aria-live="polite" className="mb-4 min-h-5 text-xs text-muted">{notice}</p>
        {content}
      </div>

      {confirm ? <ConfirmDialog state={confirm} close={() => setConfirm(null)} /> : null}
      {acquired ? <AcquiredDialog label={acquired} close={() => setAcquired(null)} /> : null}
      {reveal ? <PackReveal items={reveal} close={() => { setReveal(null); setNotice("Pack contents added to your collection."); }} /> : null}
    </section>
  );
}

function toReveal(players: PlayerCardData[], actions: ActionCard[]): PackRevealItem[] {
  return [...players.map((card): PackRevealItem => ({ kind: "player", card })), ...actions.map((card): PackRevealItem => ({ kind: "action", card }))]
    .sort((a, b) => cardTierRank(a.card.tier) - cardTierRank(b.card.tier) || ("rating" in a.card ? a.card.rating : a.card.power) - ("rating" in b.card ? b.card.rating : b.card.power));
}

type Buy = (kind: EconomyItemKind, id: string, price: number, label: string, simulatedInr?: boolean) => void;
type EquipKind = Exclude<EconomyItemKind, "playerCard" | "actionCard">;
type Equip = (kind: EquipKind, id: string) => void;

function Filters({ values, value, setValue }: { values: string[]; value: string; setValue: (value: string) => void }) {
  return <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{values.map((entry) => <button key={entry} type="button" onClick={() => setValue(entry)} aria-pressed={value === entry} className="shrink-0 border px-3 py-2 font-display text-2xs font-black tracking-wide focus-visible:outline-2" style={{ color: value === entry ? "var(--shop-accent)" : undefined, borderColor: value === entry ? "var(--shop-accent)" : "var(--ds-color-border-strong)", background: value === entry ? "color-mix(in srgb, var(--shop-accent) 10%, transparent)" : undefined }}>{entry.toUpperCase()}</button>)}</div>;
}

function AvatarGrid({ economy, sport, filter, setFilter, buy, equip }: { economy: EconomySnapshot | null; sport: Sport; filter: string; setFilter: (value: string) => void; buy: Buy; equip: Equip }) {
  const avatars = allPlayerCards.filter((card) => cardSport(card) === sport && portraitAssets[card.id]);
  const filters = ["ALL", ...new Set(avatars.map((card) => card.countryCode))].sort((a, b) => a === "ALL" ? -1 : b === "ALL" ? 1 : a.localeCompare(b));
  const shown = filter === "ALL" ? avatars : avatars.filter((card) => card.countryCode === filter);
  return <><Filters values={filters} value={filter} setValue={setFilter} /><ProductGrid>{shown.map((card, index) => { const owned = Boolean(economy?.owned.avatarIds.includes(card.id)); const equipped = economy?.equipped.avatarId === card.id; return <ProductShell key={card.id} index={index} accent={roleAccents[card.role]} footer={<PurchaseFooter guest={!economy} owned={owned} equipped={equipped} price={25} onCoins={() => buy("avatar", card.id, 25, card.name)} onEquip={() => equip("avatar", card.id)} />}><div className="relative aspect-square overflow-hidden bg-surface-raised"><Image src={portraitForCard(card)!} alt={card.name} fill sizes="(max-width: 600px) 42vw, 160px" className="object-cover object-top" /></div><ProductTitle title={card.shortName} meta={`${card.countryCode} / ${playerRoleLabels[card.role]}`} /></ProductShell>; })}</ProductGrid></>;
}

function FrameGrid({ economy, sport, buy, equip }: { economy: EconomySnapshot | null; sport: Sport; buy: Buy; equip: Equip }) {
  const frames = shopFrames.filter((frame) => frame.sport === sport);
  if (!frames.length) return <EmptyState label="NO TEAM FRAMES HAVE DROPPED FOR THIS SPORT YET" />;
  return <ProductGrid>{frames.map((frame, index) => <ProductShell key={frame.id} index={index} accent={frame.color} footer={<PurchaseFooter guest={!economy} owned={Boolean(economy?.owned.frameIds.includes(frame.id))} equipped={economy?.equipped.frameId === frame.id} price={frame.price} onCoins={() => buy("frame", frame.id, frame.price, frame.label)} onEquip={() => equip("frame", frame.id)} />}><div className="grid aspect-square place-items-center bg-surface-raised"><span className="grid size-24 place-items-center rounded-full border-[8px] font-display text-xl font-black" style={{ borderColor: frame.color, boxShadow: `inset 0 0 0 3px color-mix(in srgb, ${frame.color} 45%, white), 0 0 22px ${frame.color}` }}>{frame.shortLabel}</span></div><ProductTitle title={frame.label} meta={frame.leagueId.toUpperCase()} /></ProductShell>)}</ProductGrid>;
}

function BannerGrid({ economy, sport, buy, equip }: { economy: EconomySnapshot | null; sport: Sport; buy: Buy; equip: Equip }) {
  const banners = shopBanners.filter((banner) => banner.sport === sport);
  if (!banners.length) return <EmptyState label="NO BANNERS HAVE DROPPED FOR THIS SPORT YET" />;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{banners.map((banner, index) => <ProductShell key={banner.id} index={index} accent={banner.accent} wide footer={<PurchaseFooter guest={!economy} owned={Boolean(economy?.owned.bannerIds.includes(banner.id))} equipped={economy?.equipped.bannerId === banner.id} price={banner.price} onCoins={() => buy("banner", banner.id, banner.price, banner.label)} onEquip={() => equip("banner", banner.id)} />}><div className="relative aspect-[3/1] overflow-hidden" style={{ background: `linear-gradient(120deg, ${banner.colors[0]}, ${banner.colors[1]})` }}>{banner.assetSrc ? <Image src={banner.assetSrc} alt="" fill sizes="(max-width: 768px) 92vw, 480px" className="object-cover" /> : null}<span className="absolute inset-x-3 bottom-3 font-display text-sm font-black tracking-ultra">{banner.label}</span></div></ProductShell>)}</div>;
}

function KitGrid({ economy, sport, buy, equip }: { economy: EconomySnapshot | null; sport: Sport; buy: Buy; equip: Equip }) {
  const products = colorProducts.filter((entry) => entry.sport === sport);
  if (!products.length) return <EmptyState label="NO KITS HAVE DROPPED FOR THIS SPORT YET" />;
  return <ProductGrid>{products.map((item, index) => { const key = `${item.kind}Ids` as "kitIds" | "jerseyIds" | "liveryIds"; const equippedKey = `${item.kind}Id` as "kitId" | "jerseyId" | "liveryId"; const owned = Boolean(economy?.owned[key].includes(item.id)); return <ProductShell key={item.id} index={index} accent={item.accent} footer={<PurchaseFooter guest={!economy} owned={owned} equipped={economy?.equipped[equippedKey] === item.id} price={item.price} onCoins={() => buy(item.kind, item.id, item.price, item.label)} onEquip={() => equip(item.kind, item.id)} />}><ColorPreview item={item} /><ProductTitle title={item.label} meta={item.kind.toUpperCase()} /></ProductShell>; })}</ProductGrid>;
}

function ColorPreview({ item }: { item: ColorProduct }) { return <div className="relative grid aspect-square place-items-center overflow-hidden" style={{ background: `linear-gradient(145deg, ${item.primary}, ${item.secondary})` }}><div className="h-28 w-24 [clip-path:polygon(20%_0,80%_0,100%_20%,82%_34%,82%_100%,18%_100%,18%_34%,0_20%)]" style={{ background: `linear-gradient(90deg, ${item.secondary} 0 12%, ${item.primary} 12% 78%, ${item.accent} 78%)`, boxShadow: `0 0 26px ${item.accent}` }} /><span className="absolute bottom-3 right-3 size-4 rounded-full" style={{ background: item.accent }} /></div>; }

function CoinGrid({ guest, onBuy }: { guest: boolean; onBuy: (bundle: (typeof coinBundles)[number]) => void }) { return <ProductGrid>{coinBundles.map((bundle, index) => <ProductShell key={bundle.id} index={index} accent={bundle.id === "legendary" ? "#ff3df7" : "var(--shop-accent)"} footer={<button type="button" onClick={() => onBuy(bundle)} className="flex h-11 w-full items-center justify-center gap-1.5 bg-overlay-plate font-display text-xs font-black tracking-wide text-[var(--shop-accent)] focus-visible:outline-2">{guest ? <LockIcon size={13} /> : null}{guest ? "LOG IN · " : ""}₹{formatInt(bundle.inr)}</button>}><div className="relative aspect-square bg-surface-raised"><Image src={`/assets/shop/coins/${bundle.id}.png`} alt="" fill sizes="180px" className="object-contain p-3" />{bundle.tag ? <span className="absolute right-2 top-2 bg-inverse px-2 py-1 font-display text-[7px] font-black text-background">{bundle.tag}</span> : null}</div><ProductTitle title={formatInt(bundle.coins)} meta={`${bundle.label.toUpperCase()}${bundle.bonus ? ` / +${bundle.bonus}%` : ""}`} /></ProductShell>)}</ProductGrid>; }

function PackGrid({ economy, sport, onOpen }: { economy: EconomySnapshot | null; sport: Sport; onOpen: (pack: ShopPack, inr: boolean) => void }) {
  const packs = sport === "motorsport" ? racingPacks : standardPacks;
  return <ProductGrid>{packs.map((pack, index) => { const claimed = pack.id === "starter" && Boolean(economy?.starterClaims[sport]); return <ProductShell key={pack.id} index={index} accent={pack.accent} footer={claimed ? <div className="grid h-[72px] place-items-center font-display text-xs font-black tracking-ultra text-muted">CLAIMED</div> : <div><button type="button" onClick={() => onOpen(pack, false)} className="flex h-10 w-full items-center justify-center gap-1.5 bg-overlay-plate font-display text-xs font-black">{!economy ? <LockIcon size={13} /> : null}{!economy ? "LOG IN · " : ""}{pack.coinPrice === 0 ? "FREE" : `${formatInt(pack.coinPrice)} OZ`}</button>{pack.inr > 0 ? <button type="button" onClick={() => onOpen(pack, true)} className="h-9 w-full border-t border-border font-display text-2xs font-black" style={{ color: pack.accent }}>₹{formatInt(pack.inr)} · SIMULATED</button> : null}</div>}><div className="relative aspect-[4/5] bg-surface-raised"><Image src={`/assets/shop/packs/${pack.id.replace("racing-grid", "bronze").replace("racing-podium", "gold").replace("racing-pole", "platinum")}.${pack.id === "starter" ? "png" : "png"}`} alt="" fill sizes="180px" className="object-contain p-4" /></div><ProductTitle title={pack.label} meta={`${pack.playerCount + pack.actionCount} CARDS`} /><p className="min-h-10 px-3 pb-3 text-center font-display text-[7px] font-black leading-relaxed text-muted">{pack.guarantee}</p></ProductShell>; })}</ProductGrid>;
}

function CardsGrid({ economy, sport, filter, setFilter, buy }: { economy: EconomySnapshot | null; sport: Sport; filter: string; setFilter: (value: string) => void; buy: Buy }) {
  const cards = allPlayerCards.filter((card) => cardSport(card) === sport); const tiers: ("ALL" | CardTier)[] = ["ALL", "bronze", "silver", "gold", "platinum"]; const shown = filter === "ALL" ? cards : cards.filter((card) => card.tier === filter);
  return <><Filters values={tiers} value={filter} setValue={setFilter} /><div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(154px,1fr))]">{shown.map((card, index) => { const price = playerCardCoinPrice(card); const owned = Boolean(economy?.owned.playerCardIds.includes(card.id)); return <div key={card.id} className={`${styles.enter} flex min-w-0 flex-col items-center border border-border bg-surface-raised py-3`} style={{ "--item-index": index } as CSSProperties}><PlayerCard name={card.shortName} roleLabel={playerRoleLabels[card.role]} position={card.position} countryCode={card.countryCode} rating={card.rating} trait={card.trait} tier={card.tier} icon={glyph(card.icon)} portraitSrc={portraitForCard(card)} roleAccent={roleAccents[card.role]} markings={sport === "football" ? "none" : sport} size="sm" /><div className="mt-3 w-full px-2">{owned ? <div className="grid h-16 place-items-center font-display text-2xs font-black text-success">OWNED</div> : <><button type="button" onClick={() => buy("playerCard", card.id, price, card.name)} className="flex h-8 w-full items-center justify-center gap-1 bg-overlay-plate font-display text-[8px] font-black">{!economy ? <LockIcon size={11} /> : null}{!economy ? "LOG IN · " : ""}{formatInt(price)} OZ</button><button type="button" onClick={() => buy("playerCard", card.id, playerCardInrPrice(card), card.name, true)} className="mt-1 h-7 w-full border border-border font-display text-[7px] font-black text-muted">₹{formatInt(playerCardInrPrice(card))} · SIM</button></>}</div></div>; })}</div></>;
}

function ProductGrid({ children }: { children: ReactNode }) { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(178px,1fr))]">{children}</div>; }
function ProductShell({ children, footer, accent, index, wide = false }: { children: ReactNode; footer: ReactNode; accent: string; index: number; wide?: boolean }) { return <article className={`${styles.enter} ${styles.chamfer} min-w-0 overflow-hidden border bg-surface-raised ${wide ? "" : "max-w-[230px]"}`} style={{ borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`, "--item-index": index } as CSSProperties}>{children}<div className="border-t border-border">{footer}</div></article>; }
function ProductTitle({ title, meta }: { title: string; meta: string }) { return <div className="px-2 py-3 text-center"><h3 className="truncate font-display text-xs font-black tracking-wide">{title}</h3><p className="mt-1 truncate font-display text-[7px] font-black tracking-ultra text-muted">{meta}</p></div>; }

function PurchaseFooter({ guest, owned, equipped, price, onCoins, onEquip }: { guest: boolean; owned: boolean; equipped: boolean; price: number; onCoins: () => void; onEquip: () => void }) { return owned ? <button type="button" disabled={equipped} onClick={onEquip} className="h-11 w-full bg-overlay-plate font-display text-2xs font-black tracking-wide disabled:text-success">{equipped ? "EQUIPPED" : "EQUIP"}</button> : <button type="button" onClick={onCoins} className="flex h-11 w-full items-center justify-center gap-2 bg-overlay-plate font-display text-2xs font-black tracking-wide">{guest ? <LockIcon size={13} /> : <BrandIcon name="ozCoins" size={14} alt="" />}{guest ? "LOG IN · " : ""}{price === 0 ? "FREE" : formatInt(price)}</button>; }
function EmptyState({ label }: { label: string }) { return <div className="grid min-h-72 place-items-center border border-dashed border-border-strong bg-surface-raised/40 px-6 text-center"><div><p className="font-display text-sm font-black tracking-ultra text-muted">{"// EMPTY GRID"}</p><p className="mt-3 text-xs text-muted">{label}</p></div></div>; }

function ConfirmDialog({ state, close }: { state: ConfirmState; close: () => void }) { return <div className={`${styles.dialogBackdrop} fixed inset-0 z-50 grid place-items-center p-4`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className={`${styles.chamfer} w-full max-w-sm border border-accent-cyan bg-surface-raised p-5 shadow-2xl`}><p className="font-display text-2xs font-black tracking-ultra text-muted">{"// CONFIRM ACQUISITION"}</p><h2 id="confirm-title" className="mt-2 font-display text-xl font-black">{state.title}</h2><p className="mt-2 font-display text-sm font-black text-accent-cyan">{state.price}</p><p className="mt-3 text-xs leading-relaxed text-muted">{state.detail}</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" autoFocus onClick={close} className="h-11 border border-border-strong font-display text-xs font-black">CANCEL</button><button type="button" onClick={() => { close(); state.action(); }} className="h-11 bg-accent-cyan font-display text-xs font-black text-background">CONFIRM</button></div></div></div>; }
function AcquiredDialog({ label, close }: { label: string; close: () => void }) { return <div className={`${styles.dialogBackdrop} fixed inset-0 z-50 grid place-items-center p-4`}><div role="dialog" aria-modal="true" aria-labelledby="acquired-title" className={`${styles.chamfer} w-full max-w-sm border border-success bg-surface-raised p-7 text-center`}><BrandIcon name="ozCoins" size={48} alt="" className="mx-auto" /><p className="mt-5 font-display text-2xs font-black tracking-ultra text-success">ACQUIRED</p><h2 id="acquired-title" className="mt-2 font-display text-xl font-black">{label}</h2><button type="button" autoFocus onClick={close} className="mt-6 h-11 w-full bg-success font-display text-xs font-black text-background">CONTINUE</button></div></div>; }
function PackReveal({ items, close }: { items: PackRevealItem[]; close: () => void }) { return <PackRevealSequence items={items} onComplete={close} actionLabel="BACK TO SHOP" />; }
