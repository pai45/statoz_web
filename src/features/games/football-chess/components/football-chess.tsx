"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { settleCoinReward } from "@/features/economy";
import {
  footballAttackers,
  footballDefenders,
  footballGoalkeepers,
  footballPlayerCards,
} from "@/features/packs";
import { useDecks } from "@/features/cards-decks";
import type { PlayerCard } from "@/domain/cards";

import { randomOpponentName } from "../../shared/data/opponent-names";
import { generateShootoutOpponent } from "../../shared/engine/opponent";
import { sportForGame, type GameEntry } from "@/mocks/games";
import type { GameId } from "../../types";
import { isDraw, isFinished, playerWon } from "../engine/match";
import {
  readFootballChessStats,
  recordFootballChess,
  saveFormation,
  useFootballChessStats,
  useIsHydrated,
} from "../state/football-chess-progress";
import { useMatch, useMatchRandom } from "../state/use-match";
import type { BoardActionType, BoardCell, ChessFormation } from "../types";

import { ChessBoard } from "./chess-board";
import { ChessLobby } from "./chess-lobby";
import { ChessResult } from "./chess-result";
import {
  ActionBar,
  CentreFlash,
  ChessHud,
  DecisionTimer,
  GoalFlash,
  OpponentToast,
} from "./chess-chrome";
import { TossPhase } from "./toss-phase";

import styles from "./football-chess.module.css";

/**
 * 5v5 Football Chess — a two-minute grid duel, one action a turn.
 *
 * The orchestrator owns the lobby/session swap and nothing else. A rematch is a
 * new `key` rather than a reset, so the reducer, the clock and every timer come
 * up fresh without a state-resetting effect.
 */

export type FootballChessProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The five the football loadout fields, in the order the engine wants:
 * `[atk, atk, def, def, gk]`. Anything short of a full 5-a-side deck holds the
 * CTA rather than fielding a broken side.
 */
function squadFromLoadout(loadout: {
  attackers: string[];
  defenders: string[];
  keeperId: string | null;
} | undefined): PlayerCard[] | null {
  if (loadout === undefined || loadout.keeperId === null) return null;
  const find = (id: string) => footballPlayerCards.find((card) => card.id === id);

  const attackers = loadout.attackers.map(find).filter((c): c is PlayerCard => c !== undefined);
  const defenders = loadout.defenders.map(find).filter((c): c is PlayerCard => c !== undefined);
  const keeper = find(loadout.keeperId);

  if (attackers.length < 2 || defenders.length < 2 || keeper === undefined) return null;
  return [attackers[0], attackers[1], defenders[0], defenders[1], keeper];
}

export function FootballChess({ game }: FootballChessProps) {
  const [view, setView] = useState<"lobby" | "playing">("lobby");
  const [session, setSession] = useState(0);
  const decks = useDecks();
  const hydrated = useIsHydrated();
  const stats = useFootballChessStats();
  const gamesHref = `/games/${sportForGame(game)}`;

  const squad = useMemo(
    () => squadFromLoadout(decks.loadouts.football),
    [decks.loadouts.football],
  );

  const play = useCallback(() => {
    setSession((value) => value + 1);
    setView("playing");
  }, []);

  if (view !== "playing" || squad === null) {
    return (
      <ChessLobby
        stats={stats}
        formation={stats.formation}
        squadReady={squad !== null && hydrated}
        backHref={gamesHref}
        onFormationChange={(formation) => saveFormation(formation)}
        onPlay={play}
      />
    );
  }

  return (
    <FootballChessSession
      key={session}
      squad={squad}
      formation={stats.formation}
      backHref={gamesHref}
      onPlayAgain={play}
      onExit={() => setView("lobby")}
    />
  );
}

/* ---- One match ------------------------------------------------------------ */

type SessionProps = {
  squad: PlayerCard[];
  formation: ChessFormation;
  backHref: string;
  onPlayAgain: () => void;
  onExit: () => void;
};

function FootballChessSession({
  squad,
  formation,
  onPlayAgain,
  onExit,
}: SessionProps) {
  const sources = useMatchRandom();

  // Drawn once, in the browser: the rival's name, level and squad are all rolls,
  // and a roll during a server render would differ from the client's.
  const [setup] = useState(() => {
    const level = 5;
    const opponentLevel = Math.min(99, Math.max(1, level + Math.floor(Math.random() * 4) - 1));
    const opponent = generateShootoutOpponent(
      opponentLevel,
      footballAttackers,
      footballDefenders,
      footballGoalkeepers,
    );
    return {
      opponentName: randomOpponentName(),
      opponentLevel,
      opponentSquad: opponent.shooters,
    };
  });

  const [award, setAward] = useState({ xp: 0, coins: 0 });
  const [resultShown, setResultShown] = useState(false);
  const recorded = useRef(false);

  const { match, dispatch } = useMatch(
    {
      playerSquad: squad,
      formation,
      opponentSquad: setup.opponentSquad,
      opponentName: setup.opponentName,
      opponentLevel: setup.opponentLevel,
    },
    sources,
  );

  // Settled the instant full time lands, and guarded so a re-render cannot pay
  // out twice — the same beat Flutter dispatches its XP on.
  useEffect(() => {
    if (!isFinished(match) || recorded.current) return;
    recorded.current = true;

    const won = playerWon(match);
    const draw = isDraw(match);
    const margin = Math.abs(match.playerScore - match.opponentScore);
    const xp = recordFootballChess(won, draw, margin);
    const coins = won ? 50 : draw ? 20 : 10;
    settleCoinReward({
      // Minted here rather than during render: it is only needed once, and the
      // `recorded` guard is what actually keeps the payout idempotent.
      id: `football-chess-${Date.now()}-${Math.random()}`,
      coins,
      title: "5V5 FOOTBALL CHESS",
      subtitle: `${won ? "WIN" : draw ? "DRAW" : "LOSS"} ${match.playerScore}-${match.opponentScore}`,
    });
    setAward({ xp, coins });
    setResultShown(true);
  }, [match]);

  const onTapCell = useCallback(
    (cell: BoardCell) => dispatch({ type: "tapCell", cell }),
    [dispatch],
  );
  const onChoose = useCallback(
    (verb: BoardActionType) => dispatch({ type: "chooseAction", verb }),
    [dispatch],
  );

  return (
    <div className="relative flex min-h-dvh flex-col items-center">
      {/*
        * The column widens at the breakpoint where the board turns horizontal,
        * but the score bar and the action deck stay on the narrow measure — a
        * 900px-wide row of three chips reads as scattered, not spacious.
        */}
      <div className="relative flex min-h-dvh w-full max-w-120 flex-col lg:max-w-265">
        <div className="mx-auto w-full max-w-120">
          <ChessHud match={match} onExit={onExit} />
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-2">
          <ChessBoard
            match={match}
            interactive={match.phase === "playerTurn"}
            onTapCell={onTapCell}
          />
          <GoalFlash match={match} />
          <CentreFlash match={match} />
          <OpponentToast match={match} />
        </div>

        <div
          className="mx-auto w-full max-w-120 shrink-0 pb-5"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <DecisionTimer match={match} />
          <ActionBar match={match} onChoose={onChoose} />
        </div>

        {match.phase === "toss" ? (
          <TossPhase
            match={match}
            onCall={(call) => dispatch({ type: "callToss", call })}
            onBeginPlay={() => dispatch({ type: "beginPlay" })}
            onQuit={onExit}
          />
        ) : null}

        {resultShown ? (
          <ChessResult
            match={match}
            xpGained={award.xp}
            coinsGained={award.coins}
            stats={readFootballChessStats()}
            onPlayAgain={onPlayAgain}
            onExit={onExit}
          />
        ) : null}
      </div>

      {/* Desktop only: the board is tap-driven, so say what the keys do. */}
      <p
        className={`${styles.enter} pointer-events-none absolute bottom-6 left-6 hidden font-bold leading-body text-muted lg:block`}
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        TAB TO A SQUARE · ENTER TO SELECT
        <br />PICK A VERB, THEN A TARGET SQUARE
      </p>
    </div>
  );
}
