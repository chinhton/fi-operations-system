import React from 'react';

export default function AssetsTab({
  handleAddAssetSubmit, isAddingAsset, newAsset, setNewAsset, PM_CYCLE_OPTIONS,
  assetSearch, setAssetSearch, groupedAssets, isSystemAdmin, deleteAssetCategory,
  handleUpdateAssetStatus, calculateDaysRemaining, calculateNextPmDate,
  handleOpenAssetModal, openPmModal, deleteAsset
}) {
  return (
    <div className="space-y-8 animate-entrance">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Register New Dynamic Lab/Cleanroom Asset</h3></div>
        <form onSubmit={handleAddAssetSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Equipment Name</label>
              <input type="text" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. sCMOS Chamber" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Model Identifier</label>
              <input type="text" value={newAsset.model} onChange={(e) => setNewAsset({...newAsset, model: e.target.value})} placeholder="e.g. VCC-2020-X" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number</label>
              <input type="text" value={newAsset.serial} onChange={(e) => setNewAsset({...newAsset, serial: e.target.value})} placeholder="e.g. FC-90812-C" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location / Bay</label>
              <input type="text" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g. Cleanroom Bay 3" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Type</label>
              <input type="text" value={newAsset.category} onChange={(e) => setNewAsset({...newAsset, category: e.target.value})} placeholder="e.g. Vacuum Chamber" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PM Frequencies (Select Multiple)</label>
              <div className="flex flex-wrap gap-3 mt-2.5">
                {PM_CYCLE_OPTIONS.map(freq => (
                  <label key={freq} className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-700 font-medium bg-gray-50 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-100 transition">
                    <input
                      type="checkbox"
                      checked={newAsset.pmFrequencies?.includes(freq) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAsset({ ...newAsset, pmFrequencies: [...(newAsset.pmFrequencies || []), freq] });
                        } else {
                          setNewAsset({ ...newAsset, pmFrequencies: (newAsset.pmFrequencies || []).filter(f => f !== freq) });
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-[#005596] focus:ring-[#005596]"
                    />
                    <span>{freq}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={isAddingAsset} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${isAddingAsset ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isAddingAsset ? 'Committing...' : 'Commit Asset'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">Hardware Directory</h3>
        <input  
            type="text" 
            placeholder="Search by Name, S/N, or Category..." 
            value={assetSearch}
            onChange={(e) => setAssetSearch(e.target.value)}
            className="bg-white text-gray-900 text-xs rounded border-gray-300 px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-[#00A1E4] font-normal shadow-inner"
          />
        </div>
        
        {Object.keys(groupedAssets).length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">No assets registered in the database.</div>
        ) : (
          Object.entries(groupedAssets).map(([category, catAssets]) => (
            <div key={category} className="mb-4">
              <div className="bg-gray-100 px-6 py-2 border-y border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider shadow-inner flex justify-between items-center">
                <div>📁 Category: {category} <span className="ml-2 font-normal text-gray-400">({catAssets.length} Assets)</span></div>
                {isSystemAdmin && <button onClick={() => deleteAssetCategory(category)} className="text-[10px] text-red-500 hover:text-red-700">Delete Category &times;</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Asset Name</th>
                      <th className="px-6 py-3.5">Model / Serial No</th>
                      <th className="px-6 py-3.5">Status & PM Cycle Tracker</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {catAssets.map((asset) => {
                      const freqs = asset.pmFrequencies && asset.pmFrequencies.length > 0 ? asset.pmFrequencies : (asset.pmFrequency && asset.pmFrequency !== "None" ? [asset.pmFrequency] : []);
                      
                      return (
                        <tr key={asset.serial} className="hover:bg-gray-50/55 transition">
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900 block">{asset.name}</span>
                          </td>
                          <td className="px-6 py-4 font-mono">
                            <span className="block text-gray-700">Mod: {asset.model}</span>
                            <span className="block text-[11px] text-gray-400">S/N: {asset.serial}</span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={asset.status}
                              onChange={(e) => handleUpdateAssetStatus(asset.id, e.target.value)}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005596] ${
                                asset.status === "Operational" ? "bg-green-100 text-green-800" :
                                asset.status === "Maintenance Due" ? "bg-yellow-100 text-yellow-800" :
                                asset.status === "Out of Calibration" ? "bg-red-100 text-red-800" :
                                "bg-orange-100 text-orange-800"
                              }`}
                            >
                              <option value="Operational">Operational</option>
                              <option value="Maintenance Due">Maintenance Due</option>
                              <option value="Out of Calibration">Out of Calibration</option>
                              <option value="Corrective Maintenance">Corrective Action</option>
                            </select>
                            
                            <div className="flex flex-col mt-3 space-y-2 border-t border-gray-100 pt-2">
                              {freqs.length === 0 ? (
                                <span className="text-[9px] text-gray-400 uppercase font-bold">No Active Cycles</span>
                              ) : (
                                freqs.map(freq => {
                                  const targetDate = asset.pmDates?.[freq] || asset.lastPmDate;
                                  const daysRemaining = calculateDaysRemaining(targetDate, freq);
                                  
                                  return (
                                    <div key={freq} className="flex flex-col text-[10px]">
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[#005596] font-bold uppercase tracking-wider">{freq}</span>
                                        {daysRemaining !== null ? (
                                          <span className={`font-bold px-1.5 py-0.5 rounded-sm w-max ${daysRemaining < 0 ? 'bg-red-50 text-red-600' : daysRemaining <= 7 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            ⏳ {daysRemaining < 0 ? `Overdue (${Math.abs(daysRemaining)}d)` : `Due in ${daysRemaining}d`}
                                          </span>
                                        ) : (
                                          <span className="font-bold px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-600">⏳ Needs Baseline</span>
                                        )}
                                      </div>
                                      {targetDate && <span className="text-gray-500 font-mono text-[9px]">Next: {calculateNextPmDate(targetDate, freq)}</span>}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-4">
                            <button onClick={() => handleOpenAssetModal(asset)} className="text-xs font-bold text-[#00A1E4] hover:text-[#0081b8] transition">Hardware & Vendors</button>
                            <button onClick={() => openPmModal(asset)} className="text-xs font-bold text-[#005596] hover:text-[#005596]/80 transition">Execute PM</button>
                            {isSystemAdmin && (
                              <button onClick={() => deleteAsset(asset.id)} className="text-xs font-bold text-red-600 hover:text-red-800 transition">Delete</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}