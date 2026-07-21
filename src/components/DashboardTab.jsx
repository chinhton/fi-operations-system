import React from 'react';

export default function DashboardTab({
  operationalCount, overdueCount, calibrationCount, correctiveCount,
  openPmModal, currentUser, isSystemAdmin, triggerEmailAlert,
  workOrders, pmTemplates, assets 
}) {
  
  // --- 1. PROCESS USER ASSIGNED TASKS ---
  const assignedWorkOrders = (workOrders || []).filter(wo => 
    (wo.operatorEmail === currentUser.email || wo.managerEmail === currentUser.email) && 
    wo.status !== "Completed"
  );

  const assignedTemplates = (pmTemplates || []).filter(t => 
    t.operatorEmail === currentUser.email || t.managerEmail === currentUser.email
  );

  const myAssignedTasks = [...assignedWorkOrders, ...assignedTemplates];

  // TRIAGE: Split User Tasks into Critical vs. Upcoming
  const criticalStatuses = ["Maintenance Due", "Out of Calibration", "Corrective Action", "Corrective Maintenance", "Overdue"];
  
  const overdueMyTasks = myAssignedTasks.filter(task => criticalStatuses.includes(task.status));
  const upcomingMyTasks = myAssignedTasks.filter(task => !criticalStatuses.includes(task.status));


  // --- 2. PROCESS GLOBAL ADMIN QUEUE ---
  const adminGlobalQueue = [];
  
  if (assets) {
    assets.forEach(asset => {
      if (asset.operatorEmail || asset.status !== "Operational") {
        adminGlobalQueue.push({
          queueId: `ast-${asset.id}`,
          name: asset.name,
          serial: asset.serial || "N/A",
          badgeColor: asset.status === "Operational" ? "bg-green-100 text-green-800" :
                      asset.status === "Maintenance Due" ? "bg-yellow-100 text-yellow-800" :
                      asset.status === "Out of Calibration" ? "bg-red-100 text-red-800" :
                      "bg-orange-100 text-orange-800",
          displayStatus: asset.status,
          displayDate: asset.lastPmDate ? new Date(asset.lastPmDate).toLocaleDateString() : "N/A",
          assignedTo: asset.operatorEmail || "Unassigned",
          rawItem: asset,
          type: 'asset'
        });
      }
    });
  }

  if (pmTemplates) {
    pmTemplates.forEach(pm => {
      if (pm.operatorEmail) {
        adminGlobalQueue.push({
          queueId: `pm-${pm.id}`,
          name: pm.title || pm.name || "PM Configuration Task",
          serial: pm.targetAsset || "General Assignment",
          badgeColor: "bg-blue-100 text-[#005596]",
          displayStatus: pm.status || "Active Task",
          displayDate: "Recurring Schedule",
          assignedTo: pm.operatorEmail,
          rawItem: pm,
          type: 'pm'
        });
      }
    });
  }

  // TRIAGE: Split Admin Tasks into Critical vs. Upcoming
  const overdueAdminQueue = adminGlobalQueue.filter(item => criticalStatuses.includes(item.displayStatus));
  const upcomingAdminQueue = adminGlobalQueue.filter(item => !criticalStatuses.includes(item.displayStatus));

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
        
        {/* Left Column: Queues */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* --- GOD VIEW: ONLY RENDERS FOR ADMINS --- */}
          {isSystemAdmin && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-900">
                <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">Global Maintenance Actions Queue (Admin)</h3>
                {adminGlobalQueue.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">{adminGlobalQueue.length} Total</span>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto bg-gray-50/30">
                {adminGlobalQueue.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs font-medium bg-white">
                    No pending maintenance actions. All systems are operational.
                  </div>
                ) : (
                  <>
                    {/* ADMIN TRIAGE: OVERDUE SECTION */}
                    {overdueAdminQueue.length > 0 && (
                      <div className="bg-red-50 text-red-800 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-red-200 shadow-sm flex justify-between">
                        <span>🚨 Critical & Overdue Action Required</span>
                        <span>{overdueAdminQueue.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {overdueAdminQueue.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-red-50/30 transition flex justify-between items-center border-l-4" style={{ borderLeftColor: item.badgeColor.includes('red') ? '#ef4444' : '#eab308' }}>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">
                                OP: {item.assignedTo}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            {item.displayDate && (
                              <div className="mb-2 text-[10px] text-red-600 font-mono font-bold">
                                Due: {item.displayDate}
                              </div>
                            )}
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "SENT ✓";
                                  e.target.classList.add("text-green-600");
                                  triggerEmailAlert(
                                    item.assignedTo !== "Unassigned" ? item.assignedTo : "admin@fcimg.com",
                                    `URGENT REMINDER: Critical Action Required for ${item.name}`,
                                    `Hello,\n\nThis is an administrative reminder that ${item.name} (S/N: ${item.serial}) is currently flagged as ${item.displayStatus.toUpperCase()} and requires your immediate attention.\n\nPlease log into the FI-Operations Management System to execute the PM and clear this critical assignment from the global queue.`
                                  );
                                }} 
                                className="block text-right text-[10px] text-orange-600 font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                🔔 Remind Operator
                              </button>
                              
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">
                                  Execute PM &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ADMIN TRIAGE: UPCOMING SECTION */}
                    {upcomingAdminQueue.length > 0 && (
                      <div className="bg-blue-50 text-[#005596] text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-blue-200 shadow-sm flex justify-between">
                        <span>📅 Upcoming & Pending Tasks</span>
                        <span>{upcomingAdminQueue.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {upcomingAdminQueue.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-blue-50/30 transition flex justify-between items-center border-l-4 border-[#00A1E4]">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">
                                OP: {item.assignedTo}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            {item.displayDate && (
                              <div className="mb-2 text-[10px] text-gray-500 font-mono">
                                Due: {item.displayDate}
                              </div>
                            )}
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "SENT ✓";
                                  e.target.classList.add("text-green-600");
                                  triggerEmailAlert(
                                    item.assignedTo !== "Unassigned" ? item.assignedTo : "admin@fcimg.com",
                                    `REMINDER: Routine Task Pending for ${item.name}`,
                                    `Hello,\n\nThis is an administrative reminder regarding ${item.name} (S/N: ${item.serial}).\n\nCurrent Status: ${item.displayStatus}\n\nPlease log into the FI-Operations Management System to clear this assignment from your queue.`
                                  );
                                }} 
                                className="block text-right text-[10px] text-[#00A1E4] font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                ✉️ Send Reminder
                              </button>
                              
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">
                                  Execute PM &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* ----------------------------------------- */}


          {/* DAY-TO-DAY VIEW: RENDERS FOR EVERYONE */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#005596] to-[#00407a] text-white px-6 py-4 flex items-center justify-between border-b border-[#003058]">
              <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">My Assigned Tasks</h3>
              {myAssignedTasks.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">{myAssignedTasks.length} Total</span>
              )}
            </div>
            
            <div className="max-h-[500px] overflow-y-auto bg-gray-50/30">
              {myAssignedTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-medium bg-white">
                  You have no pending assignments in your queue.
                </div>
              ) : (
                <>
                  {/* USER TRIAGE: OVERDUE SECTION */}
                  {overdueMyTasks.length > 0 && (
                    <div className="bg-red-50 text-red-800 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-red-200 shadow-sm flex justify-between">
                      <span>🚨 Critical & Overdue Action Required</span>
                      <span>{overdueMyTasks.length} Items</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 bg-white">
                    {overdueMyTasks.map(task => (
                      <div key={task.id} className="p-5 hover:bg-red-50/30 transition flex justify-between items-center border-l-4 border-red-500">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-900 text-sm block">{task.title || task.name}</span>
                            <span className="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              {task.status || "Overdue"}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4">
                            <span><strong>ID:</strong> {task.id}</span>
                            <span><strong>Target:</strong> {task.targetAsset || task.targetCategory || "General"}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <button 
                            onClick={() => {
                              const associatedAsset = (assets || []).find(a => a.name === task.targetAsset || a.category === task.targetCategory) || task;
                              openPmModal(associatedAsset);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                          >
                            Execute Critical PM
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* USER TRIAGE: UPCOMING SECTION */}
                  {upcomingMyTasks.length > 0 && (
                    <div className="bg-blue-50 text-[#005596] text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-blue-200 shadow-sm flex justify-between">
                      <span>📅 Upcoming & Pending Tasks</span>
                      <span>{upcomingMyTasks.length} Items</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 bg-white">
                    {upcomingMyTasks.map(task => (
                      <div key={task.id} className="p-5 hover:bg-blue-50/50 transition flex justify-between items-center border-l-4 border-[#00A1E4]">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-900 text-sm block">{task.title || task.name}</span>
                            <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              {task.status || "Pending"}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4">
                            <span><strong>ID:</strong> {task.id}</span>
                            <span><strong>Target:</strong> {task.targetAsset || task.targetCategory || "General"}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <button 
                            onClick={() => {
                              const associatedAsset = (assets || []).find(a => a.name === task.targetAsset || a.category === task.targetCategory) || task;
                              openPmModal(associatedAsset);
                            }}
                            className="bg-[#00A1E4] hover:bg-[#005596] text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                          >
                            Open Assignment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Operator Info & Secondary Data */}
        <div className="lg:col-span-4 space-y-6">
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