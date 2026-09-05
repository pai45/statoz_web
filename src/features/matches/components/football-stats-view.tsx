"use client";

import { useState } from "react";

import { BoltIcon, FilterChips, ShowChartIcon, accentVar } from "@/design-system";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import { CommentaryView, TimelineList } from "./match-report-parts";
import { MatchPitchView } from "./match-pitch-view";
import {
  EmptyPanel,
  MatchIntelPanel,
  MatchPulseHeader,
  SectionHeading,
  StatComparisonRow,
  StatsRow,
  TeamLegendRow,
} from "./match-stats-shell";
import { MatchTraceChart } from "./match-trace-chart";
import styles from "./match-stats.module.css";

/**
 * The football report — the app's five sections, in its order.
 *
 * OVERVIEW leads with territorial control, MOMENTUM is the two-sided pressure
 * trace with the goals riding it, EVENTS is the log, LINEUPS the pitch, and
 * COMMENTARY the play-by-play.
 */

const tabs = ["OVERVIEW", "MOMENTUM", "EVENTS", "LINEUPS", "COMMENTARY"];

export function FootballStatsView({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  const [tab, setTab] = useState(tabs[0]);

  return (
    <div className={styles.statsView}>
      <FilterChips options={tabs} selected={tab} onSelect={setTab} label="Match report sections" />
      <div className={styles.statsScroll}>
        {tab === "OVERVIEW" ? <Overview match={match} scoreboard={scoreboard} /> : null}
        {tab === "MOMENTUM" ? <Momentum match={match} scoreboard={scoreboard} /> : null}
        {tab === "EVENTS" ? <TimelineList match={match} events={scoreboard.timeline} /> : null}
        {tab === "LINEUPS" ? <MatchPitchView match={match} scoreboard={scoreboard} /> : null}
        {tab === "COMMENTARY" ? <CommentaryView commentary={scoreboard.commentary} /> : null}
      </div>
    </div>
  );
}

function Overview({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const [held, setHeld] = useState<string | null>(null);
  const scorers = scoreboard.scorers ?? [];

  return (
    <div className={styles.stack}>
      <div className="spanFull">
        <MatchPulseHeader
          match={match}
          title={`${match.home.name} vs ${match.away.name}`}
          pulse={scoreboard.pulse}
        />
      </div>

      <section className={styles.tight}>
        <SectionHeading label="MATCH INTEL" />
        <MatchIntelPanel match={match} intel={scoreboard.intel} />
      </section>

      <section className={styles.tight}>
        <SectionHeading label="TEAM CONTROL" />
        <TeamLegendRow match={match} />
        {scoreboard.stats.map((stat) => (
          <StatComparisonRow
            key={stat.label}
            stat={stat}
            homeColor={match.home.color}
            awayColor={match.away.color}
            selected={held === stat.label}
            onSelect={() => setHeld((current) => (current === stat.label ? null : stat.label))}
          />
        ))}
      </section>

      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="GOAL IMPACT" />
        {scorers.length === 0 ? (
          <EmptyPanel title="No goals yet" message="Scorers appear here as the goals go in." />
        ) : (
          scorers.map((scorer) => (
            <StatsRow
              key={`${scorer.minute}-${scorer.player}`}
              accent={scorer.side === "home" ? match.home.color : match.away.color}
            >
              <span className={styles.eventRow}>
                <i
                  className={styles.eventSide}
                  style={{ background: scorer.side === "home" ? match.home.color : match.away.color }}
                  aria-hidden="true"
                />
                <b className={styles.eventMinute}>{scorer.minute}</b>
                <span className={styles.eventCopy}>
                  <strong>{scorer.player}</strong>
                  <small>{scorer.note}</small>
                </span>
              </span>
            </StatsRow>
          ))
        )}
      </section>
    </div>
  );
}

function Momentum({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  if (!scoreboard.trace) {
    return (
      <EmptyPanel
        icon={ShowChartIcon}
        spark={BoltIcon}
        title="Pressure feed offline"
        message="Momentum will map the match once enough live actions arrive."
      />
    );
  }
  return (
    <div className={styles.stack}>
      <div className="spanFull">
        <MatchTraceChart match={match} trace={scoreboard.trace} />
      </div>
      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="PRESSURE READ" />
        <StatsRow accent={accentVar("cyan")}>
          <p style={{ margin: 0, color: "var(--ds-color-text-muted)", fontSize: "12px" }}>
            Drag the trace to read either side&rsquo;s pressure at any point. Goals ride the plot as
            markers, and the one that decided it carries the halo.
          </p>
        </StatsRow>
      </section>
    </div>
  );
}
