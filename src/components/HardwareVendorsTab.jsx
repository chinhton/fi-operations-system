import React, { useState } from 'react';

export default function HardwareVendorsTab({ assets = [], parts = [], vendors = [], isSystemAdmin }) {
  const [activeView, setActiveView] = useState('parts'); // 'parts' or 'vendors'
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newPart, setNewPart] = useState({ id: '', name: '', partNumber: '', stockLevel: 0, targetCategory: '', vendorId: '', cost: '' });
  const [newVendor, setNewVendor] = useState({ id: '', name: '', contactName: '', email: '', phone: '', serviceType: '', accountNumber: '' });

  // Compute unique asset categories for the Part mapping dropdown
  const uniqueCategories = [...new Set(assets.map(a => a.category).filter(Boolean))];

  // --- FILTERS ---
  const filteredParts = parts.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.targetCategory?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVendors = vendors.filter(v => 
    v.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.serviceType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- CRUD OPERATIONS ---
  const handleSavePart = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...newPart,
        id: newPart.id || `part-${Date.now()}`,
        stockLevel: parseInt(newPart.stockLevel, 10) || 0
      };
      await window.fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setIsPartModalOpen(false);
    } catch (err) {
      alert("Failed to save part to database.");
    }
    setIsSaving(false);
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...newVendor,
        id: newVendor.id || `ven-${Date.now()}`
      };
      await window.fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setIsVendorModalOpen(false);
    } catch (err) {
      alert("Failed to save vendor to database.");
    }
    setIsSaving(false);
  };

  const deletePart = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this part from inventory?")) return;
    await window.fetch(`/api/parts?id=${id}`, { method: 'DELETE' });
  };

  const deleteVendor = async (id) => {
    if (!window.confirm("Are you sure you want to completely remove this vendor from the Approved Vendor List?")) return;
    await window.fetch(`/api/vendors?id=${id}`, { method: 'DELETE' });
  };

  const openEditPart = (part) => {
    setNewPart(part);
    setIsPartModalOpen(true);
  };

  const openEditVendor = (vendor) => {
    setNewVendor(vendor);
    setIsVendorModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-entrance w-full relative">
      
      {/* DIRECTORY HEADER & SUB-NAV CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col xl:flex-row justify-between items-center gap-4">
        
        {/* Sub-Tab Toggle */}
        <div className="flex bg-gray-100 p-1.5 rounded-lg border border-gray-200 w-full xl:w-auto shadow-inner">
          <button 
            onClick={() => setActiveView('parts')} 
            className={`flex-1 xl:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'parts' ? 'bg-white text-[#005596] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            ⚙️ Parts Inventory
          </button>
          <button 
            onClick={() => setActiveView('vendors')} 
            className={`flex-1 xl:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'vendors' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            🏢 Vendor Directory
          </button>
        </div>

        {/* Global Action & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {activeView === 'parts' ? (
            <button 
              onClick={() => { setNewPart({ id: '', name: '', partNumber: '', stockLevel: 0, targetCategory: 'Global', vendorId: '', cost: '' }); setIsPartModalOpen(true); }}
              className="w-full sm:w-auto bg-[#00A1E4] hover:bg-[#0081b8] text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
            >
              ➕ Add Part
            </button>
          ) : (
            <button 
              onClick={() => { setNewVendor({ id: '', name: '', contactName: '', email: '', phone: '', serviceType: '', accountNumber: '' }); setIsVendorModalOpen(true); }}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
            >
              ➕ Add Vendor
            </button>
          )}
          <input 
            type="text" 
            placeholder={`Search ${activeView === 'parts' ? 'Parts or P/N' : 'Vendors or Contacts'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 text-xs rounded-lg border border-gray-300 p-2.5 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005596] transition-all"
          />
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className={`text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between ${activeView === 'parts' ? 'bg-[#1A2530]' : 'bg-indigo-900'}`}>
          <h3 className="font-bold text-sm tracking-wide uppercase">
            {activeView === 'parts' ? 'Hardware & Consumables Inventory' : 'Approved Vendor List (AVL)'}
          </h3>
          <span className="text-[10px] bg-black/30 px-3 py-1 rounded-full font-bold shadow-inner mt-2 sm:mt-0">
            {activeView === 'parts' ? filteredParts.length : filteredVendors.length} Records Found
          </span>
        </div>

        {/* --- PARTS VIEW --- */}
        {activeView === 'parts' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Part Details</th>
                  <th className="px-6 py-3.5">Stock Level</th>
                  <th className="px-6 py-3.5">Target Assets</th>
                  <th className="px-6 py-3.5">Linked Vendor</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center bg-gray-50/50">
                      <span className="text-4xl mb-4 block opacity-50">⚙️</span>
                      <h4 className="text-gray-700 font-black text-sm uppercase tracking-wider">No Parts Logged</h4>
                      <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
                        Click "Add Part" to register spare parts, filters, or consumables and link them to your existing facility assets.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredParts.map(part => {
                    const linkedVendor = vendors.find(v => v.id === part.vendorId);
                    return (
                      <tr key={part.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 block">{part.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">P/N: {part.partNumber || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-wider ${part.stockLevel <= 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {part.stockLevel} IN STOCK
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded uppercase tracking-wider">
                            {part.targetCategory || 'Global'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {linkedVendor ? (
                             <span className="text-[10px] font-bold text-indigo-700">🏢 {linkedVendor.name}</span>
                          ) : (
                             <span className="text-[10px] text-gray-400 italic">No Vendor Linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-4">
                          <button onClick={() => openEditPart(part)} className="text-xs font-bold text-[#005596] hover:text-[#00A1E4] uppercase tracking-wider transition">Edit</button>
                          {isSystemAdmin && (
                            <button onClick={() => deletePart(part.id)} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition">Delete</button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- VENDORS VIEW --- */}
        {activeView === 'vendors' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Vendor Identity</th>
                  <th className="px-6 py-3.5">Point of Contact</th>
                  <th className="px-6 py-3.5">Service Type</th>
                  <th className="px-6 py-3.5">Account / SLA</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center bg-indigo-50/30">
                      <span className="text-4xl mb-4 block opacity-50">🏢</span>
                      <h4 className="text-indigo-900 font-black text-sm uppercase tracking-wider">No Vendors Logged</h4>
                      <p className="text-xs text-indigo-400/80 mt-2 max-w-sm mx-auto font-medium">
                        Click "Add Vendor" to build your Approved Vendor List and link them directly to specific hardware for rapid dispatching.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-indigo-50/30 transition">
                      <td className="px-6 py-4">
                        <span className="font-bold text-indigo-900 block text-sm">{vendor.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block font-bold text-gray-800">{vendor.contactName || 'N/A'}</span>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {vendor.email && <span className="block">✉️ {vendor.email}</span>}
                          {vendor.phone && <span className="block">📞 {vendor.phone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold text-[#005596] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-wider">
                          {vendor.serviceType || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600 text-[11px]">
                        {vendor.accountNumber || 'No Active SLA'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-4">
                        <button onClick={() => openEditVendor(vendor)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider transition">Edit</button>
                        {isSystemAdmin && (
                          <button onClick={() => deleteVendor(vendor.id)} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition">Delete</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD / EDIT PART MODAL --- */}
      {isPartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-entrance relative">
            <div className="bg-[#005596] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide uppercase">{newPart.id ? 'Edit Inventory Part' : 'Register New Part'}</h3>
              <button type="button" onClick={() => setIsPartModalOpen(false)} className="text-white hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSavePart} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Part / Consumable Name *</label>
                  <input type="text" required value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-[#005596] outline-none" placeholder="e.g. HEPA Filter 24x48" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Part Number (P/N)</label>
                  <input type="text" value={newPart.partNumber} onChange={e => setNewPart({...newPart, partNumber: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-[#005596] outline-none font-mono" placeholder="e.g. FLT-99201" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Stock Level</label>
                  <input type="number" min="0" value={newPart.stockLevel} onChange={e => setNewPart({...newPart, stockLevel: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Target Asset Category</label>
                  <select value={newPart.targetCategory} onChange={e => setNewPart({...newPart, targetCategory: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-[#005596] outline-none bg-white">
                    <option value="Global">Global (All Assets)</option>
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">Link Approved Vendor</label>
                  <select value={newPart.vendorId} onChange={e => setNewPart({...newPart, vendorId: e.target.value})} className="w-full text-xs rounded border-indigo-200 p-2.5 border focus:ring-1 focus:ring-indigo-600 outline-none bg-indigo-50/30">
                    <option value="">-- No Vendor Linked --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsPartModalOpen(false)} className="px-5 py-2 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-[#00A1E4] hover:bg-[#0081b8] text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition">
                  {isSaving ? 'Saving...' : 'Save Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT VENDOR MODAL --- */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-entrance relative">
            <div className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide uppercase">{newVendor.id ? 'Edit Vendor Profile' : 'Register Approved Vendor'}</h3>
              <button type="button" onClick={() => setIsVendorModalOpen(false)} className="text-white hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Vendor / Company Name *</label>
                  <input type="text" required value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-indigo-600 outline-none" placeholder="e.g. Trane Commercial Systems" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Point of Contact</label>
                  <input type="text" value={newVendor.contactName} onChange={e => setNewVendor({...newVendor, contactName: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-indigo-600 outline-none" placeholder="e.g. John Smith" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Service Type</label>
                  <input type="text" value={newVendor.serviceType} onChange={e => setNewVendor({...newVendor, serviceType: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-indigo-600 outline-none" placeholder="e.g. HVAC Repair" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-indigo-600 outline-none" placeholder="e.g. dispatch@trane.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input type="text" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-indigo-600 outline-none" placeholder="e.g. (800) 555-1234" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Account / SLA Number</label>
                  <input type="text" value={newVendor.accountNumber} onChange={e => setNewVendor({...newVendor, accountNumber: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 border focus:ring-1 focus:ring-indigo-600 outline-none font-mono" placeholder="e.g. ACC-889021" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsVendorModalOpen(false)} className="px-5 py-2 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-800 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition">
                  {isSaving ? 'Saving...' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}