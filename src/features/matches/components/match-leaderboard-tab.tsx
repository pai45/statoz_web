"use client";

import { useMemo, useState } from "react";

import { UnderlineTabs, accentVar } from "@/design-system";
import type { SportMatch } from "@/domain/matches";
import {
  boardPointsFor,
  rankedBoard,
  type MatchPredictionLeaderboardEntry,
  type PredictionQuiz,
  type UserPrediction,
} from "@/domain/predictions";
import { sportModuleFor } from "@/domain/sports";
import { CountdownPill, formatBoardCountdown } from "@/features/leaderboard/components/rank-parts";
import { RankPodium } from "@/features/leaderboard/components/rank-podium";
import { RankRow } from "@/features/leaderboard/components/rank-row";
import { RankUserBar } from "@/features/leaderboard/components/rank-user-bar";
import type { LeaderboardEntry } from "@/features/leaderboard/types";
import { predictionFor, usePredictions } from "@/features/predictions";
import { usePlayerStanding } from "@/features/profile";
import { matchDemoAnchor } from "@/mocks/matches";
import { useDemoNow } from "@/shared/hooks";

import type { MatchDetailData } from "../types";
import styles from "./match-detail.module.css";

/**
 * The TOPS tab: one prediction board per quiz set.
 *
 * The rivals are fielded by the fixture; the player only appears among them
 * once their own card has settled, which is why an unsettled entry reads as
 * pending rather than as a rank of zero. The rows themselves are the season
 * leaderboard's, so a rival looks the same here as they do there.
 */

const meta = { unit: "PTS" };

export function MatchLeaderboardTab({
  match,
  detail,
  onJoin,
}: {
  match: SportMatch;
  detail: MatchDetailData;
  onJoin?: () => void;
}) {
  const [quizId, setQuizId] = useState(detail.quizzes[0]?.id ?? "");
  const quiz = detail.quizzes.find((entry) => entry.id === quizId) ?? detail.quizzes[0];
  const predictions = usePredictions();
  const standing = usePlayerStanding();
  const accent = accentVar(sportModuleFor(match.sport).accent);
  // The shared clock keeps the pill ticking without disagreeing with the
  // server render, which cannot know what time it is on the client.
  const now = useDemoNow(matchDemoAnchor);
  const untilLock =
    match.status === "scheduled" && now != null
      ? Math.max(0, Date.parse(match.kickoff) - now) || null
      : null;

  const prediction = quiz ? predictionFor(predictions, match.id, quiz.id) : undefined;
  const entries = useMemo(
    () => (quiz ? boardEntries(detail.leaderboard[quiz.id] ?? [], quiz, prediction, standing.displayName) : []),
    [detail.leaderboard, quiz, prediction, standing.displayName],
  );

  if (!quiz) {
    return (
      <div className={styles.emptyState}>
        <strong>No leaderboard yet</strong>
        <p>Prediction leaderboards appear when quiz sets open.</p>
      </div>
    );
  }

  // A thin field skips the podium and lists everyone as flat rows.
  const usePodium = entries.length >= 3;
  const podium = usePodium ? entries.slice(0, 3) : [];
  const rest = usePodium ? entries.slice(3) : entries;
  const answered = prediction ? Object.keys(prediction.answers).length : 0;

  return (
    <div className={[styles.scrollPanel, styles.topsPanel].join(" ")}>
      {detail.quizzes.length > 1 ? (
        <UnderlineTabs
          label="Leaderboard quiz selector"
          className={styles.mainTabs}
          tabs={detail.quizzes.map((entry) => ({ id: entry.id, label: entry.title.toUpperCase() }))}
          activeIndex={detail.quizzes.findIndex((entry) => entry.id === quiz.id)}
          onChange={(index) => setQuizId(detail.quizzes[index].id)}
          accent={accentVar("gold")}
        />
      ) : null}

      <div className={styles.boardMeta}>
        {untilLock == null ? <span /> : <CountdownPill label="LOCKS IN" remaining={formatBoardCountdown(untilLock)} />}
        <span className="flex items-center gap-4.5">
          <MetaCell label="PREDICTIONS" value={`${answered}/${quiz.questions.length}`} color={accentVar("gold")} />
          <MetaCell label="PLAYERS" value={String(entries.length)} color={accent} />
        </span>
      </div>

      <div className={styles.boardState}>{boardModeLabel(match, prediction, quiz)}</div>

      {entries.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>{match.status === "scheduled" || prediction ? "Be the 1st to play" : "No players yet"}</strong>
          <p>
            {match.status === "scheduled" || prediction
              ? "Play this prediction quiz and set the rank to beat."
              : "No prediction quiz results were submitted before this board closed."}
          </p>
        </div>
      ) : (
        <>
          {usePodium ? <RankPodium entries={podium} meta={meta} accent={accent} /> : null}
          <section className={styles.rankList} aria-label="Leaderboard standings">
            {rest.map((entry) => (
              <RankRow key={entry.name} entry={entry} accent={accent} meta={meta} />
            ))}
          </section>
        </>
      )}

      <UserBar
        entries={entries}
        prediction={prediction}
        quiz={quiz}
        accent={accent}
        name={standing.displayName}
        onJoin={onJoin}
      />
    </div>
  );
}

/** The docked "where you stand" card, in its three states. */
function UserBar({
  entries,
  prediction,
  quiz,
  accent,
  name,
  onJoin,
}: {
  entries: LeaderboardEntry[];
  prediction: UserPrediction | undefined;
  quiz: PredictionQuiz;
  accent: string;
  name: string;
  onJoin?: () => void;
}) {
  const total = quiz.questions.length;
  const ranked = entries.find((entry) => entry.isUser);

  if (ranked) {
    return (
      <div className={styles.localRankBar}>
        <RankUserBar
          user={{ ...ranked, subtitle: `${prediction?.correctCount ?? 0} / ${total} CORRECT` }}
          meta={meta}
          accent={accent}
        />
      </div>
    );
  }

  const answered = prediction ? Object.keys(prediction.answers).length : 0;
  const pending = prediction != null;
  return (
    <div className={styles.localRankBar}>
      <RankUserBar
        user={{
          rank: 0,
          name,
          score: 0,
          movement: 0,
          isNew: false,
          isUser: true,
          xp: 0,
          subtitle: pending ? `${answered} / ${total} LOCKED · PENDING` : "PLAY THE QUIZ TO ENTER",
        }}
        meta={meta}
        accent={accent}
        label="Your standing"
        rankText={pending ? "#--" : "UNRANKED"}
        showScore={false}
        ctaLabel={pending ? undefined : "JOIN"}
        onOpen={pending ? undefined : onJoin}
      />
    </div>
  );
}

function MetaCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="grid justify-items-end">
      <small style={{ color: "var(--ds-color-text-muted)", fontSize: "8px", letterSpacing: "var(--ds-tracking-ultra)" }}>
        {label}
      </small>
      <b className="ds-tabular font-display" style={{ color, fontSize: "14px", marginTop: "3px" }}>
        {value}
      </b>
    </span>
  );
}

/**
 * The board rows. The player joins the field only once their card is settled —
 * before that there is no score to rank them by.
 */
function boardEntries(
  rivals: MatchPredictionLeaderboardEntry[],
  quiz: PredictionQuiz,
  prediction: UserPrediction | undefined,
  name: string,
): LeaderboardEntry[] {
  const field = [...rivals];
  if (prediction?.status === "settled") {
    const correct = prediction.correctCount ?? 0;
    const answered = Object.keys(prediction.answers).length;
    field.push({
      rank: 0,
      name,
      points: boardPointsFor(correct, quiz.questions.length, answered),
      correct,
      movement: 0,
      isUser: true,
      isNew: false,
    });
  }
  return rankedBoard(field).map((entry) => ({
    rank: entry.rank,
    name: entry.name,
    score: entry.points,
    movement: entry.movement,
    isNew: entry.isNew,
    badge: entry.badge,
    isUser: entry.isUser,
    xp: entry.points,
    subtitle: `${entry.correct} CORRECT`,
  }));
}

/** The state-driven caption over the board's hairline. */
function boardModeLabel(
  match: SportMatch,
  prediction: UserPrediction | undefined,
  quiz: PredictionQuiz,
): string {
  if (prediction?.status === "settled") return "FINAL RESULTS";
  if (match.status === "finished") {
    return prediction && quiz.questions.every((question) => question.forcedVoid || question.settledOptionIndex != null || question.settledHomeScore != null)
      ? "FINAL RANKS READY"
      : "MATCH CLOSED";
  }
  if (match.status === "live") return "LOCKED PICKS";
  if (prediction?.status === "locked") return "LOCKED IN · CROWD VOTES";
  if (prediction) return "DRAFT ACTIVE · REVIEW & LOCK";
  return "JOIN BEFORE LOCK";
}
