/**
 * Public-website mock data for the Dahabo Global Logistics marketing site.
 * Mock only — no backend calls.
 */

export const heroStats = [
  { value: 10000, suffix: "+", label: "Deliveries completed" },
  { value: 2500, suffix: "+", label: "Active customers" },
  { value: 150, suffix: "+", label: "Vehicles in fleet" },
  { value: 98, suffix: "%", label: "On-time delivery" },
];

export const companyStats = [
  { value: 14, suffix: "+", label: "Years of experience" },
  { value: 2500, suffix: "+", label: "Satisfied customers" },
  { value: 10400, suffix: "+", label: "Completed deliveries" },
  { value: 180, suffix: "+", label: "Professional drivers" },
  { value: 150, suffix: "+", label: "Fleet size" },
  { value: 6, suffix: "", label: "Branches" },
  { value: 26, suffix: "h", label: "Average delivery time" },
  { value: 5, suffix: "", label: "Countries served" },
];

export type PublicService = {
  slug: string;
  name: string;
  desc: string;
  icon: string;
  tag?: string;
};

export const publicServices: PublicService[] = [
  { slug: "road-freight", name: "Road Freight", desc: "Full and part-load haulage on every major corridor in Kenya and the region.", icon: "Truck" },
  { slug: "express-delivery", name: "Express Delivery", desc: "Same-day and next-day priority movements with guaranteed time windows.", icon: "Zap" },
  { slug: "door-to-door", name: "Door-to-Door Delivery", desc: "Collection at origin, delivery at destination — one waybill, one owner.", icon: "DoorOpen" },
  { slug: "distribution", name: "Distribution Services", desc: "Multi-drop distribution runs planned around your stock replenishment cycle.", icon: "Network" },
  { slug: "commercial-cargo", name: "Commercial Cargo", desc: "Palletised and loose commercial freight handled with full chain of custody.", icon: "Boxes" },
  { slug: "household-moving", name: "Household Moving", desc: "Packing, wrapping, loading and reassembly by trained moving crews.", icon: "Home" },
  { slug: "office-relocation", name: "Office Relocation", desc: "Weekend office moves with IT crating, labelling and floor-plan placement.", icon: "Building2" },
  { slug: "bulk-cargo", name: "Bulk Cargo", desc: "High-volume and heavy consignments on tippers, flatbeds and low loaders.", icon: "Container" },
  { slug: "retail-distribution", name: "Retail Distribution", desc: "Store-level deliveries with proof of delivery captured on the driver app.", icon: "ShoppingBag" },
  { slug: "warehouse-storage", name: "Warehouse Storage", desc: "Secure short and long-term storage with inventory visibility 24/7.", icon: "Warehouse" },
  { slug: "fleet-transport", name: "Fleet Transport", desc: "Vehicle and machinery transport on purpose-built carriers.", icon: "CarFront" },
  { slug: "last-mile", name: "Last Mile Delivery", desc: "Motorcycle and van last-mile coverage across urban centres.", icon: "Bike" },
  { slug: "scheduled-deliveries", name: "Scheduled Deliveries", desc: "Fixed-slot recurring runs on a contracted weekly timetable.", icon: "CalendarClock" },
  { slug: "corporate-logistics", name: "Corporate Logistics", desc: "Dedicated account teams, SLAs and monthly performance reporting.", icon: "Briefcase" },
  { slug: "cross-border", name: "Cross-Border Transport", desc: "Regional movements into Uganda, Tanzania, Ethiopia and Somalia.", icon: "Globe2", tag: "Coming soon" },
];

export const whyChooseUs = [
  { title: "Fast Delivery", desc: "Optimised routing and night-run capability keep transit times short.", icon: "Rocket" },
  { title: "Secure Cargo", desc: "Sealed loads, vetted crews and insurance cover on every movement.", icon: "ShieldCheck" },
  { title: "Affordable Pricing", desc: "Transparent per-tonne and per-trip rates with no hidden surcharges.", icon: "BadgeDollarSign" },
  { title: "Professional Drivers", desc: "Licensed, defensive-driving certified and continuously assessed.", icon: "UserCheck" },
  { title: "Modern Fleet", desc: "Young, well-maintained vehicles serviced on a strict interval plan.", icon: "Truck" },
  { title: "Real-Time Tracking", desc: "Milestone updates and live status from pickup through to delivery.", icon: "Radar" },
  { title: "Experienced Team", desc: "Operations planners with over a decade in East African freight.", icon: "Users" },
  { title: "Customer Support", desc: "A 24/7 operations desk that answers, not an automated queue.", icon: "Headphones" },
  { title: "Nationwide Coverage", desc: "Branches and partners covering all 47 counties in Kenya.", icon: "MapPinned" },
  { title: "Trusted Partner", desc: "Long-term contracts with retail, manufacturing and NGO clients.", icon: "Handshake" },
];

export const trackingStages = [
  { key: "received", label: "Order Received", desc: "Booking confirmed and waybill issued" },
  { key: "pickup", label: "Picked Up", desc: "Cargo collected from origin address" },
  { key: "warehouse", label: "Warehouse", desc: "Scanned in and consolidated for dispatch" },
  { key: "transit", label: "In Transit", desc: "On the road towards destination branch" },
  { key: "branch", label: "Destination Branch", desc: "Arrived and sorted at destination hub" },
  { key: "outfordelivery", label: "Out for Delivery", desc: "Loaded on the last-mile vehicle" },
  { key: "delivered", label: "Delivered", desc: "Signed for by the consignee" },
];

export type MockTracking = {
  reference: string;
  service: string;
  origin: string;
  destination: string;
  weight: string;
  packages: number;
  eta: string;
  vehicle: string;
  driver: string;
  currentStage: number;
  events: { stage: string; place: string; time: string }[];
};

export const mockTracking: MockTracking = {
  reference: "DGL-102345",
  service: "Road Freight · Express",
  origin: "Nairobi, Industrial Area",
  destination: "Mombasa, Nyali",
  weight: "3,250 kg",
  packages: 42,
  eta: "Tomorrow, 11:30",
  vehicle: "KDJ 442X · Heavy Truck",
  driver: "Abdi Hassan",
  currentStage: 4,
  events: [
    { stage: "Order Received", place: "Nairobi Control Tower", time: "Mon 08:12" },
    { stage: "Picked Up", place: "Industrial Area, Nairobi", time: "Mon 10:40" },
    { stage: "Warehouse", place: "Nairobi Hub — Bay 4", time: "Mon 14:05" },
    { stage: "In Transit", place: "Mombasa Road, Mtito Andei", time: "Tue 02:18" },
    { stage: "Destination Branch", place: "Mombasa Hub", time: "Tue 07:55" },
  ],
};

export const fleetTypes = [
  { name: "Heavy Trucks", capacity: "Up to 28 tonnes", units: 34, available: "Available", desc: "Long-haul prime movers with curtain-side and box trailers.", image: "heavy" },
  { name: "Box Trucks", capacity: "3 – 8 tonnes", units: 41, available: "Available", desc: "Enclosed rigid trucks for retail and distribution runs.", image: "box" },
  { name: "Vans", capacity: "Up to 1.5 tonnes", units: 38, available: "Limited", desc: "Urban courier and door-to-door parcel movements.", image: "van" },
  { name: "Pickups", capacity: "Up to 1 tonne", units: 19, available: "Available", desc: "Site deliveries, spares runs and field support.", image: "pickup" },
  { name: "Motorcycles", capacity: "Up to 60 kg", units: 24, available: "Available", desc: "Same-city last-mile documents and small parcels.", image: "moto" },
  { name: "Specialised Cargo", capacity: "Project loads", units: 8, available: "On request", desc: "Flatbeds, low loaders and abnormal-load equipment.", image: "special" },
];

export const industries = [
  { name: "Retail", desc: "Store replenishment and seasonal peak surges.", icon: "ShoppingBag" },
  { name: "Manufacturing", desc: "Raw material inbound and finished-goods outbound.", icon: "Factory" },
  { name: "Construction", desc: "Aggregates, steel, cement and site machinery.", icon: "HardHat" },
  { name: "Healthcare", desc: "Pharma and medical supplies with careful handling.", icon: "HeartPulse" },
  { name: "Agriculture", desc: "Produce, inputs and farm equipment movement.", icon: "Wheat" },
  { name: "E-commerce", desc: "Fulfilment pickups and last-mile parcel delivery.", icon: "PackageCheck" },
  { name: "Government", desc: "Tendered public-sector transport contracts.", icon: "Landmark" },
  { name: "NGOs", desc: "Relief cargo and programme distribution runs.", icon: "HeartHandshake" },
  { name: "Hospitality", desc: "Hotel supply chains and event logistics.", icon: "UtensilsCrossed" },
  { name: "Wholesale", desc: "Bulk distribution to depots and dealers.", icon: "Boxes" },
  { name: "Corporate Offices", desc: "Relocations, archives and asset transfers.", icon: "Building2" },
];

export const coverageBranches = [
  { city: "Nairobi", role: "Head Office & Main Hub", x: 52, y: 44 },
  { city: "Mombasa", role: "Port Branch", x: 78, y: 74 },
  { city: "Kisumu", role: "Western Branch", x: 22, y: 40 },
  { city: "Nakuru", role: "Rift Valley Branch", x: 39, y: 37 },
  { city: "Eldoret", role: "North Rift Branch", x: 27, y: 26 },
  { city: "Garissa", role: "North Eastern Branch", x: 74, y: 40 },
];

export const coverageRoutes = [
  "Nairobi — Mombasa (Northern Corridor)",
  "Nairobi — Nakuru — Eldoret — Malaba",
  "Nairobi — Kisumu — Busia",
  "Nairobi — Garissa — Dadaab",
  "Mombasa — Voi — Taveta",
];

export const branchDirectory = [
  {
    city: "Nairobi",
    name: "Nairobi Head Office",
    address: "Enterprise Road, Industrial Area, Nairobi",
    phone: "+254 700 100 100",
    email: "nairobi@dahaboglobal.com",
    manager: "Fatuma Warsame",
    hours: "Mon–Sat 07:00 – 20:00 · Sun on call",
  },
  {
    city: "Mombasa",
    name: "Mombasa Port Branch",
    address: "Archbishop Makarios Road, Mombasa",
    phone: "+254 700 100 200",
    email: "mombasa@dahaboglobal.com",
    manager: "Ali Mwinyi",
    hours: "Mon–Sat 07:00 – 19:00",
  },
  {
    city: "Kisumu",
    name: "Kisumu Western Branch",
    address: "Obote Road, Kisumu",
    phone: "+254 700 100 300",
    email: "kisumu@dahaboglobal.com",
    manager: "Brenda Achieng",
    hours: "Mon–Fri 08:00 – 18:00 · Sat 08:00 – 13:00",
  },
  {
    city: "Nakuru",
    name: "Nakuru Rift Valley Branch",
    address: "Kenyatta Avenue, Nakuru",
    phone: "+254 700 100 400",
    email: "nakuru@dahaboglobal.com",
    manager: "Peter Kiprono",
    hours: "Mon–Sat 08:00 – 18:00",
  },
  {
    city: "Eldoret",
    name: "Eldoret North Rift Branch",
    address: "Uganda Road, Eldoret",
    phone: "+254 700 100 500",
    email: "eldoret@dahaboglobal.com",
    manager: "Janet Chebet",
    hours: "Mon–Fri 08:00 – 18:00",
  },
  {
    city: "Garissa",
    name: "Garissa North Eastern Branch",
    address: "Kismayu Road, Garissa",
    phone: "+254 700 100 600",
    email: "garissa@dahaboglobal.com",
    manager: "Yussuf Noor",
    hours: "Mon–Sat 07:30 – 17:30",
  },
];

export const testimonials = [
  {
    name: "Aisha Mohamed",
    position: "Supply Chain Manager",
    company: "Horn Retail Group",
    quote:
      "Dahabo moved our entire seasonal stock into 34 stores in nine days without a single damaged pallet. Their control tower kept us informed at every milestone.",
    rating: 5,
  },
  {
    name: "James Otieno",
    position: "Plant Director",
    company: "Rift Manufacturing Ltd",
    quote:
      "We shifted our inbound haulage to Dahabo two years ago. On-time performance went from 84% to 98% and our line stoppages effectively disappeared.",
    rating: 5,
  },
  {
    name: "Grace Wanjiru",
    position: "Logistics Lead",
    company: "MediSupply Kenya",
    quote:
      "Temperature-sensitive medical consignments need trust. Their drivers are professional, the paperwork is flawless and the tracking is genuinely real time.",
    rating: 5,
  },
  {
    name: "Hassan Abdullahi",
    position: "Country Programme Manager",
    company: "Nuur Relief Foundation",
    quote:
      "Relief cargo into the North East is difficult work. Dahabo delivered every consignment with clear documentation and constant communication.",
    rating: 5,
  },
  {
    name: "Daniel Mutiso",
    position: "Head of Operations",
    company: "Swift Commerce",
    quote:
      "Their last-mile fleet handles our peak volumes without drama. Proof of delivery lands in our inbox before the rider leaves the gate.",
    rating: 5,
  },
];

export const partners = [
  "Northern Corridor Freight",
  "Sahal Trading Co",
  "Rift Manufacturing",
  "Horn Retail Group",
  "MediSupply Kenya",
  "Coastline Shipping",
  "Nuur Relief Foundation",
  "Swift Commerce",
  "Savannah Agri",
  "Bahari Wholesale",
  "Summit Construction",
  "Acacia Hospitality",
];

export const newsArticles = [
  {
    slug: "new-mombasa-hub",
    title: "Dahabo opens a 6,000 sqm consolidation hub in Mombasa",
    category: "Company",
    date: "12 July 2026",
    excerpt:
      "The new port-adjacent facility cuts dwell time on inbound containers and adds 1,800 pallet positions of bonded storage capacity.",
    featured: true,
  },
  {
    slug: "fleet-expansion-2026",
    title: "30 new trucks join the fleet ahead of the peak season",
    category: "Fleet",
    date: "28 June 2026",
    excerpt: "Euro-spec prime movers with telematics fitted as standard bring total fleet strength past 150 vehicles.",
  },
  {
    slug: "driver-safety-programme",
    title: "Driver safety programme records 12 months without a lost-time incident",
    category: "Safety",
    date: "09 June 2026",
    excerpt: "Defensive driving refreshers and in-cab coaching deliver a measurable drop in harsh-braking events.",
  },
  {
    slug: "last-mile-nairobi",
    title: "Same-day last-mile coverage extended across greater Nairobi",
    category: "Services",
    date: "21 May 2026",
    excerpt: "Motorcycle and van capacity expands to cover Ruiru, Athi River, Ngong and Kikuyu on same-day slots.",
  },
  {
    slug: "cross-border-readiness",
    title: "Preparing for cross-border operations into the region",
    category: "Growth",
    date: "02 May 2026",
    excerpt: "Licensing and partner onboarding is underway for Uganda, Tanzania, Ethiopia and Somalia corridors.",
  },
  {
    slug: "customer-portal-launch",
    title: "Customer portal brings shipments, invoices and tracking together",
    category: "Technology",
    date: "18 April 2026",
    excerpt: "Clients can now self-serve documents, pickup requests and delivery performance reports in one place.",
  },
];

export const newsCategories = ["All", "Company", "Fleet", "Safety", "Services", "Growth", "Technology"];

export const openPositions = [
  { title: "Long-Haul Truck Driver", dept: "Operations", location: "Nairobi", type: "Full-time", posted: "3 days ago" },
  { title: "Fleet Maintenance Technician", dept: "Fleet", location: "Nairobi", type: "Full-time", posted: "1 week ago" },
  { title: "Warehouse Supervisor", dept: "Warehousing", location: "Mombasa", type: "Full-time", posted: "1 week ago" },
  { title: "Route Planner", dept: "Control Tower", location: "Nairobi", type: "Full-time", posted: "2 weeks ago" },
  { title: "Customer Service Executive", dept: "Customer Care", location: "Nakuru", type: "Full-time", posted: "2 weeks ago" },
  { title: "Last-Mile Rider", dept: "Last Mile", location: "Kisumu", type: "Contract", posted: "3 weeks ago" },
  { title: "Finance Assistant", dept: "Finance", location: "Nairobi", type: "Full-time", posted: "1 month ago" },
];

export const careerBenefits = [
  { title: "Medical cover", desc: "Inpatient and outpatient cover for staff and dependants.", icon: "HeartPulse" },
  { title: "Performance bonus", desc: "Quarterly bonuses tied to safety and delivery performance.", icon: "BadgeDollarSign" },
  { title: "Training academy", desc: "Defensive driving, handling and leadership programmes.", icon: "GraduationCap" },
  { title: "Pension scheme", desc: "Employer-matched retirement savings from day one.", icon: "PiggyBank" },
  { title: "Safety first", desc: "Modern equipment, PPE and enforced rest schedules.", icon: "ShieldCheck" },
  { title: "Career growth", desc: "Internal promotion is our default for supervisory roles.", icon: "TrendingUp" },
];

export const faqs = [
  { q: "How do I book a shipment with Dahabo?", a: "Submit the quote request form or call the operations desk. Once rates are agreed we issue a waybill and schedule collection, usually within 24 hours.", cat: "Shipping" },
  { q: "How do I track my cargo?", a: "Enter your tracking number, reference number or invoice number in the tracker on this site. Milestones update as the consignment moves through each stage.", cat: "Tracking" },
  { q: "How is pricing calculated?", a: "Rates are based on distance, weight or volume, vehicle type and any special handling. Contract clients receive fixed lane rates reviewed quarterly.", cat: "Pricing" },
  { q: "What are your pickup windows?", a: "Standard collections run 08:00 to 18:00 Monday to Saturday. Express and scheduled contract clients can book night and weekend windows.", cat: "Pickup" },
  { q: "How long does delivery take?", a: "Nairobi metro same-day, major corridors next-day, and upcountry destinations within 24 to 48 hours depending on the route.", cat: "Delivery" },
  { q: "Is my cargo insured?", a: "Yes. Every movement carries goods-in-transit cover. Higher declared-value cover is available on request before collection.", cat: "Insurance" },
  { q: "What payment methods do you accept?", a: "Bank transfer, mobile money and corporate cheque. Contract clients are invoiced monthly on agreed credit terms.", cat: "Payments" },
  { q: "How do I reach support?", a: "The operations desk answers 24/7 by phone and email, and account clients have a named manager with a direct line.", cat: "Customer Support" },
];

export const futureFeatures = [
  { title: "Live GPS vehicle tracking", desc: "Vehicle-level telemetry on a live map.", icon: "Satellite" },
  { title: "Google Maps integration", desc: "Interactive branch and route mapping.", icon: "Map" },
  { title: "Online payments", desc: "Card and mobile money checkout for invoices.", icon: "CreditCard" },
  { title: "WhatsApp chat", desc: "Booking and status updates over WhatsApp.", icon: "MessageCircle" },
  { title: "AI customer assistant", desc: "Instant answers on rates and transit times.", icon: "Bot" },
  { title: "Customer live chat", desc: "Human agents in-page during office hours.", icon: "MessagesSquare" },
  { title: "SMS notifications", desc: "Milestone alerts to the consignee's phone.", icon: "Smartphone" },
  { title: "Email notifications", desc: "Automated PODs and delivery confirmations.", icon: "Mail" },
  { title: "Mobile apps", desc: "iOS and Android customer applications.", icon: "TabletSmartphone" },
  { title: "Driver app", desc: "Digital manifests, scanning and e-signature.", icon: "ScanLine" },
];

export const cargoTypes = [
  "General Cargo",
  "Palletised Goods",
  "Bulk / Loose Cargo",
  "Fragile Goods",
  "Perishables",
  "Household Goods",
  "Office Equipment",
  "Construction Materials",
  "Vehicles / Machinery",
  "Medical Supplies",
];

export const countries = ["Kenya", "Uganda", "Tanzania", "Ethiopia", "Somalia"];

export const counties = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Uasin Gishu",
  "Kiambu",
  "Machakos",
  "Kilifi",
  "Garissa",
  "Kajiado",
];
