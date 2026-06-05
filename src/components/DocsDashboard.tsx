import React, { useState } from "react";
import { BookOpen, Key, GitBranch, Server, Cpu } from "lucide-react";
import { DEVELOPER_DOCS } from "../utils/docs";

export function DocsDashboard() {
  const [activeTab, setActiveTab] = useState(0);

  const icons = [
    <BookOpen className="w-5 h-5" />,
    <Server className="w-5 h-5" />,
    <GitBranch className="w-5 h-5" />,
    <Cpu className="w-5 h-5" />
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 font-display">Onboarding & API Documentation</h2>
        <p className="text-sm text-slate-500">
          Interactive cockpit showcasing developer specs, CI/CD parameters, API mappings, and telemetry rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {DEVELOPER_DOCS.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-sm font-medium transition-all ${
                activeTab === idx
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              {icons[idx] || <BookOpen className="w-5 h-5" />}
              <span className="truncate">{doc.title.split(".")[1] || doc.title}</span>
            </button>
          ))}

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-2 mt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">SYSTEM SIGNATURE</h4>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              API ENDPOINT LIVE
            </div>
            <div className="text-neutral-500 text-[11px] font-mono">
              PORT: <span className="text-indigo-600 font-semibold">3000</span> (PROXY)
            </div>
          </div>
        </div>

        {/* Console view */}
        <div className="lg:col-span-3 bg-slate-900 text-slate-200 rounded-xl p-6 shadow-xl border border-slate-800 font-mono text-sm leading-relaxed overflow-x-auto max-w-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-xs text-slate-400 ml-2 font-semibold">attendx-onboarding-console.sh</span>
            </div>
            <span className="text-xs text-slate-500 uppercase font-mono tracking-widest block">v1.1.0</span>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-indigo-400 font-display mb-1">{DEVELOPER_DOCS[activeTab].title}</h3>
              <p className="text-xs text-slate-400 mb-4 font-sans">{DEVELOPER_DOCS[activeTab].description}</p>
            </div>

            <div className="bg-slate-950 rounded-lg p-4 text-xs text-slate-300 font-mono space-y-4 whitespace-pre-wrap outline-none border border-slate-800">
              {DEVELOPER_DOCS[activeTab].markdownCode}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
