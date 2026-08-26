/**
 * The profile feature's public API.
 *
 * The dossier itself, plus the identity store — onboarding writes the setup it
 * collects through `saveProfileSetup`, and everything else about who the player
 * is stays behind this boundary.
 */
export { ProfileScreen } from "./components/profile-screen";

export {
  readProfileIdentity,
  resetProfileIdentity,
  saveProfileSetup,
  useProfileIdentity,
} from "./state/profile-identity";

export type { ProfileIdentity } from "./types";
