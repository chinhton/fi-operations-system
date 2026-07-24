import React, { useState } from 'react';

export default function HistoryTab({ history, isSystemAdmin, deleteHistoryLog, currentUser, setCurrentUser }) {
  const [historySearch, setHistorySearch] = useState("");
  
  // --- Initialize state from the Cloud Account first, fallback to LocalStorage ---
  const [activeFilter, setActiveFilter] = useState(() => {
    return currentUser?.preferences?.historyFilter || localStorage.getItem("fi_oms_history_filter") || "Equipment";
  });

  // --- Cloud Sync the Toggle ---
  const handleFilterChange = async (type) => {
    setActiveFilter(type);
    localStorage.setItem("fi_oms_history_filter", type); // Still save locally for instant reloads
    
    if (currentUser && setCurrentUser) {
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          historyFilter: type
        }
      };
      
      // Instantly update the UI state
      setCurrentUser(updatedUser);
      
      try {
        // The ?skip=/api/history hack perfectly bypasses the email interceptor in App.jsx
        await fetch('/api/users?skip=/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser)
        });
      } catch (err) {
        console.error("Failed to sync history filter preference to cloud:", err);
      }
    }
  };

  const filteredHistory = (history || []).filter(log => {
    // Determine if the log is an automated system action
    const isSystemLog = log.assetId === "SYS-AUTO" || 
                        log.assetName === "User Directory" || 
                        log.assetName === "Established SOP" || 
                        log.assetName === "Facility Asset";
    
    // Apply the toggle filter
    if (activeFilter === "Equipment" && isSystemLog) return false;
    if (activeFilter === "System" && !isSystemLog) return false;

    // Apply the text search filter
    const matchesSearch = 
      (log.assetName || "").toLowerCase().includes(historySearch.toLowerCase()) || 
      (log.technician || "").toLowerCase().includes(historySearch.toLowerCase()) ||
      (log.templateName || "").toLowerCase().includes(historySearch.toLowerCase());
      
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-entrance">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 border-b border-gray-100 pb-4 gap-4">
          <h2 className="text-lg font-bold text-[#005596] whitespace-nowrap">Executed Audit Trail</h2>
          
          <div className="flex flex-col md:flex-row items-center w-full lg:w-auto gap-4">
            
            {/* Minimal Filter Toggles */}
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner w-full md:w-auto">
              <button 
                onClick={() => handleFilterChange('Equipment')} 
                className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeFilter === 'Equipment' ? 'bg-white text-[#005596] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Equipment PMs
              </button>
              <button 
                onClick={() => handleFilterChange('System')} 
                className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeFilter === 'System' ? 'bg-white text-[#005596] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                System Activity
              </button>
              <button 
                onClick={() => handleFilterChange('All')} 
                className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeFilter === 'All' ? 'bg-white text-[#005596] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                All Logs
              </button>
            </div>

            <input 
              type="text" 
              placeholder="Search by Asset, Tech, or Template..." 
              value={historySearch} 
              onChange={e => setHistorySearch(e.target.value)} 
              className="p-2.5 border border-gray-300 rounded-lg text-xs w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-[#005596] transition-all bg-gray-50 focus:bg-white shadow-inner" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <th className="p-3 font-bold text-[10px] uppercase tracking-wider">Date</th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-wider">Asset</th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-wider">Protocol Executed</th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-wider">Technician</th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-wider">Status</th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredHistory.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400 text-xs italic">No audit history found matching your filters.</td></tr>
              ) : (
                filteredHistory.map(log => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-3 font-mono text-[11px] text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-gray-800">{log.assetName}</td>
                    <td className="p-3 text-gray-600">{log.templateName || "Ad-Hoc"}</td>
                    <td className="p-3 font-medium text-gray-700">{log.technician}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider inline-block ${
                        log.status.includes('Pass') ? 'bg-green-100 text-green-800' : 
                        log.status.includes('Log') ? 'bg-gray-200 text-gray-700' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {isSystemAdmin && (
                        <button onClick={() => deleteHistoryLog(log.id)} className="text-gray-300 hover:text-red-600 font-bold text-xs transition-colors opacity-0 group-hover:opacity-100">
                          Delete
                        </button>
                      )}
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