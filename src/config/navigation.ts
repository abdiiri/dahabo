import {
  Gauge,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  children?: { label: string; to: string }[];
};

export type NavGroup = { group: string; items: NavItem[] };

export const staffNav: NavGroup[] = [
  {
    group: "Command",
    items: [
      { label: "Dashboard", to: "/staff", icon: Gauge },
      { label: "Drivers", to: "/staff/drivers", icon: UserCog },
      { label: "Staff", to: "/staff/users", icon: Users },
    ],
  },
];

export const driverNav: NavGroup[] = [
  {
    group: "My work",
    items: [{ label: "Dashboard", to: "/driver", icon: Gauge }],
  },
];

export const searchIndex = [
  { group: "Drivers", items: ["Drivers"], to: "/staff/drivers", icon: UserCog },
  { group: "Staff", items: ["Staff"], to: "/staff/users", icon: Users },
];
