import React, { useState } from 'react';

export default function KeyManagementTab({ keys = [], users = [], isSystemAdmin }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newKey, setNewKey] = useState({
    id: '',
    keyTag: '',
    roomNumber: '',
    roomName: '',
    keyLocation: '',
    assignedTo: '',
    lastVerified: ''
  });

  const filteredKeys = keys.filter(k => 
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
    setNewKey(keyData);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setNewKey({
      id: '',
      keyTag: '',
      roomNumber: '',
      roomName: '',
      keyLocation: 'Master Key Box', // Default location
      assignedTo: '',
      lastVerified: new Date().toISOString().split('T')[0] // Defaults to today
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-entrance w-full">
      
      {/* HEADER & CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <span className="bg-amber-100 text-amber-800 p-2.5 rounded-lg text-lg shadow-sm border border-amber-200">🔑</span>
          <div>
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Hard Key Tracking Log</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Facilities Security Module</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button 
            onClick={openNewModal}
            className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
          >
            ➕ Register Key
          </button>
          <input 
            type="text" 
            placeholder="Search Tag #, Room, or Person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 text-xs rounded-lg border border-gray-300 p-2.5 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
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
                
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Key Tag / ID # *</label>
                  <input type="text" required value={newKey.keyTag} onChange={e => setNewKey({...newKey, keyTag: e.target.value})} className="w-full text-xs font-mono rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-amber-500 outline-none" placeholder="e.g. FAC-001" />
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
                  <select 
                    value={newKey.assignedTo || ""} 
                    onChange={e => setNewKey({...newKey, assignedTo: e.target.value})} 
                    className="w-full text-xs rounded border-red-200 bg-red-50/30 p-2.5 border focus:ring-1 focus:ring-red-500 outline-none cursor-pointer"
                  >
                    <option value="">-- Maintained in Storage --</option>
                    {users.map(u => (
                      <option key={`usr-${u.email}`} value={u.name}>{u.name} ({u.department})</option>
                    ))}
                  </select>
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
    </div>
  );
}