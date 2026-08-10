import {
  Activity,
  BadgeDollarSign,
  Bell,
  Boxes,
  Building2,
  FileText,
  Gauge,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
  Warehouse,
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
      { label: "Shipments", to: "/staff/shipments", icon: Package, badge: "48" },
      { label: "Customers", to: "/staff/customers", icon: Users },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Fleet",
        to: "/staff/fleet",
        icon: Truck,
        children: [
          { label: "Vehicles", to: "/staff/fleet" },
          { label: "Maintenance", to: "/staff/fleet" },
        ],
      },
      { label: "Drivers", to: "/staff/drivers", icon: UserCog },
      { label: "Warehouses", to: "/staff/warehouses", icon: Warehouse },
    ],
  },
  {
    group: "Business",
    items: [
      { label: "Finance", to: "/staff/finance", icon: BadgeDollarSign },
      { label: "Reports", to: "/staff/reports", icon: Activity },
      { label: "Documents", to: "/staff/documents", icon: FileText },
      { label: "Notifications", to: "/staff/notifications", icon: Bell, badge: "6" },
    ],
  },
  {
    group: "Administration",
    items: [
      { label: "User Management", to: "/staff/users", icon: ShieldCheck },
      { label: "Audit Logs", to: "/staff/audit-logs", icon: ScrollText },
      { label: "Company Profile", to: "/staff/company", icon: Building2 },
      { label: "Settings", to: "/staff/settings", icon: Settings },
    ],
  },
];

// NOTE: portal.tsx imports this but it was missing from the original
// template, which would break the build the first time anyone visited
// /portal. Kept minimal since the customer portal isn't wired to real data.
export const customerNav: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", to: "/portal", icon: Gauge },
      { label: "Shipments", to: "/portal/shipments", icon: Package },
      { label: "Tracking", to: "/portal/tracking", icon: Truck },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Invoices", to: "/portal/invoices", icon: BadgeDollarSign },
      { label: "Payments", to: "/portal/payments", icon: Activity },
      { label: "Pickups", to: "/portal/pickups", icon: Boxes },
      { label: "Notifications", to: "/portal/notifications", icon: Bell },
      { label: "Support", to: "/portal/support", icon: FileText },
      { label: "Settings", to: "/portal/settings", icon: Settings },
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
  { group: "Customers", items: ["Sahal Trading Co.", "Horn Freight Ltd", "BlueNile Foods", "Zawadi Retail"], to: "/staff/customers", icon: Users },
  { group: "Shipments", items: ["DGL-102345", "DGL-102352", "DGL-102359", "DGL-102366"], to: "/staff/shipments", icon: Package },
  { group: "Drivers", items: ["Abdi Hassan", "Grace Wanjiru", "Samuel Otieno"], to: "/staff/drivers", icon: UserCog },
  { group: "Vehicles", items: ["KDD 100A", "KDD 118A", "KDD 154A"], to: "/staff/fleet", icon: Truck },
  { group: "Invoices", items: ["INV-2026-1040", "INV-2026-1041", "INV-2026-1042"], to: "/staff/finance", icon: BadgeDollarSign },
  { group: "Warehouses", items: ["Nairobi Central Hub", "Mombasa Port Depot"], to: "/staff/warehouses", icon: Warehouse },
  { group: "Branches", items: ["Nairobi HQ", "Kampala Office", "Djibouti Corridor Desk"], to: "/branches", icon: Building2 },
  { group: "Reports", items: ["Monthly performance", "Route profitability"], to: "/staff/reports", icon: Activity },
  { group: "Documents", items: ["Bill of Lading", "Proof of Delivery"], to: "/staff/documents", icon: Boxes },
];
