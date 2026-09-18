import React, { useState } from 'react';

export default function KpiBanner({ complianceRate, assetsCount = 0, activeCount = 0, inactiveCount = 0, overdueCount = 0, inspectionCount = 0, calibrationCount = 0, correctiveCount = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const actionItems = [
    { label: "Inspection", value: inspectionCount, color: "text-purple-300" },
    { label: "Preventive Maint.", value: overdueCount, color: "text-yellow-300" },
    { label: "Calibration", value: calibrationCount, color: "text-red-300" },
    { label: "Corrective", value: correctiveCount, color: "text-orange-300" }
  ].filter(item => item.value > 0);

  const actionTotal = inspectionCount + overdueCount + calibrationCount + correctiveCount;

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
            {actionTotal > 0 && (
              <span className="bg-red-500/90 text-white text-[10px] px-2 py-0.5 rounded-full">{actionTotal} Flagged</span>
            )}
          </div>
          <span className={`text-white/80 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {isExpanded && (
          <div className="space-y-2.5 pb-4">
            <div className="bg-white/10 border border-white/20 rounded-lg p-3">
              <h3 className="text-[9px] font-black text-blue-100 uppercase tracking-wider mb-1">Compliance Factor</h3>
              <div className="text-lg font-black text-white">{complianceRate || 100}%</div>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-lg p-3">
              <h3 className="text-[9px] font-black text-blue-100 uppercase tracking-wider mb-1">Fleet Status</h3>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-lg font-black text-white">{assetsCount}</div>
                  <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Total</div>
                </div>
                <div>
                  <div className="text-sm font-black text-emerald-300">{activeCount}</div>
                  <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Active</div>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-300">{inactiveCount}</div>
                  <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Inactive</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-lg p-3">
              <h3 className="text-[9px] font-black text-blue-100 uppercase tracking-wider mb-1">Action Items</h3>
              {actionTotal === 0 ? (
                <div className="text-sm font-black text-emerald-300">✓ All Clear</div>
              ) : (
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <div className="text-lg font-black text-white">{actionTotal}</div>
                    <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Flagged</div>
                  </div>
                  {actionItems.map(item => (
                    <div key={item.label}>
                      <div className={`text-sm font-black ${item.color}`}>{item.value}</div>
                      <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop/tablet: 3 consolidated cards */}
      <div className="hidden md:block w-full px-4 py-6 md:px-6">
        <div className="grid grid-cols-3 gap-4 lg:gap-6">

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-blue-100 uppercase tracking-wider mb-2">Compliance Factor</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{complianceRate || 100}%</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-blue-100 uppercase tracking-wider mb-2">Fleet Status</h3>
            <div className="flex items-end gap-6">
              <div>
                <div className="text-2xl xl:text-3xl font-black text-white">{assetsCount}</div>
                <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Total</div>
              </div>
              <div>
                <div className="text-lg xl:text-xl font-black text-emerald-300">{activeCount}</div>
                <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Active</div>
              </div>
              <div>
                <div className="text-lg xl:text-xl font-black text-slate-300">{inactiveCount}</div>
                <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Inactive</div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-blue-100 uppercase tracking-wider mb-2">Action Items</h3>
            {actionTotal === 0 ? (
              <div className="text-2xl xl:text-3xl font-black text-emerald-300 flex items-center gap-2">✓ All Clear</div>
            ) : (
              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <div className="text-2xl xl:text-3xl font-black text-white">{actionTotal}</div>
                  <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">Flagged</div>
                </div>
                {actionItems.map(item => (
                  <div key={item.label}>
                    <div className={`text-lg xl:text-xl font-black ${item.color}`}>{item.value}</div>
                    <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
