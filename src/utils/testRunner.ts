import { Attendance, Leave } from "../types";

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface SuiteResult {
  suiteName: string;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  testCases: TestCaseResult[];
}

/**
 * Calculates correct working hours given custom timestamps.
 */
export function testCalcWorkingHours(punchIn: string, punchOut: string, date: string, punchOutDate?: string | null): number {
  if (!punchIn || !punchOut) return 0;
  
  const parseTime = (dateStr: string, timeStr: string): Date | null => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseInt(match[3] || "0", 10);
    const ap = match[4].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const d = new Date(dateStr + "T00:00:00");
    d.setHours(h, m, s, 0);
    return d;
  };

  const inDT = parseTime(date, punchIn);
  const outDT = parseTime(punchOutDate || date, punchOut);
  if (!inDT || !outDT) return 0;

  const diffMs = outDT.getTime() - inDT.getTime();
  return diffMs > 0 ? diffMs / 1000 : 0; // returns seconds
}

/**
 * Check if leave requests overlap with existing approved leaves
 */
export function checkLeaveConflict(
  existingLeaves: Leave[], 
  candidateFrom: string, 
  candidateTo: string
): boolean {
  if (candidateFrom > candidateTo) return true;
  
  return existingLeaves.some(l => {
    if (l.status !== "Approved") return false;
    // Check if overlap exists: (StartA <= EndB) and (EndA >= StartB)
    return (l.from <= candidateTo) && (l.to >= candidateFrom);
  });
}

/**
 * Executes our automated unit testing suite
 */
export function runAutomatedTests(): SuiteResult {
  const tests: { name: string; fn: () => void }[] = [];
  const results: TestCaseResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  const globalStart = performance.now();

  const addTest = (name: string, fn: () => void) => {
    tests.push({ name, fn });
  };

  // --- TestCase 1: Normal working hours parsing (Same day) ---
  addTest("Parse Normal Shift (09:00 AM to 05:30 PM)", () => {
    const seconds = testCalcWorkingHours("09:00 AM", "05:30 PM", "2026-06-03");
    const expected = 8.5 * 3600; // 8.5 hours
    if (seconds !== expected) {
      throw new Error(`Expected ${expected}s, but got ${seconds}s`);
    }
  });

  // --- TestCase 2: Cross midnight shift ---
  addTest("Parse Cross-Midnight Night Shift (10:00 PM to 06:00 AM Next Day)", () => {
    const seconds = testCalcWorkingHours("10:00 PM", "06:00 AM", "2026-06-03", "2026-06-04");
    const expected = 8 * 3600; // 8 hours
    if (seconds !== expected) {
      throw new Error(`Expected ${expected}s, but got ${seconds}s`);
    }
  });

  // --- TestCase 3: Invalid chronology constraint ---
  addTest("Detect Invalid Time Order (05:00 PM to 01:00 PM)", () => {
    const seconds = testCalcWorkingHours("05:00 PM", "01:00 PM", "2026-06-03");
    if (seconds !== 0) {
      throw new Error(`Expected 0 seconds for backwards chronology, got ${seconds}`);
    }
  });

  // --- TestCase 4: Leave conflicts overlap detection ---
  addTest("Detect Leave Requests Conflict Overlap", () => {
    const mockLeaves: Leave[] = [
      {
        id: "lv-1",
        empId: "emp-test",
        leaveType: "Casual Leave",
        from: "2026-06-10",
        to: "2026-06-15",
        days: 6,
        reason: "Trip",
        status: "Approved"
      }
    ];

    // Subcase A: Exact match
    if (!checkLeaveConflict(mockLeaves, "2026-06-10", "2026-06-15")) {
      throw new Error("Failed to detect exact leave overlap");
    }
    // Subcase B: Partial intersection
    if (!checkLeaveConflict(mockLeaves, "2026-06-14", "2026-06-18")) {
      throw new Error("Failed to detect partial ending intersect");
    }
    // Subcase C: Entirely inside
    if (!checkLeaveConflict(mockLeaves, "2026-06-11", "2026-06-12")) {
      throw new Error("Failed to detect candidate entirely enclosed");
    }
    // Subcase D: Safe outside boundaries
    if (checkLeaveConflict(mockLeaves, "2026-06-01", "2026-06-09")) {
      throw new Error("Incorrectly flagged non-overlapping early dates as conflict");
    }
  });

  // Run each registered test
  for (const t of tests) {
    const start = performance.now();
    try {
      t.fn();
      const durationMs = performance.now() - start;
      results.push({ name: t.name, passed: true, durationMs });
      passedCount++;
    } catch (err) {
      const durationMs = performance.now() - start;
      results.push({
        name: t.name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs
      });
      failedCount++;
    }
  }

  const globalDuration = performance.now() - globalStart;

  return {
    suiteName: "AttendX Core Business Logic Suite",
    passedCount,
    failedCount,
    totalDurationMs: parseFloat(globalDuration.toFixed(2)),
    testCases: results
  };
}
