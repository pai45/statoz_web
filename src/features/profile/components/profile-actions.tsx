"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import {
  accentVar,
  ChevronRightIcon,
  feedbackVar,
  HeadsetIcon,
  LogoutIcon,
  MenuBookIcon,
  SettingsIcon,
  StyleIcon,
  withAlpha,
} from "@/design-system";
import { signOut } from "@/features/auth";

import { ProfileOverlay } from "./profile-overlay";
import styles from "./profile.module.css";

/**
 * The utility rows that close the dossier, and the settings sheet behind the
 * last of them.
 *
 * Three of the four destinations — All Cards, How To Play, Talk to StatOz — are
 * screens the web has not built. Their rows stay, because the profile is where
 * a player looks for them, but they are marked and inert rather than wired to a
 * route with no page behind it.
 */

const cyan = accentVar("cyan");
const danger = feedbackVar("danger");

export function ProfileActions() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <ul className="flex flex-col gap-2.5">
        <li>
          <Link
            href="/cards"
            className={`flex w-full items-center gap-3 border px-4 py-4 text-left ${styles.pressable} cursor-pointer`}
            style={{
              background: withAlpha("var(--ds-color-background-secondary)", 0.5),
              borderColor: "var(--ds-color-border-default)",
            }}
          >
            <span aria-hidden style={{ color: cyan }}>
              <StyleIcon size={20} />
            </span>
            <span className="flex-1 text-base font-semibold leading-none">All Cards</span>
            <ChevronRightIcon size={20} className="text-muted" />
          </Link>
        </li>
        <li>
          <NavRow icon={<MenuBookIcon size={20} />} label="How To Play" pending />
        </li>
        <li>
          <NavRow
            icon={<HeadsetIcon size={20} />}
            label="Talk to StatOz 1:1"
            pending
          />
        </li>
        <li>
          <NavRow
            icon={<SettingsIcon size={20} />}
            label="Settings"
            onClick={() => setSettingsOpen(true)}
          />
        </li>
      </ul>

      {settingsOpen ? (
        <SettingsSheet onClose={() => setSettingsOpen(false)} />
      ) : null}
    </>
  );
}

function NavRow({
  icon,
  label,
  onClick,
  pending = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  pending?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-disabled={pending || undefined}
      className={[
        "flex w-full items-center gap-3 border px-4 py-4 text-left",
        pending ? "cursor-default" : `${styles.pressable} cursor-pointer`,
      ].join(" ")}
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.5),
        borderColor: "var(--ds-color-border-default)",
        opacity: pending ? 0.55 : undefined,
      }}
    >
      <span aria-hidden style={{ color: cyan }}>
        {icon}
      </span>
      <span className="flex-1 text-base font-semibold leading-none">{label}</span>
      {pending ? (
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: "8px", letterSpacing: "var(--ds-tracking-wide)" }}
        >
          SOON
        </span>
      ) : (
        <ChevronRightIcon size={20} className="text-muted" />
      )}
    </button>
  );
}

/* ---- Settings -------------------------------------------------------------- */

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return <LogoutConfirm onCancel={() => setConfirming(false)} onClose={onClose} />;
  }

  return (
    <ProfileOverlay
      title="SETTINGS"
      icon={<SettingsIcon size={17} />}
      onClose={onClose}
    >
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full cursor-pointer items-center gap-3 px-4.5 py-4 text-left transition-colors hover:bg-white/4"
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center border"
          style={{
            color: danger,
            background: withAlpha(danger, 0.12),
            borderColor: withAlpha(danger, 0.55),
          }}
        >
          <LogoutIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block font-display font-black leading-none"
            style={{
              fontSize: "12px",
              letterSpacing: "var(--ds-tracking-wide)",
              color: danger,
            }}
          >
            LOG OUT
          </span>
          <span className="mt-1 block text-xs leading-none text-muted">
            Hide your player data and return to sports
          </span>
        </span>
        <ChevronRightIcon size={20} style={{ color: danger }} />
      </button>
    </ProfileOverlay>
  );
}

/**
 * Signing out only removes the local demo session. Player data remains stored
 * but is unreachable until the next sign-in.
 */
function LogoutConfirm({
  onCancel,
  onClose,
}: {
  onCancel: () => void;
  onClose: () => void;
}) {
  const router = useRouter();

  const logOut = useCallback(() => {
    onClose();
    signOut();
    router.replace("/");
  }, [onClose, router]);

  return (
    <ProfileOverlay
      title="LOG OUT"
      accent={danger}
      icon={<LogoutIcon size={16} />}
      size="dialog"
      onClose={onCancel}
      footer={
        <div className="flex">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer py-3 font-display font-black leading-none text-muted"
            style={{ fontSize: "11px", letterSpacing: "var(--ds-tracking-mega)" }}
          >
            CANCEL
          </button>
          <span aria-hidden className="w-px self-stretch bg-line-strong" />
          <button
            type="button"
            onClick={logOut}
            className="flex-1 cursor-pointer py-3 font-display font-black leading-none"
            style={{
              fontSize: "11px",
              letterSpacing: "var(--ds-tracking-mega)",
              color: danger,
            }}
          >
            LOG OUT &gt;
          </button>
        </div>
      }
    >
      <div className="px-5 pb-5 pt-4">
        <p
          className="font-display font-black leading-tight"
          style={{ fontSize: "16px", letterSpacing: "var(--ds-tracking-label)" }}
        >
          LOG OUT OF STATOZ?
        </p>
        <p className="mt-2.5 text-sm leading-body text-muted">
          Your profile, coins, cards, matches, and progress will be hidden but
          remain saved in this browser for your next sign-in.
        </p>
      </div>
    </ProfileOverlay>
  );
}
