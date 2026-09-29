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
  ClipboardList,
  Route,
  Fuel,
  Wrench,
  TrendingUp,
  Users2,
  DollarSign,
  Warehouse,
  BarChart3,
  ShieldCheck,
  Wallet,
  Trash2,
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
 *
 * Staff navigation:
 * - Dashboard
 * - Drivers
 * - Staff
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
        label: "Transport Orders",
        to: "/staff/transport-orders",
        icon: ClipboardList,
      },
      {
        label: "Trips",
        to: "/staff/trips",
        icon: Route,
      },
      {
        label: "Fleet",
        to: "/staff/fleet",
        icon: Truck,
      },
      {
        label: "Fuel",
        to: "/staff/fuel",
        icon: Fuel,
      },
      {
        label: "Maintenance",
        to: "/staff/maintenance",
        icon: Wrench,
      },
      {
        label: "Driver Payments",
        to: "/staff/driver-payments",
        icon: CreditCard,
      },
      {
        label: "Salaries",
        to: "/staff/salaries",
        icon: Wallet,
      },
      {
        label: "Vehicle Profit",
        to: "/staff/vehicle-profit",
        icon: TrendingUp,
      },
      {
        label: "Staff",
        to: "/staff/users",
        icon: Users,
      },
    ],
  },
  {
    group: "Business",
    items: [
      {
        label: "Customers",
        to: "/staff/customers",
        icon: Users2,
      },
      // Commented out — not currently used in the system. Restore this
      // item (and the matching route/pages) if Shipments is needed again.
      // {
      //   label: "Shipments",
      //   to: "/staff/shipments",
      //   icon: Package,
      // },
      {
        label: "Finance",
        to: "/staff/finance",
        icon: DollarSign,
      },
      // Commented out — not currently used in the system. Restore this
      // item (and the matching route/pages) if Warehouses is needed again.
      // {
      //   label: "Warehouses",
      //   to: "/staff/warehouses",
      //   icon: Warehouse,
      // },
      // Commented out — not currently used in the system. Restore this
      // item (and the matching route/pages) if Documents is needed again.
      // {
      //   label: "Documents",
      //   to: "/staff/documents",
      //   icon: FileText,
      // },
      {
        label: "Reports",
        to: "/staff/reports",
        icon: BarChart3,
      },
      {
        label: "Audit Logs",
        to: "/staff/audit-logs",
        icon: ShieldCheck,
      },
      {
        label: "Recycle Bin",
        to: "/staff/recycle-bin",
        icon: Trash2,
      },
      // Commented out — not currently used in the system. Restore this
      // item (and the matching route/pages) if Notifications is needed
      // again.
      // {
      //   label: "Notifications",
      //   to: "/staff/notifications",
      //   icon: Bell,
      // },
      {
        label: "Settings",
        to: "/staff/settings",
        icon: Settings,
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
 * Used by:
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