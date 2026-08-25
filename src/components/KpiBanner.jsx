import React from 'react';

export default function KpiBanner({ complianceRate, assetsCount = 0, activeCount = 0, inactiveCount = 0, overdueCount = 0, inspectionCount = 0, calibrationCount = 0, correctiveCount = 0 }) {
  return (
    <div className="bg-[#0081b8] border-b border-[#00608a] shadow-inner w-full">
      <div className="w-full px-4 py-6 md:px-6">
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
            <h3 className="text-[9px] xl:text-[10px] font-black text-purple-300 uppercase tracking-wider mb-2">Overdue Inspect</h3>
            <div className="text-2xl xl:text-3xl font-black text-white">{inspectionCount}</div>
          </div>

          <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 xl:p-5 transition-all duration-300 shadow-sm backdrop-blur-sm">
            <h3 className="text-[9px] xl:text-[10px] font-black text-yellow-300 uppercase tracking-wider mb-2">Overdue PM</h3>
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