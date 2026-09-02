"use client";

import { useEffect, useState, type ComponentType } from "react";

import {
  FlagIcon,
  PickIcon,
  QuizIcon,
  TrophyIcon,
  UnderlineTabs,
  accentVar,
  type IconProps,
} from "@/design-system";
import type { SportMatch } from "@/domain/matches";
import { sportModuleFor } from "@/domain/sports";
import { MatchPicksPanel } from "@/features/picks";
import { MatchPredictTab } from "@/features/predictions";

import type { MatchDetailData } from "../types";
import { MatchLeaderboardTab } from "./match-leaderboard-tab";
import { MatchScoreboard } from "./match-scoreboard";
import styles from "./match-detail.module.css";

/**
 * The four match surfaces: the quizzes, the markets on the same fixture, the
 * board those quizzes rank, and the scoreboard.
 *
 * The tabs know about each other in exactly two places, both of which the app
 * has too: TOPS hands an unranked player to PREDICT, and PREDICT hands a
 * finished draft to PICKS.
 */

type MainTab = "predict" | "picks" | "tops" | "stats";

const mainTabs: { id: MainTab; label: string; icon: ComponentType<IconProps> }[] = [
  { id: "predict", label: "PREDICT", icon: QuizIcon },
  { id: "picks", label: "PICKS", icon: PickIcon },
  { id: "tops", label: "TOPS", icon: TrophyIcon },
  { id: "stats", label: "STATS", icon: FlagIcon },
];

export function MatchTabsView({ match, detail }: { match: SportMatch; detail: MatchDetailData }) {
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
    icon: (
      <span className={styles.mainTabLabel}>
        <Icon size={15} aria-hidden="true" />
        <span>{label}</span>
      </span>
    ),
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
        {activeTab === "predict" ? (
          <MatchPredictTab
            match={match}
            quizzes={detail.quizzes}
            onOpenPicks={() => setActiveTab("picks")}
          />
        ) : null}
        {activeTab === "picks" ? <MatchPicksPanel matchId={match.id} /> : null}
        {activeTab === "tops" ? (
          <MatchLeaderboardTab match={match} detail={detail} onJoin={() => setActiveTab("predict")} />
        ) : null}
        {activeTab === "stats" ? <MatchScoreboard match={match} scoreboard={detail.scoreboard} /> : null}
      </div>
    </section>
  );
}
