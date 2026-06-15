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

export function normalizeToYYYYMMDD(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  
  // 1. If it's already YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // 2. Try handling DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, or variations with 2-digit years
  const parts = trimmed.split(/[-./]/);
  if (parts.length === 3) {
    const p0 = parts[0].trim();
    const p1 = parts[1].trim();
    const p2 = parts[2].trim();
    
    // Check if the first part is a 4-digit year (e.g. 2026.06.12)
    if (p0.length === 4 && !isNaN(Number(p0))) {
      const year = p0;
      const month = p1.padStart(2, '0');
      const day = p2.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Check if the last part is a 4-digit year (e.g. 12.06.2026)
    if (p2.length === 4 && !isNaN(Number(p2))) {
      const year = p2;
      const month = p1.padStart(2, '0');
      const day = p0.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Check if the last part is a 2-digit year (e.g. 12.6.26 -> 2026-06-12)
    if (p2.length === 2 && !isNaN(Number(p2))) {
      const year = "20" + p2;
      const month = p1.padStart(2, '0');
      const day = p0.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback to standard javascript Date parsing
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const r = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${r}`;
    }
  } catch (e) {
    // ignore
  }

  return trimmed;
}

