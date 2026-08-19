import React, { useState } from 'react';

export default function HardwareVendorsTab({ assets, isSystemAdmin }) {
  const [activeView, setActiveView] = useState('parts'); // 'parts' or 'vendors'
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 animate-entrance w-full">
      
      {/* DIRECTORY HEADER & SUB-NAV CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Sub-Tab Toggle */}
        <div className="flex bg-gray-100 p-1.5 rounded-lg border border-gray-200 w-full md:w-auto shadow-inner">
          <button 
            onClick={() => setActiveView('parts')} 
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'parts' ? 'bg-white text-[#005596] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            ⚙️ Parts Inventory
          </button>
          <button 
            onClick={() => setActiveView('vendors')} 
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'vendors' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            🏢 Vendor Directory
          </button>
        </div>

        {/* Global Action & Search */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {activeView === 'parts' ? (
            <button className="w-full md:w-auto bg-[#00A1E4] hover:bg-[#0081b8] text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap">
              ➕ Add Part
            </button>
          ) : (
            <button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap">
              ➕ Add Vendor
            </button>
          )}
          <input 
            type="text" 
            placeholder={`Search ${activeView === 'parts' ? 'Parts or P/N' : 'Vendors or Contacts'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 text-xs rounded-lg border border-gray-300 p-2.5 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005596] transition-all"
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
            0 Records Found
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
                {/* Placeholder Row until Database is connected */}
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center bg-gray-50/50">
                    <span className="text-4xl mb-4 block opacity-50">⚙️</span>
                    <h4 className="text-gray-700 font-black text-sm uppercase tracking-wider">No Parts Logged</h4>
                    <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
                      Click "Add Part" to register spare parts, filters, or consumables and link them to your existing facility assets.
                    </p>
                  </td>
                </tr>
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
                {/* Placeholder Row until Database is connected */}
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center bg-indigo-50/30">
                    <span className="text-4xl mb-4 block opacity-50">🏢</span>
                    <h4 className="text-indigo-900 font-black text-sm uppercase tracking-wider">No Vendors Logged</h4>
                    <p className="text-xs text-indigo-400/80 mt-2 max-w-sm mx-auto font-medium">
                      Click "Add Vendor" to build your Approved Vendor List and link them directly to specific hardware for rapid dispatching.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}