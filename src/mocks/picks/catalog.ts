import type { PickMarket, PickMarketStatus, PickMarketType, PickOutcome } from "@/domain/predictions";
import type { Sport } from "@/domain/sports";
import { matchById, trendingMarkets } from "@/mocks/matches";

export const picksDemoAnchor = "2026-08-25T12:00:00.000Z";

type MarketInput = {
  id: string; sport: Sport; leagueId: string; leagueLabel: string; question: string;
  type: PickMarketType; status?: PickMarketStatus; outcomes: PickOutcome[]; volumeOz: number;
  closesAt: string; matchId?: string; contextTitle?: string; contextSubtitle?: string;
  homeLabel?: string; awayLabel?: string; homeScore?: string; awayScore?: string;
  liveLabel?: string; resultNote?: string; resolvedOutcomeId?: string; voidReason?: string;
};

function history(closesAt: string, outcomes: PickOutcome[]): PickMarket["priceHistory"] {
  return [-168, -72, -24, -6, 0].map((hours, pointIndex) => ({
    at: new Date(Date.parse(closesAt) + hours * 3_600_000).toISOString(),
    percentsByOutcome: Object.fromEntries(outcomes.map((outcome, outcomeIndex) => {
      const drift = (outcome.delta ?? (outcomeIndex % 2 ? -2 : 2)) * (4 - pointIndex) / 4;
      return [outcome.id, Math.round(Math.max(1, Math.min(99, outcome.probabilityPercent - drift)))];
    })),
  }));
}

function defineMarket(input: MarketInput): PickMarket {
  const status = input.status ?? "upcoming";
  return { ...input, status, resolved: status === "settled" || status === "voided", priceHistory: history(input.closesAt, input.outcomes) };
}

function normalizedTrending(market: PickMarket, index: number): PickMarket {
  const matchIds: Record<string, string> = {
    epl_liv_mc_winner: "epl_liv_mci", ipl_sixes_over_12_5: "1496576",
    epl_mu_over_1_5: "epl_mu_ars", f1_belgian_gp_winner: "f1_belgian_gp",
  };
  const type: PickMarketType = market.id.includes("2026") ? "future" : market.id.includes("over") ? "event" : "match";
  const leagueId = market.leagueLabel === "WORLD CUP" ? "fifa" : market.leagueLabel === "BELGIAN GP" ? "f1" : market.leagueLabel.toLowerCase().replaceAll(" ", "-");
  const closesAt = type === "future" ? "2027-06-01T18:00:00.000Z" : new Date(Date.parse(picksDemoAnchor) + (index + 1) * 28_800_000).toISOString();
  const match = matchIds[market.id] ? matchById(matchIds[market.id]) : undefined;
  const settled = market.id === "f1_belgian_gp_winner" || market.id === "epl_mu_over_1_5";
  return defineMarket({
    id: market.id, sport: market.sport, leagueId,
    leagueLabel: market.leagueLabel, question: market.question, type, status: settled ? "settled" : market.id === "ipl_sixes_over_12_5" ? "live" : "upcoming",
    outcomes: market.outcomes, volumeOz: market.volumeOz, closesAt, matchId: match?.id,
    contextTitle: match ? `${match.home.name} vs ${match.away.name}` : undefined,
    homeLabel: match?.home.shortName, awayLabel: match?.away.shortName,
    homeScore: match?.homeScore === undefined ? undefined : String(match.homeScore), awayScore: match?.awayScore === undefined ? undefined : String(match.awayScore),
    liveLabel: match?.status === "live" ? "LIVE" : undefined, resolvedOutcomeId: settled ? (market.id === "epl_mu_over_1_5" ? "over" : "ver") : undefined,
    resultNote: settled ? "Verstappen won from pole" : undefined,
  });
}

const authoredMarkets: PickMarket[] = [
  defineMarket({ id: "epl_cfc_new_result", sport: "football", leagueId: "epl", leagueLabel: "EPL", question: "Chelsea vs Newcastle — full-time result?", type: "match", status: "live", outcomes: [{ id: "cfc", label: "Chelsea", probabilityPercent: 57, delta: 8 }, { id: "draw", label: "Draw", probabilityPercent: 19, delta: -3 }, { id: "new", label: "Newcastle", probabilityPercent: 24, delta: -5 }], volumeOz: 28200, closesAt: "2026-08-25T19:00:00.000Z", matchId: "epl_cfc_new", contextTitle: "Chelsea vs Newcastle United", contextSubtitle: "67 minutes", homeLabel: "CHE", awayLabel: "NEW", homeScore: "2", awayScore: "1", liveLabel: "67'" }),
  defineMarket({ id: "epl_cfc_new_next_goal", sport: "football", leagueId: "epl", leagueLabel: "EPL", question: "Which side scores the next goal?", type: "event", status: "live", outcomes: [{ id: "cfc", label: "Chelsea", probabilityPercent: 61, delta: 4 }, { id: "new", label: "Newcastle", probabilityPercent: 39, delta: -4 }], volumeOz: 20000, closesAt: "2026-08-25T19:00:00.000Z", matchId: "epl_cfc_new", contextTitle: "Chelsea 2 — 1 Newcastle", contextSubtitle: "Live at 67 minutes", homeLabel: "CHE", awayLabel: "NEW", homeScore: "2", awayScore: "1", liveLabel: "67'" }),
  defineMarket({ id: "ipl_pjk_rcb_winner", sport: "cricket", leagueId: "ipl", leagueLabel: "IPL", question: "Punjab Kings vs RCB — who wins?", type: "match", status: "live", outcomes: [{ id: "pbks", label: "Punjab", probabilityPercent: 44, delta: -3, color: "#ef3340" }, { id: "rcb", label: "Bengaluru", probabilityPercent: 56, delta: 3, color: "#d71920" }], volumeOz: 67900, closesAt: "2026-08-25T16:30:00.000Z", matchId: "1496576", contextTitle: "Mumbai vs Chennai", contextSubtitle: "17.2 overs", homeLabel: "MI", awayLabel: "CSK", homeScore: "164/6", awayScore: "148/8", liveLabel: "LIVE" }),
  defineMarket({ id: "ipl_opener_50", sport: "cricket", leagueId: "ipl", leagueLabel: "IPL", question: "Will the opener score 50+?", type: "event", status: "unresolved", outcomes: [{ id: "yes", label: "Yes", probabilityPercent: 62, delta: 5 }, { id: "no", label: "No", probabilityPercent: 38, delta: -5 }], volumeOz: 18400, closesAt: "2026-08-24T16:00:00.000Z", matchId: "t20i_ind_pak", contextTitle: "India vs Pakistan", resultNote: "Awaiting official scorer confirmation" }),
  defineMarket({ id: "epl_avl_bha_double_chance", sport: "football", leagueId: "epl", leagueLabel: "EPL", question: "Villa or draw — double chance?", type: "event", status: "settled", outcomes: [{ id: "villa_draw", label: "Villa / Draw", probabilityPercent: 68 }, { id: "bha", label: "Brighton", probabilityPercent: 32 }], volumeOz: 23100, closesAt: "2026-08-23T18:00:00.000Z", resolvedOutcomeId: "villa_draw", resultNote: "Aston Villa 2–1 Brighton" }),
  defineMarket({ id: "ipl_rain_delay", sport: "cricket", leagueId: "ipl", leagueLabel: "IPL", question: "Will rain delay play?", type: "event", status: "voided", outcomes: [{ id: "yes", label: "Yes", probabilityPercent: 35 }, { id: "no", label: "No", probabilityPercent: 65 }], volumeOz: 9700, closesAt: "2026-08-23T14:00:00.000Z", voidReason: "Market voided before the toss", resultNote: "All stakes refunded" }),
  defineMarket({ id: "nba_lal_gsw_winner", sport: "basketball", leagueId: "nba", leagueLabel: "NBA", question: "Lakers vs Warriors — who wins?", type: "match", outcomes: [{ id: "lal", label: "Lakers", probabilityPercent: 48, delta: -2 }, { id: "gsw", label: "Warriors", probabilityPercent: 52, delta: 2 }], volumeOz: 83400, closesAt: "2026-08-25T23:30:00.000Z", matchId: "nba_lal_gsw", contextTitle: "Lakers vs Warriors" }),
  defineMarket({ id: "laliga_title_2027", sport: "football", leagueId: "laliga", leagueLabel: "LALIGA", question: "Who wins LaLiga 2026/27?", type: "future", outcomes: [{ id: "rma", label: "Real Madrid", probabilityPercent: 42 }, { id: "bar", label: "Barcelona", probabilityPercent: 39 }, { id: "atm", label: "Atletico", probabilityPercent: 12 }], volumeOz: 192000, closesAt: "2027-05-30T18:00:00.000Z" }),
  defineMarket({ id: "seriea_title_2027", sport: "football", leagueId: "serie-a", leagueLabel: "SERIE A", question: "Who takes the Serie A title?", type: "future", outcomes: [{ id: "int", label: "Inter", probabilityPercent: 38 }, { id: "juv", label: "Juventus", probabilityPercent: 31 }, { id: "mil", label: "Milan", probabilityPercent: 19 }], volumeOz: 116000, closesAt: "2027-05-23T18:00:00.000Z" }),
];

export const pickMarkets: PickMarket[] = [...trendingMarkets.map(normalizedTrending), ...authoredMarkets];
const pickMarketIndex = new Map(pickMarkets.map((market) => [market.id, market]));
export const allPickMarketIds = pickMarkets.map((market) => market.id);
export function pickMarketById(id: string): PickMarket | undefined { return pickMarketIndex.get(id); }
export function pickMarketsForMatch(matchId: string): PickMarket[] { return pickMarkets.filter((market) => market.matchId === matchId); }
export function hasLinkedFixture(market: PickMarket): boolean { return Boolean(market.matchId && matchById(market.matchId)); }
