import React, { useState, useRef } from 'react';

// --- Aligned departments strictly with AuthScreen ---
const CORPORATE_DEPARTMENTS = [
  "Facilities", 
  "Production: Sensor Assembly", 
  "Production: Final Assembly and Test", 
  "Production: Engineering"
];

export default function TemplatesTab({
  pmTemplates = [], manuals = [],
  newTemplate, setNewTemplate, handleAddTemplateSubmit,
  PM_CYCLE_OPTIONS, isSystemAdmin, uniqueCategories = [],
  isAddingTemplate, currentUser
}) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const fileInputRef = useRef(null);

  const userDept = currentUser?.department || "";
  const isDepartmentRestricted = !isSystemAdmin && userDept !== "Facilities" && userDept !== "Production: Engineering";

  const filteredTemplates = pmTemplates.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.targetCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- JSON EXPORT / IMPORT ENGINE FOR SOPs ---
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(pmTemplates, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FI-OMS_SOP_Protocols_Export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) {
          alert("Invalid format: The JSON file must contain an array of SOPs.");
          return;
        }

        if (!window.confirm(`Are you sure you want to import ${importedData.length} SOP Protocols?`)) {
          e.target.value = null; 
          return;
        }

        for (const template of importedData) {
          await window.fetch('/api/pmTemplates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template)
          });
        }
        
        alert("SOP Import complete! Refreshing page to sync database.");
        window.location.reload(); 
        
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to parse JSON file. Ensure it is a valid FI-OMS export.");
      }
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  // --- MODAL CONTROLS ---
  const openBuildModal = () => {
    const defaultDept = isDepartmentRestricted ? userDept : "";
    setNewTemplate({
      name: "",
      interval: "Monthly",
      department: defaultDept,
      targetCategory: "Global",
      managerEmail: "",
      operatorEmail: "",
      checklistSteps: [],
      attachedManualName: "",
      attachedManualData: null
    });
    setShowTemplateModal(true);
  };

  const openEditModal = (template) => {
    setNewTemplate(template);
    setShowTemplateModal(true);
  };

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    await handleAddTemplateSubmit(e);
    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this SOP? Active assets relying on it will lose their PM framework.")) return;
    try {
      await window.fetch(`/api/pmTemplates?id=${id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete SOP:", err);
    }
  };

  return (
    <div className="space-y-8 animate-entrance w-full">
      
      {/* DIRECTORY HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button 
            onClick={openBuildModal}
            className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-all transform hover:-translate-y-0.5"
          >
            ➕ Build New SOP
          </button>

          {isSystemAdmin && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button 
                onClick={handleExportJSON}
                className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
                title="Export SOPs to JSON"
              >
                📤 Export JSON
              </button>
              <button 
                onClick={() => fileInputRef.current.click()}
                className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
                title="Import SOPs from JSON"
              >
                📥 Import JSON
              </button>
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleImportJSON} 
                className="hidden" 
              />
            </div>
          )}
        </div>

        <input 
          type="text" 
          placeholder="Search by Title, Category, or Dept..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full xl:w-96 text-xs rounded-lg border border-gray-300 p-3 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
        />
      </div>

      {/* SOP DIRECTORY GRID */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1A2530] text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">Standard Operating Procedures</h3>
          <span className="text-[10px] bg-gray-700 px-3 py-1 rounded-full font-bold shadow-inner mt-2 sm:mt-0">{filteredTemplates.length} Protocols Active</span>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm italic bg-gray-50/50">
            No Established SOPs matching search. Use the "Build New SOP" button to construct a master protocol.
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 bg-gray-50/50">
            {filteredTemplates.map(template => (
              <div key={template.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between group relative overflow-hidden">
                {/* Decorative top border */}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${template.targetCategory === 'Global' ? 'bg-[#00A1E4]' : 'bg-purple-500'}`}></div>
                
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-black text-gray-800 text-sm leading-tight pr-4">{template.name}</h4>
                    <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border border-gray-200 shadow-sm">
                      {template.interval}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 mb-5">
                    <div className="flex items-center text-[10px]">
                      <span className="font-bold text-gray-500 uppercase tracking-wider w-20 shrink-0">Map:</span>
                      <span className={`font-bold uppercase tracking-wider ${template.targetCategory === 'Global' ? 'text-[#00A1E4]' : 'text-purple-600'}`}>
                        {template.targetCategory}
                      </span>
                    </div>
                    <div className="flex items-center text-[10px]">
                      <span className="font-bold text-gray-500 uppercase tracking-wider w-20 shrink-0">Dept:</span>
                      <span className="text-gray-700 font-bold">{template.department || 'Global'}</span>
                    </div>
                    <div className="flex items-center text-[10px]">
                      <span className="font-bold text-gray-500 uppercase tracking-wider w-20 shrink-0">Actions:</span>
                      <span className="text-gray-700 font-mono font-bold">{template.checklistSteps?.length || 0} Steps Configured</span>
                    </div>
                    {template.attachedManualName && (
                      <div className="flex items-center text-[10px] pt-1">
                        <span className="font-bold text-gray-500 uppercase tracking-wider w-20 shrink-0">Doc:</span>
                        <span className="text-[#005596] font-bold truncate">📎 {template.attachedManualName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openEditModal(template)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider transition-colors">
                    ✏️ Edit SOP
                  </button>
                  {isSystemAdmin && (
                    <button onClick={() => handleDeleteTemplate(template.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- QUICK TEMPLATE BUILDER MODAL --- */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-entrance relative">
            
            <button onClick={() => setShowTemplateModal(false)} className="absolute top-4 right-5 text-white hover:text-gray-200 font-bold text-xl z-10">&times;</button>
            
            <div className="bg-[#005596] text-white px-6 py-4">
              <h3 className="font-bold text-sm tracking-wide uppercase">
                {newTemplate.id ? 'Edit Custom SOP Protocol' : 'Construct Custom SOP Protocol'}
              </h3>
              <p className="text-xs text-blue-200 mt-1">Global Library Definition</p>
            </div>
            
            <form onSubmit={handleLocalSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Checklist Title</label>
                  <input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Annual Precision ISO Check" className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Interval Frequency</label>
                  <select value={newTemplate.interval} onChange={(e) => setNewTemplate({...newTemplate, interval: e.target.value})} className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none">
                    {PM_CYCLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Cycle</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assign Department</label>
                  <select 
                    value={newTemplate.department || ""} 
                    onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})} 
                    disabled={isDepartmentRestricted}
                    className={`w-full text-xs rounded border-gray-300 shadow-sm p-2.5 border transition-colors outline-none ${
                      isDepartmentRestricted 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                        : 'bg-white cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596]'
                    }`}
                  >
                    {!isDepartmentRestricted && <option value="">-- Unassigned (Global View) --</option>}
                    {isDepartmentRestricted ? (
                      <option value={userDept}>{userDept}</option>
                    ) : (
                      CORPORATE_DEPARTMENTS.map(dept => (
                        <option key={`dept-${dept}`} value={dept}>{dept}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Asset Mapping (Category Lock)</label>
                  <select value={newTemplate.targetCategory} onChange={(e) => setNewTemplate({...newTemplate, targetCategory: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none">
                    <option value="Global">Global (All Assets)</option>
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>Strict Map: {cat}</option>)}
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
                    <select id="builderTypeSOPModal" className="text-xs border border-gray-300 rounded p-2.5 bg-white cursor-pointer w-full md:w-56 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]">
                        <option value="checkbox">Checkbox (Done/Not Done)</option>
                        <option value="text">Short Text (Serial, Note)</option>
                        <option value="number">Numeric (PSI, Temp)</option>
                        <option value="passfail">Pass/Fail Dropdown</option>
                    </select>
                    <input type="text" id="builderLabelSOPModal" placeholder="Action description, question, or parameter..." className="flex-1 text-xs border border-gray-300 rounded p-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddStepSOPModal').click(); }}} />
                    <button type="button" id="btnAddStepSOPModal" onClick={() => {
                        const type = document.getElementById('builderTypeSOPModal').value;
                        const label = document.getElementById('builderLabelSOPModal').value.trim();
                        if(!label) return;
                        setNewTemplate({...newTemplate, checklistSteps: [...(newTemplate.checklistSteps || []), { type, label }]});
                        document.getElementById('builderLabelSOPModal').value = '';
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
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-5 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isAddingTemplate} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isAddingTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isAddingTemplate ? 'Saving...' : (newTemplate.id ? 'Update Protocol' : 'Lock & Save Protocol')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}