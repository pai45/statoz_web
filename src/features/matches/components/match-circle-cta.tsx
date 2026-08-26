"use client";

import type { SportMatch } from "@/domain/matches";
import { Icon, type IconProps } from "@/design-system/icons/icon";

import styles from "./match-detail.module.css";

function ForumIcon(props: IconProps) {
  return (
    <Icon viewBox="0 -960 960 960" {...props}>
      <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80l160-160h560q33 0 56.5-23.5T880-320v-480q0-33-23.5-56.5T800-880H160q-33 0-56.5 23.5T80-800v720Zm80-213v-507h640v480H207l-47 27Z" />
    </Icon>
  );
}

export function MatchCircleCta({ match }: { match: SportMatch }) {
  const countLabel = "1.2k";

  return (
    <button
      type="button"
      className={styles.circleCta}
      aria-label={`Open Match Circle, ${countLabel} discussion posts for ${match.home.name} versus ${match.away.name}`}
    >
      <span className={styles.circleCtaInner}>
        <ForumIcon size={20} />
        <span className={styles.circleLabel}>Match Circle</span>
        <span className={styles.circleCount}>{countLabel}</span>
      </span>
    </button>
  );
}
