// Hand-written types matching supabase/schema.sql.
// Once you connect a real project you can replace these with generated
// types (see docs/SUPABASE_SETUP.md -> "Regenerating TypeScript types").

/* =========================================================
   STAFF
   ========================================================= */

export type StaffRole =
  | "admin"
  | "operations_manager"
  | "finance_officer"
  | "warehouse_manager"
  | "fleet_manager"
  | "staff"
  | "driver";

export type StaffStatus = "active" | "suspended" | "on_leave";

/* =========================================================
   DRIVER
   ========================================================= */

export type DriverStatus = "available" | "on_route" | "off_duty" | "suspended";

export type LicenseClass = "A" | "B" | "C" | "D" | "E" | "CE" | "BCE";

/* =========================================================
   ASSIGNMENTS
   ========================================================= */

export type AssignmentType = "delivery" | "pickup" | "transfer" | "maintenance_run" | "other";

export type AssignmentStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

/* =========================================================
   VEHICLES
   ========================================================= */

// Matches the public.vehicle_type enum in supabase/schema.sql exactly.
export type VehicleType =
  | "prime_mover"
  | "reefer_truck"
  | "flatbed"
  | "box_truck"
  | "tanker"
  | "van"
  | "pickup"
  | "lowbed"
  | "other";

// Matches the public.vehicle_status enum in supabase/schema.sql exactly.
export type VehicleStatus = "active" | "idle" | "maintenance" | "decommissioned";

/* =========================================================
   LABELS
   ========================================================= */

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  operations_manager: "Operations Manager",
  finance_officer: "Finance Officer",
  warehouse_manager: "Warehouse Manager",
  fleet_manager: "Fleet Manager",
  staff: "Staff",
  driver: "Driver",
};

export const LICENSE_CLASS_LABELS: Record<LicenseClass, string> = {
  A: "A — Motorcycle",
  B: "B — Light vehicle",
  C: "C — Medium truck",
  D: "D — Bus / PSV",
  E: "E — Heavy trailer",
  CE: "CE — Articulated heavy truck",
  BCE: "BCE — Combination",
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available: "Available",
  on_route: "On Route",
  off_duty: "Off Duty",
  suspended: "Suspended",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  scheduled: "Pending",
  in_progress: "In Transit",
  completed: "Delivered",
  cancelled: "On Hold",
};

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  transfer: "Transfer",
  maintenance_run: "Maintenance run",
  other: "Other",
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  prime_mover: "Prime Mover",
  reefer_truck: "Reefer Truck",
  flatbed: "Flatbed",
  box_truck: "Box Truck",
  tanker: "Tanker",
  van: "Van",
  pickup: "Pickup",
  lowbed: "Lowbed",
  other: "Other",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Active",
  idle: "Idle",
  maintenance: "Maintenance",
  decommissioned: "Decommissioned",
};

/* =========================================================
   VEHICLE
   ========================================================= */

export type Vehicle = {
  id: string;
  vehicleCode: string;
  plateNumber: string;
  type: VehicleType;
  capacity?: string | undefined;
  status: VehicleStatus;
  odometerKm: number;
  nextServiceDate?: string | undefined;
  branch?: string | undefined;
  createdAt: string;
  /** When true, this vehicle is skipped when calculating this month's
   * profit totals (Vehicle Profit page and the Dashboard's net profit
   * figure) — set from the Vehicle Profit page's delete button. The
   * vehicle itself is untouched: it still appears in Fleet, and its trips,
   * fuel and maintenance history are unaffected. */
  excludedFromProfit?: boolean | undefined;
};

export type NewVehicleInput = {
  plateNumber: string;
  type: VehicleType;
  capacity?: string | undefined;
  odometerKm?: number | undefined;
  nextServiceDate?: string | undefined;
  branch?: string | undefined;
};

/* =========================================================
   STAFF MEMBER
   ========================================================= */

export type StaffMember = {
  id: string;
  staffCode: string;
  fullName: string;
  email: string;
  phone?: string | undefined;
  role: StaffRole;
  jobTitle?: string | undefined;
  department?: string | undefined;
  status: StaffStatus;
  mustChangePassword: boolean;
  dateJoined: string;
  createdAt: string;
};

export type NewStaffInput = {
  fullName: string;
  email: string;
  password?: string | undefined;
  phone?: string | undefined;
  role: StaffRole;
  jobTitle?: string | undefined;
  department?: string | undefined;
};

/* =========================================================
   DRIVER
   ========================================================= */

export type Driver = {
  id: string;
  driverCode: string;
  fullName: string;
  email?: string | undefined;
  phone?: string | undefined;
  nationalId: string;
  licenseNumber: string;
  licenseClass: LicenseClass;
  licenseExpiry?: string | undefined;
  dateOfBirth?: string | undefined;
  address?: string | undefined;
  nextOfKinName?: string | undefined;
  nextOfKinPhone?: string | undefined;
  status: DriverStatus;
  accountStatus: StaffStatus;
  /** Whether this driver has a sign-in account (optional — most don't). */
  hasLogin: boolean;
  mustChangePassword: boolean;
  currentLocation?: string | undefined;
  locationUpdatedAt?: string | undefined;
  rating: number;
  totalTrips: number;
  dateJoined: string;
  createdAt: string;
};

/**
 * Only fullName, nationalId and licenseNumber are required.
 * Everything else can be filled in later from the driver's profile page.
 *
 * Login email and a temporary password are also required since
 * that's how the account gets created.
 */

export type NewDriverInput = {
  fullName: string;
  nationalId: string;
  licenseNumber: string;
  /** Only used when wantsLogin is true. */
  email?: string | undefined;
  password?: string | undefined;
  /** When true, also creates a sign-in account for this driver (needs
   * SUPABASE_SERVICE_ROLE_KEY configured on the server). Off by default —
   * most drivers don't need to log in anywhere; the office manages their
   * record for them. */
  wantsLogin?: boolean | undefined;
  phone?: string | undefined;
  licenseClass?: LicenseClass | undefined;
  licenseExpiry?: string | undefined;
  dateOfBirth?: string | undefined;
  address?: string | undefined;
  nextOfKinName?: string | undefined;
  nextOfKinPhone?: string | undefined;
};

/* =========================================================
   DRIVER ADVANCES
   ========================================================= */

export type DriverAdvance = {
  id: string;
  driverId: string;
  amount: number;
  purpose?: string | undefined;
  givenBy?: string | undefined;
  givenAt: string;
  status: "pending" | "reported";
  usageAmount?: number | undefined;
  usageReport?: string | undefined;
  reportedAt?: string | undefined;
  createdAt: string;
};

export type NewAdvanceInput = {
  driverId: string;
  amount: number;
  purpose?: string | undefined;
};

export type UsageReportInput = {
  usageAmount: number;
  usageReport: string;
};

/* =========================================================
   ASSIGNMENTS
   ========================================================= */

export type Assignment = {
  id: string;
  assignmentCode: string;
  driverId: string;
  type: AssignmentType;
  title: string;
  notes?: string | undefined;
  origin?: string | undefined;
  destination?: string | undefined;
  scheduledStart?: string | undefined;
  scheduledEnd?: string | undefined;
  status: AssignmentStatus;
  assignedBy?: string | undefined;
  createdAt: string;
};

export type NewAssignmentInput = {
  driverId: string;
  type: AssignmentType;
  title: string;
  notes?: string | undefined;
  origin?: string | undefined;
  destination?: string | undefined;
  scheduledStart?: string | undefined;
  scheduledEnd?: string | undefined;
};

/* =========================================================
   CUSTOMERS
   ========================================================= */

export type Customer = {
  id: string;
  customerCode?: string | undefined;
  name: string;
  contact?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  tier: string;
  outstanding: number;
  status: string;
};

/* =========================================================
   SHIPMENTS
   ========================================================= */

export type Shipment = {
  id: string;
  shipmentCode: string;
  customer?: string | undefined;
  origin: string;
  destination: string;
  status: string;
  service?: string | undefined;
  eta?: string | undefined;
  driver?: string | undefined;
  updatedAt?: string | undefined;
};

/* =========================================================
   TRANSPORT ORDERS
   ========================================================= */

export type TransportOrderStatus =
  "pending" | "assigned" | "in_progress" | "completed" | "cancelled";

export const TRANSPORT_ORDER_STATUS_LABELS: Record<TransportOrderStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type TransportOrder = {
  id: string;
  orderCode: string;
  customerId?: string | undefined;
  customerName?: string | undefined;
  branch?: string | undefined;
  pickupLocation: string;
  destination: string;
  agreedAmount: number;
  status: TransportOrderStatus;
  notes?: string | undefined;
  requestedBy?: string | undefined;
  createdAt: string;
};

export type NewTransportOrderInput = {
  customerId?: string | undefined;
  branch?: string | undefined;
  pickupLocation: string;
  destination: string;
  agreedAmount: number;
  notes?: string | undefined;
};

/* =========================================================
   TRIPS & MILEAGE
   ========================================================= */

export type TripStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type Trip = {
  id: string;
  tripCode: string;
  transportOrderId?: string | undefined;
  vehicleId: string;
  vehicleLabel?: string | undefined;
  driverId: string;
  driverName?: string | undefined;
  branch?: string | undefined;
  origin: string;
  destination: string;
  /** Flat mileage pay agreed for this trip (KSh or local currency) — entered when the trip is created, no distance calculation involved. */
  mileageAmount: number;
  status: TripStatus;
  /** Recorded automatically when the trip is started. */
  startedAt?: string | undefined;
  /** Recorded automatically when the trip is marked complete. */
  completedAt?: string | undefined;
  createdAt: string;
};

export type NewTripInput = {
  transportOrderId?: string | undefined;
  vehicleId: string;
  driverId: string;
  branch?: string | undefined;
  origin: string;
  destination: string;
  /** Flat mileage pay agreed for this trip (KSh or local currency) — no distance calculation involved. */
  mileageAmount: number;
};

export type CompleteTripInput = Record<string, never>;

/* =========================================================
   DRIVER PAYMENTS (mileage pay)
   ========================================================= */

export type DriverPaymentStatus = "pending" | "approved" | "paid";

export const DRIVER_PAYMENT_STATUS_LABELS: Record<DriverPaymentStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
};

export type DriverPayment = {
  id: string;
  tripId: string;
  tripCode?: string | undefined;
  driverId: string;
  driverName?: string | undefined;
  /** Legacy fields from when pay was distance × rate; no longer used to derive `amount`, which is now the flat mileage agreement entered on the trip. */
  distanceKm: number;
  ratePerKm: number;
  amount: number;
  status: DriverPaymentStatus;
  paidAt?: string | undefined;
  createdAt: string;
};

/* =========================================================
   FUEL
   ========================================================= */

export type FuelRecord = {
  id: string;
  /** Reference number, e.g. "FUEL-4" — reuses the linked trip's number
   * (and, through the trip, the transport order's number) when the fuel
   * record is tied to a trip; otherwise gets its own sequential number. */
  fuelCode: string;
  vehicleId: string;
  vehicleLabel?: string | undefined;
  tripId?: string | undefined;
  branch?: string | undefined;
  liters: number;
  cost: number;
  odometerKm?: number | undefined;
  filledAt: string;
  notes?: string | undefined;
  createdAt: string;
};

export type NewFuelRecordInput = {
  vehicleId: string;
  tripId?: string | undefined;
  branch?: string | undefined;
  liters: number;
  cost: number;
  odometerKm?: number | undefined;
  filledAt?: string | undefined;
  notes?: string | undefined;
};

/* =========================================================
   MAINTENANCE
   ========================================================= */

export type MaintenanceRecord = {
  id: string;
  vehicleId: string;
  vehicleLabel?: string | undefined;
  branch?: string | undefined;
  description: string;
  vendor?: string | undefined;
  cost: number;
  odometerKm?: number | undefined;
  serviceDate: string;
  nextServiceDate?: string | undefined;
  createdAt: string;
};

export type NewMaintenanceRecordInput = {
  vehicleId: string;
  branch?: string | undefined;
  description: string;
  vendor?: string | undefined;
  cost: number;
  odometerKm?: number | undefined;
  serviceDate?: string | undefined;
  nextServiceDate?: string | undefined;
};

/* =========================================================
   SALARIES & ALLOWANCES
   ========================================================= */

export type SalaryType = "salary" | "allowance" | "bonus" | "deduction";

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  salary: "Salary",
  allowance: "Allowance",
  bonus: "Bonus",
  deduction: "Deduction",
};

export type Salary = {
  id: string;
  profileId: string;
  personName?: string | undefined;
  type: SalaryType;
  amount: number;
  periodMonth: string; // the exact date this payment covers, e.g. "2026-08-14"
  status: DriverPaymentStatus;
  paidAt?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
};

export type NewSalaryInput = {
  profileId: string;
  type: SalaryType;
  amount: number;
  periodMonth: string;
  notes?: string | undefined;
};

/* =========================================================
   OTHER EXPENSES
   ========================================================= */

export type ExpenseCategory =
  "toll" | "parking" | "permit" | "insurance" | "fine" | "loading" | "offloading" | "other";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  toll: "Toll",
  parking: "Parking",
  permit: "Permit",
  insurance: "Insurance",
  fine: "Fine",
  loading: "Loading",
  offloading: "Offloading",
  other: "Other",
};

export type OtherExpense = {
  id: string;
  vehicleId?: string | undefined;
  vehicleLabel?: string | undefined;
  branch?: string | undefined;
  category: ExpenseCategory;
  description: string;
  amount: number;
  incurredAt: string;
  createdAt: string;
};

export type NewOtherExpenseInput = {
  vehicleId?: string | undefined;
  branch?: string | undefined;
  category: ExpenseCategory;
  description: string;
  amount: number;
  incurredAt?: string | undefined;
};

/* =========================================================
   VEHICLE PROFIT (from public.vehicle_profit_monthly view)
   ========================================================= */

/** One completed trip's contribution to its vehicle's monthly profit row.
 * Revenue and mileage pay are exact, trip-linked figures. */
export type VehicleProfitTrip = {
  tripId: string;
  tripCode?: string | undefined;
  origin: string;
  destination: string;
  completedAt: string;
  revenue: number;
  mileagePayment: number;
};

/** One fuel purchase counted against this vehicle's monthly fuel cost.
 * Carries its own date, liters and cost so a vehicle fuelled up several
 * times in the month shows each fill-up separately instead of one blended
 * total. When the fill-up was logged against a trip, tripCode links it back
 * to that trip's row above. */
export type VehicleProfitFuelEntry = {
  fuelRecordId: string;
  fuelCode?: string | undefined;
  tripId?: string | undefined;
  tripCode?: string | undefined;
  liters: number;
  cost: number;
  filledAt: string;
};

/** One maintenance job counted against this vehicle's monthly maintenance
 * cost, shown individually rather than combined into one total. */
export type VehicleProfitMaintenanceEntry = {
  maintenanceRecordId: string;
  description: string;
  vendor?: string | undefined;
  cost: number;
  serviceDate: string;
};

export type VehicleProfitMonth = {
  id: string;
  vehicleId: string;
  vehicleCode: string;
  plateNumber: string;
  periodMonth: string;
  revenue: number;
  fuelCost: number;
  maintenanceCost: number;
  mileagePayments: number;
  otherCost: number;
  netProfit: number;
  /** Trips that made up this vehicle's revenue/mileage-pay figures this month. */
  trips: VehicleProfitTrip[];
  /** Every fuel purchase that made up fuelCost this month, itemized. */
  fuelEntries: VehicleProfitFuelEntry[];
  /** Every maintenance job that made up maintenanceCost this month, itemized. */
  maintenanceEntries: VehicleProfitMaintenanceEntry[];
};
