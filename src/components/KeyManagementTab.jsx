import React, { useState, useRef } from 'react';

const parseCSV = (str) => {
  const arr = [];
  let quote = false;
  let row = 0, col = 0;
  for (let c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c+1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || '';
      if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
      if (cc === '"') { quote = !quote; continue; }
      if (cc === ',' && !quote) { ++col; continue; }
      if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; } 
      if (cc === '\n' && !quote) { ++row; col = 0; continue; }
      if (cc !== '\r') arr[row][col] += cc;
  }
  return arr;
};

export default function KeyManagementTab({ keys = [], isSystemAdmin }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- NEW: Toggle State for Facility vs Cabinet ---
  const [keyViewMode, setKeyViewMode] = useState('facility'); // 'facility' or 'cabinet'
  
  // Visual Progress State for Imports & Wipes
  const [syncProgress, setSyncProgress] = useState({ active: false, action: '', current: 0, total: 0 });
  
  const fileInputRef = useRef(null);

  const [newKey, setNewKey] = useState({
    id: '',
    keyTag: '',
    category: 'Facility/Door', // Added category for the toggle
    roomNumber: '',
    roomName: '',
    keyLocation: '',
    assignedTo: '',
    lastVerified: ''
  });

  // 1. Filter by Toggle Mode (Treat undefined/old keys as Facility)
  const viewFilteredKeys = keys.filter(k => {
    if (keyViewMode === 'facility') {
      return k.category !== 'Cabinet/Desk';
    } else {
      return k.category === 'Cabinet/Desk';
    }
  });

  // 2. Filter by Search Query
  const filteredKeys = viewFilteredKeys.filter(k => 
    k.keyTag?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    k.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.roomName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveKey = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...newKey,
        id: newKey.id || `key-${Date.now()}`
      };
      await window.fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save key log to database.");
    }
    setIsSaving(false);
  };

  const deleteKey = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this key from the tracking log?")) return;
    await window.fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
  };

  const openEditModal = (keyData) => {
    setNewKey({ ...keyData, category: keyData.category || 'Facility/Door' });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setNewKey({
      id: '',
      keyTag: '',
      category: keyViewMode === 'cabinet' ? 'Cabinet/Desk' : 'Facility/Door', // Default to current view
      roomNumber: '',
      roomName: '',
      keyLocation: 'Master Key Box',
      assignedTo: '',
      lastVerified: new Date().toISOString().split('T')[0] 
    });
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    // Added category to export
    const headers = ["id", "keyTag", "category", "roomNumber", "roomName", "keyLocation", "assignedTo", "lastVerified"];
    const csvRows = [headers.join(",")];

    keys.forEach(k => {
      const row = headers.map(header => {
        let val = k[header] || "";
        val = val.toString().replace(/"/g, '""'); 
        if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`; 
        return val;
      });
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FI-OMS_Key_Log_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textData = event.target.result;
        const parsedData = parseCSV(textData);
        
        if (parsedData.length < 2) {
          alert("Invalid CSV format or file is empty.");
          return;
        }

        const headers = parsedData[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const importedKeys = [];

        for (let i = 1; i < parsedData.length; i++) {
          const rowData = parsedData[i];
          if (!rowData || rowData.length === 0 || !rowData[0]) continue; 

          const rowObj = {};
          headers.forEach((h, idx) => {
             rowObj[h] = rowData[idx] ? rowData[idx].trim() : '';
          });

          let keyTag = rowObj['keytag'] || rowObj['tag'] || rowObj['key'] || rowObj['item'] || rowObj['id'] || '';
          if (!keyTag) {
              keyTag = rowData[0] ? rowData[0].trim() : `UNKNOWN-TAG-${i}`;
          }

          const category = rowObj['category'] || rowObj['type'] || 'Facility/Door';
          const roomNumber = rowObj['roomnumber'] || rowObj['room'] || rowObj['rm'] || rowObj['roomno'] || '';
          const roomName = rowObj['roomname'] || rowObj['name'] || rowObj['area'] || rowObj['areadoor'] || rowObj['description'] || rowObj['door'] || '';
          const keyLocation = rowObj['keylocation'] || rowObj['location'] || rowObj['storagelocation'] || rowObj['storage'] || 'Master Key Box';
          const assignedTo = rowObj['assignedto'] || rowObj['possession'] || rowObj['owner'] || rowObj['assignee'] || rowObj['person'] || '';
          
          let lastVerified = rowObj['lastverified'] || rowObj['date'] || rowObj['verified'] || '';
          if (lastVerified && lastVerified.includes('/')) {
              const parts = lastVerified.split('/');
              if(parts.length === 3) {
                  lastVerified = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
              }
          }

          importedKeys.push({
            id: `key-import-${Date.now()}-${i}`,
            keyTag,
            category,
            roomNumber,
            roomName,
            keyLocation,
            assignedTo,
            lastVerified
          });
        }

        if (!window.confirm(`Found ${importedKeys.length} Keys in CSV. Import them now?`)) {
          e.target.value = null; 
          return;
        }

        setSyncProgress({ active: true, action: 'Importing', current: 0, total: importedKeys.length });

        for (let i = 0; i < importedKeys.length; i++) {
          await window.fetch('/api/keys?bulk=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(importedKeys[i])
          });
          
          setSyncProgress(prev => ({ ...prev, current: i + 1 }));
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }
        
        window.location.reload(); 
        
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to parse CSV file. Ensure it is formatted correctly.");
        setSyncProgress({ active: false, action: '', current: 0, total: 0 });
      }
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const handleMassDelete = async () => {
    if (filteredKeys.length === 0) {
      alert("No keys found to delete.");
      return;
    }

    const confirm1 = window.confirm(`🚨 DANGER: You are about to permanently delete ${filteredKeys.length} keys.\n\nThis will wipe them from the Azure database completely. This action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?`);
    if (!confirm1) return;

    const confirm2 = window.prompt(`To confirm mass deletion of ${filteredKeys.length} keys, please type DELETE in all caps:`);
    if (confirm2 !== "DELETE") {
      alert("Mass deletion cancelled.");
      return;
    }

    setSyncProgress({ active: true, action: 'Deleting', current: 0, total: filteredKeys.length });

    try {
      for (let i = 0; i < filteredKeys.length; i++) {
        await window.fetch(`/api/keys?id=${filteredKeys[i].id}&bulk=true`, { method: 'DELETE' });
        
        setSyncProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      window.location.reload();
    } catch (err) {
      console.error("Mass delete error:", err);
      alert("An error occurred during mass deletion.");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-entrance w-full relative">
      
      {/* HEADER & CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col xl:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center space-x-3 w-full xl:w-auto">
          <span className="bg-amber-100 text-amber-800 p-2.5 rounded-lg text-lg shadow-sm border border-amber-200">🔑</span>
          <div>
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Hard Key Tracking Log</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Facilities Security Module</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={openNewModal}
              className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
            >
              ➕ Register Key
            </button>
            {isSystemAdmin && (
              <>
                <button 
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
                >
                  📤 Export
                </button>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
                >
                  📥 Import
                </button>
                <button 
                  onClick={handleMassDelete}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-200 transition-colors"
                >
                  🧨 Wipe List
                </button>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
              </>
            )}
          </div>
          <input 
            type="text" 
            placeholder="Search Tag #, Room, or Person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 text-xs rounded-lg border border-gray-300 p-2.5 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
        </div>
      </div>

      {/* --- NEW: KEY VIEW TOGGLE --- */}
      <div className="flex justify-start">
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
          <button
            onClick={() => setKeyViewMode('facility')}
            className={`px-6 py-2.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              keyViewMode === 'facility'
                ? 'bg-white shadow-sm text-[#005596] border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            🚪 Facility & Doors
          </button>
          <button
            onClick={() => setKeyViewMode('cabinet')}
            className={`px-6 py-2.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              keyViewMode === 'cabinet'
                ? 'bg-white shadow-sm text-[#005596] border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            🗄️ Cabinets & Desks
          </button>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="bg-[#1A2530] text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">Active Key Inventory</h3>
          <span className="text-[10px] bg-black/30 px-3 py-1 rounded-full font-bold shadow-inner mt-2 sm:mt-0">
            {filteredKeys.length} Keys Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5 w-24">Key Tag #</th>
                <th className="px-6 py-3.5">Target Room / Area</th>
                <th className="px-6 py-3.5">Storage Location</th>
                <th className="px-6 py-3.5">Possession / Assigned To</th>
                <th className="px-6 py-3.5">Last Verified</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center bg-gray-50/50">
                    <span className="text-4xl mb-4 block opacity-50">🗝️</span>
                    <h4 className="text-gray-700 font-black text-sm uppercase tracking-wider">No Keys Logged</h4>
                    <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
                      Register hard keys to track their physical location and operator assignments.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredKeys.map(key => {
                  const isCheckedOut = key.assignedTo && key.assignedTo.trim() !== "" && key.assignedTo.toLowerCase() !== "unassigned";

                  return (
                    <tr key={key.id} className="hover:bg-amber-50/20 transition">
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 font-black text-[11px] rounded tracking-widest font-mono shadow-sm">
                          {key.keyTag}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900 block">{key.roomName || 'N/A'}</span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">RM: {key.roomNumber || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 font-medium">{key.keyLocation || 'Unspecified'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {isCheckedOut ? (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded uppercase tracking-wider flex items-center w-max shadow-sm">
                            👤 {key.assignedTo}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded uppercase tracking-wider flex items-center w-max shadow-sm">
                            ✅ In Storage
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-500 text-[11px]">
                        {key.lastVerified || 'Not Verified'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-4">
                        <button onClick={() => openEditModal(key)} className="text-xs font-bold text-[#005596] hover:text-[#00A1E4] uppercase tracking-wider transition">Edit</button>
                        {isSystemAdmin && (
                          <button onClick={() => deleteKey(key.id)} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition">Delete</button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD / EDIT KEY MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-entrance relative">
            <div className="bg-[#1A2530] text-white px-6 py-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                <span>🔑</span> 
                {newKey.id ? 'Modify Key Record' : 'Register New Hard Key'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-xl transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleSaveKey} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Key Tag / ID # *</label>
                  <input type="text" required value={newKey.keyTag} onChange={e => setNewKey({...newKey, keyTag: e.target.value})} className="w-full text-xs font-mono rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-amber-500 outline-none" placeholder="e.g. FAC-001" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Key Category *</label>
                  <select 
                    value={newKey.category || 'Facility/Door'} 
                    onChange={e => setNewKey({...newKey, category: e.target.value})} 
                    className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-amber-500 outline-none bg-white"
                  >
                    <option value="Facility/Door">🚪 Facility & Door</option>
                    <option value="Cabinet/Desk">🗄️ Cabinet & Desk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Room Number</label>
                  <input type="text" value={newKey.roomNumber} onChange={e => setNewKey({...newKey, roomNumber: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-amber-500 outline-none" placeholder="e.g. 104B" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Room Name / Area</label>
                  <input type="text" value={newKey.roomName} onChange={e => setNewKey({...newKey, roomName: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-amber-500 outline-none" placeholder="e.g. Server Room Main Door" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Verified Storage Location</label>
                  <input type="text" value={newKey.keyLocation} onChange={e => setNewKey({...newKey, keyLocation: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-amber-500 outline-none" placeholder="e.g. Facilities Lockbox 1" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1.5">Assigned To / Checked Out By</label>
                  <input 
                    type="text" 
                    value={newKey.assignedTo || ""} 
                    onChange={e => setNewKey({...newKey, assignedTo: e.target.value})} 
                    className="w-full text-xs rounded border-red-200 bg-red-50/30 p-2.5 border focus:ring-1 focus:ring-red-500 outline-none placeholder-red-300"
                    placeholder="e.g. John Doe (Leave blank if stored)"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date Last Verified</label>
                  <input type="date" value={newKey.lastVerified} onChange={e => setNewKey({...newKey, lastVerified: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-amber-500 outline-none" />
                </div>

              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition">
                  {isSaving ? 'Saving...' : 'Save Key Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PROGRESS OVERLAY FOR IMPORTS / WIPES --- */}
      {syncProgress.active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center animate-entrance">
            <span className="text-5xl mb-4 block animate-bounce">
              {syncProgress.action === 'Deleting' ? '🗑️' : '📥'}
            </span>
            <h3 className={`font-black text-xl uppercase tracking-wider mb-2 ${syncProgress.action === 'Deleting' ? 'text-red-600' : 'text-[#005596]'}`}>
              {syncProgress.action === 'Deleting' ? 'Wiping Database...' : 'Importing Records...'}
            </h3>
            <p className="text-gray-500 font-bold mb-6">Please do not close this window or refresh the page.</p>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden shadow-inner">
              <div 
                className={`${syncProgress.action === 'Deleting' ? 'bg-red-500' : 'bg-[#00A1E4]'} h-4 rounded-full transition-all duration-300`} 
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm font-mono font-bold text-gray-700">
              {syncProgress.action === 'Deleting' ? 'Deleted' : 'Imported'} {syncProgress.current} of {syncProgress.total} records
            </p>
          </div>
        </div>
      )}

    </div>
  );
}