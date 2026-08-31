import type { Metadata } from "next";

import { LeaderboardScreen } from "@/features/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard | StatOz",
  description:
    "Where you stand: the match-day board, the tournament rankings for players and teams, and the game-mode boards.",
};

export default function LeaderboardPage() {
  return <LeaderboardScreen />;
}
