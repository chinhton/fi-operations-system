import React, { useState } from 'react';

export default function HistoryTab({ history = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [showOnlyPMs, setShowOnlyPMs] = useState(false);

  // Safely format dates to prevent the "Invalid Date" error
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
    if (s.includes('pass') || s.includes('operational')) return "bg-green-100 text-green-800";
    if (s.includes('fail') || s.includes('incomplete') || s.includes('due')) return "bg-red-100 text-red-800";
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

  // --- FILTERING & SORTING PIPELINE ---
  let processedHistory = [...history];

  // 1. Filter: Equipment PMs Only vs All
  if (showOnlyPMs) {
    processedHistory = processedHistory.filter(item => item.assetId !== "SYS-AUTO");
  }

  // 2. Filter: Search Term
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    processedHistory = processedHistory.filter(item =>
      (item.assetName || '').toLowerCase().includes(term) ||
      (item.technician || '').toLowerCase().includes(term) ||
      (item.templateName || '').toLowerCase().includes(term) ||
      (item.status || '').toLowerCase().includes(term)
    );
  }

  // 3. Sort Data (Fixed Logic)
  processedHistory.sort((a, b) => {
    // Special handling for dates to ensure chronological number sorting
    if (sortConfig.key === 'timestamp') {
      const timeA = new Date(a.timestamp || a.date).getTime() || 0;
      const timeB = new Date(b.timestamp || b.date).getTime() || 0;
      return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
    }

    // Standard string sorting (forced lowercase for case-insensitivity)
    const valA = String(a[sortConfig.key] || '').toLowerCase();
    const valB = String(b[sortConfig.key] || '').toLowerCase();

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-entrance">
      
      {/* Embedded print styles for clean PDF export */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pdf-print-area, #pdf-print-area * { visibility: visible; }
          #pdf-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* --- MAIN TABLE VIEW --- */}
      {!selectedLog ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-black text-[#005596]">Executed Audit Trail</h2>
            <div className="flex items-center space-x-4">
              
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
                className="border border-gray-300 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-[#005596] outline-none shadow-sm w-72"
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
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedHistory.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">No audit logs found.</td></tr>
                ) : (
                  processedHistory.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-600">
                        {formatDate(item.timestamp || item.date)}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{item.assetName || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-600">{item.templateName || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-600">{item.technician || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                          {item.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedLog(item)}
                          className="text-[#005596] hover:text-[#00A1E4] text-[10px] font-bold uppercase tracking-wider transition-colors border border-[#005596] hover:border-[#00A1E4] px-3 py-1.5 rounded shadow-sm hover:shadow"
                        >
                          Review PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

        /* --- PDF REVIEW OVERLAY --- */
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-entrance">
          <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center no-print">
            <button 
              onClick={() => setSelectedLog(null)}
              className="text-gray-600 hover:text-[#005596] text-xs font-bold uppercase tracking-wider flex items-center transition-colors"
            >
              &larr; Back to Audit Trail
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-[#005596] hover:bg-[#003058] text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center space-x-2"
            >
              <span>🖨️ Export to PDF</span>
            </button>
          </div>

          {/* The actual printable document area */}
          <div id="pdf-print-area" className="p-10 max-w-4xl mx-auto bg-white min-h-[800px]">
            
            {/* Report Header with Logo */}
            <div className="flex justify-between items-end border-b-2 border-[#005596] pb-6 mb-8 mt-4">
              <div>
                <img src="/logo.png" alt="Fairchild Imaging Logo" className="h-16 w-auto object-contain mb-1" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Operations Management System</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Maintenance Audit Report</h2>
                <p className="text-xs font-mono text-gray-500 mt-1">Log ID: {selectedLog.id || `LOG-SYSTEM`}</p>
              </div>
            </div>

            {/* Meta Information Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Target System</span>
                  <span className="text-sm font-bold text-gray-900 block">{selectedLog.assetName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Protocol Executed</span>
                  <span className="text-sm text-gray-800 block">{selectedLog.templateName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Service Interval</span>
                  <span className="text-sm text-gray-800 block">{selectedLog.interval || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Execution Timestamp</span>
                  <span className="font-mono text-sm text-[#005596] font-bold block">{formatDate(selectedLog.timestamp || selectedLog.date)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Authorized Technician</span>
                  <span className="text-sm text-gray-800 block">{selectedLog.technician || 'N/A'}</span>
                  {selectedLog.email && <span className="text-xs text-gray-500 font-mono block mt-0.5">{selectedLog.email}</span>}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Final Status</span>
                  <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Checklist (If responses exist) */}
            {(selectedLog.responses || selectedLog.checklist) && (
              <div className="mb-8">
                <h3 className="text-xs font-bold text-[#005596] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Checklist Responses</h3>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-[10px] uppercase tracking-wider text-gray-600">
                      <th className="p-3 border border-gray-200">Task Description</th>
                      <th className="p-3 border border-gray-200 w-32 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedLog.responses || selectedLog.checklist || {}).map(([task, result], i) => (
                      <tr key={i} className="even:bg-gray-50/50">
                        <td className="p-3 border border-gray-200 text-gray-800">{task}</td>
                        <td className="p-3 border border-gray-200 text-center font-bold">
                          {result === true ? <span className="text-green-600">PASS</span> : 
                           result === false ? <span className="text-red-600">FAIL</span> : 
                           <span className="text-gray-600">{result}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Technician Notes / Comments */}
            <div className="mb-12">
              <h3 className="text-xs font-bold text-[#005596] uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Technician Notes & Comments</h3>
              <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {selectedLog.comments || selectedLog.notes || "No additional comments provided during execution."}
              </div>
            </div>

            {/* Footer Sign-off */}
            <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between items-end pb-8">
              <div className="w-72">
                <div className="border-b-2 border-gray-800 pb-2 mb-2 text-center font-mono text-sm text-gray-800 italic">
                  Electronically Signed: {selectedLog.technician || 'N/A'}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Technician Digital Signature</div>
              </div>
              <div className="text-[10px] text-gray-400 font-mono text-right">
                Document Generated:<br/>
                {new Date().toLocaleString()}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}