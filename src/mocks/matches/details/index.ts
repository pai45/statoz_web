import type { MatchDetailData, SportMatch } from "@/domain/matches";

import { basketballDetail } from "./basketball";
import { cricketDetail } from "./cricket";
import { footballDetail } from "./football";
import { motorsportDetail } from "./motorsport";
import { buildMatchDetail } from "./shared";
import { tennisDetail } from "./tennis";

const detailBySport = { football: footballDetail, cricket: cricketDetail, basketball: basketballDetail, tennis: tennisDetail, motorsport: motorsportDetail };
export function matchDetailFor(match: SportMatch): MatchDetailData { return buildMatchDetail(match, detailBySport[match.sport]); }
