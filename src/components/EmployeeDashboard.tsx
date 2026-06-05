import React, { useState, useEffect, useMemo } from "react";
import { 
  Clock, MapPin, CheckCircle, AlertTriangle, Calendar, Clipboard, 
  RefreshCw, Award, LogOut, FileText, Compass, ChevronLeft, ChevronRight,
  Trash2, Edit, Printer, Download
} from "lucide-react";
import { Employee, Attendance, Leave, Coff, SpecialDuty, Holiday } from "../types";

interface EmployeeDashboardProps {
  user: Employee;
  hasRole?: any;
  attendance: Attendance[];
  leaves: Leave[];
  coffs: Coff[];
  specialDuties: SpecialDuty[];
  holidays: Holiday[];
  taskTypes: string[];
  leaveTypes: string[];
  onSubmitAttendance: (rec: any) => void;
  onSubmitLeave: (rec: any) => void;
  onSubmitCoff: (rec: any) => void;
  onSubmitSpecialDuty: (rec: any) => void;
  onDeleteRecord: (type: "attendance" | "leave" | "coff" | "sd", id: string) => void;
}

export function EmployeeDashboard({
  user,
  attendance,
  leaves,
  coffs,
  specialDuties,
  holidays,
  taskTypes,
  leaveTypes,
  onSubmitAttendance,
  onSubmitLeave,
  onSubmitCoff,
  onSubmitSpecialDuty,
  onDeleteRecord
}: EmployeeDashboardProps) {
  // Navigation tabs of Employee Console
  const [activeTab, setActiveTab] = useState("punch"); // punch, leaves, coff, spduty, history

  // Today live clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Selected date on internal calendar widget
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [calNav, setCalNav] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  });

  // Personal ledger calendar query states
  const [ledgerYear, setLedgerYear] = useState(() => new Date().getFullYear());
  const [ledgerMonth, setLedgerMonth] = useState(() => new Date().getMonth()); // 0-based index
  const [ledgerFilterType, setLedgerFilterType] = useState("all");

  const allowedLedgerMonths = useMemo(() => {
    const list = [];
    const date = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      });
    }
    return list;
  }, []);

  const ledgerStats = useMemo(() => {
    const daysInMonth = new Date(ledgerYear, ledgerMonth + 1, 0).getDate();
    let presentCount = 0;
    let leaveCount = 0;
    let coffCount = 0;
    let sdCount = 0;
    let holidayCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${ledgerYear}-${String(ledgerMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      const attRec = attendance.find(a => a.empId === user.id && a.date === dStr && a.approval === "Approved");
      if (attRec) presentCount++;

      const leaveRec = leaves.find(l => l.empId === user.id && dStr >= l.from && dStr <= l.to && l.status === "Approved");
      if (leaveRec) leaveCount++;

      const coffRec = coffs.find(c => c.empId === user.id && c.date === dStr && c.status === "Approved");
      if (coffRec) coffCount++;

      const sdRec = specialDuties.find(s => s.empId === user.id && s.date === dStr && s.status === "Approved");
      if (sdRec) sdCount++;

      const holRec = holidays.find(h => h.date === dStr);
      if (holRec) holidayCount++;
    }

    return { presentCount, leaveCount, coffCount, sdCount, holidayCount };
  }, [ledgerYear, ledgerMonth, attendance, leaves, coffs, specialDuties, holidays, user.id]);

  const ledgerDays = useMemo(() => {
    const daysInMonth = new Date(ledgerYear, ledgerMonth + 1, 0).getDate();
    const result: any[] = [];
    
    // Simple helper parser inside memo
    const parseTimeHM = (timeStr: string | null | undefined) => {
      if (!timeStr) return null;
      const cleanStr = timeStr.trim().toLowerCase();
      const isPM = cleanStr.includes("pm");
      const isAM = cleanStr.includes("am");
      const digitString = cleanStr.replace(/[ap]m/g, "").trim();
      const parts = digitString.split(":");
      if (parts.length < 2) return null;
      let hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      if (isPM && hours < 12) hours += 12;
      else if (isAM && hours === 12) hours = 0;
      return { h: hours, m: minutes };
    };

    const getDurationText = (att: any) => {
      if (!att.punchInTime) return "—";
      if (!att.punchOutTime) return "(Active Shift)";
      
      const parsedIn = parseTimeHM(att.punchInTime24) || parseTimeHM(att.punchInTime);
      const parsedOut = parseTimeHM(att.punchOutTime24) || parseTimeHM(att.punchOutTime);
      if (!parsedIn || !parsedOut) return "";

      const inDate = new Date(`${att.date}T${String(parsedIn.h).padStart(2, "0")}:${String(parsedIn.m).padStart(2, "0")}:00`);
      const endDateStr = att.punchOutDate || att.date;
      const outDate = new Date(`${endDateStr}T${String(parsedOut.h).padStart(2, "0")}:${String(parsedOut.m).padStart(2, "0")}:00`);

      let diffMs = outDate.getTime() - inDate.getTime();
      if (diffMs < 0 && !att.punchOutDate) {
        const nextDayDate = new Date(inDate);
        nextDayDate.setDate(nextDayDate.getDate() + 1);
        const adjustedOutDate = new Date(`${nextDayDate.toISOString().split("T")[0]}T${String(parsedOut.h).padStart(2, "0")}:${String(parsedOut.m).padStart(2, "0")}:00`);
        diffMs = adjustedOutDate.getTime() - inDate.getTime();
      }

      const totalMin = Math.round(diffMs / 60000);
      if (totalMin < 0 || isNaN(totalMin)) return "0 mins";
      const hrs = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      let text = "";
      if (hrs > 0) text += `${hrs} hr${hrs > 1 ? "s" : ""} `;
      if (mins > 0 || hrs === 0) text += `${mins} min${mins > 1 ? "s" : ""}`;
      return `(${text.trim()})`;
    };

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${ledgerYear}-${String(ledgerMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dDate = new Date(ledgerYear, ledgerMonth, d);
      const dayName = dDate.toLocaleDateString("en-IN", { weekday: "short" });

      const attRec = attendance.find(a => a.empId === user.id && a.date === dStr);
      const leaveRec = leaves.find(l => l.empId === user.id && dStr >= l.from && dStr <= l.to);
      const coffRec = coffs.find(c => c.empId === user.id && c.date === dStr);
      const sdRec = specialDuties.find(s => s.empId === user.id && s.date === dStr);
      const holRec = holidays.find(h => h.date === dStr);
      const isSunday = dDate.getDay() === 0;

      let matched = false;
      if (ledgerFilterType === "all") {
        matched = true;
      } else if (ledgerFilterType === "attendance" && attRec) {
        matched = true;
      } else if (ledgerFilterType === "leave" && leaveRec) {
        matched = true;
      } else if (ledgerFilterType === "coff" && coffRec) {
        matched = true;
      } else if (ledgerFilterType === "spduty" && sdRec) {
        matched = true;
      } else if (ledgerFilterType === "holiday" && (holRec || isSunday)) {
        matched = true;
      }

      if (matched) {
        result.push({
          dateStr: dStr,
          dayNum: d,
          dayName,
          attendance: attRec,
          attendanceDuration: attRec ? getDurationText(attRec) : "",
          leave: leaveRec,
          coff: coffRec,
          specialDuty: sdRec,
          holiday: holRec,
          isSunday
        });
      }
    }
    // Sort descending by day number
    return result.sort((a, b) => b.dayNum - a.dayNum);
  }, [ledgerYear, ledgerMonth, ledgerFilterType, attendance, leaves, coffs, specialDuties, holidays, user.id]);

  // Punch operational state
  const [taskType, setTaskType] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [endNotes, setEndNotes] = useState("");
  const [punchInTime, setPunchInTime] = useState<string | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<string | null>(null);
  const [gpsIn, setGpsIn] = useState<any>(null);
  const [gpsOut, setGpsOut] = useState<any>(null);
  const [punchedIn, setPunchedIn] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [gettingGPS, setGettingGPS] = useState(false);
  const [crossMidnight, setCrossMidnight] = useState(false);

  // Request Forms variables
  const [lvType, setLvType] = useState("");
  const [lvFrom, setLvFrom] = useState("");
  const [lvTo, setLvTo] = useState("");
  const [lvReason, setLvReason] = useState("");

  const [coffDate, setCoffDate] = useState("");
  const [coffReason, setCoffReason] = useState("");

  const [sdDate, setSdDate] = useState("");
  const [sdReason, setSdReason] = useState("");
  const [sdDesc, setSdDesc] = useState("");

  // Editing and dynamic re-submission states
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [editingCoffId, setEditingCoffId] = useState<string | null>(null);
  const [editingSdId, setEditingSdId] = useState<string | null>(null);

  // Reset local punch form states
  const resetPunchState = () => {
    setTaskType("");
    setTaskDesc("");
    setEndNotes("");
    setPunchInTime(null);
    setPunchOutTime(null);
    setGpsIn(null);
    setGpsOut(null);
    setPunchedIn(false);
    setTaskId("");
  };

  // Synchronize internal punch states from the global database based on selected date
  useEffect(() => {
    // Look for an unfinished record (punch-in without punch-out) for this user on the selected date
    const unfinished = attendance.find(
      a => a.empId === user.id && a.date === selectedDate && !a.punchOutTime
    );

    if (unfinished) {
      setTaskType(unfinished.taskType || "");
      setTaskDesc(unfinished.description || "");
      setPunchInTime(unfinished.punchInTime || null);
      setGpsIn(unfinished.gpsIn || null);
      setTaskId(unfinished.taskId || "");
      setPunchedIn(true);
      
      setPunchOutTime(unfinished.punchOutTime || null);
      setGpsOut(unfinished.gpsOut || null);
      setEndNotes(unfinished.endNotes || "");
      setCrossMidnight(!!unfinished.punchOutDate && unfinished.punchOutDate !== unfinished.date);
    } else {
      // Check if there is a completed record for this date
      const completed = attendance.find(
        a => a.empId === user.id && a.date === selectedDate && a.punchInTime && a.punchOutTime
      );
      if (completed) {
        setTaskType(completed.taskType || "");
        setTaskDesc(completed.description || "");
        setPunchInTime(completed.punchInTime || null);
        setPunchOutTime(completed.punchOutTime || null);
        setGpsIn(completed.gpsIn || null);
        setGpsOut(completed.gpsOut || null);
        setTaskId(completed.taskId || "");
        setEndNotes(completed.endNotes || "");
        setPunchedIn(false);
        setCrossMidnight(!!completed.punchOutDate && completed.punchOutDate !== completed.date);
      } else {
        // If no record exists, reset state to empty
        resetPunchState();
      }
    }
  }, [selectedDate, attendance, user.id]);

  // Helpers
  const formatTime12 = (date: Date) => {
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  };

  const getDayStatus = (dStr: string) => {
    // 0. Check approved leaves
    const approvedLeave = leaves?.find(l => 
      l.empId === user.id && 
      l.status === "Approved" && 
      dStr >= l.from && 
      dStr <= l.to
    );
    if (approvedLeave) {
      return { type: "Leave", label: `Leave (${approvedLeave.leaveType})`, color: "bg-rose-100 border-rose-300 text-rose-700", completed: true };
    }

    // 1. Check approved C-Off
    const approvedCoff = coffs?.find(c => c.empId === user.id && c.date === dStr && c.status === "Approved");
    if (approvedCoff) {
      return { type: "C-Off", label: "Compensatory Off Granted", color: "bg-sky-100 border-sky-300 text-sky-800", completed: true };
    }

    // 2. Check approved Special Duty
    const approvedSD = specialDuties?.find(s => s.empId === user.id && s.date === dStr && s.status === "Approved");
    if (approvedSD) {
      return { type: "Special Duty", label: "Special Duty Granted", color: "bg-amber-100 border-amber-300 text-amber-800", completed: true };
    }

    // 3. Check submitted attendance
    const hasAtt = attendance.find(a => a.empId === user.id && a.date === dStr && a.approval !== "Rejected" && a.approval !== "Rejected-Resubmit");
    if (hasAtt) {
      return { 
        type: hasAtt.status, 
        label: `${hasAtt.status} (${hasAtt.approval})`, 
        color: hasAtt.status === "Present" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-blue-100 border-blue-300 text-blue-800",
        completed: true
      };
    }

    // 4. Check holidays
    const isHoliday = holidays.find(h => h.date === dStr);
    if (isHoliday) return { type: "Holiday", label: `Holiday: ${isHoliday.name}`, color: "bg-purple-150 border-purple-300 text-purple-700", completed: false };

    // 5. Check sundays
    const isSun = new Date(dStr + "T00:00:00").getDay() === 0;
    if (isSun) return { type: "Weekly Off", label: "Sunday Weekly Off", color: "bg-rose-100 border-rose-300 text-rose-700", completed: false };

    return null;
  };

  const activeOtherDateShift = attendance.find(
    a => a.empId === user.id && !a.punchOutTime && a.date !== selectedDate
  );

  // Reverse geocoding fetch call with osm api parameters
  const getAddress = async (lat: number, lng: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
        headers: { "Accept-Language": "en" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Automated Sequential GPS triggers
  const triggerPunchIn = () => {
    const isApprovedLeave = leaves?.some(l => 
      l.empId === user.id && 
      l.status === "Approved" && 
      selectedDate >= l.from && 
      selectedDate <= l.to
    );
    if (isApprovedLeave) {
      alert(`Access Denied: You have an APPROVED LEAVE on ${selectedDate}. You are not allowed to punch in.`);
      return;
    }

    if (!taskType) {
      alert("Please select an active Task Type.");
      return;
    }
    if (!taskDesc.trim()) {
      alert("Please specify a baseline Task Description.");
      return;
    }

    setGettingGPS(true);

    // Create unique sequential workflow task credentials
    const cleanDate = selectedDate.replace(/-/g, "");
    const dailyCount = attendance.filter(a => a.empId === user.id && a.date === selectedDate).length;
    const generatedTaskId = `TSK-${cleanDate}-${String(dailyCount + 1).padStart(3, "0")}`;

    const executePunchIn = (gpsObj: any) => {
      const now = new Date();
      const inTime = formatTime12(now);
      const inTime24 = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
      
      // Look for a rejected/exist record to overwrite, or a new submission
      const existing = attendance.find(a => a.empId === user.id && a.date === selectedDate);
      const record = {
        id: existing?.id || `att-${Date.now()}`,
        empId: user.id,
        empName: `${user.firstName} ${user.lastName}`,
        date: selectedDate,
        status: "Present",
        punchInTime: inTime,
        punchInTime24: inTime24,
        punchOutTime: null,
        punchOutTime24: null,
        taskId: existing?.taskId || generatedTaskId,
        taskType,
        description: taskDesc,
        endNotes: "",
        approval: "Pending",
        gpsIn: gpsObj,
        gpsOut: null
      };
      
      onSubmitAttendance(record);
      setGpsIn(gpsObj);
      setPunchInTime(inTime);
      setTaskId(record.taskId);
      setPunchedIn(true);
      setGettingGPS(false);
    };

    if (!navigator.geolocation) {
      const gpsObj = { lat: 13.0827, lng: 80.2707, address: "GPS not supported on current framework", accuracy: 0 };
      executePunchIn(gpsObj);
      return;
    }

    let resolved = false;
    const fallbackTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const gpsObj = { lat: 13.0827, lng: 80.2707, address: "GPS Timeout - Coordinates Unavailable", accuracy: 0 };
        executePunchIn(gpsObj);
      }
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimeout);
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const address = await getAddress(latitude, longitude);
          const gpsObj = { lat: latitude, lng: longitude, address, accuracy };
          executePunchIn(gpsObj);
        } catch {
          const gpsObj = { lat: latitude, lng: longitude, address: "Address lookup failed", accuracy };
          executePunchIn(gpsObj);
        }
      },
      () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimeout);
        const gpsObj = { lat: 13.0827, lng: 80.2707, address: "GPS Authorization denied - Coordinates Unavailable", accuracy: 0 };
        executePunchIn(gpsObj);
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  };

  const triggerPunchOut = () => {
    setGettingGPS(true);

    const executePunchOut = (gpsObj: any) => {
      const now = new Date();
      const outTime = formatTime12(now);
      const outTime24 = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

      const activeRecord = attendance.find(a => a.empId === user.id && a.date === selectedDate && !a.punchOutTime);
      setGpsOut(gpsObj);
      setPunchOutTime(outTime);
      setGettingGPS(false);
    };

    if (!navigator.geolocation) {
      const gpsObj = { lat: 13.0827, lng: 80.2707, address: "GPS not supported", accuracy: 0 };
      executePunchOut(gpsObj);
      return;
    }

    let resolved = false;
    const fallbackTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const gpsObj = { lat: 13.0827, lng: 80.2707, address: "GPS Timeout - Coordinates Unavailable", accuracy: 0 };
        executePunchOut(gpsObj);
      }
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimeout);
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const address = await getAddress(latitude, longitude);
          const gpsObj = { lat: latitude, lng: longitude, address, accuracy };
          executePunchOut(gpsObj);
        } catch {
          const gpsObj = { lat: latitude, lng: longitude, address: "Address lookup failed", accuracy };
          executePunchOut(gpsObj);
        }
      },
      () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimeout);
        const gpsObj = { lat: 13.0827, lng: 80.2707, address: "GPS Authorization denied - Coordinates Unavailable", accuracy: 0 };
        executePunchOut(gpsObj);
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  };

  // Submit complete attendance record to App state
  const handleAttendanceSubmit = () => {
    const isSpecial = getDayStatus(selectedDate)?.type === "Holiday" || getDayStatus(selectedDate)?.type === "Weekly Off";
    const activeRecord = attendance.find(a => a.empId === user.id && a.date === selectedDate);
    
    if (activeRecord) {
      const outTime = punchOutTime || formatTime12(new Date());
      const outTime24 = activeRecord.punchOutTime24 || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
      
      const record = {
        ...activeRecord,
        punchOutTime: outTime,
        punchOutTime24: outTime24,
        punchOutDate: crossMidnight ? new Date(new Date(selectedDate + "T12:00:00").getTime() + 864e5).toISOString().split("T")[0] : selectedDate,
        status: isSpecial ? "Special Duty" : "Present",
        endNotes,
        gpsOut: gpsOut,
        approval: "Pending" // submit for final approval
      };
      
      onSubmitAttendance(record);
    }
    
    resetPunchState();
    alert("Attendance logged out and submitted successfully! ✅");
  };

  const handleResubmitRejectedAttendance = () => {
    const rejectedRecord = attendance.find(a => a.empId === user.id && a.date === selectedDate && (a.approval === "Rejected" || a.approval === "Rejected-Resubmit"));
    if (!rejectedRecord) return;

    if (!taskType) {
      alert("Please select an active Task Type.");
      return;
    }
    if (!taskDesc.trim()) {
      alert("Please specify a baseline Task Description.");
      return;
    }

    const record = {
      ...rejectedRecord,
      taskType,
      description: taskDesc,
      endNotes,
      crossMidnight,
      punchOutDate: crossMidnight ? new Date(new Date(selectedDate + "T12:00:00").getTime() + 864e5).toISOString().split("T")[0] : selectedDate,
      approval: "Pending" // Changed back to Pending for the admin to re-verify!
    };

    onSubmitAttendance(record);
    alert("Updated attendance entry successfully resubmitted to Admin! ✅");
  };

  // Submit Request Portals
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lvType || !lvFrom || !lvTo || !lvReason) {
      alert("Please fill in matching bounds credentials.");
      return;
    }
    const fromTime = new Date(lvFrom).getTime();
    const toTime = new Date(lvTo).getTime();
    const days = Math.round((toTime - fromTime) / 864e5) + 1;

    onSubmitLeave({
      id: editingLeaveId || `lv-${Date.now()}`,
      empId: user.id,
      leaveType: lvType,
      from: lvFrom,
      to: lvTo,
      days: days > 0 ? days : 1,
      reason: lvReason,
      status: "Pending"
    });

    setLvType("");
    setLvFrom("");
    setLvTo("");
    setLvReason("");
    setEditingLeaveId(null);
    alert(editingLeaveId ? "Leave request updated and resubmitted successfully! ✅" : "Leave request dispatched to administrators! ✅");
  };

  const handleCoffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coffDate || !coffReason) {
      alert("Complete C-Off chronological credentials.");
      return;
    }
    onSubmitCoff({
      id: editingCoffId || `coff-${Date.now()}`,
      empId: user.id,
      date: coffDate,
      reason: coffReason,
      status: "Pending"
    });
    setCoffDate("");
    setCoffReason("");
    setEditingCoffId(null);
    alert(editingCoffId ? "C-Off Claim updated and resubmitted successfully! ✅" : "Compensatory Off claim dispatched to administrator! ✅");
  };

  const handleSdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdDate || !sdReason) {
      alert("Specify Sunday/Holiday and context justifying Special Duty.");
      return;
    }
    onSubmitSpecialDuty({
      id: editingSdId || `sd-${Date.now()}`,
      empId: user.id,
      date: sdDate,
      reason: sdReason,
      description: sdDesc,
      status: "Pending"
    });
    setSdDate("");
    setSdReason("");
    setSdDesc("");
    setEditingSdId(null);
    alert(editingSdId ? "Special Duty request updated and resubmitted successfully! ✅" : "Special Duty request submitted! ✅");
  };

  // Render responsive customized calendar widget containing grid variables
  const renderCalendarWidget = () => {
    const daysInMonth = new Date(calNav.year, calNav.month + 1, 0).getDate();
    const startOffset = new Date(calNav.year, calNav.month, 1).getDay();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="aspect-square bg-slate-50/55"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${calNav.year}-${String(calNav.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const statusInfo = getDayStatus(dateString);
      const isSelected = selectedDate === dateString;
      const isToday = new Date().toISOString().split("T")[0] === dateString;

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => {
            setSelectedDate(dateString);
            resetPunchState();
          }}
          className={`aspect-square p-0.5 md:p-1 text-[10px] text-center relative flex flex-col justify-center items-center border-r border-b border-slate-100 transition-all cursor-pointer ${
            isSelected ? "ring-2 ring-indigo-500 z-10 font-bold shadow-sm bg-indigo-50" : 
            statusInfo?.completed ? 
              (statusInfo.type === "Present" ? "bg-emerald-100" // emerald-100
              : statusInfo.type === "Leave" ? "bg-rose-100" // rose-100
              : statusInfo.type === "Special Duty" ? "bg-amber-100" // amber-100
              : statusInfo.type === "C-Off" ? "bg-sky-100" // sky-100
              : "bg-white")
            : "bg-white hover:bg-slate-50"
          }`}
        >
          <span className={`${statusInfo?.type === "Weekly Off" || statusInfo?.type === "Holiday" ? "text-slate-500" : "text-slate-900"} ${isToday ? "font-bold text-indigo-700 text-xs" : "font-semibold"}`}>
            {day}
          </span>
        </button>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-[280px] mx-auto lg:ml-0">
        <div className="flex justify-between items-center bg-slate-50 px-2 py-1 border-b border-slate-200">
          <button
            onClick={() => {
              const prev = calNav.month === 0 ? { year: calNav.year - 1, month: 11 } : { year: calNav.year, month: calNav.month - 1 };
              setCalNav(prev);
            }}
            className="p-1 hover:bg-slate-200 rounded transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <span className="font-bold text-xs text-slate-800">
            {monthNames[calNav.month]} {calNav.year}
          </span>
          <button
            onClick={() => {
              const next = calNav.month === 11 ? { year: calNav.year + 1, month: 0 } : { year: calNav.year, month: calNav.month + 1 };
              setCalNav(next);
            }}
            className="p-1 hover:bg-slate-200 rounded transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center bg-slate-50/50 py-1 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(dayName => (
            <div key={dayName} className={dayName === "Sun" ? "text-rose-500" : ""}>
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-[10px]">{cells}</div>
      </div>
    );
  };

  const getMyAttCount = () => attendance.filter(a => a.empId === user.id && a.status === "Present" && a.approval === "Approved").length;
  const getMyLeavesCount = () => leaves.filter(l => l.empId === user.id && l.status === "Approved").length;
  const getMySDCount = () => specialDuties.filter(s => s.empId === user.id && s.status === "Approved").length;

  const rejectedRecord = attendance.find(a => 
    a.empId === user.id && 
    a.date === selectedDate && 
    (a.approval === "Rejected" || a.approval === "Rejected-Resubmit")
  );

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Employee Greeting banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md font-display">
            {user.firstName[0].toUpperCase()}
            {user.lastName[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-display">Welcome, {user.firstName}! 👋</h2>
            <p className="text-xs text-slate-500 leading-snug">Emp ID: {user.empId} | Assigned: Employee Sandbox Account</p>
          </div>
        </div>

        {/* Live Clock Display */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Time log (live)</div>
            <div className="text-sm font-mono font-bold text-slate-800">{time.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Aggregate Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="font-mono text-xl font-bold text-indigo-600">{getMyAttCount()}</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Days Present</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="font-mono text-xl font-bold text-amber-500">{getMySDCount()}</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Special Duties</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="font-mono text-xl font-bold text-emerald-500">{getMyLeavesCount()}</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Leaves Approved</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="font-mono text-xl font-bold text-indigo-500">
            {attendance.filter(a => a.empId === user.id && a.approval === "Pending" && a.punchOutTime).length}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Pending Submissions</p>
        </div>
      </div>

      {/* Sub tabs Navigation - Desktop */}
      <div className="hidden md:flex overflow-x-auto gap-2 pb-1 border-b border-slate-200">
        {[
          { k: "punch", label: "📍 Attendance Punch" },
          { k: "leaves", label: "📋 Apply Leaves" },
          { k: "coff", label: "🔄 Comp-Off Claims" },
          { k: "spduty", label: "⭐ Special Duty" },
          { k: "ledger", label: "🗒 Personal Ledger log" }
        ].map(tb => (
          <button
            key={tb.k}
            onClick={() => setActiveTab(tb.k)}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tb.k ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50/50 hover:bg-slate-100/70 border border-slate-200 text-slate-600"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Sub tabs Navigation - Mobile Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 z-50 px-2 py-1 flex items-center justify-around no-print shadow-xl">
        {[
          { k: "punch", icon: "📍", label: "Punch" },
          { k: "leaves", icon: "📋", label: "Leaves" },
          { k: "coff", icon: "🔄", label: "Comp" },
          { k: "spduty", icon: "⭐", label: "Special" },
          { k: "ledger", icon: "🗒", label: "Ledger" }
        ].map(tb => (
          <button
            key={tb.k}
            onClick={() => setActiveTab(tb.k)}
            className={`flex flex-col items-center justify-center p-2 text-[10px] uppercase font-bold transition-all ${
              activeTab === tb.k ? "text-indigo-400 font-extrabold" : "text-slate-400"
            }`}
          >
            <span className="text-xl">{tb.icon}</span>
            <span className="mt-0.5 leading-none">{tb.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "punch" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4 max-w-sm mx-auto w-full lg:max-w-none">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Selected Date Logs</h3>
            {renderCalendarWidget()}
            <div className="bg-indigo-50 p-4 border border-indigo-100 rounded-xl space-y-1">
              <div className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Date parameters selected:</div>
              <div className="text-base font-bold text-indigo-900">
                {selectedDate} <span className="text-xs text-indigo-600 font-normal">({new Date(selectedDate + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long" })})</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-indigo-600" />
                Work Details Registration
              </h3>

              {getDayStatus(selectedDate)?.type === "Leave" ? (
                <div className="bg-rose-50/15 border border-rose-300 text-rose-700 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-rose-600">Access Denied: Leave Approved</h4>
                    <p className="text-xs text-rose-500 mt-1">You have an approved leave on this calendar date. Attendance punches are locked.</p>
                  </div>
                </div>
              ) : attendance.some(a => a.empId === user.id && a.date === selectedDate && !!a.punchOutTime && a.approval !== "Rejected" && a.approval !== "Rejected-Resubmit") ? (
                (() => {
                  const submittedAtt = attendance.find(a => a.empId === user.id && a.date === selectedDate && !!a.punchOutTime && a.approval !== "Rejected" && a.approval !== "Rejected-Resubmit");
                  return submittedAtt ? (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-5 rounded-xl flex flex-col gap-3">
                      <div className="flex items-start gap-3 border-b border-emerald-200/60 pb-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold">Attendance successfully logged and committed.</p>
                          <p className="text-xs text-emerald-600 mt-1">Shift execution details have been securely recorded.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-700/70 uppercase tracking-wider text-[10px]">IN</p>
                          <p className="font-mono">{submittedAtt.punchInTime}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-700/70 uppercase tracking-wider text-[10px]">OUT</p>
                          <p className="font-mono">{submittedAtt.punchOutTime}</p>
                        </div>
                        <div className="col-span-2 space-y-1 bg-emerald-100/50 p-3 rounded-lg">
                          <p className="font-bold text-emerald-700/70 uppercase tracking-wider text-[10px]">END NOTES</p>
                          <p className="text-slate-700 italic">"{submittedAtt.endNotes || "No remarks provided"}"</p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <div className="space-y-4">
                  {rejectedRecord && (
                    <div className="bg-amber-50 border border-amber-300 text-amber-950 px-4 py-3.5 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Re-submission requested by Administrator
                      </div>
                      <p className="text-xs font-medium text-amber-700 leading-normal">
                        Admin Observation: <span className="font-semibold text-slate-800 italic">"{rejectedRecord.rejectReason || "Please review and edit details to re-submit."}"</span>
                      </p>
                      <div className="flex items-center gap-2 pt-1 no-print">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this rejected entry?")) {
                              onDeleteRecord("attendance", rejectedRecord.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] uppercase font-bold rounded shadow transition-all cursor-pointer"
                        >
                          🗑️ Delete & Start Over
                        </button>
                        <button
                          type="button"
                          onClick={handleResubmitRejectedAttendance}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold rounded shadow transition-all cursor-pointer"
                        >
                          📤 Resubmit Updated Details
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 1 Task parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Category *</label>
                      <select
                        value={taskType}
                        onChange={e => setTaskType(e.target.value)}
                        disabled={punchedIn || !!activeOtherDateShift}
                        className="w-full rounded-lg border border-slate-250 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                      >
                        <option value="">Select Category</option>
                        {taskTypes.map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hourly Description *</label>
                      <input
                        type="text"
                        value={taskDesc}
                        onChange={e => setTaskDesc(e.target.value)}
                        disabled={punchedIn || !!activeOtherDateShift}
                        placeholder="Provide details about the work..."
                        className="w-full rounded-lg border border-slate-250 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Punch Button console */}
                  <div className="bg-slate-900 text-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 shadow-md shadow-slate-900/10 mb-4 border border-slate-800">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-indigo-400 tracking-wider font-mono">PUNCH LOG OPERATION</div>
                      <div className="font-display font-semibold text-lg text-white">Punch-In &amp; Pin Coordinates</div>
                      {taskId && <div className="text-xs font-mono text-slate-400">Task Reference Key: {taskId}</div>}
                    </div>

                    <div className="flex gap-2">
                      {!punchedIn ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            onClick={triggerPunchIn}
                            disabled={gettingGPS || !taskType || !taskDesc.trim() || !!activeOtherDateShift}
                            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:opacity-80 text-white font-semibold rounded-lg text-sm transition-all focus:ring-2 focus:ring-emerald-500/20 active:scale-95 cursor-pointer flex items-center justify-center"
                          >
                            {gettingGPS ? "Acquiring GPS..." : "📍 Punch In & Capture ID"}
                          </button>
                          {activeOtherDateShift && (
                            <div className="text-[10px] text-amber-400 font-bold max-w-xs text-right mt-1">
                              ⚠️ Active shift detected on {activeOtherDateShift.date}. Please punch out there first.
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={triggerPunchOut}
                          disabled={gettingGPS || !!punchOutTime}
                          className="px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-white font-semibold rounded-lg text-sm transition-all focus:ring-2 focus:ring-amber-500/20 active:scale-95 cursor-pointer flex items-center justify-center"
                        >
                          {gettingGPS ? "Acquiring GPS..." : punchOutTime ? "Punch-Out Verified" : "⏱ Punch Out & Terminate"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Latency and GPS location displays */}
                  {gpsIn && (
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        PUNCH IN - GEOLOCATION CONFIRMED
                      </div>
                      <div className="text-xs font-mono text-slate-600">
                        Accuracy: ~{gpsIn.accuracy ? Math.round(gpsIn.accuracy) : "—"}m | Address: {gpsIn.address}
                      </div>
                    </div>
                  )}

                  {gpsOut && (
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        PUNCH OUT - GEOLOCATION CONFIRMED
                      </div>
                      <div className="text-xs font-mono text-slate-600">
                        Accuracy: ~{gpsOut.accuracy ? Math.round(gpsOut.accuracy) : "—"}m | Address: {gpsOut.address}
                      </div>
                    </div>
                  )}

                  {punchedIn && (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="crossMidnight"
                          checked={crossMidnight}
                          onChange={e => setCrossMidnight(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="crossMidnight" className="text-xs font-semibold text-slate-600 cursor-pointer">
                          Cross midnight operations? (Extend shift to next calendar day)
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End-of-day observations</label>
                        <textarea
                          placeholder="Summarize completed milestones..."
                          value={endNotes}
                          onChange={e => setEndNotes(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-250 px-3 py-2 bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {punchInTime && punchOutTime && (
                    <button
                      onClick={handleAttendanceSubmit}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-all focus:ring-2 focus:indigo-500/20 shadow-md cursor-pointer"
                    >
                      📤 Dispatch Attendance Record to Admin
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Application Tab */}
      {activeTab === "leaves" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-rose-50 pb-2">
              <h3 className="font-display font-semibold text-base text-slate-800">Apply for Leave allocation</h3>
              {editingLeaveId && (
                <button
                  type="button"
                  onClick={() => {
                    setLvType("");
                    setLvFrom("");
                    setLvTo("");
                    setLvReason("");
                    setEditingLeaveId(null);
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] uppercase font-bold rounded cursor-pointer transition-all"
                >
                  Cancel Edit ✏️
                </button>
              )}
            </div>
            {editingLeaveId && (
              <div className="bg-amber-50 border border-amber-250 p-2.5 rounded-lg text-xs text-amber-850">
                ✏️ Currently editing leave request. Shifting values will update existing record on submit.
              </div>
            )}
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Leave Type *</label>
                <select
                  value={lvType}
                  onChange={e => setLvType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Categories</option>
                  {leaveTypes.map(lv => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5 font-sans">Start Chronology</label>
                  <input
                    type="date"
                    value={lvFrom}
                    onChange={e => setLvFrom(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5 font-sans">End Chronology</label>
                  <input
                    type="date"
                    value={lvTo}
                    onChange={e => setLvTo(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Context / Justification *</label>
                <textarea
                  rows={3}
                  value={lvReason}
                  onChange={e => setLvReason(e.target.value)}
                  placeholder="Explain why you are requesting this leave..."
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs uppercase text-white rounded-lg cursor-pointer transition-all">
                Submit Leave Application
              </button>
            </form>
          </div>

          {/* Leaves History */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-display font-semibold text-base text-slate-800 border-b border-rose-50 pb-2">Leaves Archive</h3>
            {leaves.filter(l => l.empId === user.id).length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No leaves recorded in database.</p>
            ) : (
              <div className="space-y-3">
                {leaves
                  .filter(l => l.empId === user.id)
                  .map((l, idx) => (
                    <div key={idx} className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-800">{l.leaveType}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {l.from} to {l.to} ({l.days} days)
                        </div>
                        {l.reason && <div className="text-[10px] text-slate-500 font-sans italic mt-0.5">Reason: {l.reason}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                          {l.status}
                        </span>
                        {(l.status === "Pending" || l.status === "Rejected" || l.status === "Rejected-Resubmit") && (
                          <div className="flex items-center gap-1 no-print">
                            <button
                              type="button"
                              onClick={() => {
                                setLvType(l.leaveType);
                                setLvFrom(l.from);
                                setLvTo(l.to);
                                setLvReason(l.reason || "");
                                setEditingLeaveId(l.id);
                              }}
                              title="Edit Leave Request"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this leave request?")) {
                                  onDeleteRecord("leave", l.id);
                                }
                              }}
                              title="Delete Leave Request"
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* C-Off portal */}
      {activeTab === "coff" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-rose-50 pb-2">
              <h3 className="font-display font-semibold text-base text-slate-800">Claim Compensation Credit (C-Off)</h3>
              {editingCoffId && (
                <button
                  type="button"
                  onClick={() => {
                    setCoffDate("");
                    setCoffReason("");
                    setEditingCoffId(null);
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] uppercase font-bold rounded cursor-pointer transition-all"
                >
                  Cancel Edit ✏️
                </button>
              )}
            </div>
            {editingCoffId && (
              <div className="bg-amber-50 border border-amber-250 p-2.5 rounded-lg text-xs text-amber-850">
                ✏️ Currently editing C-Off claim. Shifting values will update existing record on submit.
              </div>
            )}
            <form onSubmit={handleCoffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Overtime Chronology *</label>
                <input
                  type="date"
                  value={coffDate}
                  onChange={e => setCoffDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Describe details *</label>
                <textarea
                  rows={3}
                  value={coffReason}
                  onChange={e => setCoffReason(e.target.value)}
                  placeholder="Detail working parameters performed on this off day..."
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs uppercase text-white rounded-lg cursor-pointer transition-all">
                Submit C-Off Claim
              </button>
            </form>
          </div>

          {/* Coff History */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-display font-semibold text-base text-slate-800 border-b border-rose-50 pb-2">C-Off Ledger</h3>
            {coffs.filter(c => c.empId === user.id).length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center font-sans">No Comp-Off records inside database.</p>
            ) : (
              <div className="space-y-3">
                {coffs
                  .filter(c => c.empId === user.id)
                  .map((c, idx) => (
                    <div key={idx} className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-800">{c.date}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.reason}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-sans">
                          {c.status}
                        </span>
                        {(c.status === "Pending" || c.status === "Rejected" || c.status === "Rejected-Resubmit") && (
                          <div className="flex items-center gap-1 no-print">
                            <button
                              type="button"
                              onClick={() => {
                                setCoffDate(c.date);
                                setCoffReason(c.reason || "");
                                setEditingCoffId(c.id);
                              }}
                              title="Edit C-Off Claim"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this compensatory off claim?")) {
                                  onDeleteRecord("coff", c.id);
                                }
                              }}
                              title="Delete C-Off Claim"
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Special duty triggers */}
      {activeTab === "spduty" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-rose-50 pb-2">
              <h3 className="font-display font-semibold text-base text-slate-800">Request Sunday / Holiday authorization</h3>
              {editingSdId && (
                <button
                  type="button"
                  onClick={() => {
                    setSdDate("");
                    setSdReason("");
                    setSdDesc("");
                    setEditingSdId(null);
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] uppercase font-bold rounded cursor-pointer transition-all"
                >
                  Cancel Edit ✏️
                </button>
              )}
            </div>
            {editingSdId && (
              <div className="bg-amber-50 border border-amber-250 p-2.5 rounded-lg text-xs text-amber-850">
                ✏️ Currently editing Special Duty authorization request. Shifting values will update existing record on submit.
              </div>
            )}
            <form onSubmit={handleSdSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Date Scope *</label>
                  <input
                    type="date"
                    value={sdDate}
                    onChange={e => setSdDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Nature of Work</label>
                  <input
                    type="text"
                    value={sdDesc}
                    onChange={e => setSdDesc(e.target.value)}
                    placeholder="Site visit, etc..."
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Description context *</label>
                <textarea
                  rows={3}
                  value={sdReason}
                  onChange={e => setSdReason(e.target.value)}
                  placeholder="Substantiate why Sunday or Holiday work parameters are fully critical..."
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs uppercase text-white rounded-lg cursor-pointer transition-all">
                Submit Request
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-display font-semibold text-base text-slate-800 border-b border-rose-50 pb-2">Authorization History</h3>
            {specialDuties.filter(s => s.empId === user.id).length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center font-sans">No Special Duty applications submitted.</p>
            ) : (
              <div className="space-y-3">
                {specialDuties
                  .filter(s => s.empId === user.id)
                  .map((s, idx) => (
                    <div key={idx} className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-800">{s.date}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Justify: {s.reason}</div>
                        {s.description && <div className="text-[10px] text-slate-500 font-sans italic mt-0.5">Nature: {s.description}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 border border-indigo-200 text-indigo-700 animate-pulse">
                          {s.status}
                        </span>
                        {(s.status === "Pending" || s.status === "Rejected" || s.status === "Rejected-Resubmit") && (
                          <div className="flex items-center gap-1 no-print">
                            <button
                              type="button"
                              onClick={() => {
                                setSdDate(s.date);
                                setSdReason(s.reason || "");
                                setSdDesc(s.description || "");
                                setEditingSdId(s.id);
                              }}
                              title="Edit Special Duty Request"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this special duty request?")) {
                                  onDeleteRecord("sd", s.id);
                                }
                              }}
                              title="Delete Special Duty Request"
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History log display */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* Filter Toolbar / Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-semibold text-base text-slate-800">
                  Monthly Personal Ledger Query
                </h3>
                <p className="text-xs text-slate-500">
                  Select month and application filters to generate your combined attendance, leaves, C-Offs, special duties, and holidays report.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Select Month (Restricted to Previous 3 Months)
                </label>
                <select
                  value={`${ledgerYear}-${ledgerMonth}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split("-").map(Number);
                    setLedgerYear(y);
                    setLedgerMonth(m);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none font-medium text-slate-800"
                >
                  {allowedLedgerMonths.map((opt, idx) => (
                    <option key={idx} value={`${opt.year}-${opt.month}`}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Type Filter
                </label>
                <select
                  value={ledgerFilterType}
                  onChange={(e) => setLedgerFilterType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none"
                >
                  <option value="all">All Calendar Days (Complete Month)</option>
                  <option value="attendance">Punched Attendance Only</option>
                  <option value="leave">Applied Leaves Only</option>
                  <option value="coff">C-Off Claims Only</option>
                  <option value="spduty">Special Duties Only</option>
                  <option value="holiday">Holidays & Sundays Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Month Summary Statistics Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-center shadow-sm">
              <span className="text-xs uppercase text-emerald-600 font-bold tracking-wider block mb-1">Present Days</span>
              <div className="text-xl font-bold text-emerald-800">{ledgerStats.presentCount}</div>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-center shadow-sm">
              <span className="text-xs uppercase text-rose-600 font-bold tracking-wider block mb-1">Approved Leaves</span>
              <div className="text-xl font-bold text-rose-800">{ledgerStats.leaveCount}</div>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5 text-center shadow-sm">
              <span className="text-xs uppercase text-sky-600 font-bold tracking-wider block mb-1">C-Off Claims</span>
              <div className="text-xl font-bold text-sky-800">{ledgerStats.coffCount}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-center shadow-sm">
              <span className="text-xs uppercase text-amber-600 font-bold tracking-wider block mb-1">Special Duty</span>
              <div className="text-xl font-bold text-amber-800">{ledgerStats.sdCount}</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 col-span-2 lg:col-span-1 text-center shadow-sm">
              <span className="text-xs uppercase text-purple-600 font-bold tracking-wider block mb-1">Holidays</span>
              <div className="text-xl font-bold text-purple-800">{ledgerStats.holidayCount}</div>
            </div>
          </div>

          {/* Ledger Sheet Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 print:border-0 print:p-0">
            {/* Header displayed in printing mode */}
            <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900 uppercase">MONTHLY PERSONAL SERVICE LEDGER</h2>
              <div className="grid grid-cols-2 text-xs text-slate-700 mt-2 gap-y-1">
                <div><b>Employee:</b> {user.firstName} {user.lastName} ({user.empId || "—"})</div>
                <div><b>Department:</b> {(user as any).department || user.empType || "General"}</div>
                <div><b>Reporting Period:</b> {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"
                ][ledgerMonth]} {ledgerYear}</div>
                <div><b>Generated On:</b> {new Date().toLocaleDateString("en-IN")}</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="font-display font-semibold text-sm text-slate-800">
                Detailed Log Summary ({ledgerDays.length} Records)
              </h4>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider print:hidden">
                Descending order
              </span>
            </div>

            {ledgerDays.length === 0 ? (
              <p className="text-slate-400 text-xs py-10 text-center font-sans">
                No matching service records found for selected calendar filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[650px] print:min-w-0">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-bold font-sans print:bg-slate-100">
                      <th className="p-3 w-32">Date &amp; Day</th>
                      <th className="p-3">Consolidated Logs / Categories / Justifications</th>
                      <th className="p-3 w-40 text-left print:hidden">Ledger Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {ledgerDays.map((rowItem, idx) => {
                      const hasAnyRecord = rowItem.attendance || rowItem.leave || rowItem.coff || rowItem.specialDuty || rowItem.holiday || rowItem.isSunday;

                      const formattedDay = (() => {
                        const dateObj = new Date(rowItem.dateStr + "T00:00:00");
                        return dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
                      })();

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/40 print:hover:bg-white transition-all ${
                            rowItem.isSunday ? "bg-rose-50/20" : ""
                          }`}
                        >
                          {/* Chronology Column */}
                          <td className="p-3 align-top">
                            <div className="font-bold text-slate-900">{formattedDay}</div>
                            <div className={`text-[10px] uppercase font-semibold ${
                              rowItem.isSunday ? "text-rose-600 font-extrabold" : "text-slate-400"
                            }`}>
                              {rowItem.dayName}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{rowItem.dateStr}</div>
                          </td>

                          {/* Data Records Column */}
                          <td className="p-3 align-top space-y-2">
                            {/* 1. Official Holiday */}
                            {rowItem.holiday && (
                              <div className="bg-purple-50/60 border border-purple-100/80 rounded-lg p-2 flex items-start gap-2 max-w-xl">
                                <span className="text-sm">🎉</span>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-purple-700 text-xs">OFFICIAL HOLIDAY</div>
                                  <p className="text-[11px] text-purple-805"><b>{rowItem.holiday.name}</b></p>
                                </div>
                              </div>
                            )}

                            {/* 2. Sunday (if no attendance) */}
                            {rowItem.isSunday && !rowItem.attendance && !rowItem.leave && !rowItem.coff && !rowItem.specialDuty && !rowItem.holiday && (
                              <div className="bg-rose-50/30 border border-rose-100/65 rounded-lg p-2 text-rose-700 text-[11px] font-medium max-w-xl flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                Regular Weekly Sunday Off
                              </div>
                            )}

                            {/* 3. Punched Attendance */}
                            {rowItem.attendance && (
                              <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-2.5 space-y-1.5 max-w-2xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                                    Present Entry
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    Approval Status:
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase rounded-md px-2 py-0.5 border ${
                                    rowItem.attendance.approval === "Approved"
                                      ? "bg-emerald-100/70 text-emerald-800 border-emerald-200"
                                      : rowItem.attendance.approval === "Pending"
                                      ? "bg-amber-100/70 text-amber-800 border-amber-200 animate-pulse"
                                      : "bg-rose-100/70 text-rose-800 border-rose-200"
                                  }`}>
                                    {rowItem.attendance.approval}
                                  </span>
                                  {rowItem.attendance.taskId && (
                                    <span className="font-mono text-[10px] text-slate-500 ml-auto bg-slate-100 px-1.5 py-0.5 rounded">
                                      Sequence: {rowItem.attendance.taskId}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-800 font-medium">
                                  ⏱ Punch Times: <span className="font-mono text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 rounded px-1.5 py-0.5">In: <b>{rowItem.attendance.punchInTime}</b></span> 
                                  {rowItem.attendance.punchOutTime ? (
                                    <span className="ml-1 font-mono text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 rounded px-1.5 py-0.5">Out: <b>{rowItem.attendance.punchOutTime}</b></span>
                                  ) : (
                                    <span className="text-amber-600 font-semibold ml-1"> (Punch Out Pending)</span>
                                  )}
                                  <span className="ml-2 font-mono text-slate-500 text-[11px] font-bold">{rowItem.attendanceDuration}</span>
                                </div>
                                {(rowItem.attendance.taskType || rowItem.attendance.description) && (
                                  <div className="text-[11px] text-slate-600 bg-white/70 border border-slate-100 rounded p-1.5">
                                    <b>Work Scope:</b> <span className="font-semibold text-slate-800">[{rowItem.attendance.taskType}]</span> — {rowItem.attendance.description || "(No description)"}
                                    {rowItem.attendance.endNotes && (
                                      <div className="mt-1 pt-1 border-t border-slate-50 text-[10px] text-slate-500">
                                        <b>Completion Notes:</b> {rowItem.attendance.endNotes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 4. Applied Leave */}
                            {rowItem.leave && (
                              <div className="bg-rose-50/30 border border-rose-100 rounded-lg p-2.5 space-y-1.5 max-w-2xl">
                                <div className="flex items-center gap-2">
                                  <span className="bg-rose-100 text-rose-800 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border border-rose-200">
                                    Leave Application
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    Status:
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 border ${
                                    rowItem.leave.status === "Approved"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : rowItem.leave.status === "Pending"
                                      ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                                      : "bg-rose-100 text-rose-800 border-rose-200"
                                  }`}>
                                    {rowItem.leave.status}
                                  </span>
                                  <span className="text-[10px] font-bold text-rose-600 ml-auto bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                                    {rowItem.leave.leaveType}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-700">
                                  📅 Period: <b>{rowItem.leave.from}</b> to <b>{rowItem.leave.to}</b> ({rowItem.leave.days} Day{rowItem.leave.days > 1 ? "s" : ""})
                                </div>
                                <div className="text-[11px] text-slate-600 bg-white/70 border border-slate-100 rounded p-1.5 italic">
                                  Reason: "{rowItem.leave.reason}"
                                </div>
                              </div>
                            )}

                            {/* 5. C-Off Claims */}
                            {rowItem.coff && (
                              <div className="bg-sky-50/30 border border-sky-100 rounded-lg p-2.5 space-y-1.5 max-w-2xl">
                                <div className="flex items-center gap-2">
                                  <span className="bg-sky-100 text-sky-800 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border border-sky-200">
                                    Comp-Off Claim
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    Status:
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 border ${
                                    rowItem.coff.status === "Approved"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : rowItem.coff.status === "Pending"
                                      ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                                      : "bg-rose-100 text-rose-800 border-rose-200"
                                  }`}>
                                    {rowItem.coff.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 bg-white/70 border border-slate-100 rounded p-1.5">
                                  <b>Claim grounds:</b> "{rowItem.coff.reason}"
                                </div>
                              </div>
                            )}

                            {/* 6. Special Duty */}
                            {rowItem.specialDuty && (
                              <div className="bg-amber-50/30 border border-amber-100 rounded-lg p-2.5 space-y-1.5 max-w-2xl">
                                <div className="flex items-center gap-2">
                                  <span className="bg-amber-100 text-amber-800 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border border-amber-200">
                                    Special Duty Allowance Auth
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    Status:
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 border ${
                                    rowItem.specialDuty.status === "Approved"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : rowItem.specialDuty.status === "Pending"
                                      ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                                      : "bg-rose-100 text-rose-800 border-rose-200"
                                  }`}>
                                    {rowItem.specialDuty.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 bg-white/70 border border-slate-100 rounded p-1.5">
                                  {rowItem.specialDuty.description && (
                                    <div className="font-bold text-slate-700 text-[10px] uppercase mb-0.5 tracking-wider">
                                      Nature: {rowItem.specialDuty.description}
                                    </div>
                                  )}
                                  <b>Requirement context / reason:</b> "{rowItem.specialDuty.reason}"
                                </div>
                              </div>
                            )}

                            {/* No record found */}
                            {!hasAnyRecord && (
                              <div className="text-slate-400 text-[11px] font-sans flex items-center gap-1.5 italic pl-1">
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                Regular Working Day (No Punches/Applications Registered)
                              </div>
                            )}
                          </td>

                          {/* Quick Edit/Delete Actions for punches */}
                          <td className="p-3 align-top print:hidden text-left">
                            {rowItem.attendance && (rowItem.attendance.approval === "Pending" || rowItem.attendance.approval === "Rejected" || rowItem.attendance.approval === "Rejected-Resubmit") ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(rowItem.dateStr);
                                    setActiveTab("punch");
                                  }}
                                  title="Edit Attendance descriptive parameters"
                                  className="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this attendance record? This will completely clear the punch indices for this day.")) {
                                      onDeleteRecord("attendance", rowItem.attendance.id);
                                    }
                                  }}
                                  title="Delete Attendance Record"
                                  className="p-1 px-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-md transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : rowItem.attendance ? (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Locked 🔒
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs italic">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
