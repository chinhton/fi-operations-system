import React, { useState } from 'react';

export default function DashboardTab({
  openPmModal, currentUser, isSystemAdmin, triggerTeamsAlert,
  assets, pmTemplates, calculateDaysRemaining, users = []
}) {
  
  const adminGlobalQueue = [];
  const userAssignedTasks = [];
  const managerDepartmentQueue = [];
  
  const [activeRoute, setActiveRoute] = useState(null);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  
  const [routeAnswers, setRouteAnswers] = useState({});

  const criticalStatuses = ["Maintenance Due", "Out of Calibration", "Corrective Maintenance"];
  const isManager = currentUser?.role?.toLowerCase() === 'manager';

  const getManagerForDepartment = (dept) => {
    if (!users || users.length === 0 || !dept || dept === "Unassigned") return "admin@fcimg.com";
    const deptArray = Array.isArray(dept) ? dept : [dept];
    const managers = users.filter(u => deptArray.includes(u.department) && u.role === "Manager").map(u => u.email);
    return managers.length > 0 ? managers.join(';') : "admin@fcimg.com";
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

  const isCategoryMatch = (templateCat, assetCat) => {
    if (!templateCat) return false;
    if (templateCat === "Global" || (Array.isArray(templateCat) && templateCat.includes("Global"))) return true;
    if (Array.isArray(templateCat)) return templateCat.includes(assetCat);
    return templateCat === assetCat;
  };

  const openRouteModal = (task) => {
    setActiveRoute(task);
    setRouteAnswers({}); 
  };

  // --- ADDED: ADMIN SWEEP TRIGGER ---
  const handleTestSweep = async () => {
    if (!window.confirm("Fire the daily sweep right now? This will send live Teams messages to operators with overdue assets.")) return;
    
    try {
      const response = await fetch('/api/dailySweep', { method: 'POST' });
      const result = await response.text();
      
      alert(`Sweep Complete: ${result}`);
    } catch (err) {
      console.error("Sweep trigger failed:", err);
      alert("Failed to trigger the sweep. Check the console.");
    }
  };

  if (assets && pmTemplates && calculateDaysRemaining) {
    
    // ==========================================
    // GROUPED ROUTES
    // ==========================================
    const routeTemplates = pmTemplates.filter(t => t.executionMode === 'route');
    routeTemplates.forEach(template => {
        const mappedAssets = assets.filter(a => a.status !== "Inactive" && isCategoryMatch(template.targetCategory, a.category));
        if (mappedAssets.length === 0) return;

        let lowestDays = null;
        let isCriticalStatus = false;
        
        mappedAssets.forEach(asset => {
            const explicitLastDone = asset.pmDates?.[template.interval];
            if (isToday(explicitLastDone)) return; 

            let daysLeft = 0; 
            if (explicitLastDone) {
                daysLeft = calculateDaysRemaining(explicitLastDone, template.interval);
            }
            
            if (daysLeft !== null && (lowestDays === null || daysLeft < lowestDays)) {
                lowestDays = daysLeft;
            }
            if (criticalStatuses.includes(asset.status)) isCriticalStatus = true;
        });

        if (lowestDays === null && !isCriticalStatus) return; 

        let taskCategory = null;
        let dueMessage = "";

        if (isCriticalStatus || lowestDays < 0) {
            taskCategory = 'Critical';
            dueMessage = lowestDays < 0 ? `Overdue by ${Math.abs(lowestDays)} days` : "Immediate Action Required";
            isCriticalStatus = true;
        } else if (lowestDays <= 5) {
            taskCategory = 'Upcoming';
            dueMessage = lowestDays === 0 ? "Due Today" : `Due in ${lowestDays} days`;
        } else if (lowestDays <= 30) {
            taskCategory = 'Pending';
            dueMessage = `Due in ${lowestDays} days`;
        }

        if (taskCategory) {
            const queueItem = {
                queueId: `route-${template.id}`,
                name: template.name,
                serial: `${mappedAssets.length} Targeted Assets`,
                department: template.department || "Global",
                badgeColor: isCriticalStatus ? "bg-purple-100 text-purple-800" : "bg-purple-50 text-purple-700",
                displayStatus: isCriticalStatus ? "Route Overdue" : "Route Pending",
                displayDate: dueMessage,
                assignedTo: Array.isArray(template.department) ? template.department.join(', ') : "Global Route",
                rawItem: mappedAssets, 
                type: 'route',
                isCritical: isCriticalStatus,
                taskCategory: taskCategory,
                targetTemplate: template
            };

            adminGlobalQueue.push(queueItem);

            const itemDeptArray = Array.isArray(template.department) ? template.department : [template.department || "Global"];
            const mappedToMyDept = itemDeptArray.includes("Global") || itemDeptArray.includes(currentUser.department);
            const assignedToMe = mappedAssets.some(a => a.operatorEmail && a.operatorEmail.toLowerCase().includes(currentUser.email.toLowerCase()));

            if (assignedToMe || (!isManager && !isSystemAdmin && mappedToMyDept)) {
                userAssignedTasks.push(queueItem);
            }
            if (isManager && mappedToMyDept) {
                managerDepartmentQueue.push(queueItem);
            }
        }
    });

    // ==========================================
    // INDIVIDUAL ASSET PMs
    // ==========================================
    assets.forEach(asset => {
      if (asset.status === "Inactive") return;

      let taskCategory = null; 
      let dueMessage = "";
      let isCriticalStatus = criticalStatuses.includes(asset.status);
      
      const assetTemplates = pmTemplates.filter(t => t.executionMode !== 'route' && isCategoryMatch(t.targetCategory, asset.category));
      const freqs = [...new Set(assetTemplates.map(t => t.interval))];
      
      let lowestDays = null;
      let targetTemplate = null; 
      
      freqs.forEach(freq => {
          const explicitLastDone = asset.pmDates?.[freq];
          if (isToday(explicitLastDone)) return;

          let daysLeft = 0;
          if (explicitLastDone) {
              daysLeft = calculateDaysRemaining(explicitLastDone, freq);
          } else if (asset.lastPmDate) {
              daysLeft = calculateDaysRemaining(asset.lastPmDate, freq);
          }
          
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
              dueMessage = lowestDays === 0 ? "Due Today" : `Due in ${lowestDays} days`;
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
          displayStatus: isCriticalStatus ? (asset.status !== "Active" ? asset.status : "Overdue") : (taskCategory === 'Upcoming' ? "Upcoming PM" : "Pending PM"),
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
        const itemDeptArray = Array.isArray(asset.department) ? asset.department : [asset.department || "Unassigned"];
        const isUnassignedInMyDept = (!asset.operatorEmail || asset.operatorEmail === "Unassigned") && itemDeptArray.includes(currentUser.department);
        
        if (isAssignedToMe || (!isManager && !isSystemAdmin && isUnassignedInMyDept)) { 
            userAssignedTasks.push(queueItem); 
        }
        if (isManager && itemDeptArray.includes(currentUser.department)) { 
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

  const handleSubmitMasterRoute = async (e) => {
    e.preventDefault();
    setIsSavingRoute(true);

    const { rawItem: mappedAssets, targetTemplate } = activeRoute;
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const exactTimestamp = new Date().toLocaleString('en-US');

    try {
        for (const asset of mappedAssets) {
            const updatedAsset = {
                ...asset,
                pmDates: { ...(asset.pmDates || {}), [targetTemplate.interval]: todayStr }
            };
            await window.fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedAsset)
            });
        }

        const historyPayload = {
            id: `AUDIT-${Date.now().toString().slice(-4)}-${Math.floor(Math.random()*1000)}`,
            executionMode: 'route',
            assetsIncluded: mappedAssets.map(a => a.name),
            assetId: `ROUTE-${targetTemplate.id}`,
            assetName: `Grouped Route: ${targetTemplate.name}`,
            assetSerial: `${mappedAssets.length} Systems Inspected`,
            actionType: 'Facility Route Execution',
            templateName: targetTemplate.name,
            interval: targetTemplate.interval,
            performedBy: currentUser?.name || "System Operator",
            performedByEmail: currentUser?.email || "",
            date: todayStr,
            timestamp: exactTimestamp,
            status: 'Completed (Grouped Route)',
            comments: 'Facility walk completed and submitted as a single master record.',
            responses: routeAnswers 
        };

        await window.fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historyPayload)
        });

        alert("Route complete! Master Log generated and all individual asset trackers updated.");
        setActiveRoute(null);
        window.location.reload(); 

    } catch (err) {
        console.error(err);
        alert("Failed to submit master route.");
    }
    setIsSavingRoute(false);
  };

  return (
    <div className="space-y-8 animate-entrance w-full relative">
      
      {/* --- ADDED: ADMIN TEST BUTTON IN UI --- */}
      {isSystemAdmin && (
        <div className="flex justify-end mt-2">
          <button 
            onClick={handleTestSweep}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-purple-300 transition-colors shadow-sm"
          >
            🧪 Trigger Daily Sweep
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
        <div className="lg:col-span-8 space-y-6">
          
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
                    No pending maintenance actions. All active systems are nominal.
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
                              <span className="font-bold text-gray-900 text-sm block">
                                {item.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} 
                                {item.name}
                              </span>
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
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {item.type === 'route' ? 'ASSETS:' : 'S/N:'} {item.serial}
                              </span>
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">DEPT: {Array.isArray(item.department) ? item.department.join(', ') : item.department}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-red-600 font-mono font-bold">{item.displayDate}</div>
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "ESCALATED ✓"; e.target.classList.add("text-green-600");
                                  triggerTeamsAlert(getManagerForDepartment(item.department), `MANAGER ESCALATION: Critical Action Required for ${item.name}`, `Hello,\n\nThe system ${item.name} is ${item.displayStatus.toUpperCase()}.\nAssigned: ${item.assignedTo}`);
                                }} 
                                className="block text-right text-[10px] text-orange-600 font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                🔔 Alert Manager
                              </button>
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                              )}
                              {item.type === 'route' && (
                                <button onClick={() => openRouteModal(item)} className="block text-right text-[10px] text-purple-700 font-extrabold uppercase tracking-wider hover:underline transition-all">Execute Master Route &rarr;</button>
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
                              <span className="font-bold text-gray-900 text-sm block">
                                {item.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {item.name}
                              </span>
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
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {item.type === 'route' ? 'ASSETS:' : 'S/N:'} {item.serial}
                              </span>
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">DEPT: {Array.isArray(item.department) ? item.department.join(', ') : item.department}</span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-[#005596] font-mono font-bold">{item.displayDate}</div>
                            <div className="flex items-center space-x-3 mt-1">
                              <button 
                                onClick={(e) => {
                                  e.target.innerText = "NOTIFIED ✓"; e.target.classList.add("text-green-600");
                                  triggerTeamsAlert(item.assignedTo.split(',')[0].trim(), `MANAGER NOTICE: Routine Task Pending for ${item.name}`, `Hello,\n\nStatus: ${item.displayStatus}\nAssigned: ${item.assignedTo}`);
                                }} 
                                className="block text-right text-[10px] text-[#00A1E4] font-extrabold uppercase tracking-wider hover:underline transition-all"
                              >
                                ✉️ Notify Manager
                              </button>
                              
                              {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                              )}
                              {item.type === 'route' && (
                                <button onClick={() => openRouteModal(item)} className="block text-right text-[10px] text-purple-700 font-extrabold uppercase tracking-wider hover:underline transition-all">Execute Master Route &rarr;</button>
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
                              <span className="font-bold text-gray-700 text-sm block">
                                {item.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {item.name}
                              </span>
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
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {item.type === 'route' ? 'ASSETS:' : 'S/N:'} {item.serial}
                              </span>
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">DEPT: {Array.isArray(item.department) ? item.department.join(', ') : item.department}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-slate-500 font-mono font-bold">{item.displayDate}</div>
                            {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-slate-500 font-extrabold uppercase tracking-wider hover:underline transition-all">View Details &rarr;</button>
                            )}
                            {item.type === 'route' && (
                                <button onClick={() => openRouteModal(item)} className="block text-right text-[10px] text-slate-500 font-extrabold uppercase tracking-wider hover:underline transition-all">Preview Route &rarr;</button>
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

          {isManager && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-900">
                <h3 className="font-bold text-xs uppercase tracking-wider shadow-sm">Department Action Queue (Manager)</h3>
                {managerDepartmentQueue.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">{managerDepartmentQueue.length} Total</span>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto bg-gray-50/30">
                {managerDepartmentQueue.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs font-medium bg-white">
                    No pending actions for your department. All systems nominal.
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
                        <div key={`mgr-${item.queueId}`} className="p-5 hover:bg-red-50/30 transition flex justify-between items-center border-l-4" style={{ borderLeftColor: item.badgeColor.includes('red') ? '#ef4444' : '#eab308' }}>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">
                                {item.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {item.name}
                              </span>
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
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {item.type === 'route' ? 'ASSETS:' : 'S/N:'} {item.serial}
                              </span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-red-600 font-mono font-bold">{item.displayDate}</div>
                            {item.type === 'asset' && (
                              <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                            )}
                            {item.type === 'route' && (
                              <button onClick={() => openRouteModal(item)} className="block text-right text-[10px] text-purple-700 font-extrabold uppercase tracking-wider hover:underline transition-all">Execute Master Route &rarr;</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {managerUpcoming.length > 0 && (
                      <div className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-5 py-2 sticky top-0 z-10 border-y border-indigo-200 shadow-sm flex justify-between">
                        <span>📅 Upcoming Tasks (0 - 5 Days)</span>
                        <span>{managerUpcoming.length} Items</span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100 bg-white">
                      {managerUpcoming.map(item => (
                        <div key={`mgr-${item.queueId}`} className="p-5 hover:bg-indigo-50/30 transition flex justify-between items-center border-l-4 border-indigo-400">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-900 text-sm block">
                                {item.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {item.name}
                              </span>
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
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {item.type === 'route' ? 'ASSETS:' : 'S/N:'} {item.serial}
                              </span>
                              <span className="bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded border border-sky-200 font-bold uppercase tracking-wider">OP: {item.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-indigo-600 font-mono font-bold">{item.displayDate}</div>
                            {item.type === 'asset' && (
                              <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-[#005596] font-extrabold uppercase tracking-wider hover:underline transition-all">Execute PM &rarr;</button>
                            )}
                            {item.type === 'route' && (
                              <button onClick={() => openRouteModal(item)} className="block text-right text-[10px] text-purple-700 font-extrabold uppercase tracking-wider hover:underline transition-all">Execute Master Route &rarr;</button>
                            )}
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
                        <div key={`mgr-${item.queueId}`} className="p-5 hover:bg-slate-50 transition flex justify-between items-center border-l-4 border-slate-300">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-700 text-sm block">
                                {item.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {item.name}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center space-x-4 block">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {item.type === 'route' ? 'ASSETS:' : 'S/N:'} {item.serial}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end">
                            <div className="mb-2 text-[10px] text-slate-500 font-mono font-bold">{item.displayDate}</div>
                            {item.type === 'asset' && (
                                <button onClick={() => openPmModal(item.rawItem, item.targetTemplate)} className="block text-right text-[10px] text-slate-500 font-extrabold uppercase tracking-wider hover:underline transition-all">View Details &rarr;</button>
                            )}
                            {item.type === 'route' && (
                                <button onClick={() => openRouteModal(item)} className="block text-right text-[10px] text-slate-500 font-extrabold uppercase tracking-wider hover:underline transition-all">Preview Route &rarr;</button>
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
                            <span className="font-bold text-gray-900 text-sm block">
                              {task.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {task.name}
                            </span>
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
                          {task.type === 'asset' ? (
                            <button 
                              onClick={() => { openPmModal(task.rawItem, task.targetTemplate); }}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                              Execute Critical PM
                            </button>
                          ) : (
                            <button 
                              onClick={() => { openRouteModal(task); }}
                              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                              Execute Master Route
                            </button>
                          )}
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
                            <span className="font-bold text-gray-900 text-sm block">
                               {task.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {task.name}
                            </span>
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
                          {task.type === 'asset' ? (
                            <button 
                              onClick={() => { openPmModal(task.rawItem, task.targetTemplate); }}
                              className="bg-[#00A1E4] hover:bg-[#005596] text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                              Open Assignment
                            </button>
                          ) : (
                            <button 
                              onClick={() => { openRouteModal(task); }}
                              className="bg-purple-600 hover:bg-purple-800 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                              Open Route Assignment
                            </button>
                          )}
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
                            <span className="font-bold text-gray-700 text-sm block">
                               {task.type === 'route' ? <span className="text-purple-600 mr-2">🚶‍♂️</span> : ''} {task.name}
                            </span>
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
                          {task.type === 'asset' ? (
                            <button 
                              onClick={() => { openPmModal(task.rawItem, task.targetTemplate); }}
                              className="text-slate-600 hover:text-slate-900 border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                              View Details
                            </button>
                          ) : (
                            <button 
                              onClick={() => { openRouteModal(task); }}
                              className="text-purple-600 hover:text-purple-900 border border-purple-300 bg-white hover:bg-purple-50 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                              Preview Route
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

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

      {activeRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl max-h-[90dvh] overflow-hidden animate-entrance relative flex flex-col">
            
            <div className="bg-purple-700 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-purple-900 shadow-sm">
              <div>
                <h3 className="font-black text-sm tracking-widest uppercase flex items-center gap-2">
                  <span>🚶‍♂️</span> MASTER FACILITY ROUTE: {activeRoute.name}
                </h3>
                <p className="text-[10px] text-purple-200 mt-1 uppercase font-bold tracking-wider">Grouped Execution Mode</p>
              </div>
              <button onClick={() => setActiveRoute(null)} className="text-purple-200 hover:text-white font-bold text-2xl transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleSubmitMasterRoute} className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50 p-6 flex flex-col gap-6">
              
              <div className="bg-white p-5 rounded-lg border border-purple-200 shadow-sm shrink-0">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Route Instructions</h4>
                    <p className="text-xs text-gray-600">Please walk the defined route and complete the checklist items for all associated systems below. Upon submission, the database will simultaneously update the maintenance cycles and generate audit logs for all {activeRoute.rawItem.length} target assets.</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded border border-purple-100 shrink-0 w-full md:w-auto">
                    <span className="block text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1">Target Assets Detected</span>
                    <span className="block text-2xl font-black text-purple-600">{activeRoute.rawItem.length} Systems</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden shrink-0">
                <div className="bg-slate-100 px-4 py-3 border-b border-gray-200">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Dynamic Protocol Checklist</h4>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {activeRoute.targetTemplate.checklistSteps.map((step, idx) => {
                    const stepType = typeof step === 'string' ? 'checkbox' : step.type;
                    const stepLabel = typeof step === 'string' ? step : step.label;

                    return (
                    <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-full md:w-1/4 shrink-0">
                        {step.section ? (
                          <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm">
                            {step.section}
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm">
                            General Parameter
                          </span>
                        )}
                      </div>
                      
                      <div className="w-full md:w-1/3">
                        <span className="text-sm font-bold text-gray-800">{stepLabel}</span>
                      </div>
                      
                      {/* --- THE FIX: Status Override Toggle & Dynamic Inputs --- */}
                      <div className="w-full md:flex-1 flex flex-col md:flex-row gap-2 justify-end items-stretch md:items-center">
                        {routeAnswers[idx] === 'OFFLINE' ? (
                          <div className="flex-1 text-[11px] px-3 py-2 border border-red-200 rounded bg-red-50 text-red-700 font-bold text-center shadow-inner uppercase tracking-wider flex items-center justify-center">
                            ⚠️ System Offline
                          </div>
                        ) : (
                          <div className="flex-1 flex justify-end">
                            {stepType === 'checkbox' && (
                              <label className="flex items-center space-x-2 cursor-pointer bg-white border border-gray-300 rounded px-3 py-2 shadow-inner hover:bg-gray-50 w-full md:w-auto">
                                <input type="checkbox" required checked={!!routeAnswers[idx]} onChange={(e) => setRouteAnswers({...routeAnswers, [idx]: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Confirm</span>
                              </label>
                            )}
                            {stepType === 'text' && (
                              <input type="text" required placeholder="Enter value..." value={routeAnswers[idx] || ""} onChange={(e) => setRouteAnswers({...routeAnswers, [idx]: e.target.value})} className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-inner outline-none" />
                            )}
                            {stepType === 'number' && (
                              <input type="number" required placeholder="0.0" value={routeAnswers[idx] || ""} onChange={(e) => setRouteAnswers({...routeAnswers, [idx]: e.target.value})} className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-inner outline-none" />
                            )}
                            {stepType === 'passfail' && (
                              <select required value={routeAnswers[idx] || ""} onChange={(e) => setRouteAnswers({...routeAnswers, [idx]: e.target.value})} className="w-full md:w-auto text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-inner outline-none bg-white font-bold cursor-pointer">
                                <option value="">-- Result --</option>
                                <option value="pass">PASS (In Spec)</option>
                                <option value="fail">FAIL (Out of Spec)</option>
                              </select>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setRouteAnswers({...routeAnswers, [idx]: routeAnswers[idx] === 'OFFLINE' ? '' : 'OFFLINE'})}
                          className={`shrink-0 px-3 py-2 rounded text-[9px] font-black uppercase tracking-wider transition-all shadow-sm border ${
                            routeAnswers[idx] === 'OFFLINE'
                              ? 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                              : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                          }`}
                        >
                          {routeAnswers[idx] === 'OFFLINE' ? 'Undo Offline' : 'Mark Down'}
                        </button>
                      </div>

                    </div>
                  )})}
                  
                  {(!activeRoute.targetTemplate.checklistSteps || activeRoute.targetTemplate.checklistSteps.length === 0) && (
                    <div className="p-8 text-center text-gray-400 text-xs italic">
                      No specific actions were configured for this route.
                    </div>
                  )}
                </div>
              </div>
            </form>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 shrink-0 border-t border-gray-200">
              <button type="button" onClick={() => setActiveRoute(null)} className="px-5 py-2.5 border border-gray-300 bg-white rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition shadow-sm">Cancel</button>
              <button 
                type="button" 
                onClick={handleSubmitMasterRoute} 
                disabled={isSavingRoute} 
                className={`bg-purple-700 hover:bg-purple-800 text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center space-x-2 ${isSavingRoute ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSavingRoute ? (
                  <span>Processing Avalanche...</span>
                ) : (
                  <>
                    <span>Submit & Sync Route</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">({activeRoute.rawItem.length})</span>
                  </>
                )}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}