import { Employee, RoleAssignment, Holiday } from "./types";

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: "emp-amit",
    empId: "EMP001",
    firstName: "Amit",
    lastName: "Patel",
    fatherName: "Ramesh Patel",
    gender: "Male",
    maritalStatus: "Married",
    dob: "1990-08-15",
    email: "amit.patel@attendx.com",
    workContact: "+91 98765 43210",
    personalContact: "+91 91234 56789",
    permAddress: "12, MG Road, Ward 5, Ahmedabad, Gujarat - 380001",
    commAddress: "12, MG Road, Ward 5, Ahmedabad, Gujarat - 380001",
    doj: "2023-01-10",
    hireSource: "Job Portal",
    empType: "Permanent",
    userRole: "Employee",
    password: "EMP001"
  },
  {
    id: "emp-priya",
    empId: "EMP002",
    firstName: "Priya",
    lastName: "Sharma",
    fatherName: "Karan Sharma",
    gender: "Female",
    maritalStatus: "Single",
    dob: "1994-11-22",
    email: "priya.sharma@attendx.com",
    workContact: "+91 98765 43211",
    personalContact: "+91 93456 78901",
    permAddress: "S-2, Sector 15-C, Noida, Uttar Pradesh - 201301",
    commAddress: "S-2, Sector 15-C, Noida, Uttar Pradesh - 201301",
    doj: "2023-06-15",
    hireSource: "Referral",
    empType: "Full Time",
    userRole: "Employee",
    password: "EMP002"
  },
  {
    id: "emp-rajesh",
    empId: "EMP003",
    firstName: "Rajesh",
    lastName: "Kumar",
    fatherName: "Vijay Kumar",
    gender: "Male",
    maritalStatus: "Married",
    dob: "1988-04-05",
    email: "rajesh.kumar@attendx.com",
    workContact: "+91 98765 43212",
    personalContact: "+91 94567 89012",
    permAddress: "A-504, Prestige Heights, Outer Ring Road, Bangalore - 560103",
    commAddress: "A-504, Prestige Heights, Outer Ring Road, Bangalore - 560103",
    doj: "2022-09-01",
    hireSource: "Job Portal",
    empType: "Permanent",
    userRole: "Employee",
    password: "EMP003"
  },
  {
    id: "emp-ananya",
    empId: "EMP004",
    firstName: "Ananya",
    lastName: "Sen",
    fatherName: "Subir Sen",
    gender: "Female",
    maritalStatus: "Single",
    dob: "1997-02-18",
    email: "ananya.sen@attendx.com",
    workContact: "+91 98765 43213",
    personalContact: "+91 95678 90123",
    permAddress: "Block G, Flat 4A, Salt Lake Sector 3, Kolkata - 700091",
    commAddress: "Block G, Flat 4A, Salt Lake Sector 3, Kolkata - 700091",
    doj: "2024-02-01",
    hireSource: "Campus",
    empType: "Full Time",
    userRole: "Employee",
    password: "EMP004"
  },
  {
    id: "emp-vikram",
    empId: "EMP005",
    firstName: "Vikram",
    lastName: "Singh",
    fatherName: "Baldev Singh",
    gender: "Male",
    maritalStatus: "Married",
    dob: "1992-12-30",
    email: "vikram.singh@attendx.com",
    workContact: "+91 98765 43214",
    personalContact: "+91 96789 01234",
    permAddress: "House 34, Gali 2, Shanti Nagar, Jaipur, Rajasthan - 302006",
    commAddress: "House 34, Gali 2, Shanti Nagar, Jaipur, Rajasthan - 302006",
    doj: "2023-10-01",
    hireSource: "Consultant",
    empType: "Full Time",
    userRole: "Employee",
    password: "EMP005"
  }
];

export const SEED_ROLES: RoleAssignment[] = [
  {
    empId: "emp-amit",
    department: "Sales",
    designation: "Manager",
    dojDept: "2023-01-10",
    status: "Active"
  },
  {
    empId: "emp-priya",
    department: "Human Resources",
    designation: "Senior Executive",
    dojDept: "2023-06-15",
    status: "Active"
  },
  {
    empId: "emp-rajesh",
    department: "Technology",
    designation: "Deputy Manager",
    dojDept: "2022-09-01",
    status: "Active"
  },
  {
    empId: "emp-ananya",
    department: "Marketing",
    designation: "Executive",
    dojDept: "2024-02-01",
    status: "Active"
  },
  {
    empId: "emp-vikram",
    department: "Operations",
    designation: "Executive",
    dojDept: "2023-10-01",
    status: "Active"
  }
];

export const SEED_DEPARTMENTS = [
  "Human Resources",
  "Finance",
  "Operations",
  "Technology",
  "Sales",
  "Marketing",
  "Legal",
  "Admin"
];

export const SEED_DESIGNATIONS = [
  "Director",
  "General Manager",
  "Manager",
  "Deputy Manager",
  "Senior Executive",
  "Executive",
  "Analyst",
  "Coordinator",
  "Intern"
];

export const SEED_LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Loss of Pay"
];

export const SEED_TASK_TYPES = [
  "Tour",
  "Office Work",
  "Local Work",
  "Client Support",
  "Strategic Meeting",
  "Other"
];

export const SEED_HOLIDAYS: Holiday[] = [
  { id: "h1", date: "2026-01-01", name: "New Year's Day", type: "National" },
  { id: "h2", date: "2026-01-14", name: "Pongal / Makar Sankranti", type: "State" },
  { id: "h3", date: "2026-01-26", name: "Republic Day", type: "National" },
  { id: "h4", date: "2026-03-25", name: "Holi", type: "National" },
  { id: "h5", date: "2026-04-02", name: "Good Friday", type: "National" },
  { id: "h6", date: "2026-04-14", name: "Dr Ambedkar Jayanti", type: "National" },
  { id: "h7", date: "2026-05-01", name: "Labour Day", type: "National" },
  { id: "h8", date: "2026-08-15", name: "Independence Day", type: "National" },
  { id: "h9", date: "2026-10-02", name: "Gandhi Jayanti", type: "National" },
  { id: "h10", date: "2026-11-09", name: "Diwali (Deepavali)", type: "National" },
  { id: "h11", date: "2026-12-25", name: "Christmas Day", type: "National" }
];
