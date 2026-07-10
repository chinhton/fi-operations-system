import React from 'react';

export default function KpiBanner({ 
  changeTab, 
  workOrdersCount, 
  assetsCount, 
  complianceRate, 
  historyCount 
}) {
  return (
    <section className="bg-gradient-to-r from-[#005596] to-[#00A1E4] text-white py-6 px-4 sm:px-6 lg:px-8 shadow-md relative overflow-hidden">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
      <div className="max-w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        <div onClick={() => changeTab('workOrders')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Pending Actions</span>
          <div className="text-3xl sm:text-4xl font-black mt-2 text-yellow-300 drop-shadow-md">{workOrdersCount}</div>
          <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Schedules in queue &rarr;</div>
        </div>
        <div onClick={() => changeTab('assets')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Facility Assets</span>
          <div className="text-3xl sm:text-4xl font-black mt-2 drop-shadow-md">{assetsCount}</div>
          <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Monitored high-value systems &rarr;</div>
        </div>
        <div onClick={() => changeTab('dashboard')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Compliance Factor</span>
          <div className="text-3xl sm:text-4xl font-black mt-2 drop-shadow-md">{complianceRate}%</div>
          <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Optimal health ratio &rarr;</div>
        </div>
        <div onClick={() => changeTab('history')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Executed Audits</span>
          <div className="text-3xl sm:text-4xl font-black mt-2 drop-shadow-md">{historyCount}</div>
          <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Traceable sign-off operations &rarr;</div>
        </div>
      </div>
    </section>
  );
}