import type { ElementType } from "react";
import {
  IconBox,
  IconBuilding,
  IconCash,
  IconIdBadge2,
  IconUsers,
} from "@tabler/icons-react";

export type NavItem = {
  path: string;
  label: string;
  icon: ElementType;
};

export const NAV_ITEMS: NavItem[] = [
  { path: "/sites", label: "Mandanten", icon: IconBuilding },
  { path: "/cost-centers", label: "Kostenstellen", icon: IconCash },
  { path: "/assets", label: "Assets", icon: IconBox },
  { path: "/employees", label: "Mitarbeiter", icon: IconIdBadge2 },
  { path: "/users", label: "Benutzer", icon: IconUsers },
];
