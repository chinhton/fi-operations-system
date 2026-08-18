import React from 'react';

export default function KpiBanner({ changeTab, assetsCount, complianceRate, historyCount }) {
  return (
    <div className="bg-[#0081b8] border-b border-[#00608a] shadow-inner">
      <div className="max-w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          
          {/* 1. COMPLIANCE FACTOR */}
          <div 
            onClick={() => changeTab('dashboard')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-5 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-sm backdrop-blur-sm group"
          >
            <h3 className="text-xs font-black text-blue-100 uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Compliance Factor</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white">{complianceRate}%</span>
            </div>
            <p className="text-[10px] text-blue-100 mt-2 font-medium">View Operations Dashboard &rarr;</p>
          </div>

          {/* 2. FACILITY ASSETS */}
          <div 
            onClick={() => changeTab('assets')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-5 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-sm backdrop-blur-sm group"
          >
            <h3 className="text-xs font-black text-blue-100 uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Facility Assets</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white">{assetsCount}</span>
            </div>
            <p className="text-[10px] text-blue-100 mt-2 font-medium">Monitored high-value systems &rarr;</p>
          </div>

          {/* 3. EXECUTED AUDITS */}
          <div 
            onClick={() => changeTab('history')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-5 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-sm backdrop-blur-sm group"
          >
            <h3 className="text-xs font-black text-blue-100 uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Executed Audits</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white">{historyCount}</span>
            </div>
            <p className="text-[10px] text-blue-100 mt-2 font-medium">Traceable sign-off operations &rarr;</p>
          </div>

        </div>
      </div>
    </div>
  );
}