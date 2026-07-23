import React, { useState } from 'react';

// Hardcoded departments to match your operations
const CORPORATE_DEPARTMENTS = ["Facilities", "Production Vangie", "Production Chris", "Production Manufacturing"];

export default function AssetsTab({
  assets = [], users = [], manuals = [],
  handleAddAssetSubmit, isAddingAsset, newAsset, setNewAsset, PM_CYCLE_OPTIONS,
  isSystemAdmin, deleteAssetCategory, handleUpdateAssetStatus, 
  calculateDaysRemaining, calculateNextPmDate, handleOpenAssetModal, openPmModal, deleteAsset,
  
  // --- TEMPLATE BUILDER PROPS ---
  newTemplate, setNewTemplate, handleAddTemplateSubmit, uniqueCategories, 
  activeAccounts, isAddingTemplate
}) {
  
  const [assetSearch, setAssetSearch] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [targetAssetContext, setTargetAssetContext] = useState(null);

  const filteredAssets = assets.filter(a =>
    a.name?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.serial?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.category?.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    const cat = asset.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  // --- QUICK BUILD INTERCEPTOR ---
  const handleQuickBuildTemplate = (asset, freq) => {
    setNewTemplate({
      name: `${asset.name} - ${freq} Maintenance`,
      interval: freq,
      department: asset.department || "",
      targetCategory: asset.category || "Global",
      managerEmail: "",
      operatorEmail: asset.operatorEmail || "",
      checklistSteps: [],
      attachedManualName: "",
      attachedManualData: null
    });
    setTargetAssetContext(asset);
    setShowTemplateModal(true);
  };

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    await handleAddTemplateSubmit(e);
    setShowTemplateModal(false);
    setTargetAssetContext(null);
  };

  return (
    <div className="space-y-8 animate-entrance">
      
      {/* ASSET REGISTRATION FORM */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Register New Dynamic Lab/Cleanroom Asset</h3></div>
        <form onSubmit={handleAddAssetSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ROW 1 */}
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
            
            {/* ROW 2: Relational Linking */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location / Bay</label>
              <input type="text" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g. Cleanroom Bay 3" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Type</label>
              <input type="text" value={newAsset.category} onChange={(e) => setNewAsset({...newAsset, category: e.target.value})} placeholder="e.g. Vacuum Pump" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Link To Facility Asset (Sub-Equipment)</label>
              <select 
                value={newAsset.parentId || ""} 
                onChange={(e) => setNewAsset({...newAsset, parentId: e.target.value})} 
                className="w-full text-xs rounded border-purple-200 shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 p-2.5 border bg-purple-50/30 outline-none"
              >
                <option value="">-- Standalone Primary Asset --</option>
                {assets.filter(a => !a.parentId).map(a => (
                  <option key={`link-${a.id}`} value={a.id}>🔗 Link to: {a.name} ({a.serial})</option>
                ))}
              </select>
            </div>

            {/* ROW 3: Department & Personnel Assignment */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-[#005596]">Assign Department</label>
              <select 
                value={newAsset.department || ""} 
                onChange={(e) => setNewAsset({...newAsset, department: e.target.value})} 
                className="w-full text-xs rounded border-[#005596]/30 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] p-2.5 border bg-blue-50/30 outline-none"
              >
                <option value="">-- Unassigned (Global View) --</option>
                {CORPORATE_DEPARTMENTS.map(dept => (
                  <option key={`dept-${dept}`} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-[#00A1E4]">Assign Operator (Optional)</label>
              <select 
                value={newAsset.operatorEmail || ""} 
                onChange={(e) => setNewAsset({...newAsset, operatorEmail: e.target.value})} 
                className="w-full text-xs rounded border-[#00A1E4]/30 shadow-sm focus:border-[#00A1E4] focus:ring-1 focus:ring-[#00A1E4] p-2.5 border bg-sky-50/30 outline-none"
              >
                <option value="">-- Leave Unassigned --</option>
                {users.map(u => (
                  <option key={`opr-${u.email}`} value={u.email}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PM Frequencies (Select Multiple)</label>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {PM_CYCLE_OPTIONS.map(freq => (
                  <label key={freq} className="flex items-center space-x-1.5 cursor-pointer text-[10px] text-gray-700 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 transition">
                    <input
                      type="checkbox"
                      checked={newAsset.pmFrequencies?.includes(freq) || false}
                      onChange={(e) => {
                        if (e.target.checked) setNewAsset({ ...newAsset, pmFrequencies: [...(newAsset.pmFrequencies || []), freq] });
                        else setNewAsset({ ...newAsset, pmFrequencies: (newAsset.pmFrequencies || []).filter(f => f !== freq) });
                      }}
                      className="w-3 h-3 rounded border-gray-300 text-[#005596] focus:ring-[#005596]"
                    />
                    <span>{freq}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
          <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" disabled={isAddingAsset} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 shadow-md hover:shadow-lg text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all transform hover:-translate-y-0.5 ${isAddingAsset ? 'opacity-50 cursor-not-allowed transform-none shadow-none' : ''}`}>
              {isAddingAsset ? 'Committing...' : 'Commit Asset'}
            </button>
          </div>
        </form>
      </div>
      
      {/* HARDWARE DIRECTORY */}
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
        
        {Object.keys(groupedAssets || {}).length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">No assets registered in the database.</div>
        ) : (
          Object.entries(groupedAssets || {}).map(([category, catAssets]) => (
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
                            
                            {asset.parentId && (
                               <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase block mt-1 w-max">
                                 🔗 Linked to: {assets.find(a => a.id === asset.parentId)?.name || 'Unknown Asset'}
                               </span>
                            )}

                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {asset.department && <span className="text-[8px] bg-blue-100 text-[#005596] px-1.5 py-0.5 rounded font-bold uppercase" title={`Department: ${asset.department}`}>DEPT: {asset.department}</span>}
                              {asset.operatorEmail && <span className="text-[8px] bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded font-bold uppercase" title={`Operator: ${asset.operatorEmail}`}>OPR Assigned</span>}
                            </div>
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
                                      <div className="flex justify-between items-center mb-0.5 group">
                                        
                                        {/* --- INTERACTIVE FREQUENCY BUTTON --- */}
                                        <button 
                                          onClick={() => handleQuickBuildTemplate(asset, freq)}
                                          className="text-[#005596] font-bold uppercase tracking-wider flex items-center hover:text-[#00A1E4] transition-colors"
                                          title={`Build ${freq} SOP Protocol`}
                                        >
                                          {freq} <span className="opacity-0 group-hover:opacity-100 ml-1.5 text-[9px] bg-blue-100 px-1 rounded transition-opacity">BUILD SOP ➔</span>
                                        </button>
                                        
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

      {/* --- QUICK TEMPLATE BUILDER MODAL --- */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-entrance relative">
            
            <button onClick={() => { setShowTemplateModal(false); setTargetAssetContext(null); }} className="absolute top-4 right-5 text-white hover:text-gray-200 font-bold text-xl z-10">&times;</button>
            
            <div className="bg-[#005596] text-white px-6 py-4">
              <h3 className="font-bold text-sm tracking-wide uppercase">Construct Custom SOP Protocol</h3>
              {targetAssetContext && <p className="text-xs text-blue-200 mt-1">Pre-configured for {targetAssetContext.name} ({targetAssetContext.serial})</p>}
            </div>
            
            <form onSubmit={handleLocalSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Checklist Title</label>
                  <input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Annual Precision ISO Check" className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Interval Frequency</label>
                  <select value={newTemplate.interval} onChange={(e) => setNewTemplate({...newTemplate, interval: e.target.value})} className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none">
                    {PM_CYCLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Cycle</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assigned Responsible Department</label>
                  <input type="text" value={newTemplate.department} onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})} placeholder="e.g. Cleanroom Operations" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Asset Mapping (Category Lock)</label>
                  <select value={newTemplate.targetCategory} onChange={(e) => setNewTemplate({...newTemplate, targetCategory: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none">
                    <option value="Global">Global (All Assets)</option>
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>Strict Map: {cat}</option>)}
                  </select>
                </div>
                <div> 
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Manager Email (For Notifications)</label>
                  <select value={newTemplate.managerEmail} onChange={(e) => setNewTemplate({...newTemplate, managerEmail: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none">
                    <option value="">-- Select Manager Account --</option>
                    {activeAccounts.map(u => <option key={`mgr-${u.email}`} value={u.email}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Operator Email (Primary Notification)</label>
                  <select value={newTemplate.operatorEmail} onChange={(e) => setNewTemplate({...newTemplate, operatorEmail: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none">
                    <option value="">-- Select Operator Account --</option>
                    {activeAccounts.map(u => <option key={`op-${u.email}`} value={u.email}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Dynamic Protocol Actions</label>
                  
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
                    {newTemplate.checklistSteps?.map((step, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 border border-gray-200 rounded shadow-sm">
                          <span className="text-xs text-gray-800"><strong className="uppercase text-[#00A1E4] mr-2 bg-blue-50 px-2 py-1 rounded">[{step.type}]</strong> {step.label}</span>
                          <button type="button" onClick={() => {
                            const newSteps = [...newTemplate.checklistSteps];
                            newSteps.splice(idx, 1);
                            setNewTemplate({...newTemplate, checklistSteps: newSteps});
                          }} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none transition-colors">&times;</button>
                      </div>
                    ))}
                    {(!newTemplate.checklistSteps || newTemplate.checklistSteps.length === 0) && (
                      <div className="text-xs text-gray-400 italic p-4 border border-dashed border-gray-300 rounded bg-white text-center">No action steps added yet. Use the builder below.</div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 items-stretch">
                    <select id="builderType" className="text-xs border border-gray-300 rounded p-2.5 bg-white cursor-pointer w-full md:w-56 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]">
                        <option value="checkbox">Checkbox (Done/Not Done)</option>
                        <option value="text">Short Text (Serial, Note)</option>
                        <option value="number">Numeric (PSI, Temp)</option>
                        <option value="passfail">Pass/Fail Dropdown</option>
                    </select>
                    <input type="text" id="builderLabel" placeholder="Action description, question, or parameter..." className="flex-1 text-xs border border-gray-300 rounded p-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddStep').click(); }}} />
                    <button type="button" id="btnAddStep" onClick={() => {
                        const type = document.getElementById('builderType').value;
                        const label = document.getElementById('builderLabel').value.trim();
                        if(!label) return;
                        setNewTemplate({...newTemplate, checklistSteps: [...(newTemplate.checklistSteps || []), { type, label }]});
                        document.getElementById('builderLabel').value = '';
                    }} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm whitespace-nowrap">Add Step</button>
                  </div>
                </div>

                <div className="md:col-span-2 p-4 bg-slate-50 border border-gray-200 rounded-lg">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Attach Existing Equipment Manual (From Document Library)
                  </label>
                  <div className="flex flex-col space-y-3">
                    <select 
                      value={newTemplate.attachedManualName || ""} 
                      onChange={(e) => {
                        const selected = manuals.find(m => m.fileName === e.target.value);
                        if (selected) {
                          setNewTemplate({ ...newTemplate, attachedManualName: selected.fileName, attachedManualData: selected.fileData });
                        } else {
                          setNewTemplate({ ...newTemplate, attachedManualName: null, attachedManualData: null });
                        }
                      }} 
                      className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none"
                    >
                      <option value="">-- Select a Manual (Optional) --</option>
                      {manuals.map((manual, idx) => (
                        <option key={manual.id || idx} value={manual.fileName}>{manual.fileName}</option>
                      ))}
                    </select>

                    {newTemplate.attachedManualName && (
                      <span className="text-xs text-[#005596] font-bold flex items-center bg-blue-50 px-3 py-2 rounded border border-blue-200 w-fit">
                        ✅ Manual Linked: {newTemplate.attachedManualName}
                      </span>
                    )}
                  </div>
                </div>

              </div> 
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowTemplateModal(false); setTargetAssetContext(null); }} className="px-5 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isAddingTemplate} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isAddingTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isAddingTemplate ? 'Saving...' : 'Lock & Save Protocol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}