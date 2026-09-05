"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type CSSProperties, type ComponentType } from "react";

import {
  BasketballIcon,
  ChevronLeftIcon,
  CricketIcon,
  EventBusyIcon,
  FootballIcon,
  FormatListNumberedIcon,
  HudPanel,
  InsightsIcon,
  MedalIcon,
  MotorsportIcon,
  NoDataState,
  TennisIcon,
  UnderlineTabs,
  type IconProps,
  type UnderlineTab,
} from "@/design-system";
import type {
  LeagueHubSnapshot,
  LeagueHubTab,
  LeagueLeaderCategory,
  LeagueStandingGroup,
  LeagueStandingRow,
} from "@/domain/leagues";
import type { SportMatch } from "@/domain/matches";
import type { PickMarket } from "@/domain/predictions";
import type { Sport } from "@/domain/sports";
import { SportFixtureCard, TeamBadge } from "@/features/matches";
import {
  PickMarketCard,
  selectPositionsForMarket,
  usePickTrading,
  usePicks,
} from "@/features/picks";

import styles from "./league-hub.module.css";

const validTabs: LeagueHubTab[] = ["table", "leaders", "games", "picks"];

export function LeagueHubScreen({
  snapshot,
  fixtures,
  markets,
}: {
  snapshot: LeagueHubSnapshot;
  fixtures: SportMatch[];
  markets: PickMarket[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab") as LeagueHubTab | null;
  const tab: LeagueHubTab = requested && validTabs.includes(requested) ? requested : "table";
  const activeIndex = validTabs.indexOf(tab);
  const tabs: UnderlineTab[] = [
    { id: "table", label: "TABLE", icon: <FormatListNumberedIcon size={21} /> },
    { id: "leaders", label: "LEADERS", icon: <MedalIcon size={21} /> },
    { id: "games", label: "GAMES", icon: <LeagueSportIcon sport={snapshot.sport} size={21} /> },
    { id: "picks", label: "PICKS", icon: <InsightsIcon size={21} /> },
  ];

  function selectTab(index: number) {
    const next = validTabs[index];
    router.replace(next === "table" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <div className={styles.page} style={{ "--league-accent": snapshot.accent } as CSSProperties}>
      <div className={styles.chrome}>
        <DetailTopBar title={`${snapshot.shortCode} HUB`} fallback="/" />
        <LeagueHeader snapshot={snapshot} />
        <UnderlineTabs
          label={`${snapshot.name} sections`}
          tabs={tabs}
          activeIndex={activeIndex}
          accent={snapshot.accent}
          onChange={selectTab}
          className={styles.primaryTabs}
        />
      </div>

      <main className={styles.content} key={tab} role="tabpanel" aria-label={tabs[activeIndex].label}>
        {tab === "table" ? <TableTab snapshot={snapshot} /> : null}
        {tab === "leaders" ? <LeadersTab snapshot={snapshot} /> : null}
        {tab === "games" ? <GamesTab fixtures={fixtures} /> : null}
        {tab === "picks" ? <PicksTab markets={markets} accent={snapshot.accent} /> : null}
      </main>
    </div>
  );
}

export function DetailTopBar({ title, fallback }: { title: string; fallback: string }) {
  const router = useRouter();
  return (
    <header className={styles.topBar}>
      <button
        type="button"
        className={styles.back}
        aria-label="Go back"
        onClick={() => window.history.length > 1 ? router.back() : router.push(fallback)}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <strong>{title}</strong>
    </header>
  );
}

function LeagueHeader({ snapshot }: { snapshot: LeagueHubSnapshot }) {
  const count = snapshot.groups.reduce((sum, group) => sum + group.rows.length, 0);
  return (
    <section className={styles.leagueHeader}>
      <span className={styles.leagueMark}>{snapshot.shortCode}</span>
      <span className={styles.leagueIdentity}>
        <h1>{snapshot.name}</h1>
        <small>{snapshot.seasonLabel} {" // "} {count} {snapshot.sport === "motorsport" || snapshot.sport === "tennis" ? "COMPETITORS" : "TEAMS"}</small>
      </span>
    </section>
  );
}

function TableTab({ snapshot }: { snapshot: LeagueHubSnapshot }) {
  const [groupIndex, setGroupIndex] = useState(0);
  const group = snapshot.groups[Math.min(groupIndex, snapshot.groups.length - 1)];
  const groupTabs: UnderlineTab[] = snapshot.groups.map((item) => ({ id: item.id, label: item.shortLabel }));
  return (
    <section className={styles.tabSection}>
      {snapshot.groups.length > 1 ? (
        <UnderlineTabs label="Standings group" tabs={groupTabs} activeIndex={groupIndex} accent={snapshot.accent} onChange={setGroupIndex} className={styles.secondaryTabs} />
      ) : <SectionHeading label="ALL COMPETITORS" />}
      <StandingsTable snapshot={snapshot} group={group} />
    </section>
  );
}

function StandingsTable({ snapshot, group }: { snapshot: LeagueHubSnapshot; group: LeagueStandingGroup }) {
  const columnCount = snapshot.columns.length + 2;
  return (
    <div className={styles.tableShell}>
      <div className={styles.tableScroll}>
        <table className={`${styles.table} ds-tabular`}>
          <thead><tr><th scope="col">#</th><th scope="col">{snapshot.sport === "tennis" || snapshot.sport === "motorsport" ? "COMPETITOR" : "TEAM"}</th>{snapshot.columns.map((column) => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead>
          <tbody>
            {group.rows.map((row, index) => {
              const nextZone = group.rows[index + 1]?.zone?.label;
              const showZone = row.zone && row.zone.label !== nextZone;
              return (
                <LeagueTableRows key={row.competitor.id} row={row} snapshot={snapshot} showZone={Boolean(showZone)} columnCount={columnCount} />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeagueTableRows({ row, snapshot, showZone, columnCount }: { row: LeagueStandingRow; snapshot: LeagueHubSnapshot; showZone: boolean; columnCount: number }) {
  return (
    <>
      <tr className={styles.dataRow}>
        <td className={row.rank === 1 ? styles.firstRank : undefined}>
          <span>{row.rank}</span>{row.rankChange ? <i className={row.rankChange > 0 ? styles.rankUp : styles.rankDown}>{row.rankChange > 0 ? "▲" : "▼"}</i> : null}
        </td>
        <th scope="row">
          <Link href={`/leagues/${snapshot.id}/teams/${row.competitor.id}`} className={styles.teamLink}>
            <TeamBadge team={row.competitor} size={26} />
            <span>{row.tableName ?? row.competitor.name}</span>
          </Link>
        </th>
        {snapshot.columns.map((column) => <td key={column.id} className={column.emphasis ? styles.emphasis : undefined}>{row.metrics[column.id]}</td>)}
      </tr>
      {showZone && row.zone ? (
        <tr className={styles.zoneRow}><td colSpan={columnCount}><span style={{ "--zone-color": row.zone.color } as CSSProperties}><i />{row.zone.label}</span></td></tr>
      ) : null}
    </>
  );
}

function LeadersTab({ snapshot }: { snapshot: LeagueHubSnapshot }) {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const category = snapshot.leaderCategories[Math.min(categoryIndex, snapshot.leaderCategories.length - 1)];
  if (!category) return <NoDataState icon={MedalIcon} title="No stat leaders" message="This competition has not published leaderboards yet." />;
  return (
    <section className={styles.leadersTab}>
      <UnderlineTabs label="Leaderboard category" tabs={snapshot.leaderCategories.map((item) => ({ id: item.id, label: item.label }))} activeIndex={categoryIndex} accent={snapshot.accent} minTabWidth={104} onChange={setCategoryIndex} className={styles.categoryTabs} />
      <StatLeaderboard category={category} leagueAccent={snapshot.accent} />
    </section>
  );
}

function StatLeaderboard({ category, leagueAccent }: { category: LeagueLeaderCategory; leagueAccent: string }) {
  const accent = category.accent === "league" ? leagueAccent : `var(--ds-color-${category.accent === "orange" ? "accent-orange" : category.accent})`;
  const [champion, ...chasers] = category.leaders;
  if (!champion) return null;
  const top = Math.max(champion.value, 1);
  return (
    <div className={styles.leaderboard}>
      <HudPanel accent={accent} glow className={styles.championCard}>
        <div className={styles.championMeta}><span>◉ LEAGUE LEADER</span><span>{category.unitLabel}</span></div>
        <div className={styles.championBody}>
          <TeamBadge team={champion.competitor} size={42} />
          <span><b>{champion.name}</b><small>{champion.competitor.name}</small></span>
          <strong>{champion.displayValue}</strong>
        </div>
        <Meter fraction={1} accent={accent} />
        {champion.detail ? <small className={styles.leaderDetail}>{champion.detail}</small> : null}
      </HudPanel>
      <ol className={styles.chaserGrid}>
        {chasers.map((leader, index) => (
          <li key={leader.id} className={styles.chaser} style={{ "--leader-delay": `${(index + 1) * 40}ms` } as CSSProperties}>
            <span className={styles.chaserRank}>{index + 2}</span><TeamBadge team={leader.competitor} size={27} />
            <span className={styles.chaserIdentity}><b>{leader.name}</b><Meter fraction={Math.max(.04, leader.value / top)} accent={accent} /></span>
            <strong>{leader.displayValue}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Meter({ fraction, accent }: { fraction: number; accent: string }) {
  return <span className={styles.meter}><i style={{ width: `${fraction * 100}%`, background: accent }} /></span>;
}

function GamesTab({ fixtures }: { fixtures: SportMatch[] }) {
  if (!fixtures.length) return <NoDataState icon={EventBusyIcon} title="No fixtures" message="No games are scheduled for this league right now." />;
  return <section className={styles.cardTab}><SectionHeading label="PREDICTION CENTER" /><ul className={styles.cardGrid}>{fixtures.map((match) => <li key={match.id}><SportFixtureCard match={match} /></li>)}</ul></section>;
}

function PicksTab({ markets, accent }: { markets: PickMarket[]; accent: string }) {
  const picks = usePicks();
  const trading = usePickTrading();
  if (!markets.length) return <NoDataState icon={InsightsIcon} title="No markets" message="No quick markets are open for this league right now." accent={accent} />;
  return (
    <section className={styles.cardTab}>
      <SectionHeading label="PICKS CENTER" />
      <div className={styles.cardGrid}>{markets.map((market) => <PickMarketCard key={market.id} market={market} positions={selectPositionsForMarket(picks, market.id)} onPick={(selected, outcomeId) => trading.openTrade(selected, outcomeId)} onClaim={trading.claim} />)}</div>
      {trading.overlays}
    </section>
  );
}

export function SectionHeading({ label }: { label: string }) {
  return <div className={styles.heading}><strong>{label}</strong><span /></div>;
}

const sportIcons: Record<Sport, ComponentType<IconProps>> = { football: FootballIcon, cricket: CricketIcon, basketball: BasketballIcon, tennis: TennisIcon, motorsport: MotorsportIcon };
function LeagueSportIcon({ sport, size }: { sport: Sport; size: number }) { const Glyph = sportIcons[sport]; return <Glyph size={size} />; }
