import React from 'react';

export default function DashboardTab({
  operationalCount, overdueCount, calibrationCount, correctiveCount,
  expandedActionQueue, openPmModal, currentUser, isSystemAdmin,
  workOrders // <--- ADDED: Catching the master work order list
}) {
  
  // --- NEW: Filter tasks specifically assigned to this operator ---
  const myAssignedTasks = (workOrders || []).filter(wo => 
    wo.operatorEmail === currentUser.email && 
    wo.status !== "Completed"
  );
  // --------------------------------------------------------------

  return (
    <div className="space-y-8 animate-entrance">
      {/* KPI Banners */}
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
        
        {/* Left Column: Master Queue */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#005596] to-[#00407a] text-white px-6 py-4 flex items-center justify-between border-b border-[#003058]">
              <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">Global Maintenance Actions Queue</h3>
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

        {/* Right Column: Operator Duty Board & Personal Queue */}
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

          {/* --- NEW: My Assigned PM Tasks Inbox --- */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">My Assigned Tasks</h3>
              <span className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{myAssignedTasks.length}</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
              {myAssignedTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-medium">
                  You have no pending assignments in your queue.
                </div>
              ) : (
                myAssignedTasks.map(task => (
                  <div key={task.id} className="p-5 hover:bg-slate-50 transition border-l-4 border-[#00A1E4]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-900 text-xs block">{task.title || task.name}</span>
                      <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ml-2">
                        {task.status || "Pending"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mb-3 bg-gray-50 p-2 rounded border border-gray-100">
                      <strong>Task ID:</strong> {task.id} <br/>
                      <strong>Target:</strong> {task.targetAsset || task.targetCategory || "General"}
                    </div>
                    <button className="w-full bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm">
                      Open Assignment
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* --------------------------------------- */}

        </div>
      </div>
    </div>
  );
}