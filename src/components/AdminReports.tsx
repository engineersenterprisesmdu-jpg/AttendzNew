import React, { useState, useMemo, useEffect } from "react";
import { Printer, Download, Search, Calendar, Users, AlertCircle, Clock } from "lucide-react";
import { Employee, Attendance, Leave, Coff, SpecialDuty, Holiday } from "../types";

function parseTimeToHourMin(timeStr: string | null | undefined): { h: number; m: number } | null {
  if (!timeStr) return null;
  const cleanStr = timeStr.trim().toLowerCase();
  
  // Check if it has pm/am
  const isPM = cleanStr.includes("pm");
  const isAM = cleanStr.includes("am");
  
  // Strip PM/AM and keep only numbers & colons
  const digitString = cleanStr.replace(/[ap]m/g, "").trim();
  const parts = digitString.split(":");
  if (parts.length < 2) return null;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return null;
  
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  return { h: hours, m: minutes };
}

function getAttendanceDuration(att: Attendance, fmtDateFn: (d: string) => string): { text: string; rawMinutes: number; detailedLog: string } {
  if (!att.punchInTime) {
    return { text: "N/A", rawMinutes: 0, detailedLog: "—" };
  }
  if (!att.punchOutTime) {
    return { text: "Active Shift", rawMinutes: 0, detailedLog: `In: ${fmtDateFn(att.date)} ${att.punchInTime} (Punch out pending)` };
  }

  // Parse check in time prioritizing punchInTime24 then falling back gracefully to 12 hour punchInTime parsing
  let inH = 0, inM = 0;
  const parsedIn = parseTimeToHourMin(att.punchInTime24) || parseTimeToHourMin(att.punchInTime);
  if (parsedIn) {
    inH = parsedIn.h;
    inM = parsedIn.m;
  }

  // Parse check out time prioritizing punchOutTime24 then falling back gracefully to 12 hour punchOutTime parsing
  let outH = 0, outM = 0;
  const parsedOut = parseTimeToHourMin(att.punchOutTime24) || parseTimeToHourMin(att.punchOutTime);
  if (parsedOut) {
    outH = parsedOut.h;
    outM = parsedOut.m;
  }

  const inDate = new Date(`${att.date}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00`);
  const endDateStr = att.punchOutDate || att.date;
  const outDate = new Date(`${endDateStr}T${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}:00`);

  let diffMs = outDate.getTime() - inDate.getTime();
  if (diffMs < 0 && !att.punchOutDate) {
    const nextDayDate = new Date(inDate);
    nextDayDate.setDate(nextDayDate.getDate() + 1);
    const adjustedOutDate = new Date(`${nextDayDate.toISOString().split("T")[0]}T${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}:00`);
    diffMs = adjustedOutDate.getTime() - inDate.getTime();
  }

  const inStr = `${fmtDateFn(att.date)} ${att.punchInTime}`;
  const outStr = `${fmtDateFn(att.punchOutDate || att.date)} ${att.punchOutTime}`;

  if (diffMs < 0 || isNaN(diffMs)) {
    return { 
      text: "0 mins", 
      rawMinutes: 0, 
      detailedLog: `In: ${inStr} | Out: ${outStr}` 
    };
  }

  const totalMin = Math.round(diffMs / 60000);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  
  let durationText = "";
  if (hrs > 0) durationText += `${hrs} hr${hrs > 1 ? "s" : ""} `;
  if (mins > 0 || hrs === 0) durationText += `${mins} min${mins > 1 ? "s" : ""}`;
  durationText = durationText.trim();

  return { 
    text: durationText, 
    rawMinutes: totalMin, 
    detailedLog: `In: ${inStr} | Out: ${outStr} (${durationText})` 
  };
}

interface AdminReportsProps {
  employees: Employee[];
  attendance: Attendance[];
  leaves: Leave[];
  coffs: Coff[];
  specialDuties: SpecialDuty[];
  holidays: Holiday[];
}

export function AdminReports({
  employees,
  attendance,
  leaves,
  coffs,
  specialDuties,
  holidays
}: AdminReportsProps) {
  // Temporary input states
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [subType, setSubType] = useState("all");

  // Committed states triggering the report creation/filtering
  const [committedFilters, setCommittedFilters] = useState({
    emp: "all",
    fromDate: "",
    toDate: "",
    subType: "all"
  });

  // Keep committed state synchronized with initial inputs on mount
  useEffect(() => {
    setCommittedFilters({
      emp: selectedEmp,
      fromDate: fromDate,
      toDate: toDate,
      subType: subType
    });
  }, []);

  const fmtDate = (d: string) => {
    return d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  };

  const fmtDay = (d: string) => {
    return d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }) : "";
  };

  const getEmpName = (id: string) => {
    const e = employees.find(x => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "Unknown";
  };

  // Compile full database dataset in memory using committed filter guidelines
  const filteredData = useMemo(() => {
    const inRange = (d: string) => (!committedFilters.fromDate || d >= committedFilters.fromDate) && (!committedFilters.toDate || d <= committedFilters.toDate);

    // Filter bases
    const rawAtt = attendance.filter(a => (committedFilters.emp === "all" || a.empId === committedFilters.emp) && inRange(a.date));
    const rawLeaves = leaves.filter(l => (committedFilters.emp === "all" || l.empId === committedFilters.emp) && (inRange(l.from) || inRange(l.to)));
    const rawCoffs = coffs.filter(c => (committedFilters.emp === "all" || c.empId === committedFilters.emp) && inRange(c.date));
    const rawSD = specialDuties.filter(s => (committedFilters.emp === "all" || s.empId === committedFilters.emp) && inRange(s.date));

    const combined: any[] = [];

    rawAtt.forEach(a => {
      if (committedFilters.subType === "all" || committedFilters.subType === "present" || (committedFilters.subType === "spduty" && a.status === "Special Duty") || (committedFilters.subType === "coff" && a.status === "C-Off") || (committedFilters.subType === "leave" && a.status === "Leave")) {
        const durationInfo = getAttendanceDuration(a, fmtDate);
        combined.push({
          date: a.date,
          endDate: a.punchOutDate || a.date,
          type: a.status === "Special Duty" ? "Special Duty" : a.status === "C-Off" ? "C-Off" : a.status === "Leave" ? "Leave" : "Present",
          empName: a.empName,
          empId: employees.find(x => x.id === a.empId)?.empId || "—",
          details: `${a.taskType ? a.taskType + ": " : ""}${a.description || ""}`,
          timeLog: durationInfo.detailedLog,
          durationMinutes: durationInfo.rawMinutes,
          status: a.approval,
          isOvernight: !!a.punchOutDate && a.punchOutDate !== a.date,
          gpsIn: a.gpsIn || null,
          gpsOut: a.gpsOut || null
        });
      }
    });

    if (committedFilters.subType === "all" || committedFilters.subType === "leave") {
      rawLeaves.forEach(l => {
        combined.push({
          date: l.from,
          endDate: l.to,
          type: "Leave App.",
          empName: getEmpName(l.empId),
          empId: employees.find(x => x.id === l.empId)?.empId || "—",
          details: `${l.leaveType} (${l.days} days) - ${l.reason}`,
          timeLog: `Period: ${fmtDate(l.from)} to ${fmtDate(l.to)}`,
          durationMinutes: 0,
          status: l.status,
          isOvernight: false,
          gpsIn: null,
          gpsOut: null
        });
      });
    }

    if (committedFilters.subType === "all" || committedFilters.subType === "coff") {
      rawCoffs.forEach(c => {
        combined.push({
          date: c.date,
          type: "C-Off Request",
          empName: getEmpName(c.empId),
          empId: employees.find(x => x.id === c.empId)?.empId || "—",
          details: `Reason: ${c.reason}`,
          timeLog: `Date: ${fmtDate(c.date)}`,
          durationMinutes: 0,
          status: c.status,
          isOvernight: false,
          gpsIn: null,
          gpsOut: null
        });
      });
    }

    if (committedFilters.subType === "all" || committedFilters.subType === "spduty") {
      rawSD.forEach(s => {
        combined.push({
          date: s.date,
          type: "Special Duty App.",
          empName: getEmpName(s.empId),
          empId: employees.find(x => x.id === s.empId)?.empId || "—",
          details: `${s.description ? s.description + " - " : ""}${s.reason}`,
          timeLog: `Date: ${fmtDate(s.date)}`,
          durationMinutes: 0,
          status: s.status,
          isOvernight: false,
          gpsIn: null,
          gpsOut: null
        });
      });
    }

    // Sort by date descending
    return combined.sort((a, b) => b.date.localeCompare(a.date));
  }, [committedFilters, attendance, leaves, coffs, specialDuties, employees]);

  // Aggregate stats summary
  const summaryBlock = useMemo(() => {
    const counts = { present: 0, leave: 0, coff: 0, spduty: 0, expected: 0 };
    filteredData.forEach(item => {
      if (item.status !== "Approved") return;
      if (item.type === "Present") counts.present++;
      else if (item.type === "Leave" || item.type === "Leave App.") counts.leave++;
      else if (item.type === "C-Off" || item.type === "C-Off Request") counts.coff++;
      else if (item.type === "Special Duty" || item.type === "Special Duty App.") counts.spduty++;
    });
    return counts;
  }, [filteredData]);

  // Sum of total working time for selected period based on approved and pending present logs
  const totalWorkingTimeText = useMemo(() => {
    let totalMin = 0;
    filteredData.forEach(item => {
      if ((item.status === "Approved" || item.status === "Pending") && item.durationMinutes) {
        totalMin += item.durationMinutes;
      }
    });
    if (totalMin === 0) return "0 hrs 0 mins";
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hrs} hr${hrs !== 1 ? "s" : ""} ${mins} min${mins !== 1 ? "s" : ""}`;
  }, [filteredData]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Date", "Day", "Category", "Employee", "ID", "Time Log", "Duration (mins)", "Remarks / Details", "GPS Punch-In Location", "GPS Punch-Out Location", "Approval Status"];
    const rows = filteredData.map(item => [
      item.date,
      fmtDay(item.date),
      item.type,
      item.empName,
      item.empId,
      item.timeLog,
      item.durationMinutes ? item.durationMinutes : "0",
      item.details,
      item.gpsIn ? (item.gpsIn.address || `${item.gpsIn.lat}, ${item.gpsIn.lng}`) : "—",
      item.gpsOut ? (item.gpsOut.address || `${item.gpsOut.lat}, ${item.gpsOut.lng}`) : "—",
      item.status
    ]);

    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `attendx_reports_${committedFilters.emp}_${committedFilters.fromDate}_to_${committedFilters.toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rejected-Resubmit":
        return "bg-amber-50 text-amber-800 border-orange-200 border-dashed";
      case "Rejected":
      default:
        return "bg-rose-50 text-rose-700 border-rose-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100 pb-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-display">System Reports Hub</h2>
          <p className="text-sm text-slate-500">Formulate and filter detailed operational histories, export spreadsheets, or print ledger templates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold text-sm rounded-lg border border-slate-300 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Inputs - No Print */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scope Target</label>
            <select
              value={selectedEmp}
              onChange={e => setSelectedEmp(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All registered staff members</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.empId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-sans">Start Chronology</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-3 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Chronology</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-3 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filter Category</label>
            <div className="flex flex-wrap gap-2">
              {[
                { k: "all", label: "All Activities" },
                { k: "present", label: "Attendance Only" },
                { k: "leave", label: "Leaves Application" },
                { k: "coff", label: "C-Off Claims" },
                { k: "spduty", label: "Special Duty Allowance" }
              ].map(tab => (
                <button
                  key={tab.k}
                  onClick={() => setSubType(tab.k)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    subType === tab.k
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-50 border-slate-250"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <button
              onClick={() => {
                setCommittedFilters({
                  emp: selectedEmp,
                  fromDate: fromDate,
                  toDate: toDate,
                  subType: subType
                });
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm lg:text-base rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Micro Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
          <div className="font-mono text-xl font-bold text-emerald-600">{summaryBlock.present}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Days Present</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
          <div className="font-mono text-xl font-bold text-rose-500">{summaryBlock.leave}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Leave Days</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
          <div className="font-mono text-xl font-bold text-teal-600">{summaryBlock.coff}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Comp-Off Days</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
          <div className="font-mono text-xl font-bold text-amber-500">{summaryBlock.spduty}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Special Duty Approved</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm text-center col-span-2 md:col-span-1">
          <div className="font-mono text-xs font-extrabold text-indigo-700 leading-normal mb-1">{totalWorkingTimeText}</div>
          <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Total Work Time</div>
        </div>
      </div>

      {/* Ledger Print Template */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
        {/* Period Summary Header block for View and Print */}
        <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-950 no-print">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-lg shadow-inner">⏱️</span>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Period Aggregators Summary</h3>
              <p className="text-xs text-slate-400">Total validated operational duration in current filter bounds</p>
            </div>
          </div>
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-450 font-mono">Working Time Sum:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{totalWorkingTimeText}</span>
          </div>
        </div>

        <div className="hidden print:block p-6 border-b border-slate-200 bg-slate-50 text-center space-y-2">
          <h1 className="text-xl font-bold font-display text-slate-900 uppercase tracking-wide">ATTENDX WORKFORCE LEDGER</h1>
          <div className="text-xs text-slate-600 font-mono flex flex-wrap justify-center gap-x-6 gap-y-1">
            <span>Trace Chronology: {fmtDate(committedFilters.fromDate)} to {fmtDate(committedFilters.toDate)}</span>
            <span>|</span>
            <span>Target Employee: {committedFilters.emp === "all" ? "All Registered Staff" : getEmpName(committedFilters.emp)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200/60 max-w-md mx-auto">
            <p className="text-xs font-bold text-indigo-700 font-mono uppercase bg-indigo-50 inline-block px-3 py-1 rounded-full border border-indigo-100">
              Approved Working Duration: {totalWorkingTimeText}
            </p>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">No records matched active search credentials in database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Chronology</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Punch Time log</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">GPS Location Mapping</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Details / Remarks</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Database Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-mono text-xs whitespace-nowrap">
                      {fmtDate(item.date)} <span className="text-slate-400 font-sans">({fmtDay(item.date)})</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{item.empName}</div>
                      <div className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">{item.empId}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold font-sans text-slate-800">{item.type}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs whitespace-nowrap text-slate-500">{item.timeLog}</td>
                    <td className="px-5 py-4">
                      {item.gpsIn || item.gpsOut ? (
                        <div className="space-y-1 text-slate-600 leading-normal max-w-sm">
                          {item.gpsIn && (
                            <div className="text-[11px]">
                              <span className="text-[9px] font-bold uppercase text-emerald-600 block">📥 In GPS</span>
                              <span className="block truncate max-w-[200px]" title={item.gpsIn.address || `${item.gpsIn.lat.toFixed(5)}, ${item.gpsIn.lng.toFixed(5)}`}>
                                {item.gpsIn.address || `${item.gpsIn.lat.toFixed(5)}, ${item.gpsIn.lng.toFixed(5)}`}
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${item.gpsIn.lat},${item.gpsIn.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline font-semibold font-mono text-[9px] inline-flex items-center gap-0.5 no-print"
                              >
                                🗺️ View Map
                              </a>
                            </div>
                          )}
                          {item.gpsOut && (
                            <div className="text-[11px] border-t border-slate-100 pt-1 mt-1">
                              <span className="text-[9px] font-bold uppercase text-rose-600 block">📤 Out GPS</span>
                              <span className="block truncate max-w-[200px]" title={item.gpsOut.address || `${item.gpsOut.lat.toFixed(5)}, ${item.gpsOut.lng.toFixed(5)}`}>
                                {item.gpsOut.address || `${item.gpsOut.lat.toFixed(5)}, ${item.gpsOut.lng.toFixed(5)}`}
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${item.gpsOut.lat},${item.gpsOut.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline font-semibold font-mono text-[9px] inline-flex items-center gap-0.5 no-print"
                              >
                                🗺️ View Map
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600 max-w-xs truncate" title={item.details}>
                      {item.details || "—"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md border inline-block ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
