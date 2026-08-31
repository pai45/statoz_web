/**
 * The port's half of the Grand Prix Dash differential.
 *
 * Prints the same transcript `scratchpad/gp2/bin/dump.dart` prints from the
 * Flutter sources, out of the code the game actually ships. Scratch: run with
 * `npx tsx scratch-gp-dump.ts`, and delete when the port is done.
 */
import { grandPrixCircuit, grandPrixCircuits } from "./src/features/games/grand-prix/data/circuits";
import {
  generateDriverNames,
  grandPrixDriverNames,
} from "./src/features/games/grand-prix/data/drivers";
import { GrandPrixEngine } from "./src/features/games/grand-prix/engine/engine";
import {
  applyLaunch,
  buildField,
  gradeLaunch,
  isOnGrass,
  launchBoost,
  positionOf,
  raceLengthOf,
  sampleCpuReactionMs,
  type RaceInputs,
  type RaceSetup,
} from "./src/features/games/grand-prix/engine/field";
import {
  centerlineX,
  cumulativeSectionStarts,
  lapLocalDistance,
  raceCenterlineX,
  sectionAt,
} from "./src/features/games/grand-prix/engine/geometry";
import { raceRandom } from "./src/features/games/grand-prix/engine/random";
import {
  bestLapMs,
  emptyGrandPrixStats,
  isPersonalBest,
  recordInto,
} from "./src/features/games/grand-prix/state/grand-prix-progress";
import { cpuSmartness, fieldSize } from "./src/features/games/grand-prix/tuning";
import {
  calculateGrandPrixXp,
  formatLapTime,
  grandPrixCircuitFromName,
  grandPrixLiveryFromName,
  grandPrixVerdict,
  grandPrixXpMultiplier,
  isStraight,
  lapLengthOf,
  signedBend,
  type GrandPrixCircuitId,
  type GrandPrixLivery,
  type LaunchGrade,
  type OvertakeEvent,
} from "./src/features/games/grand-prix/types";
import { grandPrixCircuitIds } from "./src/features/games/grand-prix/types";

const lines: string[] = [];
const w = (line: string) => lines.push(line);

function f(value: number): string {
  const x = value === 0 ? 0 : value;
  return x.toFixed(6);
}

const b = (value: boolean) => (value ? "T" : "F");

/* ---- Circuits -------------------------------------------------------------- */

function dumpCircuits(): void {
  w("== CIRCUITS ==");
  for (const circuit of grandPrixCircuits) {
    w(
      `circuit ${circuit.id} | ${circuit.name} | ${circuit.character} | ` +
        `${circuit.flavor} | stars=${circuit.difficultyStars} | ` +
        `lap=${f(lapLengthOf(circuit))} | sections=${circuit.sections.length}`,
    );
    for (let i = 0; i < circuit.sections.length; i += 1) {
      const s = circuit.sections[i];
      w(
        `  s${i} ${s.type} len=${f(s.length)} dir=${s.direction ?? "-"} ` +
          `safe=${s.safeSpeed === null ? "-" : f(s.safeSpeed)} ` +
          `wall=${f(s.wallThreshold)} bend=${f(s.bend)} ` +
          `signed=${f(signedBend(s))} straight=${b(isStraight(s))}`,
      );
    }
  }
}

function dumpGeometry(): void {
  w("== GEOMETRY ==");
  for (const circuit of grandPrixCircuits) {
    const starts = cumulativeSectionStarts(circuit.sections);
    w(`starts ${circuit.id} ${starts.map(f).join(",")}`);
    const lap = lapLengthOf(circuit);
    for (let step = 0; step <= 120; step += 1) {
      const s = -40 + (step * (lap * 3 + 80)) / 120;
      w(
        `g ${circuit.id} s=${f(s)} ` +
          `local=${f(lapLocalDistance(lap, s))} ` +
          `sec=${sectionAt(starts, circuit.sections, lapLocalDistance(lap, s))} ` +
          `cx=${f(centerlineX(circuit, starts, s))} ` +
          `rcx=${f(raceCenterlineX(circuit, starts, s))}`,
      );
    }
  }
}

function dumpDrivers(): void {
  w("== DRIVERS ==");
  w(
    `pool=${grandPrixDriverNames.length} first=${grandPrixDriverNames[0]} ` +
      `last=${grandPrixDriverNames[grandPrixDriverNames.length - 1]} ` +
      `at100=${grandPrixDriverNames[100]} at399=${grandPrixDriverNames[399]}`,
  );
  for (const seed of [0, 1, 7, 12345, 999983, 2147483646]) {
    const names = generateDriverNames(fieldSize - 1, raceRandom(seed));
    w(`draw ${seed} ${names.join("/")}`);
  }
}

function dumpLaunch(): void {
  w("== LAUNCH ==");
  for (let ms = 0; ms <= 900; ms += 17) {
    const grade = gradeLaunch(ms);
    const boost = launchBoost(grade);
    w(
      `grade ${ms} ${grade} ${f(boost.initialSpeed)} ` +
        `${f(boost.accelFactor)} ${f(boost.boostSeconds)}`,
    );
  }
  const jump = launchBoost("jump");
  w(`jump ${f(jump.initialSpeed)} ${f(jump.accelFactor)} ${f(jump.boostSeconds)}`);
  for (const seed of [3, 77, 5150]) {
    const random = raceRandom(seed);
    for (let i = 0; i < 12; i += 1) {
      const strength = i / 11;
      const reaction = sampleCpuReactionMs(strength, random);
      w(`cpu ${seed} ${f(strength)} ${reaction} ${gradeLaunch(reaction)}`);
    }
  }
  for (let level = 0; level <= 16; level += 1) {
    w(`smart ${level} ${f(cpuSmartness(level))}`);
  }
}

/* ---- Races ----------------------------------------------------------------- */

type Scenario = {
  label: string;
  circuit: GrandPrixCircuitId;
  laps: number;
  level: number;
  seed: number;
  startPosition: number;
  livery: GrandPrixLivery;
  script: number;
  grade: LaunchGrade;
  maxTicks: number;
};

const scenarios: Scenario[] = [
  { label: "sprint-emerald", circuit: "emeraldPark", laps: 1, level: 6, seed: 12345, startPosition: 12, livery: "scarlet", script: 0, grade: "perfect", maxTicks: 20000 },
  { label: "sprint-harbour", circuit: "harbourStreet", laps: 1, level: 2, seed: 777, startPosition: 8, livery: "gridLine", script: 0, grade: "slow", maxTicks: 20000 },
  { label: "sprint-desert", circuit: "desertMile", laps: 1, level: 12, seed: 424242, startPosition: 16, livery: "papaya", script: 0, grade: "great", maxTicks: 20000 },
  { label: "sprint-mountain", circuit: "mountainPass", laps: 1, level: 9, seed: 31337, startPosition: 10, livery: "midnight", script: 0, grade: "good", maxTicks: 20000 },
  { label: "sprint-coastal", circuit: "coastalSprint", laps: 1, level: 4, seed: 8675309, startPosition: 14, livery: "racingGreen", script: 0, grade: "jump", maxTicks: 20000 },
  { label: "hot-harbour", circuit: "harbourStreet", laps: 1, level: 7, seed: 5150, startPosition: 9, livery: "silverArrow", script: 1, grade: "perfect", maxTicks: 9000 },
  { label: "beached-emerald", circuit: "emeraldPark", laps: 1, level: 5, seed: 2024, startPosition: 11, livery: "skyBlue", script: 2, grade: "good", maxTicks: 6000 },
  { label: "three-lap-emerald", circuit: "emeraldPark", laps: 3, level: 8, seed: 606, startPosition: 13, livery: "scarlet", script: 0, grade: "great", maxTicks: 45000 },
  { label: "five-lap-desert", circuit: "desertMile", laps: 5, level: 12, seed: 9001, startPosition: 15, livery: "midnight", script: 3, grade: "perfect", maxTicks: 70000 },
  { label: "brakeless-mountain", circuit: "mountainPass", laps: 1, level: 1, seed: 4711, startPosition: 8, livery: "papaya", script: 3, grade: "slow", maxTicks: 20000 },
];

/** The same deterministic driver programs the oracle runs. */
function script(mode: number, tick: number): RaceInputs {
  switch (mode) {
    case 0: {
      const phase = tick % 900;
      const steer = phase < 300 ? 0 : phase < 600 ? 1 : -1;
      const brake = Math.trunc(tick / 120) % 9 === 5;
      return { steer, throttle: !brake, brake };
    }
    case 1:
      return { steer: 1, throttle: true, brake: false };
    case 2:
      return tick < 240
        ? { steer: -1, throttle: true, brake: false }
        : { steer: -1, throttle: false, brake: false };
    case 3: {
      const phase = tick % 480;
      return { steer: phase < 240 ? 0.4 : -0.4, throttle: true, brake: false };
    }
    default:
      return { steer: 0, throttle: false, brake: false };
  }
}

function setupFor(scenario: Scenario): RaceSetup {
  return {
    circuit: grandPrixCircuit(scenario.circuit),
    playerLivery: scenario.livery,
    playerLevel: scenario.level,
    startPosition: scenario.startPosition,
    seed: scenario.seed,
    laps: scenario.laps,
  };
}

function dumpFields(): void {
  w("== FIELDS ==");
  for (const scenario of scenarios) {
    const setup = setupFor(scenario);
    const random = raceRandom(scenario.seed);
    const field = buildField(setup, generateDriverNames(fieldSize - 1, random), random);
    w(
      `field ${scenario.label} raceLength=${f(raceLengthOf(field))} ` +
        `laps=${field.laps} starts=${field.sectionStarts.map(f).join(",")}`,
    );
    for (const car of field.cars) {
      w(
        `  car ${car.index} ${b(car.isPlayer)} "${car.name}" ${car.livery} ` +
          `d=${f(car.distance)} l=${f(car.lateral)} str=${f(car.strength)} ` +
          `jit=${f(car.paceJitter)} noise=${f(car.cornerNoise)}`,
      );
    }
    applyLaunch(field, scenario.grade, raceRandom(scenario.seed ^ 0x1a));
    for (const car of field.cars) {
      w(
        `  launch ${car.index} sp=${f(car.speed)} bt=${f(car.launchBoostTimer)} ` +
          `af=${f(car.launchAccelFactor)} cut=${f(car.throttleCutTimer)}`,
      );
    }
    for (const car of field.cars) {
      w(`  pos ${car.index} ${positionOf(field, car)}`);
    }
  }
}

function dumpRaces(): void {
  w("== RACES ==");
  for (const scenario of scenarios) {
    const setup = setupFor(scenario);
    const fieldRandom = raceRandom(scenario.seed);
    const field = buildField(
      setup,
      generateDriverNames(fieldSize - 1, fieldRandom),
      fieldRandom,
    );
    const engine = new GrandPrixEngine(raceRandom(scenario.seed ^ 0x51f15eed));
    applyLaunch(field, scenario.grade, raceRandom(scenario.seed ^ 0x1a));

    w(`race ${scenario.label}`);
    const dt = 1 / 120;
    let scrub = 0;
    let wall = 0;
    let contact = 0;
    let best: OvertakeEvent | null = null;
    let finished = false;
    let tick = 0;
    for (; tick < scenario.maxTicks; tick += 1) {
      const events = engine.tick(field, script(scenario.script, tick), dt);
      if (events.playerTireScrub) scrub += 1;
      if (events.playerWallContact) wall += 1;
      if (events.playerContact) contact += 1;
      if (events.playerPosition !== null) {
        w(`  t${tick} position ${events.playerPosition}`);
      }
      for (const overtake of events.overtakes) {
        if (best === null || overtake.overtakenPosition < best.overtakenPosition) {
          best = overtake;
        }
        w(
          `  t${tick} pass P${overtake.overtakenPosition} ` +
            `"${overtake.overtakenName}" at=${f(overtake.atDistance)}`,
        );
      }
      if (tick % 120 === 0) {
        const p = field.player;
        w(
          `  t${tick} player d=${f(p.distance)} l=${f(p.lateral)} ` +
            `sp=${f(p.speed)} sec=${p.sectionIndex} mode=${p.mode} ` +
            `spin=${f(p.spinTimer)} tow=${b(p.slipstreaming)} ` +
            `grass=${b(isOnGrass(p))} stuck=${f(field.playerStuckSeconds)} ` +
            `clock=${f(field.raceClockMs)} scrub=${scrub} wall=${wall} ` +
            `contact=${contact}`,
        );
      }
      if (tick % 600 === 0) {
        for (const car of field.cars) {
          w(
            `    t${tick} c${car.index} d=${f(car.distance)} l=${f(car.lateral)} ` +
              `sp=${f(car.speed)} sec=${car.sectionIndex} m=${car.mode} ` +
              `tgt=${f(car.targetLateral)}`,
          );
        }
      }
      if (events.playerCrossedLine) {
        const player = field.player;
        w(
          `  t${tick} FINISH position=${positionOf(field, player)} ` +
            `time=${Math.round(player.finishTimeMs)} best=${best?.overtakenName ?? "-"}`,
        );
        finished = true;
        break;
      }
      if (events.playerStuckOut) {
        w(`  t${tick} DNF position=${fieldSize} time=0`);
        finished = true;
        break;
      }
    }
    if (!finished) w(`  t${tick} UNFINISHED`);
    w(
      `  end ticks=${tick} scrub=${scrub} wall=${wall} contact=${contact} ` +
        `clock=${f(field.raceClockMs)}`,
    );
    for (const car of field.cars) {
      w(
        `  final c${car.index} d=${f(car.distance)} l=${f(car.lateral)} ` +
          `sp=${f(car.speed)} m=${car.mode} ft=${f(car.finishTimeMs)} ` +
          `pos=${positionOf(field, car)}`,
      );
    }
  }
}

function dumpScoring(): void {
  w("== SCORING ==");
  for (const ms of [0, -1, 1, 999, 1000, 59999, 60000, 61001, 125678, 3599999, 3600000]) {
    w(`lap ${ms} ${formatLapTime(ms)}`);
  }
  w(`lapNull ${formatLapTime(null)}`);
  for (let position = 1; position <= 20; position += 1) {
    for (const laps of [1, 3, 5]) {
      for (const pb of [false, true]) {
        w(
          `xp ${position} ${laps} ${b(pb)} ` +
            `${calculateGrandPrixXp(position, { personalBest: pb, laps })} ` +
            `${grandPrixVerdict(position)}`,
        );
      }
    }
  }
  for (const laps of [1, 2, 3, 4, 5, 6, 9]) {
    w(`mult ${laps} ${grandPrixXpMultiplier(laps)}`);
  }

  let stats = emptyGrandPrixStats;
  const results: {
    position: number;
    time: number;
    circuit: GrandPrixCircuitId;
    laps: number;
  }[] = [
    { position: 4, time: 92000, circuit: "emeraldPark", laps: 1 },
    { position: 1, time: 90500, circuit: "emeraldPark", laps: 1 },
    { position: 1, time: 91200, circuit: "emeraldPark", laps: 1 },
    { position: 3, time: 271000, circuit: "emeraldPark", laps: 3 },
    { position: 12, time: 118000, circuit: "harbourStreet", laps: 1 },
    { position: 1, time: 88000, circuit: "emeraldPark", laps: 1 },
    { position: 20, time: 0, circuit: "mountainPass", laps: 1 },
    { position: 2, time: 260000, circuit: "emeraldPark", laps: 3 },
  ];
  for (const result of results) {
    const pb = isPersonalBest(stats, result.circuit, result.time, result.laps);
    stats = recordInto(stats, {
      position: result.position,
      lapTimeMs: result.time,
      circuit: result.circuit,
      laps: result.laps,
      xp: 0,
    });
    const bests = Object.entries(stats.bestLapMsByCircuit)
      .sort(([a], [c]) => (a < c ? -1 : a > c ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join(",");
    w(
      `season P${result.position} ${result.circuit}@${result.laps} ` +
        `pb=${b(pb)} races=${stats.races} wins=${stats.wins} ` +
        `podiums=${stats.podiums} best=${stats.bestPosition} ` +
        `streak=${stats.currentStreak} bestStreak=${stats.bestStreak} ` +
        `bests=${bests}`,
    );
  }
  for (const circuit of grandPrixCircuitIds) {
    for (const laps of [1, 3, 5]) {
      w(`best ${circuit}@${laps} ${bestLapMs(stats, circuit, laps) ?? "-"}`);
    }
  }
  for (const name of ["emeraldPark", "desertMile", "nope", ""]) {
    w(
      `fromName ${name} ${grandPrixCircuitFromName(name)} ` +
        `${grandPrixLiveryFromName(name)}`,
    );
  }
}

dumpCircuits();
dumpGeometry();
dumpDrivers();
dumpLaunch();
dumpFields();
dumpRaces();
dumpScoring();
process.stdout.write(`${lines.join("\n")}\n`);
