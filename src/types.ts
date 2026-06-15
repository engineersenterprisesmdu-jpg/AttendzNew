export interface GPSCoords {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  isDefault?: boolean;
}

export interface Employee {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  fatherName?: string;
  gender?: string;
  maritalStatus?: string;
  dob?: string;
  email: string;
  workContact?: string;
  personalContact?: string;
  permAddress?: string;
  commAddress?: string;
  doj: string;
  hireSource?: string;
  empType?: string;
  userRole: "Employee" | "Admin" | "Other";
  mappedAdmin?: string;
  password?: string;
  aadhaar?: string;
  pan?: string;
  aadhaarFile?: string | null;
  aadhaarFileName?: string;
  panFile?: string | null;
  panFileName?: string;
}

export interface RoleAssignment {
  empId: string;
  department: string;
  designation: string;
  dojDept?: string;
  status: "Active" | "Left" | "Inactive" | "Others";
}

export interface Attendance {
  id: string;
  empId: string;
  empName: string;
  date: string; // YYYY-MM-DD
  punchOutDate?: string | null; // YYYY-MM-DD for cross-midnight
  status: "Present" | "Leave" | "C-Off" | "Special Duty" | "Absent";
  punchInTime?: string | null; // e.g., "09:30 AM"
  punchInTime24?: string | null; // e.g., "09:30"
  punchOutTime?: string | null; // e.g., "06:30 PM"
  punchOutTime24?: string | null; // e.g., "18:30"
  taskId?: string | null; // e.g., TSK-YYYYMMDD-001
  taskType?: string; // e.g., "Tour", "Office Work" etc.
  description?: string;
  endNotes?: string;
  approval: "Pending" | "Approved" | "Rejected" | "Rejected-Resubmit";
  rejectReason?: string;
  gpsIn?: GPSCoords | null;
  gpsOut?: GPSCoords | null;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Leave {
  id: string;
  empId: string;
  leaveType: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Rejected-Resubmit";
  rejectReason?: string;
  approvedBy?: string;
  durationOption?: "full" | "half" | "hours";
  halfDayType?: "first" | "second";
  hoursFrom?: string;
  hoursTo?: string;
}

export interface Coff {
  id: string;
  empId: string;
  date: string; // YYYY-MM-DD
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Rejected-Resubmit";
  rejectReason?: string;
  approvedBy?: string;
  durationOption?: "full" | "half" | "hours";
  halfDayType?: "first" | "second";
  hoursFrom?: string;
  hoursTo?: string;
}

export interface SpecialDuty {
  id: string;
  empId: string;
  date: string; // YYYY-MM-DD
  reason: string;
  description?: string;
  status: "Pending" | "Approved" | "Rejected" | "Rejected-Resubmit";
  rejectReason?: string;
  approvedBy?: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National" | "State" | "Optional" | "Custom";
}

export interface Settings {
  adminId?: string;
  adminPassword?: string;
}

export interface FirebaseConfigType {
  apiKey: string;
  projectId: string;
  databaseURL?: string;
  appId: string;
  authDomain?: string;
  storageBucket?: string;
}
