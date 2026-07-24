import React, { useState } from 'react';

export default function HistoryTab({ history, isSystemAdmin, deleteHistoryLog, currentUser, setCurrentUser }) {
  const [historySearch, setHistorySearch] = useState("");
  
  // --- Initialize state from the Cloud Account first, fallback to LocalStorage ---
  // Force non-admins to 'Equipment' regardless of saved preferences
  const [activeFilter, setActiveFilter] = useState(() => {
    if (!isSystemAdmin) return "Equipment";
    return currentUser?.preferences?.historyFilter || localStorage.getItem("fi_oms_history_filter") || "Equipment";
  });

  // --- NEW: Sorting State ---
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  // --- Cloud Sync the Toggle ---
  const handleFilterChange = async (type) => {
    // Prevent non-admins from changing the filter
    if (!isSystemAdmin) return;

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

  // --- NEW: Sorting Handler ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return " ↕";
    return sortConfig.direction === 'asc' ? " ▲" : " ▼";
  };

  // 1. Filter the History
  const filteredHistory = (history || []).filter(log => {
    // Determine if the log is an automated system action
    const isSystemLog = log.assetId === "SYS-AUTO" || 
                        log.assetName === "User Directory" || 
                        log.assetName === "Established SOP" || 
                        log.assetName === "Facility Asset";
    
    // HARD SECURITY LOCK: Non-admins can NEVER see system logs
    if (!isSystemAdmin && isSystemLog) return false;

    // Apply the toggle filter (for admins)
    if (activeFilter === "Equipment" && isSystemLog) return false;
    if (activeFilter === "System" && !isSystemLog) return false;

    // Apply the text search filter
    const matchesSearch = 
      (log.assetName || "").toLowerCase().includes(historySearch.toLowerCase()) || 
      (log.technician || "").toLowerCase().includes(historySearch.toLowerCase()) ||
      (log.templateName || "").toLowerCase().includes(historySearch.toLowerCase());
      
    return matchesSearch;
  });

  // 2. Sort the Filtered History
  const sortedAndFilteredHistory = [...filteredHistory].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    
    // Special handling for Dates
    if (sortConfig.key === 'timestamp') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else {
      // Standardize strings for accurate alphabetical sorting
      valA = (valA || "").toString().toLowerCase();
      valB = (valB || "").toString().toLowerCase();
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-entrance">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 border-b border-gray-100 pb-4 gap-4">
          <h2 className="text-lg font-bold text-[#005596] whitespace-nowrap">Executed Audit Trail</h2>
          
          <div className="flex flex-col md:flex-row items-center w-full lg:w-auto gap-4">
            
            {/* Minimal Filter Toggles - ONLY SHOW EXTRA OPTIONS TO ADMINS */}
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner w-full md:w-auto">
              <button 
                onClick={() => handleFilterChange('Equipment')} 
                className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeFilter === 'Equipment' ? 'bg-white text-[#005596] shadow-sm' : 'text-gray-500 hover:text-gray-800'} ${!isSystemAdmin && 'cursor-default'}`}
              >
                Equipment PMs
              </button>
              
              {isSystemAdmin && (
                <>
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
                </>
              )}
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
                <th onClick={() => handleSort('timestamp')} className="p-3 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none">
                  Date <span className="text-gray-400">{getSortIcon('timestamp')}</span>
                </th>
                <th onClick={() => handleSort('assetName')} className="p-3 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none">
                  Asset <span className="text-gray-400">{getSortIcon('assetName')}</span>
                </th>
                <th onClick={() => handleSort('templateName')} className="p-3 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none">
                  Protocol Executed <span className="text-gray-400">{getSortIcon('templateName')}</span>
                </th>
                <th onClick={() => handleSort('technician')} className="p-3 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none">
                  Technician <span className="text-gray-400">{getSortIcon('technician')}</span>
                </th>
                <th onClick={() => handleSort('status')} className="p-3 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none">
                  Status <span className="text-gray-400">{getSortIcon('status')}</span>
                </th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {sortedAndFilteredHistory.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400 text-xs italic">No audit history found matching your filters.</td></tr>
              ) : (
                sortedAndFilteredHistory.map(log => (
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