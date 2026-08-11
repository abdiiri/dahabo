import {
  Gauge,
  UserCog,
  Users,
  Package,
  MapPin,
  FileText,
  CreditCard,
  Bell,
  Truck,
  Headphones,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  children?: { label: string; to: string }[];
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

/**
 * STAFF PORTAL
 * Current local version:
 * Dashboard
 * Drivers
 * Staff
 */
export const staffNav: NavGroup[] = [
  {
    group: "Command",
    items: [
      {
        label: "Dashboard",
        to: "/staff",
        icon: Gauge,
      },
      {
        label: "Drivers",
        to: "/staff/drivers",
        icon: UserCog,
      },
      {
        label: "Staff",
        to: "/staff/users",
        icon: Users,
      },
    ],
  },
];

/**
 * DRIVER PORTAL
 */
export const driverNav: NavGroup[] = [
  {
    group: "My Work",
    items: [
      {
        label: "Dashboard",
        to: "/driver",
        icon: Gauge,
      },
    ],
  },
];

/**
 * CUSTOMER PORTAL
 *
 * These exports are required by:
 * src/routes/portal.tsx
 */
export const customerNav: NavGroup[] = [
  {
    group: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/portal",
        icon: Gauge,
      },
      {
        label: "My Shipments",
        to: "/portal/shipments",
        icon: Package,
      },
      {
        label: "Track Shipment",
        to: "/track",
        icon: MapPin,
      },
    ],
  },
  {
    group: "Finance",
    items: [
      {
        label: "Invoices",
        to: "/portal/invoices",
        icon: FileText,
      },
      {
        label: "Payments",
        to: "/portal/payments",
        icon: CreditCard,
      },
    ],
  },
  {
    group: "Support",
    items: [
      {
        label: "Notifications",
        to: "/portal/notifications",
        icon: Bell,
      },
      {
        label: "Support",
        to: "/portal/support",
        icon: Headphones,
      },
      {
        label: "Profile",
        to: "/portal/profile",
        icon: User,
      },
      {
        label: "Settings",
        to: "/portal/settings",
        icon: Settings,
      },
    ],
  },
];

/**
 * GLOBAL SEARCH INDEX
 */
export const searchIndex = [
  {
    group: "Drivers",
    items: ["Drivers"],
    to: "/staff/drivers",
    icon: UserCog,
  },
  {
    group: "Staff",
    items: ["Staff"],
    to: "/staff/users",
    icon: Users,
  },
  {
    group: "Fleet",
    items: ["Fleet"],
    to: "/staff/fleet",
    icon: Truck,
  },
  {
    group: "Shipments",
    items: ["Shipments"],
    to: "/portal/shipments",
    icon: Package,
  },
  {
    group: "Invoices",
    items: ["Invoices"],
    to: "/portal/invoices",
    icon: FileText,
  },
];