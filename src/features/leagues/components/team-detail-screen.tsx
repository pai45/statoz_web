"use client";

import type { CSSProperties } from "react";

import { EventBusyIcon, InsightsIcon, NoDataState } from "@/design-system";
import type { LeagueHubSnapshot, LeagueStandingRow } from "@/domain/leagues";
import type { SportMatch, SportTeam } from "@/domain/matches";
import type { PickMarket } from "@/domain/predictions";
import { SportFixtureCard, TeamBadge } from "@/features/matches";
import { PickMarketCard, selectPositionsForMarket, usePickTrading, usePicks } from "@/features/picks";

import { DetailTopBar, SectionHeading } from "./league-hub-screen";
import styles from "./league-hub.module.css";

export function TeamDetailScreen({ snapshot, competitor, fixtures, markets }: { snapshot: LeagueHubSnapshot; competitor: SportTeam; fixtures: SportMatch[]; markets: PickMarket[] }) {
  const picks = usePicks();
  const trading = usePickTrading();
  const standing = snapshot.groups.flatMap((group) => group.rows).find((row) => row.competitor.id === competitor.id);
  return (
    <div className={styles.teamPage} style={{ "--league-accent": snapshot.accent } as CSSProperties}>
      <DetailTopBar title={`${snapshot.shortCode} · ${competitor.shortName}`} fallback={`/leagues/${snapshot.id}`} />
      <main className={styles.teamContent}>
        <TeamHeader competitor={competitor} standing={standing} />
        <section><SectionHeading label="PREDICTION CENTER" />{fixtures.length ? <ul className={styles.cardGrid}>{fixtures.map((match) => <li key={match.id}><SportFixtureCard match={match} /></li>)}</ul> : <NoDataState icon={EventBusyIcon} title="No fixtures" message="No fixtures for this competitor yet — check back on match day." />}</section>
        <section><SectionHeading label="PICKS CENTER" />{markets.length ? <div className={styles.cardGrid}>{markets.map((market) => <PickMarketCard key={market.id} market={market} positions={selectPositionsForMarket(picks, market.id)} onPick={(selected, outcomeId) => trading.openTrade(selected, outcomeId)} onClaim={trading.claim} />)}</div> : <NoDataState icon={InsightsIcon} title="No markets" message="No markets for this competitor." />}</section>
      </main>
      {trading.overlays}
    </div>
  );
}

function TeamHeader({ competitor, standing }: { competitor: SportTeam; standing?: LeagueStandingRow }) {
  const points = standing?.metrics.pts;
  return (
    <header className={styles.teamHeader}>
      <TeamBadge team={competitor} size={54} />
      <span><h1>{competitor.name}</h1>{standing ? <div className={styles.teamMeta}><b>RANK #{standing.rank}{points == null ? "" : ` · ${points} PTS`}</b><FormPips form={standing.form ?? ""} /></div> : null}</span>
    </header>
  );
}

function FormPips({ form }: { form: string }) {
  return <span className={styles.formPips}>{form.split("").map((result, index) => <i key={`${result}-${index}`} data-result={result}>{result}</i>)}</span>;
}
