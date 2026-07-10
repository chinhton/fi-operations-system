import React, { useState } from 'react'; // Make sure useState is imported

export default function HistoryTab({ history, isSystemAdmin, deleteHistoryLog }) {
  // We moved this from App.jsx!
  const [historySearch, setHistorySearch] = useState("");
  
  const filteredHistory = history.filter(log => 
    (log.assetName || "").toLowerCase().includes(historySearch.toLowerCase()) || 
    (log.technician || "").toLowerCase().includes(historySearch.toLowerCase()) ||
    (log.templateName || "").toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-entrance">
      <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-sm tracking-wide uppercase">Traceable Activity Logs & History Records</h3>
        <span className="text-xs text-gray-400 font-semibold">{filteredHistory.length} records matching</span>
      </div>
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="text-xs text-gray-600 max-w-lg hidden md:block">
          This log officially timestamps and records all executed PMs, protocol sign-offs, and administrative actions performed within the system.
        </span>
        <input 
          type="text" 
          value={historySearch} 
          onChange={(e) => setHistorySearch(e.target.value)} 
          placeholder="Filter by Asset, Tech, or SOP..." 
          className="w-full md:w-64 text-xs rounded border border-gray-300 shadow-sm p-2 bg-white focus:outline-none focus:border-[#005596]" 
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left">
          <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Timestamp</th>
              <th className="px-6 py-3.5">Asset & Category</th>
              <th className="px-6 py-3.5">Executed Protocol</th>
              <th className="px-6 py-3.5">Technician / Inspector</th>
              <th className="px-6 py-3.5">Execution Status</th>
              <th className="px-6 py-3.5">Operating Notes</th>
              {isSystemAdmin && <th className="px-6 py-3.5 text-right">Admin</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={isSystemAdmin ? "7" : "6"} className="px-6 py-12 text-center text-gray-400 text-xs">
                  No historical log entries found matching criteria.
                </td>
              </tr>
            ) : (
              filteredHistory.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 text-gray-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 block">{log.assetName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{log.assetId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-800 block">{log.templateName}</span>
                    <span className="text-[10px] bg-blue-50 text-[#005596] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block">{log.interval} Cycle</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 block">{log.technician}</span>
                    <span className="text-xs text-gray-500 font-mono block">{log.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === "Completed Pass" ? "bg-green-100 text-green-800" : log.status === "Incomplete Log" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs break-words">{log.comments}</td>
                  {isSystemAdmin && (
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteHistoryLog(log.id)} className="text-[10px] font-bold text-red-500 hover:text-red-800 transition uppercase tracking-wider">Delete</button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}