import type { ElementType } from "react";
import {
  IconAdjustmentsHorizontal,
  IconBuilding,
  IconCalendarRepeat,
  IconCash,
  IconChartBar,
  IconClipboardList,
  IconIdBadge2,
  IconLayoutDashboard,
  IconPackage,
  IconRobot,
  IconUsers,
} from "@tabler/icons-react";

export type NavItem = {
  path: string;
  label: string;
  icon: ElementType;
};

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { path: "/assets", label: "Assets & Anlagen", icon: IconRobot },
  { path: "/maintenance-plans", label: "Wartungspläne", icon: IconCalendarRepeat },
  { path: "/work-orders", label: "Arbeitsaufträge", icon: IconClipboardList },
  { path: "/spare-parts", label: "Ersatzteillager", icon: IconPackage },
  { path: "/reports", label: "Berichte & Telemetrie", icon: IconChartBar },
  { path: "/sites", label: "Mandanten", icon: IconBuilding },
  { path: "/cost-centers", label: "Kostenstellen", icon: IconCash },
  { path: "/employees", label: "Mitarbeiter", icon: IconIdBadge2 },
  { path: "/users", label: "Benutzer", icon: IconUsers },
  { path: "/settings", label: "Einstellungen", icon: IconAdjustmentsHorizontal },
];
