import React, { useState } from 'react';

export default function WorkOrdersTab({
  handleAddWorkOrder, isSubmittingWo, newWo, setNewWo, 
  assets, activeAccounts, pmTemplates, 
  workOrders, currentUser, isSystemAdmin, // <-- Replaced the filter props with raw workOrders
  handleUpdateWoStatus, deleteWorkOrder
}) {
  // Moved from App.jsx!
  const [filterSearch, setFilterSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");

  // Local filtering logic
  const filteredWorkOrders = (workOrders || []).filter(w => 
    (w.title || "").toLowerCase().includes(filterSearch.toLowerCase()) && 
    (filterPriority === "All" || w.priority === filterPriority)
  );

  return (
    <div className="space-y-8 animate-entrance">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Dispatch Work Order</h3></div>
        <form onSubmit={handleAddWorkOrder} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Work Order Title</label>
              <input type="text" value={newWo.title} onChange={(e) => setNewWo({...newWo, title: e.target.value})} placeholder="e.g. Replace worn HEPA filter in cleanroom" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Asset (Optional)</label>
              <select value={newWo.assetId} onChange={(e) => setNewWo({...newWo, assetId: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                <option value="">-- General Facility (No specific asset) --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name} (SN: {a.serial})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assign To Operator</label>
              <select value={newWo.assignedTo} onChange={(e) => setNewWo({...newWo, assignedTo: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                <option value="">-- Select Active Technician --</option>
                {activeAccounts.map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Link PM Task Protocol (Optional)</label>
              <select 
                value={newWo.templateId || ""} 
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const template = pmTemplates.find(t => t.id === selectedId);
                  
                  if (template) {
                    const checklistText = template.checklist.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
                    setNewWo({
                      ...newWo,
                      templateId: selectedId,
                      title: newWo.title || `Execute SOP: ${template.name}`,
                      description: `[PM CHECKLIST]\n${checklistText}\n\n` + (newWo.description || "")
                    });
                  } else {
                    setNewWo({ ...newWo, templateId: "" });
                  }
                }} 
                className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer font-bold text-[#005596]"
              >
                <option value="">-- Select Standard Protocol --</option>
                {pmTemplates.map(t => <option key={t.id} value={t.id}>[{t.interval}] {t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Priority Level</label>
              <select value={newWo.priority} onChange={(e) => setNewWo({...newWo, priority: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer font-medium">
                <option value="" disabled>-- Select Priority --</option>
                <option value="95 - Emergency">95 - Emergency</option>
                <option value="90 - Compliance">90 - Compliance</option>
                <option value="80 - Reactive">80 - Reactive</option>
                <option value="70 - PM">70 - PM</option>
                <option value="60 - Service">60 - Service</option>
                <option value="50 - Deferred">50 - Deferred</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Job Description & Notes</label>
              <textarea value={newWo.description} onChange={(e) => setNewWo({...newWo, description: e.target.value})} rows="4" placeholder="Provide detailed instructions for the technician..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={isSubmittingWo} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isSubmittingWo ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isSubmittingWo ? 'Dispatching...' : 'Dispatch Work Order'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">Active Dispatch Board</h3>
          <div className="flex gap-4 text-black font-normal">
            <input 
              type="text" 
              placeholder="Search tickets or operators..." 
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="text-xs rounded border-gray-300 px-3 py-1.5 w-64 focus:outline-none"
            />
            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs rounded border-gray-300 px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="95">95 - Emergency</option>
              <option value="90">90 - Compliance</option>
              <option value="80">80 - Reactive</option>
              <option value="70">70 - PM</option>
              <option value="60">60 - Service</option>
              <option value="50">50 - Deferred</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Ticket Info</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Target Hardware</th>
                <th className="px-6 py-3.5">Assigned To</th>
                <th className="px-6 py-3.5 text-right">Job Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredWorkOrders.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 text-xs">No active work orders match your search criteria.</td></tr>
              ) : (
                filteredWorkOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50/55 transition">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 block">{wo.title}</span>
                      <span className="text-[9px] text-gray-400 font-mono mt-0.5 block">
                        {wo.id} • Created: {new Date(wo.timestamp).toLocaleDateString()} by <span className="font-bold text-[#005596]">{wo.createdBy || 'System'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                        wo.priority?.includes('95') || wo.priority === 'Critical' ? 'bg-red-600 text-white animate-pulse' : 
                        wo.priority?.includes('90') || wo.priority === 'High' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 
                        wo.priority?.includes('80') ? 'bg-yellow-100 text-yellow-800' : 
                        wo.priority?.includes('70') ? 'bg-[#005596]/10 text-[#005596]' : 
                        wo.priority?.includes('60') ? 'bg-green-100 text-green-800' : 
                        wo.priority === 'Medium' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {wo.assetId ? (
                        <span className="font-medium text-[#005596]">{assets.find(a => a.id === wo.assetId)?.name || 'Unknown'}</span>
                      ) : (
                        <span className="text-gray-500 italic text-[10px]">Facility General</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${wo.assignedTo === currentUser?.email ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                        <span className="font-mono text-gray-700">{wo.assignedTo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {wo.status === "Completed" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800">
                            Completed ✓
                          </span>
                        ) : (
                          <select
                            value={wo.status}
                            onChange={(e) => handleUpdateWoStatus(wo.id, e.target.value)}
                            disabled={!isSystemAdmin && wo.assignedTo !== currentUser?.email}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent ${!isSystemAdmin && wo.assignedTo !== currentUser?.email ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-300'} ${wo.status === "Open" ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-[#005596]"}`}
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Mark Completed</option>
                          </select>
                        )}
                        {(isSystemAdmin || wo.creatorEmail === currentUser?.email) && (
                          <button onClick={() => deleteWorkOrder(wo.id)} className="text-red-400 hover:text-red-700 text-xl font-bold leading-none transition px-1" title="Delete Work Order">&times;</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}