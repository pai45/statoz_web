import {
  accentVar,
  FootballIcon,
  NavRail,
  ProfileIcon,
  ShopIcon,
  TrophyIcon,
  type NavRailItem,
} from "@/design-system";
import { navDestinations, type NavDestinationId } from "@/shared/config";

export type PlatformNavProps = {
  activeId: NavDestinationId;
  orientation?: "bar" | "rail";
  className?: string;
};

const icons: Record<NavDestinationId, React.ReactNode> = {
  sports: <FootballIcon size={20} />,
  shop: <ShopIcon size={20} />,
  leaderboard: <TrophyIcon size={20} />,
  profile: <ProfileIcon size={20} />,
};

/** Platform destinations share one violet accent so no single tab dominates. */
const NAV_ACCENT = accentVar("violet");

/** The platform's primary navigation, in either presentation. */
export function PlatformNav({
  activeId,
  orientation = "bar",
  className,
}: PlatformNavProps) {
  const items: NavRailItem[] = navDestinations.map((destination) => ({
    id: destination.id,
    label: destination.label,
    href: destination.href,
    icon: icons[destination.id],
    accent: NAV_ACCENT,
  }));

  return (
    <NavRail
      label="Primary"
      items={items}
      activeId={activeId}
      orientation={orientation}
      className={className}
    />
  );
}
