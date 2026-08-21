import React, { useState } from 'react';

export default function HistoryTab({ history = [], pmTemplates = [], isSystemAdmin, assets = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [showOnlyPMs, setShowOnlyPMs] = useState(false);

  const formatDate = (dateInput) => {
    if (!dateInput) return "No Date Logged";
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? dateInput : parsed.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = status.toLowerCase();
    if (s.includes('pass') || s.includes('operational') || s.includes('completed')) return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (s.includes('fail') || s.includes('incomplete') || s.includes('due') || s.includes('lockout')) return "bg-red-100 text-red-800 border border-red-200";
    return "bg-gray-100 text-gray-800 border border-gray-200";
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="ml-1 text-gray-300 font-normal">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-[#005596]">▲</span> : <span className="ml-1 text-[#005596]">▼</span>;
  };

  let processedHistory = [...history];

  if (showOnlyPMs) {
    processedHistory = processedHistory.filter(item => item.assetId !== "SYS-AUTO");
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    processedHistory = processedHistory.filter(item =>
      (item.assetName || '').toLowerCase().includes(term) ||
      (item.technician || item.performedBy || '').toLowerCase().includes(term) ||
      (item.templateName || '').toLowerCase().includes(term) ||
      (item.status || '').toLowerCase().includes(term)
    );
  }

  processedHistory.sort((a, b) => {
    if (sortConfig.key === 'timestamp') {
      const timeA = new Date(a.timestamp || a.date).getTime() || 0;
      const timeB = new Date(b.timestamp || b.date).getTime() || 0;
      return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
    }
    
    let valA = String(a[sortConfig.key] || '');
    let valB = String(b[sortConfig.key] || '');
    
    if (sortConfig.key === 'technician') {
        valA = String(a.technician || a.performedBy || '');
        valB = String(b.technician || b.performedBy || '');
    }

    valA = valA.toLowerCase();
    valB = valB.toLowerCase();

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const revertAssetDates = async (log) => {
    if (!assets || assets.length === 0) return;

    let intervalToClear = log.interval;
    if (!intervalToClear) {
      const template = pmTemplates.find(t => t.name === log.templateName);
      if (template) intervalToClear = template.interval;
    }

    if (!intervalToClear) return; 

    let assetsToUpdate = [];

    if ((log.status || "").includes("Grouped Route") || log.executionMode === 'route') {
      if (log.assetsIncluded && log.assetsIncluded.length > 0) {
        assetsToUpdate = assets.filter(a => log.assetsIncluded.includes(a.name));
      }
    } else {
      const singleAsset = assets.find(a => a.id === log.assetId) || assets.find(a => a.name === log.assetName);
      if (singleAsset) assetsToUpdate.push(singleAsset);
    }

    for (const asset of assetsToUpdate) {
      const newPmDates = { ...(asset.pmDates || {}) };
      delete newPmDates[intervalToClear]; 

      const updatedAsset = { ...asset, pmDates: newPmDates };

      await window.fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAsset)
      });
    }
  };

  // --- NEW: Single Log Deletion ---
  const deleteSingleLog = async (log) => {
    if (!window.confirm("Are you sure you want to permanently delete this specific audit log? The associated PM dates will be un-stamped on the asset.")) return;
    
    try {
      await revertAssetDates(log);
      await window.fetch(`/api/history?id=${log.id}`, { method: 'DELETE' });
      alert("Log successfully deleted and asset dates reverted.");
      window.location.reload();
    } catch (err) {
      console.error("Single delete error:", err);
      alert("An error occurred while attempting to delete the log.");
    }
  };

  const handleMassDeleteLogs = async () => {
    if (processedHistory.length === 0) {
      alert("No logs found to delete based on your current search/filters.");
      return;
    }

    const confirm1 = window.confirm(`🚨 DANGER: You are about to permanently delete ${processedHistory.length} audit logs.\n\nDue to strict compliance rules, this will also UN-STAMP the completed dates on all associated assets.\n\nAre you absolutely sure you want to proceed?`);
    if (!confirm1) return;

    const confirm2 = window.prompt(`To confirm mass deletion and PM reset of ${processedHistory.length} logs, please type DELETE in all caps:`);
    if (confirm2 !== "DELETE") {
      alert("Mass deletion cancelled.");
      return;
    }

    try {
      for (const log of processedHistory) {
        await revertAssetDates(log);
        await window.fetch(`/api/history?id=${log.id}&bulk=true`, { method: 'DELETE' });
      }
      alert("Mass deletion complete! Audit logs removed and associated asset PM cycles have been reset.");
      window.location.reload();
    } catch (err) {
      console.error("Mass delete error:", err);
      alert("An error occurred during mass deletion. Partial delete may have occurred.");
      window.location.reload();
    }
  };

  const getResponsesToRender = () => {
    if (!selectedLog) return null;
    const responsesList = selectedLog.responses || selectedLog.checklist || {};
    if (Object.keys(responsesList).length > 0) return responsesList;
    return null;
  };

  const getGroupedResponses = () => {
    const responses = getResponsesToRender();
    if (!responses) return null;

    const template = pmTemplates.find(t => t.name === selectedLog.templateName);
    const grouped = {};

    Object.entries(responses).forEach(([key, result]) => {
      let taskLabel = key;
      let assetGroup = "General Protocol Tasks"; 

      if (!isNaN(key)) {
        if (template && template.checklistSteps && template.checklistSteps[key]) {
          const step = template.checklistSteps[key];
          taskLabel = step.section ? `[${step.section}] ${step.label}` : step.label;
          if (step.assetTag) {
            assetGroup = step.assetTag;
          }
        } else {
          taskLabel = `Protocol Step ${parseInt(key) + 1}`;
        }
      }

      if (!grouped[assetGroup]) grouped[assetGroup] = [];
      grouped[assetGroup].push({ label: taskLabel, result: result });
    });

    return grouped;
  };

  return (
    <div className="space-y-6 animate-entrance">
      
      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          body * { visibility: hidden; }
          #pdf-print-area, #pdf-print-area * { visibility: visible; }
          #pdf-print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100% !important; 
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {!selectedLog ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
            <h2 className="text-lg font-black text-[#005596] uppercase tracking-wider">Executed Audit Trail</h2>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              
              {isSystemAdmin && (
                <button 
                  onClick={handleMassDeleteLogs}
                  className="text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded transition-colors shadow-sm border bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  title="Wipe the currently filtered logs and reset associated assets"
                >
                  🧨 WIPE LOGS
                </button>
              )}

              <button 
                onClick={() => setShowOnlyPMs(!showOnlyPMs)}
                className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded transition-colors shadow-sm border ${
                  showOnlyPMs 
                    ? "bg-[#005596] text-white border-[#005596] hover:bg-[#003058]" 
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Equipment PMs
              </button>
              <input 
                type="text" 
                placeholder="Search by Asset, Tech, or Status..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 lg:flex-none border border-gray-300 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-[#005596] outline-none shadow-sm w-full lg:w-72"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('timestamp')}>
                    Date {renderSortIcon('timestamp')}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('assetName')}>
                    Asset {renderSortIcon('assetName')}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('templateName')}>
                    Protocol Executed {renderSortIcon('templateName')}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('technician')}>
                    Technician {renderSortIcon('technician')}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                    Status {renderSortIcon('status')}
                  </th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedHistory.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">No audit logs found.</td></tr>
                ) : (
                  processedHistory.map((item, idx) => {
                    const isRoute = (item.status || "").includes("Grouped Route") || item.executionMode === 'route';
                    
                    return (
                    <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-600">
                        {formatDate(item.timestamp || item.date)}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {isRoute ? (
                           <span className="text-purple-600">Route: {item.assetsIncluded?.length || 'Multiple'} Assets</span>
                        ) : (
                           item.assetName || 'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {isRoute ? <span className="text-purple-600 mr-2" title="Grouped Route">🚶‍♂️</span> : <span className="text-blue-500 mr-2" title="Individual Asset PM">⚙️</span>}
                        {item.templateName || 'System Action'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.technician || item.performedBy || 'System Operator'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${getStatusColor(item.status)}`}>
                          {item.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end items-center space-x-2">
                        {isSystemAdmin && (
                          <button 
                            onClick={() => deleteSingleLog(item)}
                            className="text-gray-300 hover:text-red-500 font-bold transition-colors opacity-0 group-hover:opacity-100 px-2"
                            title="Delete this log and revert asset dates"
                          >
                            🗑️
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedLog(item)}
                          className="text-[#005596] hover:text-[#00A1E4] text-[10px] font-bold uppercase tracking-wider transition-colors border border-[#005596] hover:border-[#00A1E4] px-3 py-1.5 rounded shadow-sm hover:shadow"
                        >
                          Review PDF
                        </button>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-entrance">
          <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center no-print">
            <button 
              onClick={() => setSelectedLog(null)}
              className="text-gray-600 hover:text-[#005596] text-xs font-bold uppercase tracking-wider flex items-center transition-colors"
            >
              &larr; Back to Audit Trail
            </button>
            <button 
              onClick={() => {
                const originalTitle = document.title;
                document.title = `Maintenance Management Report - ${selectedLog.id || 'Log'}`;
                window.print();
                document.title = originalTitle;
              }}
              className="bg-[#005596] hover:bg-[#003058] text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center space-x-2"
            >
              <span>🖨️ Export to PDF</span>
            </button>
          </div>

          <div id="pdf-print-area" className="p-10 bg-white">
            
            <div className="flex justify-between items-end border-b-2 border-[#005596] pb-6 mb-8 mt-4">
              <div>
                <img src="/logo.png" alt="Fairchild Imaging Logo" className="h-16 w-auto object-contain mb-1" />
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Maintenance Management Report</h2>
                <p className="text-xs font-mono text-gray-500 mt-1">Log ID: {selectedLog.id || `LOG-SYSTEM`}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-inner">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Target System</span>
                  <span className="text-sm font-bold text-gray-900 block">
                    {(selectedLog.status || "").includes("Grouped Route") || selectedLog.executionMode === 'route' 
                      ? "Master Route Execution" 
                      : (selectedLog.assetName || 'N/A')}
                  </span>
                  {selectedLog.assetSerial && <span className="text-[10px] text-gray-500 font-mono block mt-0.5">S/N: {selectedLog.assetSerial}</span>}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Protocol Executed</span>
                  <span className="text-sm text-gray-800 font-bold block">{selectedLog.templateName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Service Interval</span>
                  <span className="text-sm text-gray-800 block">{selectedLog.interval || 'System Action'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Execution Timestamp</span>
                  <span className="font-mono text-sm text-[#005596] font-bold block">{formatDate(selectedLog.timestamp || selectedLog.date)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Authorized Technician</span>
                  <span className="text-sm text-gray-800 block">{selectedLog.technician || selectedLog.performedBy || 'System Operator'}</span>
                  {(selectedLog.email || selectedLog.performedByEmail) && <span className="text-xs text-gray-500 font-mono block mt-0.5">{selectedLog.email || selectedLog.performedByEmail}</span>}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Final Status</span>
                  <span className={`inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-bold text-[#005596] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">SOP Checklist Items Completed</h3>
              
              {getGroupedResponses() ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 shadow-inner overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-200/50 border-b border-gray-300 text-[10px] uppercase tracking-wider text-gray-600 font-bold">
                        <th className="py-3 px-4">Task Description</th>
                        <th className="py-3 px-4 w-32 text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(getGroupedResponses()).map(([groupName, tasks], groupIdx) => (
                        <React.Fragment key={groupIdx}>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <td colSpan="2" className="py-2 px-4 font-bold text-[#005596] text-[10px] uppercase tracking-wider">
                              {groupName}
                            </td>
                          </tr>
                          {tasks.map((task, taskIdx) => (
                            <tr key={`${groupIdx}-${taskIdx}`} className="border-b border-gray-200 last:border-0 hover:bg-white transition-colors bg-gray-50/50">
                              <td className="py-2.5 pl-8 pr-4 text-gray-800 font-medium text-xs">
                                {task.label}
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold font-mono text-xs">
                                {task.result === true || task.result === "true" || task.result === "Pass" || task.result === "PASS" ? 
                                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 shadow-sm inline-block w-full">PASS</span> : 
                                 task.result === false || task.result === "false" || task.result === "Fail" || task.result === "FAIL" ? 
                                  <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 shadow-sm inline-block w-full">FAIL</span> : 
                                  <span className="text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm inline-block w-full">{task.result}</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-sm italic text-gray-500 text-center shadow-inner">
                  No specific checklist actions or parameters were recorded during this execution.
                </div>
              )}
            </div>

            <div className="mb-12">
              <h3 className="text-xs font-bold text-[#005596] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Technician Notes & Comments</h3>
              <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap font-mono shadow-inner">
                {selectedLog.comments || selectedLog.notes || "No additional comments provided during execution."}
              </div>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-300">
              <div className="w-72">
                <div className="border-b-2 border-gray-800 pb-2 mb-2 text-center font-mono text-sm text-gray-800 italic">
                  Electronically Signed: {selectedLog.technician || selectedLog.performedBy || 'N/A'}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Technician Digital Signature</div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}