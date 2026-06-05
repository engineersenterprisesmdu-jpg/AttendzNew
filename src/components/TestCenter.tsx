import React, { useState } from "react";
import { Play, CheckCircle2, XCircle, Clock, Cpu, HelpCircle } from "lucide-react";
import { runAutomatedTests, SuiteResult } from "../utils/testRunner";

export function TestCenter() {
  const [suiteResult, setSuiteResult] = useState<SuiteResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const result = runAutomatedTests();
        setSuiteResult(result);
      } catch (e) {
        console.error("Failed to run suite:", e);
      } finally {
        setIsRunning(false);
      }
    }, 600); // realistic diagnostic delay
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-display">Automated Testing Center</h2>
          <p className="text-sm text-slate-500">Run integrated diagnostic unit tests to verify cross-midnight shifts, overlaps, and timezone safety.</p>
        </div>
        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Running Diagnostics...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Trigger Diagnostic Suite
            </>
          )}
        </button>
      </div>

      {suiteResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Diagnostic Console Sum */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">DIAGNOSTIC TRACE</h3>
              <div className="space-y-2">
                <div className="text-3xl font-extrabold text-indigo-600 font-display">
                  {suiteResult.passedCount} / {suiteResult.passedCount + suiteResult.failedCount}
                </div>
                <p className="text-xs text-slate-500">Validation assertions built and validated successfully.</p>
              </div>

              <div className="pt-4 border-t border-slate-150 space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> PASS COMPLIANCE
                  </span>
                  <span className="font-mono font-bold text-emerald-600">{suiteResult.passedCount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> REJECT TRACES
                  </span>
                  <span className="font-mono font-bold text-rose-600">{suiteResult.failedCount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> TOTAL LATENCY
                  </span>
                  <span className="font-mono font-bold text-indigo-600">{suiteResult.totalDurationMs} ms</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-indigo-500" />
                ENVIRONMENT TELEMETRY
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Tests are built inside a sandboxed module layer before deployment. In CI environments, this trace runs automatically prior to asset building to prevent code regression.
              </p>
            </div>
          </div>

          {/* Test Case Detail Feed */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">DIAGNOSTIC LEDGER</h3>
            {suiteResult.testCases.map((tc, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all"
              >
                {tc.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="font-display font-bold text-slate-800 text-sm">{tc.name}</h4>
                    <span className="text-xs font-mono text-slate-400 flex-shrink-0">{tc.durationMs.toFixed(3)} ms</span>
                  </div>
                  {tc.passed ? (
                    <p className="text-xs text-emerald-600 font-mono mt-1">✓ Assertions matching parameters: COMPLIANT</p>
                  ) : (
                    <div className="bg-rose-50 border border-rose-100 rounded p-3 mt-2 font-mono text-xs text-rose-700 whitespace-pre-wrap">
                      <b>CRITICAL REJECTION TRACE:</b> {tc.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-full text-indigo-600 mb-1">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 font-display">Ready to Analyze Shift Validation Chronologies</h3>
          <p className="text-sm text-slate-500 font-sans">
            Diagnostic checks will review calculations for cross-midnight timing arrays, overlapping holiday allowances, and rule contradictions. Trigger the tool above to start.
          </p>
        </div>
      )}
    </div>
  );
}
