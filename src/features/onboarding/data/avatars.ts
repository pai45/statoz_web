import type { AvatarOption } from "../types";

/** The faces a new player picks their dossier portrait from. */
export const avatarOptions: AvatarOption[] = [
  { id: "adams", label: "Adams", src: "/assets/avatars/adams.webp" },
  { id: "bellingham", label: "Bellingham", src: "/assets/avatars/bellingham.webp" },
  { id: "raphinha", label: "Raphinha", src: "/assets/avatars/raphinha.webp" },
  { id: "camavinga", label: "Camavinga", src: "/assets/avatars/camavinga.webp" },
  { id: "ndiaye", label: "Ndiaye", src: "/assets/avatars/ndiaye.webp" },
  { id: "rodri", label: "Rodri", src: "/assets/avatars/rodri.webp" },
];

export function avatarOptionById(id: string | undefined): AvatarOption {
  return avatarOptions.find((avatar) => avatar.id === id) ?? avatarOptions[0];
}
