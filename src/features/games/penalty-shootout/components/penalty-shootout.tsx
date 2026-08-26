"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { accentVar, Button, withAlpha } from "@/design-system";
import {
  footballAttackers,
  footballDefenders,
  footballGoalkeepers,
  footballPlayerCards,
  useClaimedPacks,
} from "@/features/packs";
import type { PlayerCard } from "@/domain/cards";

import type { GameEntry } from "../../data/game-registry";
import { sportForGame } from "../../data/sport-decks";
import type { GameId } from "../../types";
import { randomOpponentName } from "../../shared/data/opponent-names";
import { generateShootoutOpponent } from "../engine/opponent";
import { initialShootout, shootoutReducer } from "../engine/shootout";
import {
  levelFromXp,
  readShootoutProgress,
  recordShootout,
} from "../state/shootout-progress";
import type { PenaltyDirection, ShootoutSquads } from "../types";

import { KickPhase } from "./kick-phase";
import { LineupPhase } from "./lineup-phase";
import { OpponentRevealPhase } from "./opponent-reveal-phase";
import styles from "./penalty-shootout.module.css";
import { ShootoutLobby } from "./shootout-lobby";
import { SummaryPhase } from "./summary-phase";

/**
 * Penalty Shootout.
 *
 * The game opens on its lobby and enters the shootout from there, the way
 * Flutter's hub holds an `AppSection` and swaps the home screen for the match.
 * Quitting and finishing both come back here rather than leaving the game, so
 * the lobby is the one place a session begins and ends.
 */

export type PenaltyShootoutProps = {
  game: GameId;
  entry: GameEntry;
};

type View = "lobby" | "playing";

export function PenaltyShootout({ game, entry }: PenaltyShootoutProps) {
  const [view, setView] = useState<View>("lobby");
  const [session, setSession] = useState(0);
  const claimed = useClaimedPacks();
  const gamesHref = `/games/${sportForGame(game)}`;

  const squad = useMemo(
    () => squadFromClaim(claimed.football?.playerCardIds),
    [claimed.football?.playerCardIds],
  );

  const play = useCallback(() => {
    setSession((value) => value + 1);
    setView("playing");
  }, []);

  if (view !== "playing" || squad === null) {
    return (
      <ShootoutLobby
        squadReady={squad !== null}
        onPlay={play}
        backHref={gamesHref}
      />
    );
  }

  return (
    <ShootoutSession
      key={session}
      squad={squad}
      entry={entry}
      onPlayAgain={play}
      onHome={() => setView("lobby")}
    />
  );
}

/**
 * The player's five takers: two attackers, two defenders, then the keeper.
 *
 * Flutter reads them off the active deck built in the Deck Builder. There is no
 * deck builder here yet, but the football starter pack deals exactly that
 * shape, and the pack gate has already run by the time this mounts — so the
 * cards the player was actually given are the cards they take penalties with.
 *
 * Returning null is the web's `deckReady == false`: the lobby says the squad is
 * incomplete and holds the CTA rather than fielding a squad nobody picked.
 */
function squadFromClaim(
  playerCardIds: string[] | undefined,
): PlayerCard[] | null {
  if (!playerCardIds || playerCardIds.length === 0) return null;

  const owned = playerCardIds
    .map((id) => footballPlayerCards.find((card) => card.id === id))
    .filter((card): card is PlayerCard => card !== undefined);

  const attackers = owned.filter((card) => card.role === "attacker").slice(0, 2);
  const defenders = owned.filter((card) => card.role === "defender").slice(0, 2);
  const keeper = owned.find((card) => card.role === "goalkeeper");

  if (attackers.length < 2 || defenders.length < 2 || !keeper) return null;
  return [...attackers, ...defenders, keeper];
}

function buildSquads(playerShooters: PlayerCard[]): ShootoutSquads {
  const level = levelFromXp(readShootoutProgress().xp);
  const cpu = generateShootoutOpponent(
    level,
    footballAttackers,
    footballDefenders,
    footballGoalkeepers,
  );

  return {
    playerShooters,
    playerKeeper: playerShooters[playerShooters.length - 1],
    cpuShooters: cpu.shooters,
    cpuKeeper: cpu.keeper,
    cpuLevel: level,
    opponentName: randomOpponentName(),
  };
}

type SessionProps = {
  squad: PlayerCard[];
  entry: GameEntry;
  onPlayAgain: () => void;
  onHome: () => void;
};

function ShootoutSession({ squad, entry, onPlayAgain, onHome }: SessionProps) {
  // Drawn once, in the browser, when the session mounts — never during a
  // server render, where the roll would differ from the client's.
  const [state, dispatch] = useReducer(shootoutReducer, squad, (cards) =>
    initialShootout(buildSquads(cards)),
  );

  const [award, setAward] = useState({ xp: 0, total: 0 });
  const recorded = useRef(false);
  const [quitting, setQuitting] = useState(false);

  // XP is applied the instant the result is decided, before the summary — the
  // same beat Flutter dispatches `ShootoutFinished` on, and guarded the same
  // way so a re-render cannot pay out twice.
  useEffect(() => {
    if (!state.over || recorded.current) return;
    recorded.current = true;

    const gained = recordShootout({
      won: state.winner === "player",
      margin: Math.abs(state.playerScore - state.opponentScore),
      playerScore: state.playerScore,
      opponentScore: state.opponentScore,
      opponentName: state.opponentName,
      suddenDeath: state.suddenDeath,
    });
    setAward({ xp: gained, total: readShootoutProgress().xp });
  }, [
    state.over,
    state.winner,
    state.playerScore,
    state.opponentScore,
    state.opponentName,
    state.suddenDeath,
  ]);

  const onQuit = useCallback(() => {
    const inProgress =
      !state.over &&
      state.stage !== "opponentReveal" &&
      state.stage !== "lineup" &&
      state.stage !== "summary";

    if (inProgress) setQuitting(true);
    else onHome();
  }, [onHome, state.over, state.stage]);

  const onSelect = useCallback(
    (direction: PenaltyDirection) =>
      dispatch({ type: "directionSelected", direction }),
    [],
  );
  const onNextKick = useCallback(() => dispatch({ type: "nextKick" }), []);

  return (
    <>
      <div key={state.stage} className={styles.enter}>
        {state.stage === "opponentReveal" ? (
          <OpponentRevealPhase
            state={state}
            onComplete={() => dispatch({ type: "opponentRevealCompleted" })}
            onQuit={onQuit}
          />
        ) : state.stage === "lineup" ? (
          <LineupPhase
            state={state}
            onStart={() => dispatch({ type: "started" })}
            onQuit={onQuit}
          />
        ) : state.stage === "summary" ? (
          <SummaryPhase
            state={state}
            xpGained={award.xp}
            totalXp={award.total}
            onPlayAgain={onPlayAgain}
            onHome={onHome}
          />
        ) : (
          <KickPhase
            state={state}
            onSelect={onSelect}
            onConfirm={() => dispatch({ type: "kickConfirmed" })}
            onNextKick={onNextKick}
            onSummary={() => dispatch({ type: "summaryShown" })}
            onQuit={onQuit}
          />
        )}
      </div>

      {quitting ? (
        <QuitDialog
          title={entry.title}
          onCancel={() => setQuitting(false)}
          onConfirm={onHome}
        />
      ) : null}
    </>
  );
}

/** Leaving mid-shootout throws the progress away, so it has to be asked. */
function QuitDialog({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quit ${title}`}
      className="fixed inset-0 z-50 grid place-items-center p-6"
      style={{ background: "var(--ds-color-overlay-scrim)" }}
    >
      <div
        className="w-full max-w-80 p-5"
        style={{
          background: "var(--ds-color-background-elevated)",
          border: `1px solid ${withAlpha(accentVar("cyan"), 0.35)}`,
          boxShadow: "var(--ds-shadow-panel)",
        }}
      >
        <h2
          className="font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-lg)",
            letterSpacing: "var(--ds-tracking-label)",
          }}
        >
          QUIT SHOOTOUT?
        </h2>
        <p
          className="mt-2 font-medium leading-body text-muted"
          style={{ fontSize: "var(--ds-text-sm)" }}
        >
          Your current shootout progress will be lost.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            variant="solid"
            accent="var(--ds-color-danger)"
            size="md"
            fullWidth
            onClick={onConfirm}
          >
            QUIT
          </Button>
          <Button
            variant="ghost"
            accent={accentVar("cyan")}
            size="md"
            fullWidth
            onClick={onCancel}
          >
            KEEP PLAYING
          </Button>
        </div>
      </div>
    </div>
  );
}
