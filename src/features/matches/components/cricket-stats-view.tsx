"use client";

import { useState } from "react";

import { FilterChips, accentVar } from "@/design-system";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import { LineupsView } from "./match-report-parts";
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
 * The cricket report: the chase, the two worms side by side, the required rate
 * against the actual one, the card, the ball-by-ball feed, and the squads.
 */

const tabs = ["OVERVIEW", "RACE", "CHASE", "SCORECARD", "MATCH FEED", "SQUADS"];

export function CricketStatsView({
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
        {tab === "RACE" ? (
          scoreboard.trace ? (
            <div className={styles.stack}>
              <div className="spanFull">
                <MatchTraceChart match={match} trace={scoreboard.trace} />
              </div>
              <div className="spanFull">
                <InningsList match={match} scoreboard={scoreboard} heading="INNINGS" />
              </div>
            </div>
          ) : (
            <EmptyPanel title="Race pending" message="Both innings plot here once the first ball is bowled." />
          )
        ) : null}
        {tab === "CHASE" ? (
          scoreboard.chase ? (
            <div className={styles.stack}>
              <div className="spanFull">
                <MatchTraceChart
                  match={match}
                  trace={scoreboard.chase}
                  homeLabel="SCORED AT"
                  awayLabel="REQUIRED"
                />
              </div>
              <section className={`${styles.tight} spanFull`}>
                <SectionHeading label="WHERE IT WAS DECIDED" />
                <StatsRow accent={accentVar("gold")}>
                  <p style={{ margin: 0, color: "var(--ds-color-text-muted)", fontSize: "12px" }}>
                    The two lines are the chase and the rate it needed. Where the required rate
                    climbs above what they were scoring at is where the game turned.
                  </p>
                </StatsRow>
              </section>
            </div>
          ) : (
            <EmptyPanel title="No chase yet" message="The required rate appears once a target is set." />
          )
        ) : null}
        {tab === "SCORECARD" ? <Scorecard match={match} scoreboard={scoreboard} /> : null}
        {tab === "MATCH FEED" ? <Feed scoreboard={scoreboard} /> : null}
        {tab === "SQUADS" ? <LineupsView match={match} scoreboard={scoreboard} /> : null}
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

      {match.resultLine ? (
        <section className={styles.tight}>
          <SectionHeading label="FINAL RESULT" />
          <StatsRow accent="var(--ds-color-success)">
            <b style={{ color: "var(--ds-color-success)", fontFamily: "var(--ds-font-display)", fontSize: "13px" }}>
              {match.resultLine}
            </b>
          </StatsRow>
        </section>
      ) : null}

      <div className="spanFull">
        <InningsList match={match} scoreboard={scoreboard} heading="INNINGS SUMMARY" />
      </div>

      <section className={styles.tight}>
        <SectionHeading label="TEAM COMPARISON" />
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
    </div>
  );
}

function InningsList({
  match,
  scoreboard,
  heading,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
  heading: string;
}) {
  const innings = scoreboard.innings ?? [];
  return (
    <section className={styles.tight}>
      <SectionHeading label={heading} />
      {innings.length === 0 ? (
        <EmptyPanel title="No innings yet" message="Innings totals appear once play begins." />
      ) : (
        innings.map((line) => (
          <StatsRow key={line.team} accent={line.side === "home" ? match.home.color : match.away.color}>
            <span className={styles.eventRow}>
              <i
                className={styles.eventSide}
                style={{ background: line.side === "home" ? match.home.color : match.away.color }}
                aria-hidden="true"
              />
              <span className={styles.eventCopy}>
                <strong>{line.team}</strong>
                <small>
                  {line.topBat} · {line.topBowl}
                </small>
              </span>
              <span className="grid justify-items-end">
                <b className="ds-tabular font-display" style={{ fontSize: "15px" }}>{line.score}</b>
                <small style={{ color: "var(--ds-color-text-muted)", fontSize: "9px" }}>
                  {line.overs} · RR {line.runRate}
                </small>
              </span>
            </span>
          </StatsRow>
        ))
      )}
    </section>
  );
}

function Scorecard({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  return (
    <div className={styles.stack}>
      <section className={styles.tight}>
        <SectionHeading label="PHASES" />
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
        <SectionHeading label="INNINGS" />
        {(scoreboard.innings ?? []).map((innings) => (
          <StatsRow key={innings.team} accent={innings.side === "home" ? match.home.color : match.away.color}>
            <span className={styles.comparisonHead}>
              <b className="ds-tabular">{innings.score}</b>
              <small>{innings.team.toUpperCase()}</small>
              <b className="ds-tabular">{innings.overs}</b>
            </span>
          </StatsRow>
        ))}
      </section>
    </div>
  );
}

function Feed({ scoreboard }: { scoreboard: MatchDetailScoreboard }) {
  const feed = scoreboard.feed ?? [];
  if (feed.length === 0) {
    return <EmptyPanel title="Feed pending" message="Ball-by-ball arrives once the innings is under way." />;
  }
  const accentFor = (kind: string) =>
    kind === "wicket"
      ? "var(--ds-color-danger)"
      : kind === "score"
        ? accentVar("gold")
        : accentVar("cyan");
  return (
    <div className={styles.tight}>
      <SectionHeading label="MATCH FEED" />
      {feed.map((event) => (
        <StatsRow key={`${event.marker}-${event.text}`} accent={accentFor(event.kind)}>
          <span className={styles.eventRow}>
            <b className={styles.feedMarker} style={{ color: accentFor(event.kind) }}>{event.marker}</b>
            <span className={styles.eventCopy}>
              <strong style={{ whiteSpace: "normal", fontWeight: 400 }}>{event.text}</strong>
            </span>
          </span>
        </StatsRow>
      ))}
    </div>
  );
}
