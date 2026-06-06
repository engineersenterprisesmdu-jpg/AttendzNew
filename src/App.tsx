import React, { useState, useEffect } from "react";
import { 
  Building, Users, ClipboardCheck, Calendar, FileSpreadsheet, Database, 
  Settings, BookOpen, Key, Trash2, Edit3, Plus, Search, FolderPlus, 
  LogOut, ShieldAlert, BadgeInfo, Code, Radio, RefreshCw
} from "lucide-react";

import { Employee, RoleAssignment, Attendance, Leave, Coff, SpecialDuty, Holiday } from "./types";
import { 
  SEED_EMPLOYEES, SEED_ROLES, SEED_DEPARTMENTS, SEED_DESIGNATIONS, 
  SEED_LEAVE_TYPES, SEED_TASK_TYPES, SEED_HOLIDAYS 
} from "./seedData";
import { 
  syncStorage, 
  initFirebaseService, 
  getFirebaseStatus, 
  firestoreSetDoc as originalFirestoreSetDoc, 
  firestoreDeleteDoc as originalFirestoreDeleteDoc, 
  handleFirestoreError, 
  OperationType 
} from "./firebase-service";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { HARDCODED_FIREBASE_CONFIG } from "./firebase-config";
import { uploadToSupabaseStorage, SUPABASE_URL, STORAGE_BUCKET_NAME } from "./supabase-client";
import { 
  supabaseSetDoc, 
  supabaseDeleteDoc, 
  supabaseListenCollection, 
  checkSupabaseTableExists, 
  SYNC_TABLE_NAME 
} from "./supabase-service";

import { DocsDashboard } from "./components/DocsDashboard";
import { TestCenter } from "./components/TestCenter";
import { AdminReports } from "./components/AdminReports";
import { EmployeeDashboard } from "./components/EmployeeDashboard";

export default function App() {
  // -------------------------------------------------------------
  // STATE DEFINITIONS
  // -------------------------------------------------------------
  const [user, setUser] = useState<Employee | null>(() => syncStorage.getLocalStorage<Employee | null>("attendx_active_user", null));
  
  // Storage states populated with seed data on first load
  const [employees, setEmployees] = useState<Employee[]>(() => syncStorage.getLocalStorage<Employee[]>("attendx_employees", SEED_EMPLOYEES));
  const [roles, setRoles] = useState<RoleAssignment[]>(() => syncStorage.getLocalStorage<RoleAssignment[]>("attendx_roles", SEED_ROLES));
  const [departments, setDepartments] = useState<string[]>(() => syncStorage.getLocalStorage<string[]>("attendx_departments", SEED_DEPARTMENTS));
  const [designations, setDesignations] = useState<string[]>(() => syncStorage.getLocalStorage<string[]>("attendx_designations", SEED_DESIGNATIONS));
  const [leaveTypes, setLeaveTypes] = useState<string[]>(() => syncStorage.getLocalStorage<string[]>("attendx_leave_types", SEED_LEAVE_TYPES));
  const [taskTypes, setTaskTypes] = useState<string[]>(() => syncStorage.getLocalStorage<string[]>("attendx_task_types", SEED_TASK_TYPES));
  const [attendance, setAttendance] = useState<Attendance[]>(() => syncStorage.getLocalStorage<Attendance[]>("attendx_attendance", []));
  const [leaves, setLeaves] = useState<Leave[]>(() => syncStorage.getLocalStorage<Leave[]>("attendx_leaves", []));
  const [coffs, setCoffs] = useState<Coff[]>(() => syncStorage.getLocalStorage<Coff[]>("attendx_coffs", []));
  const [specialDuties, setSpecialDuties] = useState<SpecialDuty[]>(() => syncStorage.getLocalStorage<SpecialDuty[]>("attendx_special_duties", []));
  const [holidays, setHolidays] = useState<Holiday[]>(() => syncStorage.getLocalStorage<Holiday[]>("attendx_holidays", SEED_HOLIDAYS));

  // Admin global credentials
  const [adminId, setAdminId] = useState(() => syncStorage.getLocalStorage<string>("attendx_admin_id", "ADMIN"));
  const [adminPassword, setAdminPassword] = useState(() => syncStorage.getLocalStorage<string>("attendx_admin_pwd", "Admin@123"));

  // Helper matching employee names in database
  const getEmpName = (id: string) => {
    const e = employees.find(x => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "Unknown";
  };

  // UI routes
  const [showDemoLogins, setShowDemoLogins] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [isPwdVisible, setIsPwdVisible] = useState(false);

  // Admin portal tab
  const [adminTab, setAdminTab] = useState("dashboard"); // dashboard, employees, assignments, masterdata, approvals, holidays, reports, tests, documentation, database
  const [showAllMobileTools, setShowAllMobileTools] = useState(false);
  const [guideTab, setGuideTab] = useState<"firebase" | "supabase-storage" | "supabase-db">("supabase-db");

  // Employee Form variables
  const [isEmpFormOpen, setIsEmpFormOpen] = useState(false);
  const [editEmpId, setEditEmpId] = useState<string | null>(null);

  const [fFirst, setFFirst] = useState("");
  const [fLast, setFLast] = useState("");
  const [fFather, setFFather] = useState("");
  const [fGender, setFGender] = useState("");
  const [fMarital, setFMarital] = useState("");
  const [fDob, setFDob] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fWorkCon, setFWorkCon] = useState("");
  const [fPersCon, setFPersCon] = useState("");
  const [fPermAddr, setFPermAddr] = useState("");
  const [fCommAddr, setFCommAddr] = useState("");
  const [fDoj, setFDoj] = useState("");
  const [fSource, setFSource] = useState("");
  const [fType, setFType] = useState("");
  const [fAadhaar, setFAadhaar] = useState("");
  const [fPan, setFPan] = useState("");
  const [fAadhaarFile, setFAadhaarFile] = useState<string | null>(null);
  const [fAadhaarFileName, setFAadhaarFileName] = useState("");
  const [fPanFile, setFPanFile] = useState<string | null>(null);
  const [fPanFileName, setFPanFileName] = useState("");

  // Supabase Upload State Trackers
  const [fAadhaarUploading, setFAadhaarUploading] = useState(false);
  const [fPanUploading, setFPanUploading] = useState(false);
  const [fAadhaarUploadError, setFAadhaarUploadError] = useState<string | null>(null);
  const [fPanUploadError, setFPanUploadError] = useState<string | null>(null);

  const [searchEmp, setSearchEmp] = useState("");

  // Role Assignment State
  const [selRoleEmp, setSelRoleEmp] = useState("");
  const [selRoleDept, setSelRoleDept] = useState("");
  const [selRoleDesig, setSelRoleDesig] = useState("");
  const [selRoleStatus, setSelRoleStatus] = useState<"Active" | "Left" | "Inactive" | "Others">("Active");

  // Master Lists Entry variables
  const [newDept, setNewDept] = useState("");
  const [newDesig, setNewDesig] = useState("");
  const [newLeaveType, setNewLeaveType] = useState("");
  const [newTaskType, setNewTaskType] = useState("");

  // Holiday entry Form variables
  const [newHolDate, setNewHolDate] = useState("");
  const [newHolName, setNewHolName] = useState("");
  const [newHolType, setNewHolType] = useState<"National" | "State" | "Optional" | "Custom">("National");

  // Rejection Reason Prompt variable
  const [rejectReasonPrompt, setRejectReasonPrompt] = useState("");
  const [activeRejectTarget, setActiveRejectTarget] = useState<{ type: string; id: string; requireResubmit: boolean } | null>(null);

  // Unified Database Router Settings
  const [dbMode, setDbMode] = useState<"local" | "firebase" | "supabase">(() => {
    return (localStorage.getItem("attendx_db_mode") as any) || "supabase";
  });
  
  // Storage bucket and sync state configurations
  const [sbTableExists, setSbTableExists] = useState<boolean | null>(null);
  const [sbCheckingTable, setSbCheckingTable] = useState(false);

  // Live Firebase connection setup variables
  const [fbApiKey, setFbApiKey] = useState(() => syncStorage.getLocalStorage<string>("attendx_fb_apikey", HARDCODED_FIREBASE_CONFIG.apiKey));
  const [fbProjId, setFbProjId] = useState(() => syncStorage.getLocalStorage<string>("attendx_fb_projid", HARDCODED_FIREBASE_CONFIG.projectId));
  const [fbAppId, setFbAppId] = useState(() => syncStorage.getLocalStorage<string>("attendx_fb_appid", HARDCODED_FIREBASE_CONFIG.appId));
  const [fbDbUrl, setFbDbUrl] = useState(() => syncStorage.getLocalStorage<string>("attendx_fb_dburl", HARDCODED_FIREBASE_CONFIG.databaseURL));
  const [fbConfigured, setFbConfigured] = useState(() => {
    const apikey = localStorage.getItem("attendx_fb_apikey") || HARDCODED_FIREBASE_CONFIG.apiKey;
    const projid = localStorage.getItem("attendx_fb_projid") || HARDCODED_FIREBASE_CONFIG.projectId;
    const appid = localStorage.getItem("attendx_fb_appid") || HARDCODED_FIREBASE_CONFIG.appId;
    return !!(apikey && projid && appid);
  });

  const cloudSyncActive = dbMode === "supabase" || (dbMode === "firebase" && fbConfigured);

  // Local Masking Overrides to intercept all existing Firestore calls dynamically
  const firestoreSetDoc = async (collectionPath: string, docId: string, data: any) => {
    if (dbMode === "supabase") {
      try {
        await supabaseSetDoc(collectionPath, docId, data);
        console.log(`[Supabase Engine] Successfully saved ${collectionPath}/${docId}`);
      } catch (err: any) {
        console.error(`[Supabase Engine] Failed to save document:`, err);
        alert(`⚠️ Cloud Database Sync Failed!\n\nUnable to save records to your Supabase cloud database.\n\nReason: ${err?.message || err}\n\n👉 ACTION REQUIRED: If you haven't already, please go to your Admin Portal > Database configuration and run the SQL Script in your Supabase SQL Editor to initialize the 'attendx_sync' table!`);
      }
    } else if (dbMode === "firebase" && fbConfigured) {
      try {
        await originalFirestoreSetDoc(collectionPath, docId, data);
      } catch (err: any) {
        console.error(`[Firebase Engine] Failed to save document:`, err);
        alert(`⚠️ Firebase Database Sync Failed!\n\nUnable to save records to Cloud Firestore.\n\nError: ${err?.message || err}`);
      }
    }
  };

  const firestoreDeleteDoc = async (collectionPath: string, docId: string) => {
    if (dbMode === "supabase") {
      try {
        await supabaseDeleteDoc(collectionPath, docId);
        console.log(`[Supabase Engine] Successfully deleted ${collectionPath}/${docId}`);
      } catch (err: any) {
        console.error(`[Supabase Engine] Failed to delete document:`, err);
        alert(`⚠️ Cloud Database Sync Failed!\n\nUnable to delete record from your Supabase cloud database.\n\nReason: ${err?.message || err}\n\n👉 ACTION REQUIRED: Please check if you have created the 'attendx_sync' table in Supabase and enabled the public access RLS policies listed in the Database tab.`);
      }
    } else if (dbMode === "firebase" && fbConfigured) {
      try {
        await originalFirestoreDeleteDoc(collectionPath, docId);
      } catch (err: any) {
        console.error(`[Firebase Engine] Failed to delete document:`, err);
        alert(`⚠️ Firebase Database Sync Failed!\n\nUnable to delete records from Cloud Firestore.\n\nError: ${err?.message || err}`);
      }
    }
  };

  // -------------------------------------------------------------
  // DYNAMIC FIREBASE SERVER COUPLING
  // -------------------------------------------------------------
  useEffect(() => {
    if (fbApiKey && fbProjId && fbAppId) {
      try {
        initFirebaseService({
          apiKey: fbApiKey,
          projectId: fbProjId,
          appId: fbAppId,
          authDomain: `${fbProjId}.firebaseapp.com`,
          storageBucket: `${fbProjId}.appspot.com`
        });
        setFbConfigured(true);
        console.log("AttendX Active Firebase coupling integrated successfully.");
      } catch (err) {
        console.error("Firebase dynamic coupling mismatch error:", err);
      }
    }
  }, [fbApiKey, fbProjId, fbAppId]);

  // -------------------------------------------------------------
  // REAL-TIME CLOUD DATABASE SYNCHRONIZERS (FIREBASE vs SUPABASE)
  // -------------------------------------------------------------
  
  // A. Supabase Realtime DB Synchronizer
  useEffect(() => {
    if (dbMode !== "supabase") return;

    setSbCheckingTable(true);
    checkSupabaseTableExists().then(exists => {
      setSbTableExists(exists);
      setSbCheckingTable(false);
    });

    const unsubscribes: (() => void)[] = [];

    const setupSbListener = (collectionName: string, setState: (data: any) => void, currentLocalState: any = []) => {
      try {
        const sub = supabaseListenCollection(collectionName, (list) => {
          const seededKey = `attendx_seeded_supabase_${collectionName}`;
          const alreadySeeded = localStorage.getItem(seededKey) === "true";

          // If Supabase is empty, and we haven't seeded before, seed with active local state
          if (list.length === 0 && !alreadySeeded && currentLocalState && currentLocalState.length > 0) {
            console.log(`[Supabase Sync] ${collectionName} is empty. Seeding local dataset to Supabase for first-time use...`);
            currentLocalState.forEach((item: any) => {
              const docId = item.id || item.empId;
              if (docId) {
                supabaseSetDoc(collectionName, docId, item);
              }
            });
            localStorage.setItem(seededKey, "true");
          } else {
            console.log(`[Supabase Sync] Fetched ${list.length} docs for '${collectionName}'`);
            localStorage.setItem(seededKey, "true");
            setState(list);
          }
        });
        unsubscribes.push(sub.unsubscribe);
      } catch (err) {
        console.error(`Error hooking up Supabase listener for ${collectionName}:`, err);
      }
    };

    setupSbListener("employees", setEmployees, employees);
    setupSbListener("roles", setRoles, roles);
    setupSbListener("attendance", setAttendance, attendance);
    setupSbListener("leaves", setLeaves, leaves);
    setupSbListener("coffs", setCoffs, coffs);
    setupSbListener("specialDuties", setSpecialDuties, specialDuties);
    setupSbListener("holidays", setHolidays, holidays);

    // Sync Global Settings
    try {
      const subSettings = supabaseListenCollection("settings", (list) => {
        const seededKey = "attendx_seeded_supabase_settings";
        const alreadySeeded = localStorage.getItem(seededKey) === "true";
        const globalConfig = list.find(item => item.id === "global" || item.departments);
        if (globalConfig) {
          localStorage.setItem(seededKey, "true");
          if (globalConfig.adminId) setAdminId(globalConfig.adminId);
          if (globalConfig.adminPassword) setAdminPassword(globalConfig.adminPassword);
          if (globalConfig.departments) setDepartments(globalConfig.departments);
          if (globalConfig.designations) setDesignations(globalConfig.designations);
          if (globalConfig.leaveTypes) setLeaveTypes(globalConfig.leaveTypes);
          if (globalConfig.taskTypes) setTaskTypes(globalConfig.taskTypes);
        } else if (!alreadySeeded) {
          // Seed settings to Supabase
          supabaseSetDoc("settings", "global", {
            id: "global",
            adminId,
            adminPassword,
            departments,
            designations,
            leaveTypes,
            taskTypes
          });
          localStorage.setItem(seededKey, "true");
        }
      });
      unsubscribes.push(subSettings.unsubscribe);
    } catch (err) {
      console.error("Error setting up Supabase Global Settings Listener", err);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [dbMode]);

  // B. Firebase Firestore DB Synchronizer
  useEffect(() => {
    if (dbMode !== "firebase") return;
    const { isConfigured, db } = getFirebaseStatus();
    if (!isConfigured || !db) return;

    const unsubscribes: (() => void)[] = [];

    // Helper to setup snapshot listener safely
    const setupListener = (collectionName: string, setState: (data: any) => void, currentLocalState: any = []) => {
      try {
        const q = collection(db, collectionName);
        const unsub = onSnapshot(q, (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((doc) => {
            list.push({ ...doc.data() });
          });
          
          // Seed rule: If Firestore database is empty (e.g. freshly created) but local state has items, sync them to cloud!
          if (snapshot.empty && currentLocalState && currentLocalState.length > 0) {
            console.log(`Firestore collection ${collectionName} was empty. Auto-seeding local index...`);
            currentLocalState.forEach((item: any) => {
              const docId = item.id || item.empId;
              if (docId) {
                originalFirestoreSetDoc(collectionName, docId, item);
              }
            });
          } else {
            console.log(`Synced ${list.length} docs from ${collectionName}`);
            setState(list);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, collectionName);
        });
        unsubscribes.push(unsub);
      } catch (err) {
        console.error(`Error hooking up listener for ${collectionName}:`, err);
      }
    };

    setupListener("employees", setEmployees, employees);
    setupListener("roles", setRoles, roles);
    setupListener("attendance", setAttendance, attendance);
    setupListener("leaves", setLeaves, leaves);
    setupListener("coffs", setCoffs, coffs);
    setupListener("specialDuties", setSpecialDuties, specialDuties);
    setupListener("holidays", setHolidays, holidays);

    // List settings / configurations global document
    try {
      const settingsRef = doc(db, "settings", "global");
      const unsubSettings = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.adminId) setAdminId(data.adminId);
          if (data.adminPassword) setAdminPassword(data.adminPassword);
          if (data.departments) setDepartments(data.departments);
          if (data.designations) setDesignations(data.designations);
          if (data.leaveTypes) setLeaveTypes(data.leaveTypes);
          if (data.taskTypes) setTaskTypes(data.taskTypes);
        } else {
          // Seed settings to cloud
          originalFirestoreSetDoc("settings", "global", {
            adminId,
            adminPassword,
            departments,
            designations,
            leaveTypes,
            taskTypes
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/global");
      });
      unsubscribes.push(unsubSettings);
    } catch (err) {
      console.error("Error setting up Global Settings Listener", err);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [dbMode, fbConfigured]);

  // -------------------------------------------------------------
  // SYNCHRONIZATION EFFECT WRAPPER
  // -------------------------------------------------------------
  useEffect(() => {
    syncStorage.setLocalStorage("attendx_active_user", user);
    syncStorage.setLocalStorage("attendx_employees", employees);
    syncStorage.setLocalStorage("attendx_roles", roles);
    syncStorage.setLocalStorage("attendx_departments", departments);
    syncStorage.setLocalStorage("attendx_designations", designations);
    syncStorage.setLocalStorage("attendx_leave_types", leaveTypes);
    syncStorage.setLocalStorage("attendx_task_types", taskTypes);
    syncStorage.setLocalStorage("attendx_attendance", attendance);
    syncStorage.setLocalStorage("attendx_leaves", leaves);
    syncStorage.setLocalStorage("attendx_coffs", coffs);
    syncStorage.setLocalStorage("attendx_special_duties", specialDuties);
    syncStorage.setLocalStorage("attendx_holidays", holidays);
    syncStorage.setLocalStorage("attendx_admin_id", adminId);
    syncStorage.setLocalStorage("attendx_admin_pwd", adminPassword);
  }, [
    user, employees, roles, departments, designations, leaveTypes, taskTypes, 
    attendance, leaves, coffs, specialDuties, holidays, adminId, adminPassword
  ]);

  // -------------------------------------------------------------
  // USER PORTAL ROUTERS & LOGINS
  // -------------------------------------------------------------
  const executeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginEmail.trim();
    if (!identifier || !loginPwd.trim()) {
      alert("Credentials cannot be left blank.");
      return;
    }

    // 1. Check if trying to login as admin
    if (identifier.toUpperCase() === adminId.toUpperCase()) {
      if (loginPwd === adminPassword) {
        setUser({
          id: "super-admin",
          empId: "SUPER_ADMIN",
          firstName: "Administrator",
          lastName: "Control",
          email: "admin@attendx.com",
          userRole: "Admin",
          doj: new Date().toISOString().split("T")[0]
        });
        setAdminTab("dashboard");
      } else {
        alert("The specified Admin credentials do not match.");
      }
      return;
    }

    // 2. Check if trying to login as employee (match by Email or Employee ID)
    const emp = employees.find(
      e =>
        e.email.trim().toLowerCase() === identifier.toLowerCase() ||
        e.empId.trim().toLowerCase() === identifier.toLowerCase()
    );

    if (emp) {
      const empRole = roles.find(r => r.empId === emp.id);
      if (!empRole || !empRole.department || empRole.department.trim() === "") {
        alert("Login Restricted: Access is disabled until your department has been formally assigned by an Administrator.");
        return;
      }
      if (loginPwd === emp.password || loginPwd === emp.empId) {
        setUser(emp);
      } else {
        alert("Incorrect password. Please verify.");
      }
    } else {
      alert("Account credentials not recognized. Please verify your Email or Employee ID.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginEmail("");
    setLoginPwd("");
  };

  // -------------------------------------------------------------
  // ADMINISTRATIVE DIRECTORY MANAGERS
  // -------------------------------------------------------------
  const handleOpenEmpForm = (emp: Employee | null = null) => {
    if (emp) {
      setEditEmpId(emp.id);
      setFFirst(emp.firstName);
      setFLast(emp.lastName);
      setFFather(emp.fatherName || "");
      setFGender(emp.gender || "");
      setFMarital(emp.maritalStatus || "");
      setFDob(emp.dob || "");
      setFEmail(emp.email);
      setFWorkCon(emp.workContact || "");
      setFPersCon(emp.personalContact || "");
      setFPermAddr(emp.permAddress || "");
      setFCommAddr(emp.commAddress || "");
      setFDoj(emp.doj);
      setFSource(emp.hireSource || "");
      setFType(emp.empType || "");
      setFAadhaar(emp.aadhaar || "");
      setFPan(emp.pan || "");
      setFAadhaarFile(emp.aadhaarFile || null);
      setFAadhaarFileName(emp.aadhaarFileName || "");
      setFPanFile(emp.panFile || null);
      setFPanFileName(emp.panFileName || "");
    } else {
      setEditEmpId(null);
      setFFirst("");
      setFLast("");
      setFFather("");
      setFGender("");
      setFMarital("");
      setFDob("");
      setFEmail("");
      setFWorkCon("");
      setFPersCon("");
      setFPermAddr("");
      setFCommAddr("");
      setFDoj(new Date().toISOString().split("T")[0]);
      setFSource("Job Portal");
      setFType("Permanent");
      setFAadhaar("");
      setFPan("");
      setFAadhaarFile(null);
      setFAadhaarFileName("");
      setFPanFile(null);
      setFPanFileName("");
    }
    setIsEmpFormOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fFirst.trim() || !fLast.trim() || !fEmail.trim() || !fDoj) {
      alert("Missing required bounds (Name, Email, Joining properties).");
      return;
    }

    if (editEmpId) {
      setEmployees(prev => prev.map(emp => {
        if (emp.id === editEmpId) {
          const updated = {
            ...emp,
            firstName: fFirst,
            lastName: fLast,
            fatherName: fFather,
            gender: fGender,
            maritalStatus: fMarital,
            dob: fDob,
            email: fEmail,
            workContact: fWorkCon,
            personalContact: fPersCon,
            permAddress: fPermAddr,
            commAddress: fCommAddr,
            doj: fDoj,
            hireSource: fSource,
            empType: fType,
            aadhaar: fAadhaar,
            pan: fPan,
            aadhaarFile: fAadhaarFile,
            aadhaarFileName: fAadhaarFileName,
            panFile: fPanFile,
            panFileName: fPanFileName
          };
          if (cloudSyncActive) {
            firestoreSetDoc("employees", updated.id, updated);
          }
          return updated;
        }
        return emp;
      }));
      alert(`Updated credentials of ${fFirst} successfully.`);
    } else {
      const idxStr = String(employees.length + 1).padStart(3, "0");
      const empId = `EMP${idxStr}`;
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        empId,
        firstName: fFirst,
        lastName: fLast,
        fatherName: fFather,
        gender: fGender,
        maritalStatus: fMarital,
        dob: fDob,
        email: fEmail,
        workContact: fWorkCon,
        personalContact: fPersCon,
        permAddress: fPermAddr,
        commAddress: fCommAddr,
        doj: fDoj,
        hireSource: fSource,
        empType: fType,
        userRole: "Employee",
        password: empId,
        aadhaar: fAadhaar,
        pan: fPan,
        aadhaarFile: fAadhaarFile,
        aadhaarFileName: fAadhaarFileName,
        panFile: fPanFile,
        panFileName: fPanFileName
      };
      setEmployees(prev => [...prev, newEmp]);

      // Seed automatic alignment role mapping (starts unassigned)
      const standardRole: RoleAssignment = {
        empId: newEmp.id,
        department: "",
        designation: "",
        status: "Active"
      };
      setRoles(prev => [...prev, standardRole]);

      if (cloudSyncActive) {
        firestoreSetDoc("employees", newEmp.id, newEmp);
        firestoreSetDoc("roles", standardRole.empId, standardRole);
      }
      alert(`Created credentials of ${fFirst}. Init Password: ${empId}. (NOTE: Set their assigned Department before they can log in.)`);
    }
    setIsEmpFormOpen(false);
  };

  const handleFileUpload = async (type: "aadhaar" | "pan", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = type === "aadhaar" ? setFAadhaarUploading : setFPanUploading;
    const setError = type === "aadhaar" ? setFAadhaarUploadError : setFPanUploadError;
    const setFileUrl = type === "aadhaar" ? setFAadhaarFile : setFPanFile;
    const setFileName = type === "aadhaar" ? setFAadhaarFileName : setFPanFileName;

    setUploading(true);
    setError(null);

    // Get an identifier for the folder path
    const entityId = editEmpId || `new_profile_${Date.now()}`;

    try {
      // 1. Try to upload to Supabase Storage
      const result = await uploadToSupabaseStorage(file, type, entityId);
      
      // Update state with Supabase URL
      setFileUrl(result.publicUrl);
      setFileName(file.name);
      console.log(`Successfully uploaded ${type} to Supabase Storage:`, result.publicUrl);
    } catch (err: any) {
      console.warn("Supabase Storage Upload failed, falling back to local base64 reader:", err);
      setError(err?.message || "Storage Upload failed. Loaded as local Base64.");
      
      // 2. Fallback to Local Base64 FileReader so user can STILL input files if bucket or CORS is not live yet
      const reader = new FileReader();
      reader.onload = () => {
        setFileUrl(reader.result as string);
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleAssignRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selRoleEmp || !selRoleDept || !selRoleDesig) {
      alert("Specify matching Department and Designation references.");
      return;
    }
    const updatedAssignment: RoleAssignment = {
      empId: selRoleEmp,
      department: selRoleDept,
      designation: selRoleDesig,
      status: selRoleStatus
    };
    setRoles(prev => {
      const exists = prev.find(r => r.empId === selRoleEmp);
      if (exists) {
        return prev.map(r => r.empId === selRoleEmp ? updatedAssignment : r);
      } else {
        return [...prev, updatedAssignment];
      }
    });

    if (cloudSyncActive) {
      firestoreSetDoc("roles", selRoleEmp, updatedAssignment);
    }
    alert("Employee department role assignments cataloged successfully! ✅");
  };

  // -------------------------------------------------------------
  // DATABASE STATE CONSOLE MUTATORS & SYNC SETTINGS
  // -------------------------------------------------------------
  const handleConfigureFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanApiKey = fbApiKey.trim();
    const cleanProjId = fbProjId.trim();
    const cleanAppId = fbAppId.trim();
    const cleanDbUrl = fbDbUrl.trim();

    if (!cleanApiKey || !cleanProjId || !cleanAppId) {
      alert("Missing credential indexes. Connecting locally.");
      return;
    }

    syncStorage.setLocalStorage("attendx_fb_apikey", cleanApiKey);
    syncStorage.setLocalStorage("attendx_fb_projid", cleanProjId);
    syncStorage.setLocalStorage("attendx_fb_appid", cleanAppId);
    syncStorage.setLocalStorage("attendx_fb_dburl", cleanDbUrl);

    try {
      initFirebaseService({
        apiKey: cleanApiKey,
        projectId: cleanProjId,
        appId: cleanAppId,
        authDomain: `${cleanProjId}.firebaseapp.com`,
        storageBucket: `${cleanProjId}.appspot.com`
      });
      setFbConfigured(true);
      alert("Firebase Connection Synced. Active Cloud Run parameters live! ✅");
    } catch (err) {
      console.error("Firebase startup synchronization mismatch:", err);
      alert("Failed to couple connection with specified credentials. Check your config inputs.");
    }
  };

  const handleWipeDatabase = () => {
    if (confirm("Are you sure? This will delete all corporate logs, files, and schedules permanently.")) {
      localStorage.clear();
      setEmployees(SEED_EMPLOYEES);
      setRoles(SEED_ROLES);
      setDepartments(SEED_DEPARTMENTS);
      setDesignations(SEED_DESIGNATIONS);
      setLeaveTypes(SEED_LEAVE_TYPES);
      setTaskTypes(SEED_TASK_TYPES);
      setAttendance([]);
      setLeaves([]);
      setCoffs([]);
      setSpecialDuties([]);
      setHolidays(SEED_HOLIDAYS);
      handleLogout();
    }
  };

  const handleWipePunchesOnly = () => {
    if (confirm("Delete all granular day-wise punches, leave applications, and C-Off histories? (Keep Employees directory)")) {
      setAttendance([]);
      setLeaves([]);
      setCoffs([]);
      setSpecialDuties([]);
      alert("Operational records deleted. Catalog reset.");
    }
  };

  // -------------------------------------------------------------
  // APPROVALS FLOW CONTROLS
  // -------------------------------------------------------------
  const handleApproveItem = (type: string, id: string) => {
    const approvedBy = user?.firstName || "Admin";
    if (type === "attendance") {
      setAttendance(prev => prev.map(a => {
        if (a.id === id) {
          const updated = { ...a, approval: "Approved", approvedBy };
          if (cloudSyncActive) firestoreSetDoc("attendance", id, updated);
          return updated;
        }
        return a;
      }));
    } else if (type === "leave") {
      setLeaves(prev => prev.map(l => {
        if (l.id === id) {
          const updated = { ...l, status: "Approved", approvedBy };
          if (cloudSyncActive) firestoreSetDoc("leaves", id, updated);
          return updated;
        }
        return l;
      }));
    } else if (type === "coff") {
      setCoffs(prev => prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, status: "Approved", approvedBy };
          if (cloudSyncActive) firestoreSetDoc("coffs", id, updated);
          return updated;
        }
        return c;
      }));
    } else if (type === "sd") {
      setSpecialDuties(prev => prev.map(s => {
        if (s.id === id) {
          const updated = { ...s, status: "Approved", approvedBy };
          if (cloudSyncActive) firestoreSetDoc("specialDuties", id, updated);
          return updated;
        }
        return s;
      }));
    }
    alert("Requested Item approved successfully! ✅");
  };

  const handleAuditRejectTrigger = (type: string, id: string, requireResubmit: boolean) => {
    setActiveRejectTarget({ type, id, requireResubmit });
    setRejectReasonPrompt("");
  };

  const handleResolveRejection = () => {
    if (!activeRejectTarget) return;
    const { type, id, requireResubmit } = activeRejectTarget;
    const statusVal = requireResubmit ? "Rejected-Resubmit" : "Rejected";

    if (type === "attendance") {
      setAttendance(prev => prev.map(a => {
        if (a.id === id) {
          const updated = { ...a, approval: statusVal, rejectReason: rejectReasonPrompt };
          if (cloudSyncActive) firestoreSetDoc("attendance", id, updated);
          return updated;
        }
        return a;
      }));
    } else if (type === "leave") {
      setLeaves(prev => prev.map(l => {
        if (l.id === id) {
          const updated = { ...l, status: statusVal, rejectReason: rejectReasonPrompt };
          if (cloudSyncActive) firestoreSetDoc("leaves", id, updated);
          return updated;
        }
        return l;
      }));
    } else if (type === "coff") {
      setCoffs(prev => prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, status: statusVal, rejectReason: rejectReasonPrompt };
          if (cloudSyncActive) firestoreSetDoc("coffs", id, updated);
          return updated;
        }
        return c;
      }));
    } else if (type === "sd") {
      setSpecialDuties(prev => prev.map(s => {
        if (s.id === id) {
          const updated = { ...s, status: statusVal, rejectReason: rejectReasonPrompt };
          if (cloudSyncActive) firestoreSetDoc("specialDuties", id, updated);
          return updated;
        }
        return s;
      }));
    }

    setActiveRejectTarget(null);
    alert(`Item updated to ${statusVal}. Reason archived.`);
  };

  // -------------------------------------------------------------
  // SUB COMPONENT ACTIONS PASS THROUGH
  // -------------------------------------------------------------
  const handleEmployeeSubmitAttendance = (rec: Attendance) => {
    setAttendance(prev => {
      const exists = prev.some(a => a.id === rec.id);
      if (exists) {
        return prev.map(a => a.id === rec.id ? rec : a);
      }
      return [...prev, rec];
    });
    if (cloudSyncActive) {
      firestoreSetDoc("attendance", rec.id, rec);
    }
  };
  const handleEmployeeSubmitLeave = (rec: Leave) => {
    setLeaves(prev => {
      const exists = prev.some(l => l.id === rec.id);
      if (exists) {
        return prev.map(l => l.id === rec.id ? rec : l);
      }
      return [...prev, rec];
    });
    if (cloudSyncActive) {
      firestoreSetDoc("leaves", rec.id, rec);
    }
  };
  const handleEmployeeSubmitCoff = (rec: Coff) => {
    setCoffs(prev => {
      const exists = prev.some(c => c.id === rec.id);
      if (exists) {
        return prev.map(c => c.id === rec.id ? rec : c);
      }
      return [...prev, rec];
    });
    if (cloudSyncActive) {
      firestoreSetDoc("coffs", rec.id, rec);
    }
  };
  const handleEmployeeSubmitSD = (rec: SpecialDuty) => {
    setSpecialDuties(prev => {
      const exists = prev.some(s => s.id === rec.id);
      if (exists) {
        return prev.map(s => s.id === rec.id ? rec : s);
      }
      return [...prev, rec];
    });
    if (cloudSyncActive) {
      firestoreSetDoc("specialDuties", rec.id, rec);
    }
  };

  const handleDeleteRecord = (type: "attendance" | "leave" | "coff" | "sd", id: string) => {
    if (type === "attendance") {
      setAttendance(prev => prev.filter(x => x.id !== id));
    } else if (type === "leave") {
      setLeaves(prev => prev.filter(x => x.id !== id));
    } else if (type === "coff") {
      setCoffs(prev => prev.filter(x => x.id !== id));
    } else if (type === "sd") {
      setSpecialDuties(prev => prev.filter(x => x.id !== id));
    }

    if (cloudSyncActive) {
      const collName = type === "attendance" ? "attendance" : type === "leave" ? "leaves" : type === "coff" ? "coffs" : "specialDuties";
      firestoreDeleteDoc(collName, id);
    }
  };

  // -------------------------------------------------------------
  // RENDERING COMPASS
  // -------------------------------------------------------------
  const searchingEmployeesList = employees.filter(e => {
    const term = searchEmp.toLowerCase();
    return (
      e.firstName.toLowerCase().includes(term) ||
      e.lastName.toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term) ||
      e.empId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-200 flex flex-col font-sans">
      {/* Dynamic Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 px-6 py-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl font-bold font-display shadow-lg shadow-indigo-900/30 text-white">
            🕐
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight font-display text-white uppercase flex items-center gap-2 leading-none">
              AttendX
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-mono tracking-tight lowercase">v3.4.0-stable</span>
            </h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-1 leading-none">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block"></span>
              Enterprise Workforce Hub
            </p>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
              <span>Firebase Connection: Connected</span>
            </div>
            <span className="hidden sm:inline text-xs text-slate-400 font-mono font-medium">Logged in: {user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-xs rounded-lg transition-all font-semibold cursor-pointer border border-slate-700/60"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 pb-24 md:pb-6 max-w-7xl w-full mx-auto">
        {!user ? (
          /* Login Dialog Container */
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-8 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600"></div>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
                  🕐
                </div>
                <h2 className="text-xl font-bold text-slate-800 font-display">Sign In to Dashboard</h2>
                <p className="text-xs text-slate-400 leading-snug">Enter your credentials to access your administrative desk or staff self-service workspace.</p>
              </div>

              <form onSubmit={executeLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">
                    EMAIL OR EMPLOYEE ID / USER ID
                  </label>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    placeholder="e.g. ADMIN or your registered email / ID"
                    className="w-full text-sm border border-slate-250 rounded-xl px-3.5 py-3 bg-white focus:outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">PASSWORD KEY</label>
                  <div className="relative">
                    <input
                      type={isPwdVisible ? "text" : "password"}
                      value={loginPwd}
                      onChange={e => setLoginPwd(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full text-sm border border-slate-250 rounded-xl px-3.5 py-3 bg-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPwdVisible(prev => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-all"
                    >
                      {isPwdVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-indigo-100 transition-all cursor-pointer border-none"
                >
                  Access Workspace
                </button>
              </form>

              {/* Demo Credentials Guide */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoLogins(!showDemoLogins)}
                  className="w-full text-left text-xs font-bold text-indigo-600 hover:text-indigo-700 font-mono flex items-center justify-between cursor-pointer"
                >
                  <span>🔑 DEMO CREDENTIALS QUICK GUIDE</span>
                  <span>{showDemoLogins ? "Collapse ▲" : "Expand ▼"}</span>
                </button>
                {showDemoLogins && (
                  <div className="mt-2.5 bg-slate-50 border border-slate-150 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed font-sans space-y-2">
                    <div>
                      <strong className="text-slate-800">Admin Console Access:</strong>
                      <div className="mt-0.5">Use User ID: <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-bold font-mono text-indigo-700">ADMIN</code> and Password: <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-bold font-mono text-indigo-700">Admin@123</code></div>
                    </div>
                    <div className="border-t border-slate-150 pt-1.5">
                      <strong className="text-slate-800">Staff Self-Service Access:</strong>
                      <div className="mt-0.5">Use any active Employee ID (e.g. <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono">EMP001</code>) or email with their corresponding password.</div>
                      <div className="text-[10px] text-slate-400 mt-1"><em>Note: Newly registered employees must have their Department assigned in the Admin console before access is granted.</em></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : user.userRole === "Admin" ? (
          /* ADMINISTRATIVE EXECUTIVE DESK */
          <div className="space-y-6">
            {/* Nav bars - Desktop-only */}
            <div className="hidden md:flex overflow-x-auto gap-2 pb-1 border-b border-indigo-100 no-print">
              {[
                { k: "dashboard", label: "🏠 Overview" },
                { k: "employees", label: "👥 Employees Catalog" },
                { k: "assignments", label: "🎭 Dept Assignments" },
                { k: "masterdata", label: "⚙️ Master Lists" },
                { k: "approvals", label: "📋 Approvals Hub" },
                { k: "holidays", label: "📅 Holiday Master" },
                { k: "reports", label: "📊 Report Matrix" },
                { k: "tests", label: "🧪 Unit Testing" },
                { k: "documentation", label: "📖 Dev Onboarding" },
                { k: "database", label: "☁️ Database Config" }
              ].map(tab => (
                <button
                  key={tab.k}
                  onClick={() => {
                    setAdminTab(tab.k);
                    setShowAllMobileTools(false);
                  }}
                  className={`px-4 py-2.5 text-xs font-extrabold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    adminTab === tab.k ? "bg-indigo-600 text-white shadow" : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-205"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Bottom Navigation Dock */}
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 z-50 px-2 py-1 flex items-center justify-around no-print shadow-2xl">
              <button
                onClick={() => { setAdminTab("dashboard"); setShowAllMobileTools(false); }}
                className={`flex flex-col items-center justify-center p-2 text-[10px] uppercase font-bold transition-all ${
                  adminTab === "dashboard" && !showAllMobileTools ? "text-indigo-400" : "text-slate-400"
                }`}
              >
                <span className="text-xl">🏠</span>
                <span className="mt-0.5 leading-none">Home</span>
              </button>

              <button
                onClick={() => { setAdminTab("employees"); setShowAllMobileTools(false); }}
                className={`flex flex-col items-center justify-center p-2 text-[10px] uppercase font-bold transition-all ${
                  adminTab === "employees" && !showAllMobileTools ? "text-indigo-400" : "text-slate-400"
                }`}
              >
                <span className="text-xl">👥</span>
                <span className="mt-0.5 leading-none">Staff</span>
              </button>

              <button
                onClick={() => { setAdminTab("approvals"); setShowAllMobileTools(false); }}
                className={`flex flex-col items-center justify-center p-2 text-[10px] uppercase font-bold relative transition-all ${
                  adminTab === "approvals" && !showAllMobileTools ? "text-indigo-400" : "text-slate-400"
                }`}
              >
                <span className="text-xl">📋</span>
                <span className="mt-0.5 leading-none">Approvals</span>
                {(attendance.filter(a => a.approval === "Pending" && a.punchOutTime).length + 
                  leaves.filter(l => l.status === "Pending").length +
                  coffs.filter(c => c.status === "Pending").length +
                  specialDuties.filter(s => s.status === "Pending").length) > 0 && (
                  <span className="absolute top-1.5 right-3.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                )}
              </button>

              <button
                onClick={() => { setAdminTab("reports"); setShowAllMobileTools(false); }}
                className={`flex flex-col items-center justify-center p-2 text-[10px] uppercase font-bold transition-all ${
                  adminTab === "reports" && !showAllMobileTools ? "text-indigo-400" : "text-slate-400"
                }`}
              >
                <span className="text-xl">📊</span>
                <span className="mt-0.5 leading-none">Reports</span>
              </button>

              <button
                onClick={() => setShowAllMobileTools(prev => !prev)}
                className={`flex flex-col items-center justify-center p-2 text-[10px] uppercase font-bold transition-all ${
                  showAllMobileTools ? "text-indigo-400 font-extrabold" : "text-slate-400"
                }`}
              >
                <span className="text-xl">⚙️</span>
                <span className="mt-0.5 leading-none">Tools</span>
              </button>
            </div>

            {/* Mobile Expandable Tools Overlay Grid */}
            {showAllMobileTools && (
              <div className="md:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl relative z-40 animate-in fade-in slide-in-from-bottom-4 duration-200 no-print">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Administrative Controls</h4>
                  <button onClick={() => setShowAllMobileTools(false)} className="text-xs font-bold text-rose-500 hover:text-rose-400 uppercase font-mono">
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 pb-8">
                  {[
                    { k: "assignments", label: "🎭 Roles Assignment", desc: "Designate and map roles" },
                    { k: "masterdata", label: "⚙️ Master Lists", desc: "Task/leave fields setup" },
                    { k: "holidays", label: "📅 Holiday Master", desc: "Configure off-dates" },
                    { k: "tests", label: "🧪 Diagnostics Suite", desc: "Automated unit tests" },
                    { k: "documentation", label: "📖 Dev Onboarding", desc: "Onboarding docs" },
                    { k: "database", label: "☁️ Database Config", desc: "Firebase configurations" }
                  ].map(sec => (
                    <button
                      key={sec.k}
                      onClick={() => {
                        setAdminTab(sec.k);
                        setShowAllMobileTools(false);
                      }}
                      className={`flex flex-col items-start p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        adminTab === sec.k
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                          : "bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800"
                      }`}
                    >
                      <span className="text-xs font-extrabold block">{sec.label}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 line-clamp-1 leading-none">{sec.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Panels */}
            {adminTab === "dashboard" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono">STAFF ATTENDANCE INDEX</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-indigo-700 font-display">{employees.length}</div>
                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-1 font-sans">Active Employees</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-emerald-700 font-display">
                          {attendance.filter(a => a.date === new Date().toISOString().split("T")[0] && a.status === "Present" && a.approval === "Approved").length}
                        </div>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1 font-sans">Present Today</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-amber-700 font-display">
                          {leaves.filter(l => l.status === "Pending").length}
                        </div>
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1 font-sans">Pending Leaves</p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-rose-700 font-display">
                          {attendance.filter(a => a.approval === "Pending" && a.punchOutTime).length}
                        </div>
                        <p className="text-[10px] text-rose-505 font-bold uppercase tracking-wider mt-1 font-sans">Pending Punches</p>
                      </div>
                      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-sky-700 font-display">
                          {coffs.filter(c => c.status === "Pending").length}
                        </div>
                        <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider mt-1 font-sans">Pending C-Off Claims</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-purple-700 font-display">
                          {specialDuties.filter(s => s.status === "Pending").length}
                        </div>
                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mt-1 font-sans">Pending Special Duties</p>
                      </div>
                    </div>
                  </div>

                  {/* High Quality Seed employees statistics summary grid */}
                  <div className="bg-white border border-slate-200 rounded-1.5xl p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Seeded Department Stats
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {departments
                        .filter(dept => roles.filter(r => r.department === dept && r.status === "Active").length > 0)
                        .map(dept => {
                          const count = roles.filter(r => r.department === dept && r.status === "Active").length;
                          return (
                            <div key={dept} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-1">
                              <span className="font-semibold text-slate-800 text-sm block">{dept}</span>
                              <span className="font-mono text-xs text-indigo-600 font-bold uppercase">{count} assigned</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                  {/* System connectivity specs */}
                  <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-inner space-y-4 border border-slate-800">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">DATABASE DIAGNOSTICS</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Database Mode:</span>
                        <span className="font-bold text-white font-mono bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">LOCAL (HYBRID)</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Telemetry tracking:</span>
                        <span className="text-emerald-500 font-extrabold uppercase">Live ✅</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Punches recorded:</span>
                        <span className="font-bold text-white font-mono">{attendance.length} items</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adminTab === "employees" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-50 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 font-display">Employees Master Directory</h2>
                    <p className="text-xs text-slate-400">Register employee profiles, upload identity credentials, or execute deletes.</p>
                  </div>
                  <button
                    onClick={() => handleOpenEmpForm(null)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Employee Account
                  </button>
                </div>

                {isEmpFormOpen && (
                  <div className="bg-white border border-slate-250 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto space-y-4 relative">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600"></div>
                    <h3 className="font-display font-semibold text-base text-slate-800">
                      {editEmpId ? "Update Employee Data Properties" : "Register New Employer Directory Identity"}
                    </h3>

                    <form onSubmit={handleSaveEmployee} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">FIRST Name *</label>
                          <input type="text" required value={fFirst} onChange={e => setFFirst(e.target.value)} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">LAST Name *</label>
                          <input type="text" required value={fLast} onChange={e => setFLast(e.target.value)} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Father / Spouse Name</label>
                          <input type="text" value={fFather} onChange={e => setFFather(e.target.value)} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Date of Birth</label>
                          <input type="date" value={fDob} onChange={e => setFDob(e.target.value)} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Email Address *</label>
                          <input type="email" required value={fEmail} onChange={e => setFEmail(e.target.value)} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Work Contact</label>
                          <input type="text" value={fWorkCon} onChange={e => setFWorkCon(e.target.value)} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Date of Joining *</label>
                          <input type="date" required value={fDoj} onChange={e => setFDoj(e.target.value)} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:outline-none" />
                        </div>
                      </div>

                      {/* File uploads section */}
                      <div className="bg-slate-50 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 font-display flex items-center justify-between">
                            <span>Aadhaar card index</span>
                            <span className="text-[9px] text-indigo-500 font-semibold font-mono">SUPABASE CLOUD</span>
                          </label>
                          <input type="text" placeholder="12-digit UID" value={fAadhaar} onChange={e => setFAadhaar(e.target.value)} className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none bg-white mb-2" />
                          <input type="file" onChange={e => handleFileUpload("aadhaar", e)} className="text-xs file:mr-3 file:py-1 file:px-2 block w-full cursor-pointer" disabled={fAadhaarUploading} />
                          
                          {fAadhaarUploading && (
                            <div className="flex items-center gap-2 mt-2 text-indigo-600 text-xs font-semibold">
                              <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                              <span>Uploading to Supabase...</span>
                            </div>
                          )}

                          {!fAadhaarUploading && fAadhaarFile && (
                            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                              {fAadhaarFile.startsWith("http") ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold font-sans">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  ✓ Supabase Cloud Link Stored
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium font-sans">
                                  ⚠️ Local Base64 Cache Fallback
                                </span>
                              )}
                              <a
                                href={fAadhaarFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-600 font-bold hover:underline bg-white px-2 py-0.5 border border-slate-200 rounded"
                              >
                                View Live Document ↗
                              </a>
                            </div>
                          )}
                          {fAadhaarUploadError && (
                            <p className="text-[9px] text-rose-500 mt-1.5 leading-normal font-sans">
                              {fAadhaarUploadError} (Please confirm CORS rules & Policies for 'Attendance-files' bucket!)
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 font-display flex items-center justify-between">
                            <span>PAN card index</span>
                            <span className="text-[9px] text-indigo-500 font-semibold font-mono">SUPABASE CLOUD</span>
                          </label>
                          <input type="text" placeholder="10-digit PAN" value={fPan} onChange={e => setFPan(e.target.value)} className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none bg-white mb-2" />
                          <input type="file" onChange={e => handleFileUpload("pan", e)} className="text-xs file:mr-3 file:py-1 file:px-2 block w-full cursor-pointer" disabled={fPanUploading} />
                          
                          {fPanUploading && (
                            <div className="flex items-center gap-2 mt-2 text-indigo-600 text-xs font-semibold">
                              <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                              <span>Uploading to Supabase...</span>
                            </div>
                          )}

                          {!fPanUploading && fPanFile && (
                            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                              {fPanFile.startsWith("http") ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold font-sans">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  ✓ Supabase Cloud Link Stored
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium font-sans">
                                  ⚠️ Local Base64 Cache Fallback
                                </span>
                              )}
                              <a
                                href={fPanFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-600 font-bold hover:underline bg-white px-2 py-0.5 border border-slate-200 rounded"
                              >
                                View Live Document ↗
                              </a>
                            </div>
                          )}
                          {fPanUploadError && (
                            <p className="text-[9px] text-rose-500 mt-1.5 leading-normal font-sans">
                              {fPanUploadError} (Please confirm CORS rules & Policies for 'Attendance-files' bucket!)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Permanent Address</label>
                          <textarea rows={2} value={fPermAddr} onChange={e => setFPermAddr(e.target.value)} className="w-full text-xs p-3 border rounded-lg focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Communication Address</label>
                          <textarea rows={2} value={fCommAddr} onChange={e => setFCommAddr(e.target.value)} className="w-full text-xs p-3 border rounded-lg focus:outline-none" />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-lg cursor-pointer">
                          Save Employee Identity Data
                        </button>
                        <button type="button" onClick={() => setIsEmpFormOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-lg">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Directory table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-150 flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search employee by name, ID or email..."
                        value={searchEmp}
                        onChange={e => setSearchEmp(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[720px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-mono font-bold uppercase tracking-wider text-slate-400">
                          <th className="p-4">Employee</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Work ID</th>
                          <th className="p-4">D.O.J</th>
                          <th className="p-4">Identity Fields</th>
                          <th className="p-4 text-right">Directory Options</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {searchingEmployeesList.map(e => (
                          <tr key={e.id} className="hover:bg-slate-50/40">
                            <td className="p-4 font-bold text-slate-800">
                              {e.firstName} {e.lastName}
                            </td>
                            <td className="p-4 font-mono text-slate-500">{e.email}</td>
                            <td className="p-4 font-mono font-extrabold text-indigo-600">{e.empId}</td>
                            <td className="p-4 font-mono">{e.doj}</td>
                            <td className="p-4 space-y-1.5">
                              {e.aadhaar && (
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] font-mono text-slate-600 font-semibold">AADHAAR: {e.aadhaar}</div>
                                  {e.aadhaarFile && (
                                    <a
                                      href={e.aadhaarFile}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                                    >
                                      📄 View Aadhaar Doc
                                    </a>
                                  )}
                                </div>
                              )}
                              {e.pan && (
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] font-mono text-slate-600 font-semibold">PAN: {e.pan}</div>
                                  {e.panFile && (
                                    <a
                                      href={e.panFile}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                                    >
                                      📄 View PAN Doc
                                    </a>
                                  )}
                                </div>
                              )}
                              {!e.aadhaar && !e.pan && <span className="text-slate-400 italic text-[10px]">No credentials</span>}
                            </td>
                            <td className="p-4 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenEmpForm(e)}
                                className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Edit employee properties"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                               <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${e.firstName}?`)) {
                                    setEmployees(prev => prev.filter(emp => emp.id !== e.id));
                                    if (cloudSyncActive) {
                                      firestoreDeleteDoc("employees", e.id);
                                      firestoreDeleteDoc("roles", e.id);
                                    }
                                  }
                                }}
                                className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="Delete from system"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {adminTab === "assignments" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-base text-slate-800 border-b border-indigo-50 pb-2">Modify Employee Department</h3>
                  <form onSubmit={handleAssignRole} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">SELECT STAFF MEMBER *</label>
                      <select
                        required
                        value={selRoleEmp}
                        onChange={e => setSelRoleEmp(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs bg-white focus:outline-none"
                      >
                        <option value="">Choose employee...</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.firstName} {e.lastName} ({e.empId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">ASSIGN DEPARTMENT *</label>
                      <select
                        required
                        value={selRoleDept}
                        onChange={e => setSelRoleDept(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs bg-white focus:outline-none"
                      >
                        <option value="">Select...</option>
                        {departments.map(d => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">ASSIGN DESIGNATION *</label>
                      <select
                        required
                        value={selRoleDesig}
                        onChange={e => setSelRoleDesig(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs bg-white focus:outline-none"
                      >
                        <option value="">Select...</option>
                        {designations.map(d => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">OPERATIONAL STATUS *</label>
                      <select
                        value={selRoleStatus}
                        onChange={e => setSelRoleStatus(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs bg-white focus:outline-none"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Left">Left</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm">
                      Assign Employee Details
                    </button>
                  </form>
                </div>

                {/* Listing Active assignments */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-base text-slate-800 border-b border-indigo-50 pb-2">Active Department Registry</h3>
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {roles.length === 0 ? (
                      <p className="text-slate-400 text-xs py-8 text-center">No structural roles assigned yet.</p>
                    ) : (
                      roles.map((r, idx) => {
                        const target = employees.find(e => e.id === r.empId);
                        if (!target) return null;
                        return (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {target.firstName} {target.lastName} <span className="font-mono text-slate-400 font-normal">({target.empId})</span>
                              </div>
                              <div className="text-[10px] text-indigo-750 font-mono mt-0.5 flex items-center gap-1">
                                {r.department ? (
                                  <span>{r.department} &middot; {r.designation}</span>
                                ) : (
                                  <span className="text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                                    ⚠️ Unassigned (Login Disabled)
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-100 border border-indigo-200 text-indigo-700">
                              {r.status}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {adminTab === "masterdata" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Departments */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 col-span-1">
                  <h3 className="font-display font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" /> Departments Directory
                  </h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="New dept..." value={newDept} onChange={e => setNewDept(e.target.value)} className="text-xs px-3 py-2 border rounded-lg flex-1 focus:outline-none" />
                    <button onClick={() => {
                      if (!newDept.trim()) return;
                      const updated = [...departments, newDept.trim()];
                      setDepartments(updated);
                      if (cloudSyncActive) {
                        firestoreSetDoc("settings", "global", {
                          adminId,
                          adminPassword,
                          departments: updated,
                          designations,
                          leaveTypes,
                          taskTypes
                        });
                      }
                      setNewDept("");
                    }} className="px-3 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg uppercase cursor-pointer">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {departments.map((d, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-250 font-medium inline-block">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Designations */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 col-span-1">
                  <h3 className="font-display font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-indigo-600" /> Designations Range
                  </h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="New desig..." value={newDesig} onChange={e => setNewDesig(e.target.value)} className="text-xs px-3 py-2 border rounded-lg flex-1 focus:outline-none" />
                    <button onClick={() => {
                      if (!newDesig.trim()) return;
                      const updated = [...designations, newDesig.trim()];
                      setDesignations(updated);
                      if (cloudSyncActive) {
                        firestoreSetDoc("settings", "global", {
                          adminId,
                          adminPassword,
                          departments,
                          designations: updated,
                          leaveTypes,
                          taskTypes
                        });
                      }
                      setNewDesig("");
                    }} className="px-3 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg uppercase cursor-pointer">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {designations.map((d, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-250 font-medium inline-block">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === "approvals" && (
              <div className="space-y-6">
                <div className="border-b border-indigo-50 pb-4">
                  <h2 className="text-xl font-bold text-slate-800 font-display">Administrative Approvals Hub</h2>
                  <p className="text-xs text-slate-400">Review pending working punches, leave applications, Comp-off, and holiday schedules.</p>
                </div>

                {/* Attendance Submissions */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    Pending Attendance Submissions ({attendance.filter(a => a.approval === "Pending" && a.punchOutTime).length})
                  </h3>

                  {attendance.filter(a => a.approval === "Pending" && a.punchOutTime).length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center">No pending attendance logs require attention.</p>
                  ) : (
                    <div className="space-y-3">
                      {attendance
                        .filter(a => a.approval === "Pending" && a.punchOutTime)
                        .map((a) => (
                          <div key={a.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">{a.empName}</span>
                                <span className="font-mono text-xs text-indigo-600 font-semibold">{a.taskId}</span>
                              </div>
                              <p className="text-xs text-slate-500 font-serif leading-relaxed">
                                Date Scope: <b>{a.date} {a.punchOutDate ? `to ${a.punchOutDate}` : ""}</b> | Logged: <b>{a.punchInTime} to {a.punchOutTime}</b>
                              </p>
                              {a.description && <p className="text-xs text-slate-600 italic">Task details: "{a.description}"</p>}
                              {a.gpsIn && (
                                <p className="text-[10px] text-emerald-600 font-mono">
                                  📍 Punch-In address: {a.gpsIn.address || `${a.gpsIn.lat.toFixed(5)}, ${a.gpsIn.lng.toFixed(5)}`}
                                </p>
                              )}
                              {a.gpsOut && (
                                <p className="text-[10px] text-amber-655 font-mono">
                                  📍 Punch-Out address: {a.gpsOut.address || `${a.gpsOut.lat.toFixed(5)}, ${a.gpsOut.lng.toFixed(5)}`}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                              <button
                                onClick={() => handleApproveItem("attendance", a.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("attendance", a.id, true)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg uppercase cursor-pointer transition-all"
                              >
                                Reject (Resubmit)
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("attendance", a.id, false)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Leave Applications */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Pending Leaves ({leaves.filter(l => l.status === "Pending").length})
                  </h3>

                  {leaves.filter(l => l.status === "Pending").length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center">No pending leave claims requiring attention.</p>
                  ) : (
                    <div className="space-y-3">
                      {leaves
                        .filter(l => l.status === "Pending")
                        .map((l) => (
                          <div key={l.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-900">{getEmpName(l.empId)}</div>
                              <p className="text-xs text-slate-500">
                                Leave Scope: <b>{l.leaveType}</b> | Period: <b>{l.from} to {l.to}</b> ({l.days} days)
                              </p>
                              <p className="text-xs text-slate-600">Reasoning context: "{l.reason}"</p>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                              <button
                                onClick={() => handleApproveItem("leave", l.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("leave", l.id, true)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Reject (Resubmit)
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("leave", l.id, false)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Compensatory Off claims (C-Off) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    Pending Comp-Off Claims ({coffs.filter(c => c.status === "Pending").length})
                  </h3>

                  {coffs.filter(c => c.status === "Pending").length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center">No pending Comp-off claims requiring attention.</p>
                  ) : (
                    <div className="space-y-3">
                      {coffs
                        .filter(c => c.status === "Pending")
                        .map((c) => (
                          <div key={c.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-900">{getEmpName(c.empId)}</div>
                              <p className="text-xs text-slate-500">
                                Requested C-Off Date: <b>{c.date}</b>
                              </p>
                              <p className="text-xs text-slate-600">Work Reason / Claim Grounds: "{c.reason}"</p>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                              <button
                                onClick={() => handleApproveItem("coff", c.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("coff", c.id, true)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Reject (Resubmit)
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("coff", c.id, false)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Special Duty Allowance Authorizations */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    Pending Special Duty Authorizations ({specialDuties.filter(s => s.status === "Pending").length})
                  </h3>

                  {specialDuties.filter(s => s.status === "Pending").length === 0 ? (
                    <p className="text-slate-400 text-xs py-8 text-center">No pending Special Duty authorizations requiring attention.</p>
                  ) : (
                    <div className="space-y-3">
                      {specialDuties
                        .filter(s => s.status === "Pending")
                        .map((s) => (
                          <div key={s.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-900">{getEmpName(s.empId)}</div>
                              <p className="text-xs text-slate-500">
                                Target Date: <b>{s.date}</b> {s.description && <span>| Nature of work: <b>{s.description}</b></span>}
                              </p>
                              <p className="text-xs text-slate-600">Requirement justification: "{s.reason}"</p>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                              <button
                                onClick={() => handleApproveItem("sd", s.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("sd", s.id, true)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Reject (Resubmit)
                              </button>
                              <button
                                onClick={() => handleAuditRejectTrigger("sd", s.id, false)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === "holidays" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-base text-slate-800 border-b border-indigo-50 pb-2">Modify General Holiday Calendar</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Holiday Date *</label>
                      <input type="date" value={newHolDate} onChange={e => setNewHolDate(e.target.value)} className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none bg-white font-mono" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Holiday Name *</label>
                      <input type="text" placeholder="e.g. Diwali celebration..." value={newHolName} onChange={e => setNewHolName(e.target.value)} className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none bg-white font-sans" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Holiday Classification *</label>
                      <select value={newHolType} onChange={e => setNewHolType(e.target.value as any)} className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none bg-white">
                        <option value="National">National</option>
                        <option value="State">State</option>
                        <option value="Optional">Optional</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        if (!newHolDate || !newHolName.trim()) {
                          alert("Select holiday date and name.");
                          return;
                        }
                        const nHol: Holiday = {
                          id: `hol-${Date.now()}`,
                          date: newHolDate,
                          name: newHolName.trim(),
                          type: newHolType
                        };
                        setHolidays(prev => [...prev, nHol]);
                        if (cloudSyncActive) {
                          firestoreSetDoc("holidays", nHol.id, nHol);
                        }
                        setNewHolDate("");
                        setNewHolName("");
                        setNewHolType("National");
                        alert("Holiday added successfully! ✅");
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer"
                    >
                      Commit Holiday Details
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-base text-slate-800 border-b border-indigo-50 pb-2">Calendar holidays ({holidays.length})</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {holidays.map(h => (
                      <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{h.name}</div>
                          <div className="text-[10px] text-indigo-600 font-mono mt-0.5">{h.date} | Class: {h.type}</div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Remove holiday ${h.name}?`)) {
                              setHolidays(prev => prev.filter(x => x.id !== h.id));
                              if (cloudSyncActive) {
                                firestoreDeleteDoc("holidays", h.id);
                              }
                            }
                          }}
                          className="p-1 px-2.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-300 rounded font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === "reports" && (
              <AdminReports
                employees={employees}
                attendance={attendance}
                leaves={leaves}
                coffs={coffs}
                specialDuties={specialDuties}
                holidays={holidays}
              />
            )}

            {adminTab === "tests" && <TestCenter />}

            {adminTab === "documentation" && <DocsDashboard />}

            {adminTab === "database" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 font-display">
                    <Database className="w-5 h-5 text-indigo-600" />
                    Corporate Storage Parameters
                  </h3>

                  {/* Active Database Engine Switcher */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      Active Sync Engine
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 border border-slate-200 rounded-lg">
                      <button
                        onClick={() => {
                          setDbMode("supabase");
                          localStorage.setItem("attendx_db_mode", "supabase");
                        }}
                        className={`py-2 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border-none text-center ${
                          dbMode === "supabase"
                            ? "bg-indigo-600 text-white shadow"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        ⚡ Supabase Cloud
                      </button>
                      <button
                        onClick={() => {
                          setDbMode("firebase");
                          localStorage.setItem("attendx_db_mode", "firebase");
                        }}
                        className={`py-2 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border-none text-center ${
                          dbMode === "firebase"
                            ? "bg-indigo-600 text-white shadow"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        🔥 Firebase Sync
                      </button>
                      <button
                        onClick={() => {
                          setDbMode("local");
                          localStorage.setItem("attendx_db_mode", "local");
                        }}
                        className={`py-2 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border-none text-center ${
                          dbMode === "local"
                            ? "bg-indigo-600 text-white shadow"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        🔌 Local Cache
                      </button>
                    </div>
                  </div>

                  {/* System Status Indicators based on dbMode */}
                  {dbMode === "supabase" && (
                    <div className="space-y-3">
                      {sbTableExists === true ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold font-sans">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
                          <span>SUPABASE CLOUD SYNC ACTIVE & WORKING</span>
                        </div>
                      ) : sbTableExists === false ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-1.5 text-xs text-amber-800 font-sans leading-normal">
                          <div className="flex items-center gap-2.5 font-bold">
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0"></span>
                            <span>SUPABASE CONNECTED (Sync Table Missing)</span>
                          </div>
                          <span className="text-[11px] text-slate-600">
                            The database exists but the sync table <code className="bg-white border text-amber-900 font-mono font-bold px-1 rounded">attendx_sync</code> has not been detected. Please copy and run the SQL code from the guide tab on the right side of your screen to authorize records sync!
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-xs text-indigo-700 font-medium font-sans animate-pulse">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0"></span>
                          <span>Verifying Active Supabase DB Connection...</span>
                        </div>
                      )}

                      <div className="bg-slate-50 border rounded-xl p-3 space-y-2 text-xs text-slate-700">
                        <span className="font-bold text-slate-800 block">Current Supabase Integration parameters:</span>
                        <div className="font-mono text-[10px] space-y-1">
                          <div className="truncate"><b className="text-slate-500">URL:</b> {SUPABASE_URL}</div>
                          <div><b className="text-slate-500">BUCKET:</b> {STORAGE_BUCKET_NAME}</div>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          setSbCheckingTable(true);
                          try {
                            const exists = await checkSupabaseTableExists();
                            setSbTableExists(exists);
                            if (exists) {
                              alert("Database Sync Validated! connected to Supabase successfully and 'attendx_sync' table is active. ✅");
                            } else {
                              alert("Supabase connected! But the table 'attendx_sync' was not found. Please paste and execute Step 1 SQL in your Supabase SQL Editor. ⚠️");
                            }
                          } catch (err: any) {
                            alert("Failed to connect to Supabase: " + (err?.message || err));
                          } finally {
                            setSbCheckingTable(false);
                          }
                        }}
                        disabled={sbCheckingTable}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all"
                      >
                        {sbCheckingTable ? "Diagnosing Supabase Connection..." : "Verify Supabase Connection ↗"}
                      </button>
                    </div>
                  )}

                  {dbMode === "firebase" && (
                    <div className="space-y-4">
                      {fbConfigured ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold font-sans">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
                          <span>☁️ CLOUD FIRESTORE SYNC ACTIVE</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 font-medium font-sans">
                          <span className="w-2.5 h-2.5 bg-amber-400 rounded-full flex-shrink-0"></span>
                          <span>💡 Offline Sandbox Mode (Local Cache Only)</span>
                        </div>
                      )}

                      <form onSubmit={handleConfigureFirebase} className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Firebase API KEY</label>
                          <input type="text" value={fbApiKey} onChange={e => setFbApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none" />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Firebase PROJECT ID</label>
                          <input type="text" value={fbProjId} onChange={e => setFbProjId(e.target.value)} placeholder="project-id" className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none" />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Firebase App ID</label>
                          <input type="text" value={fbAppId} onChange={e => setFbAppId(e.target.value)} placeholder="1:34..." className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none" />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Firebase Rtdb Database URL (opt.)</label>
                          <input type="text" value={fbDbUrl} onChange={e => setFbDbUrl(e.target.value)} placeholder="https://..." className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none" />
                        </div>

                        <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-lg">
                          Sync Firebase connection parameters
                        </button>
                      </form>
                    </div>
                  )}

                  {dbMode === "local" && (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs text-indigo-950 font-sans leading-relaxed">
                      <span className="font-bold text-indigo-900 block font-display text-sm">🔋 Pure Offline Sandbox Active</span>
                      <p>
                        In Local Cache Mode, all operations (Employee checkins, shifts roster, leaves, master data adjustments) are immediately safely committed to your browser's persistent key-value localStorage.
                      </p>
                      <p className="font-semibold block text-indigo-800">
                        ⚠️ Note: Local Offline variables remain sandboxed inside this browser and are not shared or synchronized across employee devices. Select Supabase to allow global sync.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                  {/* Selector tabs */}
                  <div className="flex border-b border-slate-100 pb-1.5 gap-2">
                    <button
                      onClick={() => setGuideTab("supabase-db")}
                      className={`px-3 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border-none ${
                        guideTab === "supabase-db"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      ⚡ Supabase DB (Records)
                    </button>
                    <button
                      onClick={() => setGuideTab("supabase-storage")}
                      className={`px-3 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border-none ${
                        guideTab === "supabase-storage"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      📁 Supabase Storage (Files)
                    </button>
                    <button
                      onClick={() => setGuideTab("firebase")}
                      className={`px-3 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer border-none ${
                        guideTab === "firebase"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      🔥 Firebase Guide
                    </button>
                  </div>

                  {guideTab === "supabase-db" && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 font-display">
                        <Database className="w-5 h-5 text-indigo-600 animate-pulse" />
                        Supabase database setup Guide (Records Sync)
                      </h3>

                      <div className="mt-3.5 bg-indigo-50/60 border border-indigo-150 rounded-xl p-3.5 text-xs text-indigo-950 font-sans leading-relaxed space-y-3">
                        <div className="bg-indigo-600 text-white rounded-lg p-3 text-xs leading-normal">
                          <span className="font-extrabold block mb-0.5">🚀 All-in-One Supabase Storage Enabled!</span>
                          You can now record both details AND upload documents strictly inside Supabase, removing the need for Firebase entirely!
                        </div>

                        <div>
                          <span className="font-bold block text-indigo-800">1. Open the SQL Editor in Supabase:</span>
                          <span className="block text-slate-600 text-[11px] mt-0.5">
                            Go to your <a href={SUPABASE_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">Supabase Console Dashboard ↗</a>, choose the <b>SQL Editor</b> option on the left, and run this query block to declare your records storage:
                          </span>
                          <pre className="mt-2 p-2 bg-slate-900 text-slate-100 text-[9px] font-mono rounded overflow-x-auto select-all leading-normal">
{`--- Create the document sync table for records
CREATE TABLE IF NOT EXISTS public.attendx_sync (
  collection_name TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (collection_name, doc_id)
);

--- Enable Row Level Security (RLS)
ALTER TABLE public.attendx_sync ENABLE ROW LEVEL SECURITY;

--- Enable public access policies for simple, fast testing
CREATE POLICY "Allow public read"
ON public.attendx_sync FOR SELECT
USING (true);

CREATE POLICY "Allow public insert"
ON public.attendx_sync FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update"
ON public.attendx_sync FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete"
ON public.attendx_sync FOR DELETE
USING (true);`}
                          </pre>
                        </div>
                        <div className="border-t border-indigo-150 pt-2 text-[10px] text-slate-600">
                          🌟 Once created, click <b>"Verify Supabase Connection"</b> in the left panel to verify your active link status!
                        </div>
                      </div>
                    </div>
                  )}

                  {guideTab === "supabase-storage" && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 font-display">
                        <Database className="w-5 h-5 text-indigo-600" />
                        Supabase Storage Integration Guide
                      </h3>
                      <div className="mt-3.5 bg-indigo-50/60 border border-indigo-150 rounded-xl p-3.5 text-xs text-indigo-950 font-sans leading-relaxed space-y-3">
                        <div className="bg-indigo-600 text-white rounded-lg p-3 text-xs leading-normal">
                          <span className="font-extrabold block mb-0.5">📁 Aadhaar & PAN Files Directory Loaded</span>
                          The app is pre-configured to upload Aadhaar and PAN documents to your bucket <span className="font-mono bg-indigo-800 px-1 rounded">Attendance-files</span> on Supabase.
                        </div>

                        <div>
                          <span className="font-bold block text-indigo-800 font-display">Step 1: Create the Storage Bucket</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Open your Supabase console at <a href={SUPABASE_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">Supabase Project Dashboard ↗</a>, go to the <b>Storage</b> option on the left side, click <b>New bucket</b>, and name it exactly:
                          </p>
                          <code className="block mt-1 p-1.5 bg-white border rounded font-mono text-[10px] font-bold text-center text-indigo-800">
                            {STORAGE_BUCKET_NAME}
                          </code>
                          <p className="text-slate-600 text-[11px] mt-1.5 font-sans font-medium">
                            🚨 <b>Crucial:</b> Toggle the <b className="text-indigo-800">"Public bucket"</b> switch to <b>ON</b>.
                          </p>
                        </div>

                        <div className="border-t border-indigo-150 pt-2.5">
                          <span className="font-bold block text-indigo-800 font-display">Step 2: Assign Access Policies</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            To allow uploads and downloads, you must declare access policies. Click on <b>Storage &gt; Policies</b>, select your bucket, and click <b>New Policy</b>. Use the <b>SQL Editor</b> inside Supabase to run this code block to open permissions:
                          </p>
                          <pre className="mt-2 p-2 bg-slate-900 text-slate-100 text-[9px] font-mono rounded overflow-x-auto select-all leading-normal">
{`--- 1. Allow everyone to view public objects inside bucket
CREATE POLICY "Public Retrieve objects"
ON storage.objects FOR SELECT
USING (bucket_id = '${STORAGE_BUCKET_NAME}');

--- 2. Allow public inserts for uploading docs
CREATE POLICY "Public Insert objects"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = '${STORAGE_BUCKET_NAME}');`}
                          </pre>
                        </div>

                        <div className="border-t border-indigo-150 pt-2.5 text-[10px] bg-white p-2 border rounded-lg text-slate-600 space-y-1">
                          <span className="font-bold block text-slate-800">Supabase Endpoints Configured:</span>
                          <div>• URL: <span className="font-mono bg-slate-100 text-slate-700 px-1 rounded">{SUPABASE_URL}</span></div>
                          <div>• Bucket Name: <span className="font-mono bg-slate-100 text-slate-700 px-1 rounded">{STORAGE_BUCKET_NAME}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {guideTab === "firebase" && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 font-display">
                        <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
                        Firebase Cloud Integration Guide
                      </h3>
                      <div className="mt-3.5 bg-indigo-50/60 border border-indigo-150 rounded-xl p-3.5 text-xs text-indigo-950 font-sans leading-relaxed space-y-2.5">
                        <div className="bg-amber-100/80 border border-amber-300 text-amber-900 rounded-lg p-2.5 mb-2 font-semibold font-sans leading-normal">
                          ⚠️ IMPORTANT: Avoid "Realtime Database". Go to "Firestore Database" (Orange icon) instead!
                        </div>
                        <div>
                          <span className="font-bold block text-indigo-8002">1. Cloud Firestore vs Realtime DB:</span>
                          This system synchronizes using <b className="text-indigo-950 font-bold">Cloud Firestore</b>. Under no circumstances paste these rules in the "Realtime Database" tab. Click the <b className="text-indigo-700 font-bold uppercase font-mono">Firestore Database</b> menu item on the left, click its <b className="font-bold">Rules</b> tab, and paste there.
                        </div>
                        <div className="border-t border-indigo-150 pt-2">
                          <span className="font-bold block text-indigo-800">2. Define Firestore Rules:</span>
                          Go to your <b className="text-indigo-950">Firebase console &gt; Firestore Database (not Realtime Database!) &gt; Rules</b> and publish this block to permit reads and writes:
                          <pre className="mt-1.5 p-2 bg-slate-900 text-slate-100 text-[10px] font-mono rounded overflow-x-auto select-all leading-normal">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                          </pre>
                        </div>
                        <div className="border-t border-indigo-150 pt-2">
                          <span className="font-bold block text-indigo-800">3. Activate Permanent Multi-Browser Sync:</span>
                          To secure connections across all employee browsers and phone devices instantly: copy your credentials directly into the project's source file <code className="bg-white border border-indigo-200 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">src/firebase-config.ts</code>!
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 font-sans">
                    <h3 className="text-xs font-bold text-rose-500 flex items-center gap-2 pb-2 font-display">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      Reset system caches
                    </h3>

                    <div className="space-y-3 mt-1">
                      <p className="text-[11px] text-slate-500 leading-normal font-sans">
                        Wipe local storage configurations, keys, and session parameters.
                      </p>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleWipePunchesOnly}
                          className="py-2.5 bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-700 font-semibold text-xs uppercase rounded-lg cursor-pointer border-none"
                        >
                          Reset Operations punches only
                        </button>
                        <button
                          onClick={handleWipeDatabase}
                          className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase rounded-lg cursor-pointer border-none animate"
                        >
                          Wipe entire database properties
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* WORKFORCE SELF SERVICE PORTAL (EMPLOYEE MODE) */
          <EmployeeDashboard
            user={user}
            attendance={attendance}
            leaves={leaves}
            coffs={coffs}
            specialDuties={specialDuties}
            holidays={holidays}
            taskTypes={taskTypes}
            leaveTypes={leaveTypes}
            onSubmitAttendance={handleEmployeeSubmitAttendance}
            onSubmitLeave={handleEmployeeSubmitLeave}
            onSubmitCoff={handleEmployeeSubmitCoff}
            onSubmitSpecialDuty={handleEmployeeSubmitSD}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </main>

      {/* Floating Audit Rejection Reason Dialog Modal */}
      {activeRejectTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-250 rounded-2xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <h3 className="font-display font-semibold text-slate-800 text-sm border-b pb-2">Specify Rejection Context</h3>
            <div>
              <p className="text-xs text-slate-500 leading-normal mb-3 font-sans">
                Type in the contextual description explaining the grounds for rejection. Employees see this in real-time.
              </p>
              <textarea
                value={rejectReasonPrompt}
                onChange={e => setRejectReasonPrompt(e.target.value)}
                rows={3}
                placeholder="Ex. Missing descriptive task, incorrect geolocation duration, etc..."
                className="w-full text-xs border border-slate-250 rounded-lg p-2.5 bg-white focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResolveRejection}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-lg"
              >
                Disburse Rejection State
              </button>
              <button
                onClick={() => setActiveRejectTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="h-12 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest no-print">
        <div className="flex items-center space-x-4">
          <span>Region: global-sandbox (Firebase)</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Cloud Run Instance: Stable</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Last Sync: Real-time</span>
          <span className="hidden sm:inline">|</span>
          <span className="text-indigo-400 font-bold">Configuration Optimized</span>
        </div>
      </footer>
    </div>
  );
}
