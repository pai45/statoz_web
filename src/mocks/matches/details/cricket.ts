import type { DetailConfig } from "./shared";
export const cricketDetail: DetailConfig = {
  mainQuiz: { title: "Match Basics Quiz", subtitle: "Toss, sixes, and match winner", questions: 3, rewardXp: 225 },
  eventQuiz: { subtitle: "Powerplay, wickets, and final-over drama", rewardXp: 210 },
  lineup: { formation: "PLAYING XI", roles: ["BAT", "BAT", "AR", "WK", "AR", "BWL", "BWL", "BWL", "BWL", "BWL", "BWL"] },
  statLabels: ["RUN RATE", "BOUNDARIES", "WICKETS", "DOT BALLS"],
  scoreRows: (match) => [{ label: "POWERPLAY", home: "52/1", away: "46/2" }, { label: "OVERS", home: "20.0", away: match.status === "live" ? "17.2" : "20.0" }, { label: "RUN RATE", home: "8.25", away: "7.40" }],
};
