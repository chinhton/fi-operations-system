import React from 'react';

export default function DashboardTab({
  operationalCount, overdueCount, calibrationCount, correctiveCount,
  expandedActionQueue, openPmModal, currentUser, isSystemAdmin
}) {
  return (
    <div className="space-y-8 animate-entrance">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Operational Health</span>
            <div className="text-4xl font-black mt-3 text-green-600 drop-shadow-sm">{operationalCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Overdue Maintenance</span>
            <div className="text-4xl font-black mt-3 text-yellow-600 drop-shadow-sm">{overdueCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Out Of Calibration</span>
            <div className="text-4xl font-black mt-3 text-red-600 drop-shadow-sm">{calibrationCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Corrective Action</span>
            <div className="text-4xl font-black mt-3 text-orange-600 drop-shadow-sm">{correctiveCount}</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#005596] to-[#00407a] text-white px-6 py-4 flex items-center justify-between border-b border-[#003058]">
              <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">SOP & Maintenance Actions Queue</h3>
              {expandedActionQueue.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">{expandedActionQueue.length} Pending</span>
              )}
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {expandedActionQueue.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-medium">
                  No pending maintenance actions. All systems are operational.
                </div>
              ) : (
                expandedActionQueue.map(item => (
                  <div key={item.queueId} className="p-5 hover:bg-blue-50/50 transition flex justify-between items-center border-l-4" style={{ borderLeftColor: item.badgeColor.includes('red') ? '#ef4444' : item.badgeColor.includes('yellow') ? '#eab308' : '#f97316' }}>
                    <div>
                      <span className="font-bold text-gray-900 text-xs block">{item.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono mt-1 block bg-gray-50 inline-block px-1.5 py-0.5 rounded">S/N: {item.serial}</span>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                        {item.displayStatus}
                      </span>
                      {item.displayDate && (
                        <div className="mt-1.5 text-[10px] text-gray-500 font-mono">
                          Due: {item.displayDate}
                        </div>
                      )}
                      <button onClick={() => openPmModal(item)} className="block w-full text-right mt-2 text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">
                        Execute PM &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h4 className="font-bold text-xs text-[#005596] uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Operator Duty Board</h4>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center space-x-4 shadow-inner">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${isSystemAdmin ? 'bg-[#005596]/10 text-[#005596] border border-[#005596]/20' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
                {isSystemAdmin ? 'SYS' : 'OP'}
              </div>
              <div>
                <span className="block text-sm font-bold text-gray-900 font-sans">{currentUser.name}</span>
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">{currentUser.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}