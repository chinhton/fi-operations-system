import React, { useState, useEffect } from 'react';

// --- THE FIX: Aligned departments strictly with AuthScreen ---
const CORPORATE_DEPARTMENTS = [
  "Facilities", 
  "Production: Sensor Assembly", 
  "Production: Final Assembly and Test", 
  "Production Engineering"
];

export default function TemplatesTab({
  handleAddTemplateSubmit, newTemplate, setNewTemplate, 
  uniqueCategories, activeAccounts, editingTemplateId, cancelEditTemplate, 
  isAddingTemplate, pmTemplates, 
  isSystemAdmin, deleteTemplateCategory, handleEditTemplateClick, deleteTemplate,
  manuals = [], PM_CYCLE_OPTIONS
}) {
  
  const [templateSearch, setTemplateSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // --- THE FIX: State to hold the protocol being viewed in the popup ---
  const [viewingSop, setViewingSop] = useState(null);

  // Automatically open the modal ONLY if the admin clicks "Edit" on an existing template card
  useEffect(() => {
    if (editingTemplateId) {
      setIsModalOpen(true);
    }
  }, [editingTemplateId]);

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    await handleAddTemplateSubmit(e);
    setIsModalOpen(false);
  };

  const closeAndCancel = () => {
    if (editingTemplateId) cancelEditTemplate();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-entrance">
      
      {/* DIRECTORY HEADER & CONTROLS */}
      <div className="flex justify-end items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <input 
          type="text" 
          placeholder="Search Established SOPs by Name, Category, or Dept..." 
          value={templateSearch}
          onChange={(e) => setTemplateSearch(e.target.value)}
          className="w-full md:w-96 text-xs rounded-lg border border-gray-300 p-3 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005596] transition-all"
        />
      </div>

      {/* COMPACT TABLE DIRECTORY MAP */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">Standard Operating Procedures</h3>
          <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full">{pmTemplates?.length || 0} Protocols</span>
        </div>

        {(() => {
          const filteredTemplates = (pmTemplates || []).filter(t => 
            (t.name || "").toLowerCase().includes(templateSearch.toLowerCase()) ||
            (t.targetCategory || "").toLowerCase().includes(templateSearch.toLowerCase()) ||
            (t.department || "").toLowerCase().includes(templateSearch.toLowerCase())
          );

          const groupedTemplates = filteredTemplates.reduce((acc, template) => {
            const cat = template.targetCategory || "Global";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(template);
            return acc;
          }, {});

          return Object.keys(groupedTemplates).length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">No Established SOPs matching search.</div>
          ) : (
            Object.entries(groupedTemplates).map(([category, catTemplates]) => (
              <div key={category} className="mb-0">
                <div className="bg-gray-100 px-6 py-2 border-y border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider shadow-inner flex justify-between items-center">
                  <div>📁 Category Lock: {category} <span className="ml-2 font-normal text-gray-400">({catTemplates.length} Protocols)</span></div>
                  {isSystemAdmin && category !== "Global" && <button onClick={() => deleteTemplateCategory(category)} className="text-[10px] text-red-500 hover:text-red-700 transition">Delete Category &times;</button>}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Protocol ID & Name</th>
                        <th className="px-6 py-3.5">Interval & Dept</th>
                        <th className="px-6 py-3.5">Task Profile</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {catTemplates.map((template) => (
                        <tr key={template.id} className="hover:bg-gray-50/55 transition">
                          <td className="px-6 py-4">
                            <span className="text-[9px] font-extrabold text-gray-400 tracking-wider uppercase block mb-0.5">{template.id}</span>
                            <span className="font-bold text-gray-900 block">{template.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-50 border border-blue-100 text-[#005596] text-[9px] font-bold px-2 py-0.5 rounded uppercase">{template.interval}</span>
                              <span className="text-[10px] text-gray-500 font-semibold">{template.department || 'Global Mgmt'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-medium text-gray-600">
                            {template.checklist?.length || 0} Actions Logged
                            {template.attachedManualName && (
                              <span className="block mt-1 text-[#005596] font-bold">📎 Linked Manual</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button onClick={() => setViewingSop(template)} className="text-xs font-bold text-[#00A1E4] hover:text-[#0081b8] transition">View Protocol</button>
                            <button onClick={() => handleEditTemplateClick(template)} className="text-xs font-bold text-gray-600 hover:text-gray-900 transition">Edit</button>
                            {isSystemAdmin && (
                              <button onClick={() => deleteTemplate(template.id)} className="text-xs font-bold text-red-600 hover:text-red-800 transition">Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          );
        })()}
      </div>

      {/* --- PROTOCOL VIEWER MODAL (READ-ONLY POPUP) --- */}
      {viewingSop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-entrance relative border border-gray-300">
            
            <div className="bg-[#005596] px-6 py-4 flex justify-between items-center shrink-0">
               <h3 className="text-white font-bold text-sm tracking-widest uppercase">Protocol Overview</h3>
               <button onClick={() => setViewingSop(null)} className="text-white hover:text-red-400 text-2xl leading-none transition">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               <div className="mb-4">
                 <span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase block mb-1">{viewingSop.id}</span>
                 <h4 className="font-bold text-lg text-[#005596] leading-tight">{viewingSop.name}</h4>
               </div>
               
               <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                 <span className="bg-blue-50 border border-blue-100 text-[#005596] text-[10px] font-bold px-2 py-0.5 rounded uppercase">{viewingSop.interval}</span>
                 <span className="text-[10px] text-gray-500 font-semibold uppercase">{viewingSop.department || 'Global Mgmt'}</span>
                 {viewingSop.targetCategory !== "Global" && (
                   <span className="bg-yellow-100 text-yellow-800 text-[9px] font-bold px-2 py-0.5 uppercase rounded ml-auto">Target: {viewingSop.targetCategory}</span>
                 )}
               </div>

               {(viewingSop.managerEmail || viewingSop.operatorEmail) && (
                 <div className="mb-6 text-[11px] text-gray-600 bg-gray-50 p-4 rounded border border-gray-200 shadow-inner grid grid-cols-2 gap-4">
                   {viewingSop.managerEmail && <div><span className="block text-[9px] font-bold uppercase text-gray-400 mb-1">Manager Notification</span><span className="font-mono text-gray-800">{viewingSop.managerEmail}</span></div>}
                   {viewingSop.operatorEmail && <div><span className="block text-[9px] font-bold uppercase text-gray-400 mb-1">Operator Assignment</span><span className="font-mono text-gray-800">{viewingSop.operatorEmail}</span></div>}
                 </div>
               )}

               {viewingSop.attachedManualName && (
                 <div className="mb-6 text-[11px] text-[#005596] font-bold bg-blue-50/50 p-3 rounded border border-blue-100 flex items-center shadow-sm">
                     📎 Reference Document: {viewingSop.attachedManualName}
                 </div>
               )}
               
               <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-3">Checklist Steps ({viewingSop.checklist?.length || 0})</h5>
               <ul className="space-y-2 list-none text-xs text-gray-700">
                 {viewingSop.checklist?.map((item, idx) => {
                   const label = typeof item === 'string' ? item : item.label;
                   const type = typeof item === 'string' ? 'checkbox' : item.type;
                   return (
                     <li key={idx} className="flex items-start bg-gray-50 p-3 rounded border border-gray-100">
                       <span className="uppercase text-[9px] font-bold text-[#00A1E4] bg-sky-50 px-1.5 py-0.5 rounded mr-3 border border-sky-100 shrink-0">[{type}]</span> 
                       <span className="font-medium text-gray-800 leading-tight pt-0.5">{label}</span>
                     </li>
                   );
                 })}
               </ul>
            </div>
            
            <div className="bg-gray-100 px-6 py-4 flex justify-end shrink-0 border-t border-gray-200">
              <button onClick={() => setViewingSop(null)} className="px-6 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-white transition shadow-sm">Close Protocol</button>
            </div>
          </div>
        </div>
      )}

      {/* --- TEMPLATE EDIT MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-entrance relative">
            
            <button onClick={closeAndCancel} className="absolute top-4 right-5 text-white hover:text-gray-200 font-bold text-xl z-10">&times;</button>
            
            <div className="bg-[#005596] text-white px-6 py-4">
              <h3 className="font-bold text-sm tracking-wide uppercase">Edit Custom SOP Protocol</h3>
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
                    {PM_CYCLE_OPTIONS?.map(opt => <option key={opt} value={opt}>{opt} Cycle</option>) || (
                      <>
                        <option value="Daily">Daily Cycle</option>
                        <option value="Weekly">Weekly Cycle</option>
                        <option value="Monthly">Monthly Cycle</option>
                        <option value="Quarterly">Quarterly Cycle</option>
                        <option value="Annually">Annually Cycle</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assign Department</label>
                  <select 
                    value={newTemplate.department || ""} 
                    onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})} 
                    className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none"
                  >
                    <option value="">-- Unassigned (Global View) --</option>
                    {CORPORATE_DEPARTMENTS.map(dept => (
                      <option key={`dept-${dept}`} value={dept}>{dept}</option>
                    ))}
                  </select>
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
                
                {/* --- FULLY EDITABLE GRID PROTOCOL ACTIONS --- */}
                <div className="md:col-span-2 mt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Dynamic Protocol Actions</label>
                  
                  <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded shadow-inner bg-white">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-3 w-16 text-center border-r border-gray-200">Item #</th>
                          <th className="px-4 py-3 border-r border-gray-200">Checklist Action</th>
                          <th className="px-4 py-3 w-40 border-r border-gray-200">Input Type</th>
                          <th className="px-4 py-3 w-16 text-center">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {newTemplate.checklistSteps?.map((step, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-4 py-3 text-center font-mono font-bold text-gray-500 border-r border-gray-100 bg-gray-50/50">{idx + 1}</td>
                            <td className="px-2 py-2 border-r border-gray-100">
                              <input 
                                type="text" 
                                value={step.label} 
                                onChange={(e) => {
                                  const newSteps = [...newTemplate.checklistSteps];
                                  newSteps[idx].label = e.target.value;
                                  setNewTemplate({...newTemplate, checklistSteps: newSteps});
                                }}
                                placeholder="Enter action description..."
                                className="w-full text-xs font-medium text-gray-800 bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] px-2 py-1.5 rounded outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-gray-100">
                              <select 
                                value={step.type} 
                                onChange={(e) => {
                                  const newSteps = [...newTemplate.checklistSteps];
                                  newSteps[idx].type = e.target.value;
                                  setNewTemplate({...newTemplate, checklistSteps: newSteps});
                                }}
                                className="w-full uppercase text-[9px] font-bold text-[#00A1E4] bg-sky-50 px-1.5 py-1.5 rounded border border-transparent hover:border-sky-200 focus:bg-white focus:border-sky-400 focus:outline-none cursor-pointer transition-all outline-none"
                              >
                                <option value="checkbox">CHECKBOX</option>
                                <option value="text">SHORT TEXT</option>
                                <option value="number">NUMERIC</option>
                                <option value="passfail">PASS/FAIL</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => {
                                const newSteps = [...newTemplate.checklistSteps];
                                newSteps.splice(idx, 1);
                                setNewTemplate({...newTemplate, checklistSteps: newSteps});
                              }} className="text-gray-300 hover:text-red-600 font-bold text-lg leading-none transition-colors" title="Remove Step">&times;</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {(!newTemplate.checklistSteps || newTemplate.checklistSteps.length === 0) && (
                      <div className="text-xs text-gray-400 italic p-8 text-center bg-gray-50/50">No action steps added yet. Use the builder below to construct the grid.</div>
                    )}
                  </div>

                  {/* Add Row Controls */}
                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 items-stretch bg-gray-50 p-3 rounded border border-gray-200">
                    <select id="builderTypeModal" className="text-xs border border-gray-300 rounded p-2.5 bg-white cursor-pointer w-full md:w-56 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]">
                        <option value="checkbox">Checkbox (Done/Not Done)</option>
                        <option value="text">Short Text (Serial, Note)</option>
                        <option value="number">Numeric (PSI, Temp)</option>
                        <option value="passfail">Pass/Fail Dropdown</option>
                    </select>
                    <input type="text" id="builderLabelModal" placeholder="Action description, question, or parameter..." className="flex-1 text-xs border border-gray-300 rounded p-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddStepModal').click(); }}} />
                    <button type="button" id="btnAddStepModal" onClick={() => {
                        const type = document.getElementById('builderTypeModal').value;
                        const label = document.getElementById('builderLabelModal').value.trim();
                        if(!label) return;
                        setNewTemplate({...newTemplate, checklistSteps: [...(newTemplate.checklistSteps || []), { type, label }]});
                        document.getElementById('builderLabelModal').value = '';
                    }} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm whitespace-nowrap">Add Row to Grid</button>
                  </div>
                </div>
                {/* ------------------------------------------- */}

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
                <button type="button" onClick={closeAndCancel} className="px-5 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel Edit</button>
                <button type="submit" disabled={isAddingTemplate} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isAddingTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isAddingTemplate ? 'Processing...' : 'Update Protocol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}