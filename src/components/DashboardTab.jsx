import React from 'react';

export default function DashboardTab({
  openPmModal, currentUser, isSystemAdmin, triggerTeamsAlert,
  assets, pmTemplates, calculateDaysRemaining, users = []
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

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const isToday = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false; 
      d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
  };

  const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (assets && calculateDaysRemaining) {
    assets.forEach(asset => {
      let taskCategory = null; 
      let dueMessage = "";
      let isCriticalStatus = criticalStatuses.includes(asset.status);
      
      const assetTemplates = (pmTemplates || []).filter(t => t.targetCategory === "Global" || t.targetCategory === asset.category);
      const freqs = [...new Set(assetTemplates.map(t => t.interval))];
      
      let lowestDays = null;
      let targetTemplate = null; 
      
      freqs.forEach(freq => {
          const explicitLastDone = asset.pmDates?.[freq];
          if (isToday(explicitLastDone)) return;

          const baselineDate = explicitLastDone || asset.lastPmDate || todayStr;
          const daysLeft = calculateDaysRemaining(baselineDate, freq);
          
          if (daysLeft !== null && (lowestDays === null || daysLeft < lowestDays)) {
              lowestDays = daysLeft;
              targetTemplate = assetTemplates.find(t => t.interval === freq); 
          }
      });

      if (isCriticalStatus) {
          taskCategory = 'Critical';
          dueMessage = "Immediate Action Required";
      } else if (lowestDays !== null) {
          if (lowestDays < 0) {
              taskCategory = 'Critical';
              dueMessage = `Overdue by ${Math.abs(lowestDays)} days`;
              isCriticalStatus = true;
          } else if (lowestDays <= 5) {
              taskCategory = 'Upcoming';
              dueMessage = `Due in ${lowestDays} days`;
          } else if (lowestDays <= 30) {
              taskCategory = 'Pending';
              dueMessage = `Due in ${lowestDays} days`;
          }
      }

      if (taskCategory) {
        const queueItem = {
          queueId: `ast-${asset.id}`,
          name: asset.name,
          serial: asset.serial || "N/A",
          department: asset.department || "Unassigned",
          badgeColor: isCriticalStatus ? "bg-red-100 text-red-800" : (taskCategory === 'Upcoming' ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"),
          displayStatus: isCriticalStatus ? (asset.status !== "Operational" ? asset.status : "Overdue") : (taskCategory === 'Upcoming' ? "Upcoming PM" : "Pending PM"),
          displayDate: dueMessage,
          assignedTo: asset.operatorEmail || "Unassigned",
          rawItem: asset,
          type: 'asset',
          isCritical: isCriticalStatus,
          taskCategory: taskCategory,
          targetTemplate: targetTemplate 
        };

        adminGlobalQueue.push(queueItem);
        
        const isAssignedToMe = asset.operatorEmail && asset.operatorEmail.toLowerCase().includes(currentUser.email.toLowerCase());
        const isUnassignedInMyDept = (!asset.operatorEmail || asset.operatorEmail === "Unassigned") && asset.department === currentUser.department;
        
        if (isAssignedToMe || (!isManager && !isSystemAdmin && isUnassignedInMyDept)) { 
            userAssignedTasks.push(queueItem); 
        }
        
        if (isManager && asset.department === currentUser.department) { 
            managerDepartmentQueue.push(queueItem); 
        }
      }
    });
  }

  const adminCritical = adminGlobalQueue.filter(item => item.taskCategory === 'Critical');
  const adminUpcoming = adminGlobalQueue.filter(item => item.taskCategory === 'Upcoming');
  const adminPending = adminGlobalQueue.filter(item => item.taskCategory === 'Pending');

  const managerCritical = managerDepartmentQueue.filter(item => item.taskCategory === 'Critical');
  const managerUpcoming = managerDepartmentQueue.filter(item => item.taskCategory === 'Upcoming');
  const managerPending = managerDepartmentQueue.filter(item => item.taskCategory === 'Pending');

  const myCritical = userAssignedTasks.filter(item => item.taskCategory === 'Critical');
  const myUpcoming = userAssignedTasks.filter(item => item.taskCategory === 'Upcoming');
  const myPending = userAssignedTasks.filter(item => item.taskCategory === 'Pending');

  return (
    <div className="space-y-8 animate-entrance w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                    {adminCritical.length > 0 && (
                      <div className="bg-red-50 text-red-800 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-red-200 shadow-sm flex justify-between">
                        <span>🚨 Critical & Overdue Action Required</span>
                        <span>{adminCritical.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {adminCritical.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-red-50/30 transition flex justify-between items-center border-l-4" style={{ borderLeftColor: item.badgeColor.includes('red') ? '#ef4444' : '#eab308' }}>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                              {item.targetTemplate && (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                  {item.targetTemplate.interval}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">DEPT: {item.department}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-red-600 font-mono font-bold">{item.displayDate}</div>
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "ESCALATED ✓"; e.target.classList.add("text-green-600");
                                  triggerTeamsAlert(getManagerForDepartment(item.department), `MANAGER ESCALATION: Critical Action Required for ${item.name}`, `Hello,\n\nThe system ${item.name} (S/N: ${item.serial}) is ${item.displayStatus.toUpperCase()}.\nAssigned: ${item.assignedTo}`);
                                }} 
                                className="block text-right text-[10px] text-orange-600 font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                🔔 Alert Manager ({getManagerForDepartment(item.department)})
                              </button>
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {adminUpcoming.length > 0 && (
                      <div className="bg-blue-50 text-[#005596] text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-blue-200 shadow-sm flex justify-between">
                        <span>📅 Upcoming Tasks (0 - 5 Days)</span>
                        <span>{adminUpcoming.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {adminUpcoming.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-blue-50/30 transition flex justify-between items-center border-l-4 border-[#00A1E4]">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                              {item.targetTemplate && (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                  {item.targetTemplate.interval}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">DEPT: {item.department}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-[#005596] font-mono font-bold">{item.displayDate}</div>
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "NOTIFIED ✓"; e.target.classList.add("text-green-600");
                                  triggerTeamsAlert(getManagerForDepartment(item.department), `MANAGER NOTICE: Routine Task Pending for ${item.name}`, `Hello,\n\nStatus: ${item.displayStatus}\nAssigned: ${item.assignedTo}`);
                                }} 
                                className="block text-right text-[10px] text-[#00A1E4] font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                ✉️ Notify Manager ({getManagerForDepartment(item.department)})
                              </button>
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {adminPending.length > 0 && (
                      <div className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-slate-300 shadow-sm flex justify-between">
                        <span>🗓️ Pending Tasks (6 - 30 Days)</span>
                        <span>{adminPending.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white opacity-80 hover:opacity-100 transition-opacity">
                      {adminPending.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-slate-50 transition flex justify-between items-center border-l-4 border-slate-300">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-700 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                              {item.targetTemplate && (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                  {item.targetTemplate.interval}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">DEPT: {item.department}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-slate-500 font-mono font-bold">{item.displayDate}</div>
                            {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-slate-500 font-extrabold uppercase tracking-wider hover:underline transition-all">View Details &rarr;</button>
                            )}
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
                    {managerCritical.length > 0 && (
                      <div className="bg-red-50 text-red-800 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-red-200 shadow-sm flex justify-between">
                        <span>🚨 Critical & Overdue Action Required</span>
                        <span>{managerCritical.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {managerCritical.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-red-50/30 transition flex justify-between items-center border-l-4" style={{ borderLeftColor: item.badgeColor.includes('red') ? '#ef4444' : '#eab308' }}>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                              {item.targetTemplate && (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                  {item.targetTemplate.interval}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-red-600 font-mono font-bold">{item.displayDate}</div>
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "SENT ✓"; e.target.classList.add("text-green-600");
                                  triggerTeamsAlert(item.assignedTo.split(',')[0].trim(), `URGENT MANAGER REMINDER: Critical Action Required for ${item.name}`, `Please log in and execute this task immediately.`);
                                }} 
                                className="block text-right text-[10px] text-orange-600 font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                🔔 Remind Operator
                              </button>
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {managerUpcoming.length > 0 && (
                      <div className="bg-blue-50 text-[#005596] text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-blue-200 shadow-sm flex justify-between">
                        <span>📅 Upcoming Tasks (0 - 5 Days)</span>
                        <span>{managerUpcoming.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {managerUpcoming.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-blue-50/30 transition flex justify-between items-center border-l-4 border-[#00A1E4]">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                              {item.targetTemplate && (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                  {item.targetTemplate.interval}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-[#005596] font-mono font-bold">{item.displayDate}</div>
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "NOTIFIED ✓"; e.target.classList.add("text-green-600");
                                  triggerTeamsAlert(item.assignedTo.split(',')[0].trim(), `MANAGER REMINDER: Routine Task Pending for ${item.name}`, `Current Status: ${item.displayStatus}\nPlease ensure completion.`);
                                }} 
                                className="block text-right text-[10px] text-[#00A1E4] font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                ✉️ Remind Operator
                              </button>
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {managerPending.length > 0 && (
                      <div className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-slate-300 shadow-sm flex justify-between">
                        <span>🗓️ Pending Tasks (6 - 30 Days)</span>
                        <span>{managerPending.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white opacity-80 hover:opacity-100 transition-opacity">
                      {managerPending.map(item => (
                        <div key={item.queueId} className="p-5 hover:bg-slate-50 transition flex justify-between items-center border-l-4 border-slate-300">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-700 text-sm block">{item.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                              {item.targetTemplate && (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                  {item.targetTemplate.interval}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">S/N: {item.serial}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-slate-500 font-mono font-bold">{item.displayDate}</div>
                            {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-slate-500 font-extrabold uppercase tracking-wider hover:underline transition-all">View Details &rarr;</button>
                            )}
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
                  {myCritical.length > 0 && (
                    <div className="bg-red-50 text-red-800 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-red-200 shadow-sm flex justify-between">
                      <span>🚨 Critical & Overdue Action Required</span>
                      <span>{myCritical.length} Items</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 bg-white">
                    {myCritical.map(task => (
                      <div key={task.queueId} className="p-5 hover:bg-red-50/30 transition flex justify-between items-center border-l-4 border-red-500">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-900 text-sm block">{task.name}</span>
                            <span className="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                              {task.displayStatus}
                            </span>
                            {task.targetTemplate && (
                              <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                {task.targetTemplate.interval}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4">
                            <span><strong>Target:</strong> {task.serial}</span>
                            <span className="text-red-600 font-bold"><strong>Note:</strong> {task.displayDate}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <button 
                            onClick={() => { openPmModal(task.rawItem, task.targetTemplate); }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                          >
                            Execute Critical PM
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {myUpcoming.length > 0 && (
                    <div className="bg-blue-50 text-[#005596] text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-blue-200 shadow-sm flex justify-between">
                      <span>📅 Upcoming Tasks (0 - 5 Days)</span>
                      <span>{myUpcoming.length} Items</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 bg-white">
                    {myUpcoming.map(task => (
                      <div key={task.queueId} className="p-5 hover:bg-blue-50/50 transition flex justify-between items-center border-l-4 border-[#00A1E4]">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-900 text-sm block">{task.name}</span>
                            <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                              {task.displayStatus}
                            </span>
                            {task.targetTemplate && (
                              <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                {task.targetTemplate.interval}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4">
                            <span><strong>Target:</strong> {task.serial}</span>
                            <span className="text-[#005596] font-bold"><strong>Note:</strong> {task.displayDate}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <button 
                            onClick={() => { openPmModal(task.rawItem, task.targetTemplate); }}
                            className="bg-[#00A1E4] hover:bg-[#005596] text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                          >
                            Open Assignment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {myPending.length > 0 && (
                    <div className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-slate-300 shadow-sm flex justify-between">
                      <span>🗓️ Pending Tasks (6 - 30 Days)</span>
                      <span>{myPending.length} Items</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 bg-white opacity-80 hover:opacity-100 transition-opacity">
                    {myPending.map(task => (
                      <div key={task.queueId} className="p-5 hover:bg-slate-50 transition flex justify-between items-center border-l-4 border-slate-300">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-700 text-sm block">{task.name}</span>
                            <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                              {task.displayStatus}
                            </span>
                            {task.targetTemplate && (
                              <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                                {task.targetTemplate.interval}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4">
                            <span><strong>Target:</strong> {task.serial}</span>
                            <span className="text-slate-500 font-bold"><strong>Note:</strong> {task.displayDate}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <button 
                            onClick={() => { openPmModal(task.rawItem, task.targetTemplate); }}
                            className="text-slate-600 hover:text-slate-900 border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                          >
                            View Details
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