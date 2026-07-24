import React from 'react';

export default function DashboardTab({
  operationalCount, overdueCount, calibrationCount, correctiveCount,
  openPmModal, currentUser, isSystemAdmin, triggerTeamsAlert,
  workOrders, assets, pmTemplates, calculateDaysRemaining,
  users = []
}) {
  
  const adminGlobalQueue = [];
  const userAssignedTasks = [];
  const managerDepartmentQueue = [];
  
  const criticalStatuses = ["Maintenance Due", "Out of Calibration", "Corrective Action", "Corrective Maintenance", "Overdue"];

  const isManager = currentUser?.role?.toLowerCase() === 'manager';

  const getManagerForDepartment = (dept) => {
    if (!users || users.length === 0 || !dept || dept === "Unassigned") return "admin@fcimg.com";
    const manager = users.find(u => u.department === dept && u.role === "Manager");
    return manager ? manager.email : "admin@fcimg.com";
  };

  if (assets && calculateDaysRemaining) {
    assets.forEach(asset => {
      let isDueOrCritical = false;
      let dueMessage = "";
      let isCriticalStatus = criticalStatuses.includes(asset.status);

      if (isCriticalStatus) {
          isDueOrCritical = true;
          dueMessage = "Immediate Action Required";
      } else {
          const assetTemplates = (pmTemplates || []).filter(t => t.targetCategory === "Global" || t.targetCategory === asset.category);
          const freqs = [...new Set(assetTemplates.map(t => t.interval))];
          
          let lowestDays = null;
          
          // THE FIX: Standardized formatting to perfectly match the database ("Jul 24, 2026")
          const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          
          freqs.forEach(freq => {
              const targetDate = asset.pmDates?.[freq] || asset.lastPmDate;
              
              // If it was completed today, clear it from the queue immediately
              if (targetDate === todayStr) {
                  return; 
              }

              const effectiveDate = targetDate ? targetDate : todayStr;
              const daysLeft = calculateDaysRemaining(effectiveDate, freq);
              
              if (daysLeft !== null && (lowestDays === null || daysLeft < lowestDays)) {
                  lowestDays = daysLeft;
              }
          });

          if (lowestDays !== null && lowestDays <= 7) {
              isDueOrCritical = true;
              dueMessage = lowestDays < 0 ? `Overdue by ${Math.abs(lowestDays)} days` : `Due in ${lowestDays} days`;
              if (lowestDays <= 0) isCriticalStatus = true; 
          }
      }

      if (isDueOrCritical) {
        const queueItem = {
          queueId: `ast-${asset.id}`,
          name: asset.name,
          serial: asset.serial || "N/A",
          department: asset.department || "Unassigned",
          badgeColor: isCriticalStatus ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800",
          displayStatus: isCriticalStatus ? (asset.status !== "Operational" ? asset.status : "Overdue") : "Pending PM",
          displayDate: dueMessage,
          assignedTo: asset.operatorEmail || "Unassigned",
          rawItem: asset,
          type: 'asset',
          isCritical: isCriticalStatus
        };

        adminGlobalQueue.push(queueItem);
        
        if (asset.operatorEmail && asset.operatorEmail.toLowerCase().includes(currentUser.email.toLowerCase())) { 
            userAssignedTasks.push(queueItem); 
        }
        
        if (isManager && asset.department === currentUser.department) { 
            managerDepartmentQueue.push(queueItem); 
        }
      }
    });
  }

  if (workOrders) {
    workOrders.forEach(wo => {
      if (wo.status !== "Completed") {
        const isCritical = criticalStatuses.includes(wo.status);
        const queueItem = {
          queueId: `wo-${wo.id}`,
          name: wo.title || `Work Order ${wo.id}`,
          serial: wo.targetAsset || "N/A",
          department: wo.department || "Unassigned",
          badgeColor: isCritical ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800",
          displayStatus: wo.status,
          displayDate: wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "Pending",
          assignedTo: wo.operatorEmail || "Unassigned",
          rawItem: wo,
          type: 'wo',
          isCritical: isCritical
        };

        adminGlobalQueue.push(queueItem);
        
        const isAssignedOp = wo.operatorEmail && wo.operatorEmail.toLowerCase().includes(currentUser.email.toLowerCase());
        const isAssignedMgr = wo.managerEmail && wo.managerEmail.toLowerCase().includes(currentUser.email.toLowerCase());
        
        if (isAssignedOp || isAssignedMgr) { 
            userAssignedTasks.push(queueItem); 
        }
        
        if (isManager && wo.department === currentUser.department) { 
            managerDepartmentQueue.push(queueItem); 
        }
      }
    });
  }

  const overdueAdminQueue = adminGlobalQueue.filter(item => item.isCritical);
  const upcomingAdminQueue = adminGlobalQueue.filter(item => !item.isCritical);

  const overdueManagerQueue = managerDepartmentQueue.filter(item => item.isCritical);
  const upcomingManagerQueue = managerDepartmentQueue.filter(item => !item.isCritical);

  const overdueMyTasks = userAssignedTasks.filter(item => item.isCritical);
  const upcomingMyTasks = userAssignedTasks.filter(item => !item.isCritical);

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
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">
                                DEPT: {item.department}
                              </span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">
                                OP: {item.assignedTo}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            {item.displayDate && (
                              <div className="mb-2 text-[10px] text-red-600 font-mono font-bold">
                                {item.displayDate}
                              </div>
                            )}
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "ESCALATED ✓";
                                  e.target.classList.add("text-green-600");
                                  const managerEmail = getManagerForDepartment(item.department);
                                  
                                  triggerTeamsAlert(
                                    managerEmail,
                                    `MANAGER ESCALATION: Critical Action Required for ${item.name}`,
                                    `Hello,\n\nThis is an administrative escalation. The system ${item.name} (S/N: ${item.serial}) in the ${item.department} department is currently flagged as ${item.displayStatus.toUpperCase()} and requires your immediate oversight.\n\nAssigned Operator(s): ${item.assignedTo}\n\nPlease review this in the FI-Operations Management System to ensure compliance.`
                                  );
                                }} 
                                className="block text-right text-[10px] text-orange-600 font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                🔔 Alert Manager
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
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">
                                DEPT: {item.department}
                              </span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">
                                OP: {item.assignedTo}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            {item.displayDate && (
                              <div className="mb-2 text-[10px] text-gray-500 font-mono">
                                {item.displayDate}
                              </div>
                            )}
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "NOTIFIED ✓";
                                  e.target.classList.add("text-green-600");
                                  const managerEmail = getManagerForDepartment(item.department);

                                  triggerTeamsAlert(
                                    managerEmail,
                                    `MANAGER NOTICE: Routine Task Pending for ${item.name}`,
                                    `Hello,\n\nThis is a notification regarding ${item.name} (S/N: ${item.serial}) in the ${item.department} department.\n\nCurrent Status: ${item.displayStatus}\nAssigned Operator(s): ${item.assignedTo}\n\nPlease ensure your team completes this assignment on schedule.`
                                  );
                                }} 
                                className="block text-right text-[10px] text-[#00A1E4] font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                ✉️ Notify Manager
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
          
          {/* --- MANAGER VIEW: RENDERS FOR DEPARTMENT MANAGERS --- */}
          {!isSystemAdmin && isManager && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-900">
                <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">{currentUser.department} - Team Operations Queue</h3>
                {managerDepartmentQueue.length > 0 && (
                  <span className="bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">{managerDepartmentQueue.length} Total</span>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto bg-gray-50/30">
                {managerDepartmentQueue.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs font-medium bg-white">
                    No pending maintenance actions for your department. All systems are operational.
                  </div>
                ) : (
                  <>
                    {overdueManagerQueue.length > 0 && (
                      <div className="bg-red-50 text-red-800 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-red-200 shadow-sm flex justify-between">
                        <span>🚨 Critical & Overdue Action Required</span>
                        <span>{overdueManagerQueue.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {overdueManagerQueue.map(item => (
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
                                {item.displayDate}
                              </div>
                            )}
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "SENT ✓";
                                  e.target.classList.add("text-green-600");
                                  
                                  const primaryOperator = item.assignedTo !== "Unassigned" ? item.assignedTo.split(',')[0].trim() : "admin@fcimg.com";
                                  
                                  triggerTeamsAlert(
                                    primaryOperator,
                                    `URGENT MANAGER REMINDER: Critical Action Required for ${item.name}`,
                                    `Hello,\n\nThis is a priority reminder from your department manager. The system ${item.name} (S/N: ${item.serial}) is currently flagged as ${item.displayStatus.toUpperCase()}.\n\nPlease log into the FI-Operations Management System and execute this task immediately to maintain compliance.`
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

                    {upcomingManagerQueue.length > 0 && (
                      <div className="bg-blue-50 text-[#005596] text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-blue-200 shadow-sm flex justify-between">
                        <span>📅 Upcoming & Pending Tasks</span>
                        <span>{upcomingManagerQueue.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {upcomingManagerQueue.map(item => (
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
                                {item.displayDate}
                              </div>
                            )}
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "NOTIFIED ✓";
                                  e.target.classList.add("text-green-600");
                                  
                                  const primaryOperator = item.assignedTo !== "Unassigned" ? item.assignedTo.split(',')[0].trim() : "admin@fcimg.com";
                                  
                                  triggerTeamsAlert(
                                    primaryOperator,
                                    `MANAGER REMINDER: Routine Task Pending for ${item.name}`,
                                    `Hello,\n\nThis is a standard reminder from your department manager regarding ${item.name} (S/N: ${item.serial}).\n\nCurrent Status: ${item.displayStatus}\n\nPlease ensure this assignment is completed on schedule.`
                                  );
                                }} 
                                className="block text-right text-[10px] text-[#00A1E4] font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                ✉️ Remind Operator
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


          {/* DAY-TO-DAY VIEW: RENDERS FOR EVERYONE */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#005596] to-[#00407a] text-white px-6 py-4 flex items-center justify-between border-b border-[#003058]">
              <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">My Assigned Tasks</h3>
              {userAssignedTasks.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">{userAssignedTasks.length} Total</span>
              )}
            </div>
            
            <div className="max-h-[500px] overflow-y-auto bg-gray-50/30">
              {userAssignedTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-medium bg-white">
                  You have no pending assignments in your queue.
                </div>
              ) : (
                <>
                  {overdueMyTasks.length > 0 && (
                    <div className="bg-red-50 text-red-800 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-red-200 shadow-sm flex justify-between">
                      <span>🚨 Critical & Overdue Action Required</span>
                      <span>{overdueMyTasks.length} Items</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 bg-white">
                    {overdueMyTasks.map(task => (
                      <div key={task.queueId} className="p-5 hover:bg-red-50/30 transition flex justify-between items-center border-l-4 border-red-500">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-900 text-sm block">{task.name}</span>
                            <span className="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              {task.displayStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4">
                            <span><strong>Target:</strong> {task.serial}</span>
                            <span><strong>Note:</strong> {task.displayDate}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <button 
                            onClick={() => { openPmModal(task.rawItem); }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                          >
                            Execute Critical PM
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {upcomingMyTasks.length > 0 && (
                    <div className="bg-blue-50 text-[#005596] text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-blue-200 shadow-sm flex justify-between">
                      <span>📅 Upcoming & Pending Tasks</span>
                      <span>{upcomingMyTasks.length} Items</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 bg-white">
                    {upcomingMyTasks.map(task => (
                      <div key={task.queueId} className="p-5 hover:bg-blue-50/50 transition flex justify-between items-center border-l-4 border-[#00A1E4]">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-900 text-sm block">{task.name}</span>
                            <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              {task.displayStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4">
                            <span><strong>Target:</strong> {task.serial}</span>
                            <span><strong>Note:</strong> {task.displayDate}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <button 
                            onClick={() => { openPmModal(task.rawItem); }}
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${isSystemAdmin ? 'bg-[#005596]/10 text-[#005596] border border-[#005596]/20' : isManager ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
                {isSystemAdmin ? 'SYS' : isManager ? 'MGR' : 'OP'}
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