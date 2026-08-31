"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ComponentType } from "react";

import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  FlagIcon,
  LockIcon,
  PickIcon,
  QuizIcon,
  TrophyIcon,
  UnderlineTabs,
  accentVar,
  type IconProps,
} from "@/design-system";
import type { SportMatch } from "@/domain/matches";
import { sportModuleFor } from "@/domain/sports";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { MatchPicksPanel } from "@/features/picks";

import type {
  MatchDetailBoardEntry,
  MatchDetailData,
  MatchDetailQuiz,
} from "../types";
import { MatchScoreboard } from "./match-scoreboard";
import styles from "./match-detail.module.css";

type MainTab = "predict" | "picks" | "tops" | "stats";

const mainTabs: { id: MainTab; label: string; icon: ComponentType<IconProps> }[] = [
  { id: "predict", label: "PREDICT", icon: QuizIcon },
  { id: "picks", label: "PICKS", icon: PickIcon },
  { id: "tops", label: "TOPS", icon: TrophyIcon },
  { id: "stats", label: "STATS", icon: FlagIcon },
];

export function MatchTabsView({ match, detail }: { match: SportMatch; detail: MatchDetailData }) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const [activeTab, setActiveTab] = useState<MainTab>("predict");
  useEffect(() => {
    if (window.location.hash !== "#picks") return;
    const task = window.setTimeout(() => setActiveTab("picks"), 0);
    return () => window.clearTimeout(task);
  }, []);
  const activeIndex = mainTabs.findIndex((tab) => tab.id === activeTab);
  const accent = accentVar(sportModuleFor(match.sport).accent);
  const tabs = mainTabs.map(({ id, label, icon: Icon }) => ({
    id,
    label,
    icon: <span className={styles.mainTabLabel}><Icon size={15} aria-hidden="true" /><span>{label}</span></span>,
  }));

  return (
    <section className={styles.tabsBody} aria-label="Match content">
      <UnderlineTabs
        label="Match detail tabs"
        className={styles.mainTabs}
        tabs={tabs}
        activeIndex={activeIndex}
        onChange={(index) => setActiveTab(mainTabs[index].id)}
        accent={accent}
      />

      <div className={styles.tabPanel}>
        {activeTab === "predict" ? <PredictTab match={match} quizzes={detail.quizzes} guest={session.status === "guest"} onStart={() => requireAuth({ intent: "predict", message: "Log in to answer match missions and save your prediction history." })} /> : null}
        {activeTab === "picks" ? <MatchPicksPanel matchId={match.id} /> : null}
        {activeTab === "tops" ? <TopsTab match={match} detail={detail} /> : null}
        {activeTab === "stats" ? <MatchScoreboard match={match} scoreboard={detail.scoreboard} /> : null}
      </div>
    </section>
  );
}

function PredictTab({ match, quizzes, guest, onStart }: { match: SportMatch; quizzes: MatchDetailQuiz[]; guest: boolean; onStart: () => void }) {
  const seconds = useLockCountdown(match.kickoff);
  const mobileLockLabel = match.status === "live"
    ? "PREDICTIONS LOCKED"
    : match.status === "finished"
      ? "MATCH COMPLETE"
      : `LOCKS IN ${formatRemaining(seconds)}`;
  const desktopLockLabel = match.status === "live"
    ? "LIVE QUIZZES LOCKED"
    : mobileLockLabel;

  return (
    <div className={[styles.scrollPanel, styles.predictPanel].join(" ")}>
      <div
        className={[
          styles.lockLine,
          match.status === "live" ? styles.lockLineLive : "",
        ].filter(Boolean).join(" ")}
        role="status"
      >
        <span className={styles.lockPulse} aria-hidden="true" />
        <LockIcon className={styles.lockIcon} size={13} aria-hidden="true" />
        <span className={styles.mobileLockLabel}>{mobileLockLabel}</span>
        <span className={styles.desktopLockLabel}>{desktopLockLabel}</span>
      </div>

      <div className={styles.quizList}>
        {quizzes.map((quiz, index) => (
          <QuizHubCard key={quiz.id} quiz={quiz} index={index + 1} homeColor={match.home.color} awayColor={match.away.color} guest={guest} onStart={onStart} />
        ))}
      </div>
    </div>
  );
}

function QuizHubCard({
  quiz,
  index,
  homeColor,
  awayColor,
  guest,
  onStart,
}: {
  quiz: MatchDetailQuiz;
  index: number;
  homeColor: string;
  awayColor: string;
  guest: boolean;
  onStart: () => void;
}) {
  const visual = quizVisual(quiz);
  const progress = Math.min(100, Math.round((quiz.answered / quiz.questions) * 100));
  const Icon = quiz.id.includes("event") ? BoltIcon : QuizIcon;

  return (
    <article
      className={[
        styles.quizCard,
        styles[`quizCard${quiz.state[0].toUpperCase()}${quiz.state.slice(1)}`],
        quiz.state === "finished" ? styles.quizCardFinished : "",
      ].filter(Boolean).join(" ")}
      style={{ "--home-color": homeColor, "--away-color": awayColor, "--card-accent": visual.accent } as CSSProperties}
    >
      <div className={styles.quizHardShadow} aria-hidden="true" />
      <div className={styles.quizFrame}>
        <div className={styles.quizWashes} aria-hidden="true" />
        <div className={styles.quizTopline}>
          <span className={styles.missionPlate}>M{String(index).padStart(2, "0")}</span>
          <span className={[styles.stateTag, styles[`stateTag${visual.tag}`]].join(" ")}>{visual.tag}</span>
          <span className={styles.rewardPill}>
            <BoltIcon size={12} aria-hidden="true" />
            {quiz.rewardXp} XP
          </span>
        </div>

        <div className={styles.quizHeading}>
          <span className={styles.quizGlyph}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <div>
            <h2>{quiz.title}</h2>
            <p>{quiz.subtitle}</p>
          </div>
        </div>

        {quiz.contest ? (
          <div className={styles.contestStrip}>
            <span className={styles.contestChip}>CONTEST</span>
            <span>{quiz.contest.entryLabel}</span>
            <strong>{quiz.contest.prizeLabel}</strong>
          </div>
        ) : null}

        <div className={styles.quizMeter} aria-label={`${quiz.answered} of ${quiz.questions} questions answered`}>
          <span className={styles.meterTrack}><i style={{ width: `${progress}%` }} /></span>
          <b>{quiz.answered}/{quiz.questions}</b>
        </div>
        <div className={styles.hudDivider} aria-hidden="true" />
        <button type="button" className={styles.quizCta} disabled={quiz.state !== "open"} onClick={quiz.state === "open" ? onStart : undefined}>
          <span>{guest && quiz.state === "open" ? "LOG IN TO START" : visual.action}</span>
          {quiz.state === "finished" ? <CheckIcon size={16} aria-hidden="true" /> : <ArrowRightIcon size={16} aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}

function TopsTab({ match, detail }: { match: SportMatch; detail: MatchDetailData }) {
  const [quizId, setQuizId] = useState(detail.quizzes[0]?.id ?? "");
  const quiz = detail.quizzes.find((entry) => entry.id === quizId) ?? detail.quizzes[0];
  if (!quiz) return null;
  const entries = detail.leaderboard[quiz.id] ?? [];
  const podium = entries.slice(0, 3);
  const rows = entries.slice(3);
  const boardMode = match.status === "finished"
    ? "FINAL RESULTS"
    : match.status === "live"
      ? "LOCKED PICKS"
      : "JOIN BEFORE LOCK";

  return (
    <div className={[styles.scrollPanel, styles.topsPanel].join(" ")}>
      <div className={styles.quizBoardTabs} role="tablist" aria-label="Leaderboard quiz selector">
        {detail.quizzes.map((entry) => (
          <button key={entry.id} type="button" role="tab" aria-selected={entry.id === quiz.id} className={entry.id === quiz.id ? styles.quizBoardTabActive : ""} onClick={() => setQuizId(entry.id)}>
            {entry.title}
          </button>
        ))}
      </div>
      <div className={styles.boardMeta}>
        <span><TrophyIcon size={16} aria-hidden="true" /> {quiz.title.toUpperCase()}</span>
        <span>{entries.length + 48} PLAYERS · {quiz.questions} PREDICTIONS</span>
      </div>

      <div className={styles.boardState}>{boardMode}</div>

      <section className={styles.podium} aria-label="Top three">
        {[podium[1], podium[0], podium[2]].map((entry, slot) => entry ? <PodiumSpot key={entry.name} entry={entry} rank={entry.rank} slot={slot} /> : null)}
      </section>

      <section className={styles.rankList} aria-label="Leaderboard standings">
        {rows.map((entry) => <RankRow key={entry.name} entry={entry} />)}
      </section>

      <div className={styles.localRankBar}>
        <span className={styles.localRank}>#42</span>
        <Avatar name="YOU" rank={42} />
        <span className={styles.localPlayer}>YOU <small>7 CORRECT</small></span>
        <strong>1,240</strong>
        <span className={styles.rankMoveUp}>↑ 6</span>
      </div>
    </div>
  );
}

function PodiumSpot({ entry, rank, slot }: { entry: MatchDetailBoardEntry; rank: number; slot: number }) {
  return (
    <article className={[styles.podiumSpot, rank === 1 ? styles.podiumFirst : "", styles[`podiumSlot${slot}`]].filter(Boolean).join(" ")}>
      <Avatar name={entry.name} rank={rank} />
      <span className={styles.podiumName}>{entry.name}</span>
      <span className={styles.podiumPoints}>{entry.points.toLocaleString()}</span>
      <span className={styles.podiumBase}>#{rank}</span>
    </article>
  );
}

function RankRow({ entry }: { entry: MatchDetailBoardEntry }) {
  return (
    <article className={styles.rankRow}>
      <span className={styles.rankNumber}>#{entry.rank}</span>
      <Avatar name={entry.name} rank={entry.rank} />
      <div className={styles.rankIdentity}>
        <strong>{entry.name}</strong>
        <small>{entry.badge ?? `${entry.correct} CORRECT`}</small>
      </div>
      <strong className={styles.rankPoints}>{entry.points.toLocaleString()}</strong>
      <span className={entry.movement > 0 ? styles.rankMoveUp : entry.movement < 0 ? styles.rankMoveDown : styles.rankMoveFlat}>
        {entry.movement > 0 ? `↑ ${entry.movement}` : entry.movement < 0 ? `↓ ${Math.abs(entry.movement)}` : "—"}
      </span>
    </article>
  );
}

function Avatar({ name, rank }: { name: string; rank: number }) {
  const avatars = ["adams", "bellingham", "raphinha", "camavinga", "ndiaye", "rodri"];
  const avatar = avatars[nameHash(name) % avatars.length];
  return <Image className={styles.avatar} src={`/assets/avatars/${avatar}.webp`} alt="" width={40} height={40} priority={rank <= 3} />;
}

function quizVisual(quiz: MatchDetailQuiz) {
  if (quiz.state === "finished") return { accent: "var(--color-success)", tag: "DONE", action: "VIEW RESULTS" };
  if (quiz.state === "locked") return { accent: "var(--color-warning)", tag: "LOCKED", action: "LOCKED" };
  return { accent: "var(--color-primary)", tag: "OPEN", action: quiz.answered > 0 ? "CONTINUE QUIZ" : "PLAY QUIZ" };
}

function useLockCountdown(kickoff: string) {
  // Match fixtures are mock data anchored to the catalog's demo date; using the
  // same reference on both server and client keeps the Flutter-like HUD stable.
  const [seconds] = useState(() => Math.max(0, Math.floor((new Date(kickoff).getTime() - new Date("2026-08-25T00:00:00.000Z").getTime()) / 1000)));
  return seconds;
}

function formatRemaining(seconds: number) {
  if (seconds <= 0) return "SOON";
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return hours > 0 ? `${hours}H ${minutes}M` : `${minutes}M`;
}

function nameHash(value: string) {
  return [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0) >>> 0;
}
