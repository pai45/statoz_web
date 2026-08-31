"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PlayerRole } from "@/domain/cards";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { AuthBoundary } from "@/features/auth";
import { useEconomy } from "@/features/economy";
import { actionCardForId, playerCardForId } from "@/features/packs";

import { saveLoadout, useDecks, validateLoadout } from "../state/deck-store";
import type { SportLoadout } from "../types";

function blank(sport: Sport): SportLoadout {
  if (sport === "football") return { sport, attackers: [], defenders: [], keeperId: null, actionCardIds: [] };
  if (sport === "cricket") return { sport, batterIds: [] };
  if (sport === "basketball") return { sport, playerIds: [], starterId: null };
  if (sport === "tennis") return { sport, playerId: null };
  return { sport, driverId: null };
}

const clone = <T extends SportLoadout>(value: T): T => structuredClone(value);

export function DeckEditor({ sport }: { sport: Sport }) {
  return (
    <AuthBoundary
      intent="edit your loadout"
      message="Log in to manage owned cards and save an active lineup."
      returnTo={`/decks/${sport}`}
    >
      <AuthenticatedDeckEditor sport={sport} />
    </AuthBoundary>
  );
}

function AuthenticatedDeckEditor({ sport }: { sport: Sport }) {
  const economy = useEconomy();
  const decks = useDecks();
  const saved = decks.loadouts[sport];
  const [draft, setDraft] = useState<SportLoadout>(() => blank(sport));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("Only owned cards appear in the editor.");

  useEffect(() => {
    // Deck storage is an external store and may change in another tab.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dirty) setDraft(clone(saved ?? blank(sport)));
  }, [dirty, saved, sport]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const players = useMemo(() => economy.owned.playerCardIds.map(playerCardForId).filter((card) => card !== undefined), [economy.owned.playerCardIds]);
  const actions = useMemo(() => economy.owned.actionCardIds.map(actionCardForId).filter((card) => card !== undefined), [economy.owned.actionCardIds]);
  const roles = Object.fromEntries(players.map((card) => [card.id, card.role])) as Partial<Record<string, PlayerRole>>;
  const errors = validateLoadout(draft, { playerCardIds: economy.owned.playerCardIds, actionCardIds: economy.owned.actionCardIds, roles });

  function update(next: SportLoadout) { setDraft(next); setDirty(true); setMessage("Unsaved changes."); }
  function save() {
    if (errors.length) { setMessage(errors.join(" ")); return; }
    saveLoadout(sport, draft as never);
    setDirty(false); setMessage("Loadout saved and ready for play.");
  }
  function discard(event: React.MouseEvent<HTMLAnchorElement>) {
    if (dirty && !window.confirm("Discard your unsaved loadout changes?")) event.preventDefault();
  }

  const pools = {
    attacker: players.filter((card) => card.role === "attacker"), defender: players.filter((card) => card.role === "defender"), goalkeeper: players.filter((card) => card.role === "goalkeeper"), batsman: players.filter((card) => card.role === "batsman"), basketballGuard: players.filter((card) => card.role === "basketballGuard"), basketballWing: players.filter((card) => card.role === "basketballWing"), basketballBig: players.filter((card) => card.role === "basketballBig"), tennisSingles: players.filter((card) => card.role === "tennisSingles"), driver: players.filter((card) => ["f1Driver", "f2Driver", "nascarDriver", "indycarDriver"].includes(card.role)),
  };

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <div className="border-b border-border pb-5">
        <p className="font-display text-2xs font-black tracking-ultra text-muted">{"// ACTIVE "}{sportModuleFor(sport).label.toUpperCase()} LOADOUT</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-black">BUILD YOUR SQUAD</h1><p aria-live="polite" className="mt-2 text-xs text-muted">{message}</p></div><Link href="/profile" onClick={discard} className="border border-border-strong px-4 py-3 font-display text-2xs font-black tracking-wide">BACK TO PROFILE</Link></div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {draft.sport === "football" ? <FootballSlots value={draft} pools={pools} actions={actions} update={update} /> : null}
          {draft.sport === "cricket" ? <OrderedSlots label="BATTER" count={5} values={draft.batterIds} options={pools.batsman} update={(batterIds) => update({ sport: "cricket", batterIds })} /> : null}
          {draft.sport === "basketball" ? <BasketballSlots value={draft} pools={pools} update={update} /> : null}
          {draft.sport === "tennis" ? <SingleSlot label="SINGLES ATHLETE" value={draft.playerId} options={pools.tennisSingles} update={(playerId) => update({ sport: "tennis", playerId })} /> : null}
          {draft.sport === "motorsport" ? <SingleSlot label="DRIVER" value={draft.driverId} options={pools.driver} update={(driverId) => update({ sport: "motorsport", driverId })} /> : null}
        </div>

        <aside className="h-fit border border-border bg-surface-raised p-4 lg:sticky lg:top-5">
          <p className="font-display text-2xs font-black tracking-ultra text-muted">VALIDATION</p>
          {errors.length ? <ul className="mt-3 space-y-2 text-xs text-error">{errors.map((error) => <li key={error}>— {error}</li>)}</ul> : <p className="mt-3 text-xs text-success">Every slot is legal and owned.</p>}
          <button type="button" onClick={save} disabled={!dirty || errors.length > 0} className="mt-5 h-12 w-full bg-accent-cyan font-display text-xs font-black text-background disabled:cursor-not-allowed disabled:opacity-35">SAVE ACTIVE LOADOUT</button>
          <p className="mt-3 text-[10px] leading-relaxed text-muted">Games consume this saved lineup. If a card becomes unavailable, return here to repair the stale slot.</p>
        </aside>
      </div>
    </section>
  );
}

type PlayerOption = NonNullable<ReturnType<typeof playerCardForId>>;
type ActionOption = NonNullable<ReturnType<typeof actionCardForId>>;
type Pools = Record<string, PlayerOption[]>;

function SlotSelect({ label, value, options, used = [], update }: { label: string; value: string | null; options: { id: string; name?: string; shortName?: string; title?: string; rating?: number; power?: number }[]; used?: string[]; update: (value: string | null) => void }) {
  return <label className="block border border-border bg-surface-raised p-3"><span className="font-display text-2xs font-black tracking-wide text-muted">{label}</span><select value={value ?? ""} onChange={(event) => update(event.target.value || null)} className="mt-2 h-11 w-full border border-border-strong bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-accent-cyan"><option value="">— SELECT OWNED CARD —</option>{options.map((option) => <option key={option.id} value={option.id} disabled={used.includes(option.id) && option.id !== value}>{option.shortName ?? option.name ?? option.title} · {option.rating ?? option.power}</option>)}</select></label>;
}

function OrderedSlots({ label, count, values, options, update }: { label: string; count: number; values: string[]; options: PlayerOption[]; update: (values: string[]) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: count }, (_, index) => <SlotSelect key={index} label={`${label} ${index + 1}`} value={values[index] ?? null} options={options} used={values} update={(id) => { const next = [...values]; if (id) next[index] = id; else next.splice(index, 1); update(next); }} />)}</div>;
}

function SingleSlot({ label, value, options, update }: { label: string; value: string | null; options: PlayerOption[]; update: (value: string | null) => void }) { return <SlotSelect label={label} value={value} options={options} update={update} />; }

function FootballSlots({ value, pools, actions, update }: { value: Extract<SportLoadout, { sport: "football" }>; pools: Pools; actions: ActionOption[]; update: (value: SportLoadout) => void }) {
  return <><h2 className="font-display text-sm font-black tracking-wide text-accent-cyan">STARTING FIVE</h2><OrderedSlots label="ATTACKER" count={2} values={value.attackers} options={pools.attacker} update={(attackers) => update({ ...value, attackers })} /><OrderedSlots label="DEFENDER" count={2} values={value.defenders} options={pools.defender} update={(defenders) => update({ ...value, defenders })} /><SingleSlot label="GOALKEEPER" value={value.keeperId} options={pools.goalkeeper} update={(keeperId) => update({ ...value, keeperId })} /><h2 className="pt-3 font-display text-sm font-black tracking-wide text-accent-violet">ACTION HAND</h2><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <SlotSelect key={index} label={`ACTION ${index + 1}`} value={value.actionCardIds[index] ?? null} options={actions} used={value.actionCardIds} update={(id) => { const actionCardIds = [...value.actionCardIds]; if (id) actionCardIds[index] = id; else actionCardIds.splice(index, 1); update({ ...value, actionCardIds }); }} />)}</div></>;
}

function BasketballSlots({ value, pools, update }: { value: Extract<SportLoadout, { sport: "basketball" }>; pools: Pools; update: (value: SportLoadout) => void }) {
  const roles = [["GUARD", pools.basketballGuard], ["WING", pools.basketballWing], ["BIG", pools.basketballBig]] as const;
  return <><div className="grid gap-3 sm:grid-cols-3">{roles.map(([label, options], index) => <SlotSelect key={label} label={label} value={value.playerIds[index] ?? null} options={options} used={value.playerIds} update={(id) => { const playerIds = [...value.playerIds]; if (id) playerIds[index] = id; else playerIds.splice(index, 1); update({ ...value, playerIds, starterId: value.starterId && playerIds.includes(value.starterId) ? value.starterId : playerIds[0] ?? null }); }} />)}</div><SlotSelect label="SELECTED STARTER" value={value.starterId} options={value.playerIds.map(playerCardForId).filter((card) => card !== undefined)} update={(starterId) => update({ ...value, starterId })} /></>;
}
