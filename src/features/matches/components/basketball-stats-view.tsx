"use client";

import { useState } from "react";

import { FilterChips, GridOnIcon, ShowChartIcon, accentVar } from "@/design-system";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import { CommentaryView, LineupsView, TimelineList } from "./match-report-parts";
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
 * The basketball report: the model's read, the flow that produced it, the
 * plays, the box score, and the two rosters.
 */

const tabs = ["OVERVIEW", "FLOW", "PLAYS", "BOX SCORE", "TEAMS"];

export function BasketballStatsView({
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
        {tab === "FLOW" ? <Flow match={match} scoreboard={scoreboard} /> : null}
        {tab === "PLAYS" ? (
          <div className={styles.stack}>
            <div className="spanFull">
              <TimelineList match={match} events={scoreboard.timeline} />
            </div>
            <div className="spanFull">
              <CommentaryView commentary={scoreboard.commentary} />
            </div>
          </div>
        ) : null}
        {tab === "BOX SCORE" ? <BoxScoreView match={match} scoreboard={scoreboard} /> : null}
        {tab === "TEAMS" ? <LineupsView match={match} scoreboard={scoreboard} /> : null}
      </div>
    </div>
  );
}

function Overview({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const [held, setHeld] = useState<string | null>(null);
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
        <SectionHeading label="BY QUARTER" />
        {scoreboard.scoreRows.map((row) => (
          <StatsRow key={row.label} accent={accentVar("cyan")}>
            <span className={styles.comparisonHead}>
              <b className="ds-tabular">{row.home}</b>
              <small>{row.label}</small>
              <b className="ds-tabular">{row.away}</b>
            </span>
          </StatsRow>
        ))}
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

      <section className={styles.tight}>
        <SectionHeading label="LEADERS" />
        {(scoreboard.leaders ?? []).map((leader) => (
          <StatsRow
            key={leader.name}
            accent={leader.side === "home" ? match.home.color : match.away.color}
          >
            <span className={styles.eventRow}>
              <i
                className={styles.eventSide}
                style={{ background: leader.side === "home" ? match.home.color : match.away.color }}
                aria-hidden="true"
              />
              <span className={styles.eventCopy}>
                <strong>{leader.name}</strong>
                <small>{leader.note}</small>
              </span>
              <b className={styles.eventMinute} style={{ textAlign: "right" }}>{leader.line}</b>
            </span>
          </StatsRow>
        ))}
      </section>
    </div>
  );
}

function Flow({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  if (!scoreboard.trace) {
    return (
      <EmptyPanel
        icon={ShowChartIcon}
        title="Flow feed unavailable"
        message="Win probability and scoring coordinates have not arrived."
      />
    );
  }
  return (
    <div className={styles.stack}>
      <div className="spanFull">
        <MatchTraceChart match={match} trace={scoreboard.trace} />
      </div>
      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="SCORING RUNS" />
        {scoreboard.scoreRows.map((row) => (
          <StatsRow key={row.label} accent={accentVar("orange")}>
            <span className={styles.comparisonHead}>
              <b className="ds-tabular">{row.home}</b>
              <small>{row.label}</small>
              <b className="ds-tabular">{row.away}</b>
            </span>
          </StatsRow>
        ))}
      </section>
    </div>
  );
}

function BoxScoreView({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const box = scoreboard.boxScore;
  if (!box) {
    return (
      <EmptyPanel
        icon={GridOnIcon}
        title="Box score unavailable"
        message="Player totals have not been published for this fixture."
      />
    );
  }
  return (
    <div className={styles.stack}>
      {(["home", "away"] as const).map((side) => (
        <section key={side} className={styles.tight}>
          <SectionHeading label={(side === "home" ? match.home.name : match.away.name).toUpperCase()} />
          <StatsRow accent={side === "home" ? match.home.color : match.away.color}>
            <table className={styles.statTable}>
              <thead>
                <tr>
                  <th className={styles.tableHead}>PLAYER</th>
                  {box.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {box.rows
                  .filter((row) => row.side === side)
                  .map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      {row.values.map((value, index) => (
                        <td key={box.columns[index]}>{value}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </StatsRow>
        </section>
      ))}
    </div>
  );
}
