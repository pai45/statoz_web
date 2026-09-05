"use client";

import { useState } from "react";

import {
  FilterChips,
  GridOnIcon,
  InsightsIcon,
  MicIcon,
  ShowChartIcon,
  TimerIcon,
  accentVar,
} from "@/design-system";
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
                <MatchTraceChart match={match} trace={scoreboard.trace} showInningsModes />
              </div>
              <div className="spanFull">
                <InningsList match={match} scoreboard={scoreboard} heading="INNINGS" />
              </div>
            </div>
          ) : (
            <EmptyPanel
              icon={ShowChartIcon}
              title="Race data unavailable"
              message="Both innings need published scoring samples for this race."
            />
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
            <EmptyPanel
              icon={TimerIcon}
              title="Chase feed unavailable"
              message="Ball-level run-rate samples have not been published."
            />
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
        <EmptyPanel
          icon={GridOnIcon}
          title="Scorecard unavailable"
          message="Batting and bowling figures have not been published."
        />
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

/**
 * The card behind the score: one innings at a time, who batted and what they
 * made, then who bowled at them. The phase comparison stays underneath, since
 * it is the only place the two innings are read against each other.
 */
function Scorecard({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const innings = scoreboard.innings ?? [];
  const [selected, setSelected] = useState(0);

  if (innings.length === 0) {
    return (
      <EmptyPanel
        icon={GridOnIcon}
        title="Scorecard unavailable"
        message="Batting and bowling figures have not been published."
      />
    );
  }

  const card = innings[Math.min(selected, innings.length - 1)];
  const accent = card.side === "home" ? match.home.color : match.away.color;

  return (
    <div className={styles.stack}>
      {innings.length > 1 ? (
        <div className={`${styles.inningsTabs} spanFull`}>
          {innings.map((entry, index) => (
            <button
              key={entry.team}
              type="button"
              className={`${styles.inningsTab} ${index === selected ? styles.inningsTabActive : ""}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              {entry.team}
            </button>
          ))}
        </div>
      ) : null}

      <section className={`${styles.tight} spanFull`}>
        <StatsRow accent={accent}>
          <span className={styles.inningsHead}>
            <span>
              <strong>{card.team} Innings</strong>
              <small>
                RR {card.runRate}
                {card.target == null ? "" : ` // TARGET ${card.target}`}
              </small>
            </span>
            <span className={styles.inningsScore}>
              <b style={{ color: accent }}>{card.score}</b>
              <small>{card.overs.toUpperCase()}</small>
            </span>
          </span>
        </StatsRow>
      </section>

      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="BATTING" />
        <table className={styles.card}>
          <thead>
            <tr>
              <th>BATTER</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {card.batting.map((line) => (
              <tr key={line.name}>
                <td>
                  <strong style={line.dismissal ? undefined : { color: accent }}>{line.name}</strong>
                  <small>{line.dismissal ?? "not out"}</small>
                </td>
                <td><b>{line.runs}</b></td>
                <td>{line.balls}</td>
                <td>{line.fours}</td>
                <td>{line.sixes}</td>
                <td>{strikeRate(line.runs, line.balls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${styles.tight} spanFull`}>
        <SectionHeading label="BOWLING" />
        <table className={styles.card}>
          <thead>
            <tr>
              <th>BOWLER</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>ECON</th>
            </tr>
          </thead>
          <tbody>
            {card.bowling.map((line) => (
              <tr key={line.name}>
                <td><strong>{line.name}</strong></td>
                <td>{line.overs}</td>
                <td>{line.maidens}</td>
                <td>{line.runs}</td>
                <td><b>{line.wickets}</b></td>
                <td>{economy(line.runs, line.overs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
    </div>
  );
}

/** Runs per hundred balls, the way a card prints it. */
function strikeRate(runs: number, balls: number): string {
  return balls === 0 ? "0.00" : ((runs / balls) * 100).toFixed(2);
}

/** Runs per over, from an overs figure written as `3.4`. */
function economy(runs: number, overs: string): string {
  const [whole, balls = "0"] = overs.split(".");
  const bowled = Number(whole) + Number(balls) / 6;
  return bowled === 0 ? "0.00" : (runs / bowled).toFixed(2);
}

function Feed({ scoreboard }: { scoreboard: MatchDetailScoreboard }) {
  const feed = scoreboard.feed ?? [];
  if (feed.length === 0) {
    return (
      <EmptyPanel
        icon={MicIcon}
        spark={InsightsIcon}
        title="Ball feed unavailable"
        message="Ball-by-ball arrives once the provider publishes it."
      />
    );
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
