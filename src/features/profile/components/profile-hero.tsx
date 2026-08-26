"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { accentVar, CopyIcon, EditIcon, Progress, withAlpha } from "@/design-system";
import {
  levelFromXp,
  trackShortLabels,
  type ProgressTrack,
  type TrackXp,
} from "@/domain/progression";
import { avatarOptionById, BannerVisual, profileBannerOptionById } from "@/features/onboarding";
import { publicAsset } from "@/shared/config";

import type { PlayerProgress } from "../state/player-progress";

import { ProfilePanel } from "./profile-panel";
import styles from "./profile.module.css";

/**
 * The dossier hero: a banner strip, an avatar overlapping it, the player's name
 * and greeble line, the glowing level chip, the XP meter, the mastery strip and
 * the shareable player tag.
 *
 * The phone keeps the app's exact geometry — a 206px banner, the card starting
 * 120px down, the avatar at 28/72 — but as flow rather than a fixed 420px
 * `Stack`, so nothing clips when a track label or a name runs long. Once there
 * is room the identity and the meters sit side by side instead of stacked,
 * which is the one thing a phone could never do.
 *
 * Per the glow rule this is the only lit part of the page: the level chip and
 * the XP meter carry the accent, and every other surface stays matte.
 */

const cyan = accentVar("cyan");

export type ProfileHeroProps = {
  progress: PlayerProgress;
  avatarId: string;
  bannerId: string;
  playerTag: string | null;
  onEditAvatar: () => void;
  onEditBanner: () => void;
};

export function ProfileHero({
  progress,
  avatarId,
  bannerId,
  playerTag,
  onEditAvatar,
  onEditBanner,
}: ProfileHeroProps) {
  const banner = profileBannerOptionById(bannerId);
  const avatar = avatarOptionById(avatarId);

  return (
    <section className="relative">
      {/* Banner. Flat art with a blend into the page, so the card below it
          appears to sit on the same surface rather than on a photograph. */}
      <div className="absolute inset-x-0 top-0 h-51.5 overflow-hidden lg:h-60">
        <BannerVisual banner={banner} />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-19"
          style={{
            background: `linear-gradient(to bottom,
              ${withAlpha("var(--ds-color-background-primary)", 0)} 0%,
              ${withAlpha("var(--ds-color-background-primary)", 0.72)} 62%,
              var(--ds-color-background-primary) 100%)`,
          }}
        />
        <EditButton
          label="Edit banner"
          onClick={onEditBanner}
          className="absolute right-3 top-3"
        />
      </div>

      <div className="relative px-2 pt-30 lg:px-0 lg:pt-33">
        <ProfilePanel>
          {/* The panel clips its content to the chamfer, so everything inside
              is positioned against the panel itself rather than against a
              padded box the chip would hang outside of. */}
          <div className="relative">
            <div className="absolute right-4 top-4.5 lg:right-6">
              <LevelChip level={progress.level} />
            </div>

            <div className="px-5 pb-5 pt-19 lg:flex lg:items-start lg:gap-10 lg:px-7 lg:pt-21">
              <div className="min-w-0 lg:flex-1">
                <h1
                  className="font-display font-black leading-none"
                  style={{
                    fontSize: "24px",
                    letterSpacing: "var(--ds-tracking-label)",
                  }}
                >
                  PLAYER ONE
                </h1>
                <p
                  className="mt-1 font-display font-black leading-none text-muted"
                  style={{ fontSize: "10px", letterSpacing: "var(--ds-tracking-ultra)" }}
                >
                  OPERATIVE // ID 0001
                </p>

                <div className="mt-4.5 lg:max-w-90">
                  <XpMeter progress={progress} />
                </div>
              </div>

              <div className="mt-3 lg:mt-0 lg:min-w-0 lg:flex-1">
                <MasteryStrip xpByTrack={progress.xpByTrack} tracks={progress.tracks} />
                <div className="mt-3">
                  <PlayerTagPill tag={playerTag} />
                </div>
              </div>
            </div>
          </div>
        </ProfilePanel>
      </div>

      {/* The avatar straddles the banner and the card, so it sits outside both. */}
      <div className="absolute left-7 top-18 lg:left-10 lg:top-21">
        <Avatar src={avatar.src} label={avatar.label} onEdit={onEditAvatar} />
      </div>
    </section>
  );
}

/* ---- Banner and avatar chrome -------------------------------------------- */

function EditButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "grid size-8 cursor-pointer place-items-center border transition-colors",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        color: cyan,
        // The app's CTA edge is a dark teal; the palette reaches it as cyan
        // held well back, which is what a hairline over this ground wants.
        borderColor: withAlpha(cyan, 0.55),
        background: withAlpha("var(--ds-color-background-primary)", 0.86),
      }}
    >
      <EditIcon size={16} />
    </button>
  );
}

function Avatar({
  src,
  label,
  onEdit,
}: {
  src: string;
  label: string;
  onEdit: () => void;
}) {
  return (
    <div className="relative size-26 lg:size-32">
      <div
        className="absolute bottom-0 left-0 size-24 overflow-hidden lg:size-30"
        style={{
          background: "var(--ds-color-background-elevated)",
          border: `2px solid ${cyan}`,
          // The player's own face is a legitimate focal element, so it is the
          // one thing besides the level chip allowed a bloom.
          boxShadow: `0 4px 0 var(--ds-color-fixture-shadow), 0 0 18px -6px ${withAlpha(cyan, 0.75)}`,
        }}
      >
        <Image
          src={publicAsset(src)}
          alt={label}
          fill
          sizes="8rem"
          className="object-cover object-top"
        />
      </div>

      <EditButton
        label="Edit avatar"
        onClick={onEdit}
        className="absolute right-0 top-0"
      />
    </div>
  );
}

/* ---- Level, XP, mastery --------------------------------------------------- */

/**
 * The level badge — a raised plate, lit by a top-to-bottom fill and a soft dark
 * shadow rather than a neon halo, so it reads as hardware sitting proud of the
 * card.
 */
function LevelChip({ level }: { level: number }) {
  return (
    <span
      className="relative inline-flex"
      aria-label={`Level ${level}`}
      style={{ filter: "drop-shadow(0 3px 6px rgb(0 0 0 / 50%))" }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: withAlpha(cyan, 0.85),
        }}
      />
      <span
        aria-hidden
        className="absolute inset-[1.4px]"
        style={{
          clipPath: "var(--ds-clip-field)",
          background:
            "linear-gradient(to bottom, var(--ds-color-background-elevated), var(--ds-color-background-secondary))",
        }}
      />
      <span className="relative flex items-baseline gap-1.5 px-3.5 py-1.5">
        <span
          className="font-display font-black leading-none"
          style={{
            fontSize: "9px",
            letterSpacing: "var(--ds-tracking-ultra)",
            color: withAlpha(cyan, 0.85),
          }}
        >
          LVL
        </span>
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{ fontSize: "20px", color: cyan }}
        >
          {level}
        </span>
      </span>
    </span>
  );
}

function XpMeter({ progress }: { progress: PlayerProgress }) {
  const { band } = progress;
  return (
    <div>
      <div className="flex items-baseline">
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: "10px", letterSpacing: "var(--ds-tracking-wide)" }}
        >
          XP
        </span>
        <span
          className="ds-tabular ml-auto font-display font-black leading-none text-muted"
          style={{ fontSize: "10px", letterSpacing: "var(--ds-tracking-tight)" }}
        >
          {band.intoLevel} / {band.levelSpan}
        </span>
      </div>
      <div className="mt-1.75">
        <Progress
          value={band.fraction}
          accent={cyan}
          label={`${band.intoLevel} of ${band.levelSpan} XP into level ${band.level}`}
          height={6}
        />
      </div>
    </div>
  );
}

/**
 * One chip per track carrying XP. Flat and matte — the level chip stays the
 * focus — and absent entirely until a mode has actually been played.
 */
function MasteryStrip({
  xpByTrack,
  tracks,
}: {
  xpByTrack: TrackXp;
  tracks: ProgressTrack[];
}) {
  return (
    <div>
      <p
        className="font-display font-black leading-none text-muted"
        style={{ fontSize: "9px", letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        MASTERY
      </p>
      {tracks.length === 0 ? (
        <p
          className="mt-2 font-display font-black leading-none text-muted"
          style={{ fontSize: "9px", letterSpacing: "var(--ds-tracking-wide)" }}
        >
          PLAY A MODE TO START A TRACK
        </p>
      ) : (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
          {tracks.map((track) => (
            <li key={track} className="shrink-0">
              <MasteryChip
                label={trackShortLabels[track]}
                level={levelFromXp(xpByTrack[track] ?? 0)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MasteryChip({ label, level }: { label: string; level: number }) {
  return (
    <span
      className="relative inline-flex"
      aria-label={`${label} level ${level}`}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: withAlpha("var(--ds-color-border-default)", 0.9),
        }}
      />
      <span
        aria-hidden
        className="absolute inset-px"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: "var(--ds-color-background-elevated)",
        }}
      />
      <span className="relative flex items-baseline gap-1.5 px-2.5 py-1.5">
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: "8px", letterSpacing: "var(--ds-tracking-wide)" }}
        >
          {label}
        </span>
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{ fontSize: "14px", color: cyan }}
        >
          L{level}
        </span>
      </span>
    </span>
  );
}

/* ---- The player tag ------------------------------------------------------- */

/**
 * The player's own shareable tag. Tap to copy it; another player pastes it to
 * find you.
 *
 * Flutter confirms with a `SnackBar`; the web says so in place and politely,
 * which needs no host surface and never covers the thing you just copied.
 */
function PlayerTagPill({ tag }: { tag: string | null }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    if (tag === null) return;
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
    } catch {
      // A browser can refuse the clipboard outright; the tag is still on screen
      // to be read off, so there is nothing to recover from.
    }
  }, [tag]);

  const style: CSSProperties = {
    fontSize: "16px",
    letterSpacing: "var(--ds-tracking-tight)",
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={copy}
        disabled={tag === null}
        aria-label={tag === null ? "Player tag loading" : `Copy player tag ${tag}`}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 disabled:cursor-default"
      >
        <span
          className="ds-tabular truncate font-semibold leading-none"
          style={style}
        >
          {tag ?? "••••-••••"}
        </span>
        <CopyIcon size={16} style={{ color: withAlpha(cyan, 0.85) }} />
      </button>

      {copied ? (
        <span
          role="status"
          className={`${styles.copied} font-display font-black leading-none`}
          style={{
            fontSize: "8px",
            letterSpacing: "var(--ds-tracking-wide)",
            color: cyan,
          }}
        >
          COPIED
        </span>
      ) : null}
    </div>
  );
}
