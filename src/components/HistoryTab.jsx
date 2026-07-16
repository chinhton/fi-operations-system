import React, { useState } from 'react';

export default function HistoryTab({ history, isSystemAdmin, deleteHistoryLog }) {
  const [historySearch, setHistorySearch] = useState("");

  const filteredHistory = (history || []).filter(log => 
    (log.assetName || "").toLowerCase().includes(historySearch.toLowerCase()) || 
    (log.technician || "").toLowerCase().includes(historySearch.toLowerCase()) ||
    (log.templateName || "").toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-entrance">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-2">
          <h2 className="text-lg font-bold text-[#005596]">Executed Audit Trail</h2>
          <input 
            type="text" 
            placeholder="Search by Asset, Tech, or Template..." 
            value={historySearch} 
            onChange={e => setHistorySearch(e.target.value)} 
            className="p-2 border rounded text-xs w-full md:w-64 mt-2 md:mt-0" 
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-3 font-bold">Date</th>
                <th className="p-3 font-bold">Asset</th>
                <th className="p-3 font-bold">Protocol Executed</th>
                <th className="p-3 font-bold">Technician</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr><td colSpan="6" className="p-4 text-center text-gray-500 italic">No audit history found.</td></tr>
              ) : (
                filteredHistory.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-semibold">{log.assetName}</td>
                    <td className="p-3">{log.templateName || "Ad-Hoc"}</td>
                    <td className="p-3">{log.technician}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {isSystemAdmin && (
                        <button onClick={() => deleteHistoryLog(log.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">Delete</button>
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