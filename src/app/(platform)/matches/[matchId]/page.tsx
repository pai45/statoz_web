import Link from "next/link";
import { getMockMatch } from "@/features/matches/data/mock-match";
import { matchDetailFor } from "@/features/matches/data/match-detail-catalog";
import { MatchSummaryHeader } from "@/features/matches/components/match-summary-header";
import { MatchTabsView } from "@/features/matches/components/match-tabs-view";
import { MatchDetailContext } from "@/features/matches/components/match-detail-context";
import { allMockMatchIds } from "@/features/matches/data/fixtures";
import { ChevronLeftIcon } from "@/design-system";
import { notFound } from "next/navigation";

import styles from "@/features/matches/components/match-detail.module.css";

export function generateStaticParams() {
  return allMockMatchIds.map((matchId) => ({ matchId }));
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = await params;
  const match = getMockMatch(resolvedParams.matchId);

  if (!match) {
    notFound();
  }
  const detail = matchDetailFor(match);

  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.topBar}>
          <Link href="/" aria-label="Back to matches" className={styles.backLink}>
            <ChevronLeftIcon size={18} />
          </Link>
          <h1 className={styles.topTitle}>MATCH</h1>
        </header>

        <MatchSummaryHeader match={match} />
        <MatchTabsView match={match} detail={detail} />
        <MatchDetailContext match={match} />
      </div>
    </div>
  );
}
