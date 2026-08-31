/**
 * The profile feature's public API.
 *
 * The dossier itself, plus the identity store — onboarding writes the setup it
 * collects through `saveProfileSetup`, and everything else about who the player
 * is stays behind this boundary.
 */
export { ProfileScreen } from "./components/profile-screen";
export { AllCardsScreen } from "./components/all-cards-screen";
export {
  ProfileHistoryScreen,
  type ProfileHistoryScreenProps,
} from "./components/profile-history";
export type { HistorySection } from "@/mocks/profile";

export {
  playerDisplayName,
  usePlayerStanding,
  type PlayerStanding,
} from "./state/player-standing";

export { RivalDossierOverlay } from "./components/rival-dossier";

export {
  readProfileIdentity,
  resetProfileIdentity,
  saveProfileSetup,
  useProfileIdentity,
} from "./state/profile-identity";

export type { ProfileIdentity } from "./types";
