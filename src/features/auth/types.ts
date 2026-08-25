/** The clip that plays behind the sign-in heading. */
export type AuthHeroMedia = {
  /** Path under `public/`, for example `/assets/backgrounds/auth-hero.mp4`. */
  src: string;
  /** `video` autoplays muted on a loop; `image` covers a still or a GIF. */
  kind: "video" | "image";
  /** Frame shown while a video buffers. */
  poster?: string;
  /** Describes the artwork; leave unset when it is purely decorative. */
  alt?: string;
};
