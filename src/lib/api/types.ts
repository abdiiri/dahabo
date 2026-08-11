// Hand-written types matching supabase/schema.sql.
// Once you connect a real project you can replace these with generated
// types (see docs/SUPABASE_SETUP.md -> "Regenerating TypeScript types").

export type StaffRole =
  | "admin"
  | "operations_manager"
  | "finance_officer"
  | "warehouse_manager"
  | "fleet_manager"
  | "staff"
  | "driver";

export type StaffStatus = "active" | "suspended" | "on_leave";
export type DriverStatus = "available" | "on_route" | "off_duty" | "suspended";
export type LicenseClass = "A" | "B" | "C" | "D" | "E" | "CE" | "BCE";

export type AssignmentType = "delivery" | "pickup" | "transfer" | "maintenance_run" | "other";
export type AssignmentStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

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
  phone?: string | undefined;
  role: StaffRole;
  jobTitle?: string | undefined;
  department?: string | undefined;
};

export type Driver = {
  id: string;
  driverCode: string;
  fullName: string;
  email: string;
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
  mustChangePassword: boolean;
  currentLocation?: string | undefined;
  locationUpdatedAt?: string | undefined;
  rating: number;
  totalTrips: number;
  dateJoined: string;
  createdAt: string;
};

/** Only fullName, nationalId and licenseNumber are required — everything
 * else can be filled in later from the driver's profile page. Login email
 * + a temporary password are also required since that's how the account
 * gets created. */
export type NewDriverInput = {
  fullName: string;
  nationalId: string;
  licenseNumber: string;
  email: string;
  password: string;
  phone?: string | undefined;
  licenseClass?: LicenseClass | undefined;
  licenseExpiry?: string | undefined;
  dateOfBirth?: string | undefined;
  address?: string | undefined;
  nextOfKinName?: string | undefined;
  nextOfKinPhone?: string | undefined;
};

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
