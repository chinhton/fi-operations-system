import React from 'react';

export default function KpiBanner({ complianceRate, activeCount = 0, overdueCount = 0, calibrationCount = 0, correctiveCount = 0 }) {
  return (
    <div className="max-w-full mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col xl:flex-row">
        
        {/* COMPLIANCE FACTOR (NAVY BOX) */}
        <div className="bg-[#1A2530] text-white p-6 xl:w-1/3 flex flex-col justify-center items-center text-center border-b xl:border-b-0 xl:border-r border-gray-700">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">System Compliance Factor</h2>
          <div className="text-5xl font-black mb-1">{complianceRate || 100}%</div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Optimal Health Ratio</p>
        </div>
        
        {/* OPERATIONS HEALTH OVERVIEW (WHITE BOX) */}
        <div className="p-6 xl:w-2/3 flex flex-col justify-center bg-gray-50/50">
          <h3 className="text-xs font-black text-[#005596] mb-4 uppercase tracking-wider">Operations Health Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-emerald-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] uppercase font-extrabold text-emerald-700 tracking-wider">Active</span>
              <div className="text-3xl font-black mt-2 text-emerald-600 drop-shadow-sm">{activeCount}</div>
            </div>
            <div className="bg-white border border-yellow-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] uppercase font-extrabold text-yellow-700 tracking-wider">Overdue PM</span>
              <div className="text-3xl font-black mt-2 text-yellow-600 drop-shadow-sm">{overdueCount}</div>
            </div>
            <div className="bg-white border border-red-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] uppercase font-extrabold text-red-700 tracking-wider">Calibration</span>
              <div className="text-3xl font-black mt-2 text-red-600 drop-shadow-sm">{calibrationCount}</div>
            </div>
            <div className="bg-white border border-orange-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] uppercase font-extrabold text-orange-700 tracking-wider">Corrective</span>
              <div className="text-3xl font-black mt-2 text-orange-600 drop-shadow-sm">{correctiveCount}</div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}