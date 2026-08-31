"use client";

import { useEffect } from "react";

import { AdaptiveDrawer } from "@/design-system";
import type { PickPosition } from "@/domain/predictions";

import styles from "./picks.module.css";

export function SettlementReveal({ position, onClose }: { position: PickPosition | null; onClose: () => void }) {
  useEffect(() => { if (!position) return; const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; const timeout = window.setTimeout(onClose, reduced ? 100 : 2800); return () => window.clearTimeout(timeout); }, [position, onClose]);
  const title = position?.status === "won" ? "PICK WON" : position?.status === "voided" ? "PICK VOID" : "PICK LOST";
  return <AdaptiveDrawer open={Boolean(position)} onClose={onClose} title="RESULT"><button type="button" onClick={onClose} className={styles.cinematic} aria-label="Skip result reveal"><span><strong>{title}</strong><b>{position?.payoutOz ?? 0} OZ</b><span>{position?.status === "voided" ? "STAKE REFUNDED" : position?.status === "won" ? "PAYOUT CREDITED" : "BETTER LUCK NEXT PICK"}</span><small>Tap to close</small></span></button></AdaptiveDrawer>;
}
