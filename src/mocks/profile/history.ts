import type { Sport } from "@/domain/sports";
import type { GameId } from "@/features/games/types";

/** The three archives exposed from the player dossier. */
export type HistorySection = "predict" | "pick" | "games";

export type HistoryStatus =
  | "won"
  | "lost"
  | "live"
  | "pending"
  | "unresolved"
  | "voided";

export type PredictionHistoryRecord = {
  id: string;
  sport: Sport;
  matchId: string;
  status: Exclude<HistoryStatus, "voided">;
  submittedAt: string;
  answered: number;
  questions: number;
  correct: number;
  potentialXp: number;
  note: string;
};

export type PickHistoryRecord = {
  id: string;
  sport: Sport;
  matchId: string;
  marketId: string;
  market: string;
  outcome: string;
  status: HistoryStatus;
  submittedAt: string;
  stakeOz: number;
  probability: number;
  payoutOz: number;
  note: string;
};

export type GameHistoryRecord = {
  id: string;
  sport: Sport;
  game: GameId;
  opponent: string;
  result: "won" | "draw" | "lost";
  playedAt: string;
  playerScore: string;
  opponentScore: string;
  streak: number;
  note: string;
};

/**
 * Presentation fixtures for the first web archive pass. The ids deliberately
 * point at the existing match catalog, which means these can be replaced by a
 * repository later without changing the history card contract.
 */
export const predictionHistoryRecords: PredictionHistoryRecord[] = [
  {
    id: "prediction-cfc-newcastle",
    sport: "football",
    matchId: "epl_cfc_new",
    status: "live",
    submittedAt: "2026-08-28T08:40:00.000Z",
    answered: 3,
    questions: 5,
    correct: 2,
    potentialXp: 120,
    note: "Locked while the match is in play.",
  },
  {
    id: "prediction-liverpool-city",
    sport: "football",
    matchId: "epl_liv_mci",
    status: "pending",
    submittedAt: "2026-08-27T18:10:00.000Z",
    answered: 5,
    questions: 5,
    correct: 0,
    potentialXp: 110,
    note: "All answers are in. Kickoff is next.",
  },
  {
    id: "prediction-france-england",
    sport: "football",
    matchId: "fifa_fra_eng_result",
    status: "won",
    submittedAt: "2026-08-24T16:20:00.000Z",
    answered: 5,
    questions: 5,
    correct: 4,
    potentialXp: 160,
    note: "Prediction settled with a clean read.",
  },
  {
    id: "prediction-mumbai-chennai",
    sport: "cricket",
    matchId: "1496576",
    status: "live",
    submittedAt: "2026-08-28T07:55:00.000Z",
    answered: 2,
    questions: 4,
    correct: 1,
    potentialXp: 140,
    note: "Live innings data is still updating.",
  },
  {
    id: "prediction-india-pakistan",
    sport: "cricket",
    matchId: "t20i_ind_pak",
    status: "lost",
    submittedAt: "2026-08-24T11:30:00.000Z",
    answered: 4,
    questions: 4,
    correct: 1,
    potentialXp: 130,
    note: "The result did not clear the prediction line.",
  },
  {
    id: "prediction-liberty-aces",
    sport: "basketball",
    matchId: "wnba_nyl_lva",
    status: "unresolved",
    submittedAt: "2026-08-25T17:12:00.000Z",
    answered: 4,
    questions: 5,
    correct: 2,
    potentialXp: 95,
    note: "Review is available while settlement catches up.",
  },
  {
    id: "prediction-phoenix-dallas",
    sport: "basketball",
    matchId: "wnba_phx_dal_result",
    status: "won",
    submittedAt: "2026-08-23T18:20:00.000Z",
    answered: 5,
    questions: 5,
    correct: 5,
    potentialXp: 75,
    note: "Perfect card on the finished fixture.",
  },
  {
    id: "prediction-alcaraz-djokovic",
    sport: "tennis",
    matchId: "atp_alc_djo_result",
    status: "won",
    submittedAt: "2026-08-24T10:04:00.000Z",
    answered: 4,
    questions: 4,
    correct: 3,
    potentialXp: 160,
    note: "Straight-sets call confirmed.",
  },
  {
    id: "prediction-swiatek-gauff",
    sport: "tennis",
    matchId: "wta_swi_gau",
    status: "pending",
    submittedAt: "2026-08-27T11:40:00.000Z",
    answered: 3,
    questions: 5,
    correct: 0,
    potentialXp: 125,
    note: "Finish the remaining questions before lock.",
  },
  {
    id: "prediction-belgian-gp",
    sport: "motorsport",
    matchId: "f1_belgian_gp",
    status: "unresolved",
    submittedAt: "2026-08-22T09:35:00.000Z",
    answered: 3,
    questions: 5,
    correct: 2,
    potentialXp: 180,
    note: "Race result is waiting for final review.",
  },
];

export const pickHistoryRecords: PickHistoryRecord[] = [
  {
    id: "pick-liverpool",
    sport: "football",
    matchId: "epl_liv_mci",
    marketId: "epl_liv_mc_winner",
    market: "Liverpool vs Man City — full-time result?",
    outcome: "Liverpool",
    status: "live",
    submittedAt: "2026-08-27T18:22:00.000Z",
    stakeOz: 240,
    probability: 41,
    payoutOz: 0,
    note: "Position is live until the final whistle.",
  },
  {
    id: "pick-world-cup",
    sport: "football",
    matchId: "fifa_fra_eng_result",
    marketId: "fifa_2026_winner",
    market: "Who lifts the 2026 World Cup?",
    outcome: "France",
    status: "won",
    submittedAt: "2026-08-20T12:18:00.000Z",
    stakeOz: 360,
    probability: 21,
    payoutOz: 1714,
    note: "Settled position. Profit is ready to review.",
  },
  {
    id: "pick-ipl-sixes",
    sport: "cricket",
    matchId: "1496576",
    marketId: "ipl_sixes_over_12_5",
    market: "Over 12.5 sixes in tonight's innings?",
    outcome: "Over",
    status: "pending",
    submittedAt: "2026-08-28T07:18:00.000Z",
    stakeOz: 180,
    probability: 58,
    payoutOz: 0,
    note: "Market closes when the innings begins.",
  },
  {
    id: "pick-india-pakistan",
    sport: "cricket",
    matchId: "t20i_ind_pak",
    marketId: "ipl-2026-winner",
    market: "International T20 — match winner",
    outcome: "India",
    status: "lost",
    submittedAt: "2026-08-23T12:40:00.000Z",
    stakeOz: 220,
    probability: 54,
    payoutOz: 0,
    note: "The position closed below the line.",
  },
  {
    id: "pick-liberty",
    sport: "basketball",
    matchId: "wnba_nyl_lva",
    marketId: "wnba-liberty-winner",
    market: "New York Liberty vs Las Vegas Aces",
    outcome: "New York Liberty",
    status: "unresolved",
    submittedAt: "2026-08-25T17:30:00.000Z",
    stakeOz: 140,
    probability: 52,
    payoutOz: 0,
    note: "Review outcome before claiming the position.",
  },
  {
    id: "pick-dallas",
    sport: "basketball",
    matchId: "wnba_phx_dal_result",
    marketId: "wnba-dallas-winner",
    market: "Phoenix Mercury vs Dallas Wings",
    outcome: "Dallas Wings",
    status: "lost",
    submittedAt: "2026-08-23T16:42:00.000Z",
    stakeOz: 95,
    probability: 46,
    payoutOz: 0,
    note: "The opposing side took the settled result.",
  },
  {
    id: "pick-alcaraz",
    sport: "tennis",
    matchId: "atp_alc_djo_result",
    marketId: "atp-alcaraz-winner",
    market: "Alcaraz vs Djokovic — match winner",
    outcome: "Alcaraz",
    status: "won",
    submittedAt: "2026-08-24T10:16:00.000Z",
    stakeOz: 300,
    probability: 62,
    payoutOz: 484,
    note: "Straight-sets settlement confirmed.",
  },
  {
    id: "pick-belgian-gp",
    sport: "motorsport",
    matchId: "f1_belgian_gp",
    marketId: "f1_belgian-gp-winner",
    market: "Who wins at Spa?",
    outcome: "Verstappen",
    status: "voided",
    submittedAt: "2026-08-21T14:05:00.000Z",
    stakeOz: 160,
    probability: 36,
    payoutOz: 160,
    note: "Market voided. Stake returned to the balance.",
  },
];

/** Representative records across the playable catalog. */
export const gameHistoryRecords: GameHistoryRecord[] = [
  {
    id: "game-pitch-duel-01",
    sport: "football",
    game: "pitch-duel",
    opponent: "CPU // PRESSING 07",
    result: "won",
    playedAt: "2026-08-27T20:42:00.000Z",
    playerScore: "3",
    opponentScore: "1",
    streak: 4,
    note: "Won the midfield battle with a late counter.",
  },
  {
    id: "game-shootout-01",
    sport: "football",
    game: "penalty-shootout",
    opponent: "CPU // KEEPER 03",
    result: "lost",
    playedAt: "2026-08-26T18:04:00.000Z",
    playerScore: "3",
    opponentScore: "4",
    streak: 0,
    note: "The final kick found the wrong corner.",
  },
  {
    id: "game-football-quiz-01",
    sport: "football",
    game: "football-quiz",
    opponent: "SET 04 // CLASSIC",
    result: "draw",
    playedAt: "2026-08-25T12:16:00.000Z",
    playerScore: "7",
    opponentScore: "7",
    streak: 0,
    note: "A dead heat after the final question.",
  },
  {
    id: "game-final-over-01",
    sport: "cricket",
    game: "final-over",
    opponent: "CPU // SWING KING",
    result: "won",
    playedAt: "2026-08-27T16:38:00.000Z",
    playerScore: "186/2",
    opponentScore: "179/7",
    streak: 3,
    note: "Six runs from the last ball sealed the chase.",
  },
  {
    id: "game-cricket-quiz-01",
    sport: "cricket",
    game: "cricket-quiz",
    opponent: "SET 02 // POWERPLAY",
    result: "won",
    playedAt: "2026-08-24T09:12:00.000Z",
    playerScore: "9",
    opponentScore: "6",
    streak: 2,
    note: "A sharp read on the powerplay record.",
  },
  {
    id: "game-hoop-duel-01",
    sport: "basketball",
    game: "hoop-duel",
    opponent: "CPU // RIM RUNNER",
    result: "won",
    playedAt: "2026-08-27T10:40:00.000Z",
    playerScore: "21",
    opponentScore: "17",
    streak: 5,
    note: "Perfect release timing carried the fourth quarter.",
  },
  {
    id: "game-basketball-quiz-01",
    sport: "basketball",
    game: "basketball-quiz",
    opponent: "SET 03 // DYNASTIES",
    result: "lost",
    playedAt: "2026-08-23T13:28:00.000Z",
    playerScore: "5",
    opponentScore: "8",
    streak: 0,
    note: "The final buzzer ended a three-question slide.",
  },
  {
    id: "game-tennis-rally-01",
    sport: "tennis",
    game: "tennis-rally",
    opponent: "CPU // BASELINER 11",
    result: "won",
    playedAt: "2026-08-26T14:22:00.000Z",
    playerScore: "2",
    opponentScore: "1",
    streak: 3,
    note: "Turned a long rally into a deciding-set break.",
  },
  {
    id: "game-tennis-quiz-01",
    sport: "tennis",
    game: "tennis-quiz",
    opponent: "SET 01 // GRAND SLAMS",
    result: "draw",
    playedAt: "2026-08-22T08:50:00.000Z",
    playerScore: "6",
    opponentScore: "6",
    streak: 0,
    note: "Neither side gave up a point in the tiebreaker.",
  },
  {
    id: "game-grand-prix-01",
    sport: "motorsport",
    game: "grand-prix-dash",
    opponent: "CPU // GRID 02",
    result: "won",
    playedAt: "2026-08-27T06:20:00.000Z",
    playerScore: "01:42.8",
    opponentScore: "01:44.1",
    streak: 2,
    note: "Purple sector two made the difference at the flag.",
  },
  {
    id: "game-motorsport-quiz-01",
    sport: "motorsport",
    game: "motorsport-quiz",
    opponent: "SET 05 // CIRCUITS",
    result: "lost",
    playedAt: "2026-08-21T11:05:00.000Z",
    playerScore: "4",
    opponentScore: "8",
    streak: 0,
    note: "One corner too late on the final lap history set.",
  },
];
