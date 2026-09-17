import React, { useState } from 'react';

export default function KpiBanner({ complianceRate, assetsCount = 0, activeCount = 0, inactiveCount = 0, overdueCount = 0, inspectionCount = 0, calibrationCount = 0, correctiveCount = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const flaggedCount = overdueCount + inspectionCount + calibrationCount + correctiveCount;

  const stats = [
    { label: "Compliance Factor", value: `${complianceRate || 100}%`, color: "text-white" },
    { label: "Total Systems", value: assetsCount, color: "text-blue-200" },
    { label: "Active Systems", value: activeCount, color: "text-emerald-300" },
    { label: "Inactive Systems", value: inactiveCount, color: "text-slate-300" },
    { label: "Overdue Inspection", value: inspectionCount, color: "text-purple-300" },
    { label: "Overdue Preventive Maintenance", value: overdueCount, color: "text-yellow-300" },
    { label: "Overdue Calibration", value: calibrationCount, color: "text-red-300" },
    { label: "Corrective Maintenance", value: correctiveCount, color: "text-orange-300" }
  ];

  return (
    <div className="bg-[#0081b8] border-b border-[#00608a] shadow-inner w-full">

      {/* Mobile: compact collapsible summary, collapsed by default */}
      <div className="md:hidden px-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-2.5 text-white"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span>{complianceRate || 100}% Compliance</span>
            {flaggedCount > 0 && (
              <span className="bg-red-500/90 text-white text-[10px] px-2 py-0.5 rounded-full">{flaggedCount} Flagged</span>
            )}
          </div>
          <span className={`text-white/80 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {isExpanded && (
          <div className="grid grid-cols-2 gap-2.5 pb-4">
            {stats.map(s => (
              <div key={s.label} className="bg-white/10 border border-white/20 rounded-lg p-3">
                <h3 className="text-[9px] font-black text-blue-100 uppercase tracking-wider mb-1">{s.label}</h3>
                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop/tablet: full grid */}
      <div className="hidden md:block w-full px-4 py-6 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 lg:gap-4">

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-blue-100 uppercase tracking-wider mb-2">Compliance Factor</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{complianceRate || 100}%</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-blue-200 uppercase tracking-wider mb-2">Total Systems</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{assetsCount}</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-emerald-300 uppercase tracking-wider mb-2">Active Systems</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{activeCount}</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-slate-300 uppercase tracking-wider mb-2">Inactive Systems</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{inactiveCount}</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-purple-300 uppercase tracking-wider mb-2">Overdue Inspection</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{inspectionCount}</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-yellow-300 uppercase tracking-wider mb-2">Overdue Preventive Maintenance</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{overdueCount}</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-red-300 uppercase tracking-wider mb-2">Overdue Calibration</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{calibrationCount}</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-orange-300 uppercase tracking-wider mb-2">Corrective Maintenance</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{correctiveCount}</div>
          </div>

        </div>
      </div>
    </div>
  );
}
