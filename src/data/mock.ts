export type ShipmentStatus = "In Transit" | "Delivered" | "Delayed" | "Pending" | "At Warehouse";

export type Shipment = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  eta: string;
  weight: string;
  service: string;
  driver: string;
  progress: number;
  value: number;
};

export const cities = ["Nairobi", "Mombasa", "Kisumu", "Eldoret", "Nakuru", "Garissa", "Kampala", "Dar es Salaam", "Addis Ababa", "Djibouti"];
const customers = [
  "Sahal Trading Co.",
  "Horn Freight Ltd",
  "BlueNile Foods",
  "Rift Valley Agro",
  "Coastal Cement",
  "Amana Pharma",
  "Nomad Energy",
  "Zawadi Retail",
  "Barwaqo Motors",
  "Juba Distributors",
];
const drivers = [
  "Abdi Hassan",
  "Grace Wanjiru",
  "Samuel Otieno",
  "Fatuma Ali",
  "Peter Kimani",
  "Yusuf Omar",
  "Mercy Chebet",
  "John Mwangi",
];
const services = ["Express Air", "Road Freight", "Sea Freight", "Cold Chain", "Bulk Haulage", "Last Mile"];
const statuses: ShipmentStatus[] = ["In Transit", "Delivered", "Delayed", "Pending", "At Warehouse"];

const pick = <T,>(arr: T[], i: number): T => arr[Math.abs(i) % arr.length] as T;

export const shipments: Shipment[] = Array.from({ length: 48 }, (_, i) => ({
  id: `DGL-${(102345 + i * 7).toString()}`,
  customer: pick(customers, i * 3),
  origin: pick(cities, i),
  destination: pick(cities, i * 5 + 3),
  status: pick(statuses, i * 2 + (i % 3)),
  eta: `${(i % 28) + 1} Aug 2026`,
  weight: `${(120 + i * 37) % 4200} kg`,
  service: pick(services, i + 1),
  driver: pick(drivers, i * 2),
  progress: (i * 13) % 100,
  value: 1200 + ((i * 971) % 48000),
}));

export const customersData = customers.map((name, i) => ({
  id: `CUS-${4100 + i}`,
  name,
  contact: pick(drivers, i + 2),
  email: `ops@${name.toLowerCase().replace(/[^a-z]/g, "")}.com`,
  phone: `+254 7${(10 + i).toString()}  ${(200000 + i * 1337).toString()}`,
  tier: (["Enterprise", "Corporate", "SME"] as const)[i % 3]!,
  shipments: 24 + i * 11,
  outstanding: (i * 4300) % 52000,
  since: `20${18 + (i % 7)}`,
  status: i % 5 === 0 ? "On Hold" : "Active",
}));

export const driversData = drivers.map((name, i) => ({
  id: `DRV-${900 + i}`,
  name,
  license: `KE-DL-${34000 + i * 17}`,
  vehicle: `KDD ${100 + i * 9}A`,
  status: (["On Route", "Available", "Off Duty", "On Route"] as const)[i % 4]!,
  trips: 120 + i * 14,
  rating: (4.2 + (i % 7) / 10).toFixed(1),
  phone: `+254 72${i} 445 ${100 + i}`,
  base: pick(cities, i),
}));

export const fleetData = Array.from({ length: 14 }, (_, i) => ({
  id: `VEH-${2200 + i}`,
  plate: `KDD ${100 + i * 9}A`,
  type: pick(["Prime Mover", "Reefer Truck", "Flatbed", "Box Truck", "Tanker", "Van"], i),
  capacity: `${8 + (i % 6) * 6} tonnes`,
  status: (["Active", "Idle", "Maintenance", "Active"] as const)[i % 4]!,
  driver: pick(drivers, i),
  odometer: `${(120000 + i * 8431).toLocaleString()} km`,
  nextService: `${(i % 27) + 1} Sep 2026`,
  utilisation: 55 + ((i * 7) % 45),
}));

export const warehouses = [
  { id: "WH-01", name: "Nairobi Central Hub", city: "Nairobi", capacity: 86, sqm: "18,400", manager: "Fatuma Ali", docks: 14 },
  { id: "WH-02", name: "Mombasa Port Depot", city: "Mombasa", capacity: 72, sqm: "24,900", manager: "Yusuf Omar", docks: 22 },
  { id: "WH-03", name: "Eldoret Agro Store", city: "Eldoret", capacity: 44, sqm: "9,200", manager: "Mercy Chebet", docks: 8 },
  { id: "WH-04", name: "Kisumu Lakeside", city: "Kisumu", capacity: 61, sqm: "7,600", manager: "Samuel Otieno", docks: 6 },
  { id: "WH-05", name: "Kampala Transit", city: "Kampala", capacity: 38, sqm: "11,100", manager: "Grace Wanjiru", docks: 10 },
];

export const branches = [
  { name: "Nairobi HQ", address: "Enterprise Road, Industrial Area", phone: "+254 700 100 100", hours: "Mon–Sat, 07:00–19:00", country: "Kenya" },
  { name: "Mombasa Port Office", address: "Moi Avenue, Kilindini", phone: "+254 700 100 210", hours: "24/7 Operations", country: "Kenya" },
  { name: "Kisumu Branch", address: "Oginga Odinga Street", phone: "+254 700 100 330", hours: "Mon–Fri, 08:00–18:00", country: "Kenya" },
  { name: "Eldoret Branch", address: "Uganda Road", phone: "+254 700 100 440", hours: "Mon–Sat, 08:00–18:00", country: "Kenya" },
  { name: "Kampala Office", address: "Jinja Road, Nakawa", phone: "+256 414 220 550", hours: "Mon–Fri, 08:00–17:00", country: "Uganda" },
  { name: "Djibouti Corridor Desk", address: "Port de Djibouti", phone: "+253 21 350 660", hours: "24/7 Operations", country: "Djibouti" },
];

export const invoices = Array.from({ length: 18 }, (_, i) => ({
  id: `INV-2026-${(1040 + i).toString()}`,
  customer: pick(customers, i),
  issued: `${(i % 27) + 1} Jul 2026`,
  due: `${(i % 27) + 1} Aug 2026`,
  amount: 4200 + ((i * 3719) % 62000),
  status: (["Paid", "Pending", "Overdue", "Paid"] as const)[i % 4]!,
  shipment: `DGL-${102345 + i * 7}`,
}));

export const payments = Array.from({ length: 12 }, (_, i) => ({
  id: `PAY-${7700 + i}`,
  invoice: `INV-2026-${1040 + i}`,
  method: pick(["M-Pesa", "Bank Transfer", "Card", "Cheque"], i),
  amount: 3800 + ((i * 2917) % 41000),
  date: `${(i % 27) + 1} Jul 2026`,
  status: i % 6 === 0 ? "Processing" : "Settled",
}));

export const notifications = [
  { id: 1, category: "Shipment", title: "DGL-102422 delayed at Mariakani weighbridge", time: "4 min ago", tone: "warning" as const },
  { id: 2, category: "Finance", title: "Payment of KES 412,000 received from Horn Freight Ltd", time: "22 min ago", tone: "success" as const },
  { id: 3, category: "Drivers", title: "Abdi Hassan completed route NBO → MSA", time: "1 hr ago", tone: "default" as const },
  { id: 4, category: "Customers", title: "New customer onboarded: Juba Distributors", time: "3 hrs ago", tone: "default" as const },
  { id: 5, category: "System", title: "Nightly reconciliation completed successfully", time: "6 hrs ago", tone: "success" as const },
  { id: 6, category: "Shipment", title: "Reefer unit VEH-2207 temperature excursion", time: "8 hrs ago", tone: "danger" as const },
];

export const activityFeed = [
  { id: 1, type: "created", title: "Shipment DGL-102513 created", meta: "Sahal Trading Co. · Nairobi → Kampala", time: "09:42" },
  { id: 2, type: "driver", title: "Driver Abdi Hassan assigned", meta: "Vehicle KDD 118A · Bulk Haulage", time: "09:55" },
  { id: 3, type: "dispatch", title: "Vehicle dispatched from Nairobi Central Hub", meta: "Dock 6 · Seal #44812", time: "10:20" },
  { id: 4, type: "payment", title: "Payment received — KES 412,000", meta: "Horn Freight Ltd · M-Pesa", time: "11:05" },
  { id: 5, type: "delivered", title: "Shipment DGL-102401 delivered", meta: "POD signed by G. Njoroge", time: "12:38" },
];

export const revenueSeries = [
  { month: "Jan", revenue: 3.2, target: 3.0 },
  { month: "Feb", revenue: 3.6, target: 3.2 },
  { month: "Mar", revenue: 4.1, target: 3.6 },
  { month: "Apr", revenue: 3.9, target: 3.8 },
  { month: "May", revenue: 4.7, target: 4.0 },
  { month: "Jun", revenue: 5.2, target: 4.4 },
  { month: "Jul", revenue: 5.9, target: 4.8 },
  { month: "Aug", revenue: 6.4, target: 5.2 },
];

export const deliverySeries = [
  { day: "Mon", delivered: 128, delayed: 9 },
  { day: "Tue", delivered: 142, delayed: 12 },
  { day: "Wed", delivered: 156, delayed: 7 },
  { day: "Thu", delivered: 149, delayed: 14 },
  { day: "Fri", delivered: 173, delayed: 11 },
  { day: "Sat", delivered: 121, delayed: 6 },
  { day: "Sun", delivered: 84, delayed: 3 },
];

export const vehicleUsage = [
  { name: "Prime Movers", value: 34 },
  { name: "Reefer", value: 22 },
  { name: "Flatbed", value: 18 },
  { name: "Box Truck", value: 15 },
  { name: "Vans", value: 11 },
];

export const customerGrowth = [
  { month: "Mar", customers: 184 },
  { month: "Apr", customers: 203 },
  { month: "May", customers: 229 },
  { month: "Jun", customers: 261 },
  { month: "Jul", customers: 288 },
  { month: "Aug", customers: 316 },
];

export const topRoutes = [
  { route: "Nairobi → Mombasa", trips: 412, revenue: "KES 18.4M", growth: "+12%" },
  { route: "Mombasa → Kampala", trips: 288, revenue: "KES 14.1M", growth: "+9%" },
  { route: "Nairobi → Kisumu", trips: 254, revenue: "KES 8.7M", growth: "+4%" },
  { route: "Nairobi → Addis Ababa", trips: 176, revenue: "KES 12.9M", growth: "+18%" },
  { route: "Eldoret → Juba", trips: 132, revenue: "KES 9.6M", growth: "-3%" },
];

export const mapMarkers = [
  { id: "v1", kind: "Vehicle", label: "KDD 118A · En route", x: 22, y: 34 },
  { id: "v2", kind: "Vehicle", label: "KDD 154A · En route", x: 61, y: 52 },
  { id: "v3", kind: "Vehicle", label: "KDD 172A · Idling", x: 44, y: 71 },
  { id: "w1", kind: "Warehouse", label: "Nairobi Central Hub", x: 35, y: 45 },
  { id: "w2", kind: "Warehouse", label: "Mombasa Port Depot", x: 74, y: 66 },
  { id: "c1", kind: "Customer", label: "Sahal Trading Co.", x: 52, y: 27 },
  { id: "c2", kind: "Customer", label: "BlueNile Foods", x: 18, y: 62 },
  { id: "d1", kind: "Destination", label: "Kampala Transit", x: 12, y: 22 },
  { id: "p1", kind: "Pickup", label: "Rift Valley Agro pickup", x: 66, y: 20 },
];

export const calendarEvents = [
  { day: "Thu 6", items: [{ t: "07:30", label: "Delivery · DGL-102513", kind: "Delivery" }, { t: "11:00", label: "Pickup · Zawadi Retail", kind: "Pickup" }] },
  { day: "Fri 7", items: [{ t: "09:00", label: "Service · VEH-2205", kind: "Maintenance" }, { t: "15:00", label: "Client review · Horn Freight", kind: "Meeting" }] },
  { day: "Sat 8", items: [{ t: "06:00", label: "Convoy dispatch · Mombasa", kind: "Delivery" }] },
];

export const documents = Array.from({ length: 10 }, (_, i) => ({
  id: `DOC-${5500 + i}`,
  name: pick(["Bill of Lading", "Customs Declaration", "Proof of Delivery", "Insurance Certificate", "Packing List"], i) + ` — DGL-${102345 + i * 7}`,
  type: pick(["PDF", "PDF", "XLSX", "PNG"], i),
  size: `${(120 + i * 43) % 900} KB`,
  owner: pick(drivers, i),
  updated: `${(i % 27) + 1} Jul 2026`,
}));

export const auditLogs = Array.from({ length: 14 }, (_, i) => ({
  id: `LOG-${88100 + i}`,
  actor: pick(["a.hassan", "g.wanjiru", "system", "f.ali", "admin"], i),
  action: pick(["updated shipment status", "created invoice", "assigned driver", "deleted document", "logged in", "changed role"], i),
  target: pick(["DGL-102387", "INV-2026-1042", "DRV-902", "DOC-5503", "USR-118"], i),
  ip: `41.90.${10 + i}.${100 + i * 3}`,
  time: `06 Aug 2026, ${(8 + (i % 10)).toString().padStart(2, "0")}:${(i * 7) % 60}`.padEnd(0),
}));

export const staffUsers = [
  { id: "USR-001", name: "Amina Dahir", email: "amina@dahaboglobal.com", role: "Super Admin", branch: "Nairobi HQ", status: "Active" },
  { id: "USR-002", name: "Peter Kimani", email: "peter@dahaboglobal.com", role: "Operations Manager", branch: "Nairobi HQ", status: "Active" },
  { id: "USR-003", name: "Mercy Chebet", email: "mercy@dahaboglobal.com", role: "Finance Officer", branch: "Eldoret", status: "Active" },
  { id: "USR-004", name: "Yusuf Omar", email: "yusuf@dahaboglobal.com", role: "Warehouse Manager", branch: "Mombasa", status: "Active" },
  { id: "USR-005", name: "Grace Wanjiru", email: "grace@dahaboglobal.com", role: "Fleet Manager", branch: "Kampala", status: "Suspended" },
  { id: "USR-006", name: "Abdi Hassan", email: "abdi@dahaboglobal.com", role: "Driver", branch: "Nairobi HQ", status: "Active" },
];

export const roles = [
  { role: "Super Admin", scope: "Full platform control", permissions: ["All modules", "User management", "Audit logs", "Billing"] },
  { role: "Admin", scope: "Branch-wide administration", permissions: ["Operations", "Customers", "Reports", "Documents"] },
  { role: "Operations Manager", scope: "Shipments & dispatch", permissions: ["Shipments", "Drivers", "Fleet", "Pickups"] },
  { role: "Finance Officer", scope: "Revenue & receivables", permissions: ["Invoices", "Payments", "Finance reports"] },
  { role: "Warehouse Manager", scope: "Inventory & docks", permissions: ["Warehouses", "Inbound", "Outbound"] },
  { role: "Fleet Manager", scope: "Vehicles & maintenance", permissions: ["Fleet", "Maintenance", "Fuel"] },
  { role: "Driver", scope: "Assigned trips only", permissions: ["My trips", "POD upload", "Checklists"] },
  { role: "Customer", scope: "Own account", permissions: ["My shipments", "Invoices", "Support"] },
  { role: "Visitor", scope: "Public website", permissions: ["Track shipment", "Request quote"] },
];

export const newsPosts = [
  { slug: "corridor-expansion", title: "Dahabo opens the Nairobi–Addis corridor desk", date: "28 Jul 2026", tag: "Network", excerpt: "A dedicated cross-border desk cuts clearance time on the northern corridor by an average of 31%." },
  { slug: "reefer-fleet", title: "20 new reefer units join the cold-chain fleet", date: "14 Jul 2026", tag: "Fleet", excerpt: "Temperature-controlled capacity grows to 480 tonnes across three regional hubs." },
  { slug: "iso-certification", title: "ISO 9001:2015 recertification achieved", date: "02 Jul 2026", tag: "Compliance", excerpt: "Independent audit confirms quality management across all six branches." },
  { slug: "gps-rollout", title: "Real-time GPS telemetry rolled out fleet-wide", date: "19 Jun 2026", tag: "Technology", excerpt: "Every vehicle now streams position, fuel and temperature data to the command centre." },
];

export const jobs = [
  { title: "Senior Operations Manager", location: "Nairobi HQ", type: "Full-time", dept: "Operations" },
  { title: "Long-Haul Driver (Class CE)", location: "Mombasa", type: "Full-time", dept: "Fleet" },
  { title: "Customs Clearing Officer", location: "Djibouti", type: "Contract", dept: "Compliance" },
  { title: "Warehouse Supervisor", location: "Eldoret", type: "Full-time", dept: "Warehousing" },
  { title: "Finance Analyst", location: "Nairobi HQ", type: "Full-time", dept: "Finance" },
];

export const serviceList = [
  {
    key: "raw-material",
    name: "Raw Material Supply",
    desc: "We source and supply quality raw materials for construction and industry — including gypsum and cement — in bulk or bagged quantities, delivered directly from source to your site.",
    points: ["Gypsum supply", "Cement supply", "Bulk & bagged quantities", "Quality-assured sourcing", "Direct site delivery"],
  },
  {
    key: "transport",
    name: "Transportation & Logistics",
    desc: "Our fleet of heavy-duty trucks and loading equipment moves bulk and general cargo reliably across Kenya and the wider region, backed by an experienced operations team.",
    points: ["Heavy-duty trucking", "Bulk cargo haulage", "Excavator loading support", "Nationwide coverage", "Scheduled & on-demand runs"],
  },
];

export const integrations = [
  "Google Maps", "GPS Tracking", "WhatsApp", "SMS Gateway", "Email", "QR Code", "Barcode",
  "AI Assistant", "Driver Mobile App", "Customer Mobile App", "Cloud Storage", "Payment Gateway", "Live Tracking",
];

export const trackingTimeline = [
  { label: "Order received", place: "Nairobi Central Hub", time: "01 Aug, 08:12", done: true },
  { label: "Picked up", place: "Sahal Trading Co. warehouse", time: "01 Aug, 11:40", done: true },
  { label: "Departed origin hub", place: "Nairobi Central Hub", time: "01 Aug, 18:05", done: true },
  { label: "In transit", place: "Mariakani weighbridge", time: "02 Aug, 04:22", done: true },
  { label: "Arrived destination hub", place: "Mombasa Port Depot", time: "02 Aug, 09:50", done: false },
  { label: "Out for delivery", place: "Kilindini", time: "Expected 02 Aug, 14:00", done: false },
  { label: "Delivered", place: "Consignee", time: "Expected 02 Aug, 16:30", done: false },
];
