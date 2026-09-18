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
      if (cc === '\n' && !quote) { ++row; col = 0; continue; }
      if (cc !== '\r') arr[row][col] += cc;
  }
  return arr;
};

const encodeSteps = (steps) => {
  if (!steps || !Array.isArray(steps)) return "";
  return steps.map(s => `[${s.type}] ${s.section ? `{${s.section}} ` : ''}${s.label}${s.limits ? ` <${s.limits}>` : ''}`).join(' | ');
};

const decodeSteps = (stepString) => {
  if (!stepString) return [];
  return stepString.split(/\s*\|\s*/).filter(Boolean).map(s => {
    const match = s.match(/^\[(.*?)\]\s*(?:\{(.*?)\}\s*)?(.*?)(?:\s*<(.*?)>)?$/);
    if (match) {
      let t = match[1].toLowerCase().trim();
      if (!['checkbox', 'text', 'number', 'passfail'].includes(t)) t = 'checkbox';
      return { type: t, section: match[2] ? match[2].trim() : "", label: match[3].trim(), limits: match[4] ? match[4].trim() : "" };
    }
    return { type: 'checkbox', section: "", label: s.trim(), limits: "" }; 
  });
};

export default function TemplatesTab({
  pmTemplates = [], manuals = [], assets = [],
  isSystemAdmin
}) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  const [syncProgress, setSyncProgress] = useState({ active: false, action: '', current: 0, total: 0 });
  
  const [newTemplate, setNewTemplate] = useState({
    id: '',
    name: "",
    docControlNumber: "",
    ecnNumber: "",
    executionMode: "asset",
    sopType: "Preventive Maintenance",
    managerEmail: "",
    operatorEmail: "",
    checklistSteps: [],
    attachedManualName: "",
    attachedManualData: null
  });

  const fileInputRef = useRef(null);

  const handleExportCSV = () => {
    const headers = ["id", "name", "docControlNumber", "ecnNumber", "executionMode", "sopType", "managerEmail", "operatorEmail", "attachedManualName", "checklistSteps"];
    const csvRows = [headers.join(",")];

    pmTemplates.forEach(template => {
      const row = headers.map(header => {
        let val = "";
        if (header === "checklistSteps") {
          val = encodeSteps(template[header]);
        } else {
          val = template[header] || "";
        }

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
    link.download = `FI-OMS_SOP_Protocols_Export_${new Date().toISOString().split('T')[0]}.csv`;
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

        const headers = parsedData[0].map(h => h.trim());
        const importedTemplates = [];

        for (let i = 1; i < parsedData.length; i++) {
          const rowData = parsedData[i];
          if (!rowData || rowData.length === 0 || !rowData[0]) continue;

          const rowObj = {};
          headers.forEach((h, idx) => {
             rowObj[h] = rowData[idx] ? rowData[idx].trim() : '';
          });

          const name = rowObj['name'] || rowObj['Title'] || rowObj['SOP Name'] || '';
          if (!name) continue;

          const finalTemplate = {
            id: rowObj['id'] || `sop-import-${Date.now()}-${i}`,
            name: name,
            docControlNumber: rowObj['docControlNumber'] || rowObj['Doc Control Number'] || "",
            ecnNumber: rowObj['ecnNumber'] || rowObj['ECN Number'] || "",
            executionMode: rowObj['executionMode'] || "asset",
            sopType: rowObj['sopType'] || rowObj['Type'] || "Preventive Maintenance",
            managerEmail: rowObj['managerEmail'] || "",
            operatorEmail: rowObj['operatorEmail'] || "",
            attachedManualName: rowObj['attachedManualName'] || "",
            checklistSteps: decodeSteps(rowObj['checklistSteps'] || "")
          };

          importedTemplates.push(finalTemplate);
        }

        if (!window.confirm(`Found ${importedTemplates.length} SOP Protocols in CSV. Import them now?`)) {
          e.target.value = null; 
          return;
        }

        setSyncProgress({ active: true, action: 'Importing', current: 0, total: importedTemplates.length });

        for (let i = 0; i < importedTemplates.length; i++) {
          await window.fetch('/api/templates?bulk=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(importedTemplates[i])
          });
          
          setSyncProgress(prev => ({ ...prev, current: i + 1 }));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        window.location.reload(); 
        
      } catch (err) {
        console.error(err);
        alert("Failed to parse CSV file. Ensure it is formatted correctly.");
        setSyncProgress({ active: false, action: '', current: 0, total: 0 });
      }
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const handleMassDeleteSOPs = async () => {
    if (filteredTemplates.length === 0) {
      alert("No SOPs found to delete.");
      return;
    }

    const confirm1 = window.confirm(`🚨 DANGER: You are about to permanently delete ${filteredTemplates.length} SOPs.\n\nThis action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?`);
    if (!confirm1) return;

    const confirm2 = window.prompt(`To confirm mass deletion of ${filteredTemplates.length} SOPs, please type DELETE in all caps:`);
    if (confirm2 !== "DELETE") {
      alert("Mass deletion cancelled.");
      return;
    }

    setSyncProgress({ active: true, action: 'Deleting', current: 0, total: filteredTemplates.length });

    try {
      for (let i = 0; i < filteredTemplates.length; i++) {
        await window.fetch(`/api/templates?id=${filteredTemplates[i].id}&bulk=true`, { method: 'DELETE' });
        
        setSyncProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("An error occurred during mass deletion.");
      window.location.reload();
    }
  };

  const openBuildModal = () => {
    setNewTemplate({
      id: '',
      name: "",
      docControlNumber: "",
      ecnNumber: "",
      executionMode: "asset",
      sopType: "Preventive Maintenance",
      managerEmail: "",
      operatorEmail: "",
      checklistSteps: [],
      attachedManualName: "",
      attachedManualData: null
    });
    setShowTemplateModal(true);
  };

  const openEditModal = (template) => {
    setNewTemplate({
      ...template,
      docControlNumber: template.docControlNumber || "",
      ecnNumber: template.ecnNumber || "",
      executionMode: template.executionMode || 'asset',
      sopType: template.sopType || "Preventive Maintenance"
    });
    setShowTemplateModal(true);
  };

  // --- NEW: DUPLICATE SOP HANDLER ---
  const handleDuplicateTemplate = (template) => {
    setNewTemplate({
      ...template,
      id: '', // Stripping the ID forces it to save as a brand new protocol
      name: `${template.name} (Copy)`,
      docControlNumber: "", // Stripped to prevent accidental ISO compliance overlaps
      ecnNumber: ""
    });
    setShowTemplateModal(true);
  };

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    
    if (!newTemplate.name || newTemplate.name.trim() === "") {
      alert("⚠️ SOP Checklist Title is required.");
      return;
    }

    setIsSaving(true);
    
    try {
      const payload = {
        ...newTemplate,
        id: newTemplate.id || `sop-${Date.now()}`
      };
      
      const response = await window.fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Database rejected the save request.");
      }
      
      setShowTemplateModal(false);
    } catch (error) {
      console.error("Failed to save SOP:", error);
      alert("An error occurred while communicating with the database.");
    }
    
    setIsSaving(false);
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this SOP? Active assets relying on it will lose their PM framework.")) return;
    try {
      await window.fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    } catch (err) { console.error("Failed to delete SOP:", err); }
  };

  const filteredTemplates = pmTemplates.filter(t =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.docControlNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableTags = [...new Set(assets.map(a => a.category).filter(Boolean))];

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedSteps = [...(newTemplate.checklistSteps || [])];
    const [movedItem] = updatedSteps.splice(draggedIndex, 1);
    updatedSteps.splice(targetIndex, 0, movedItem);

    setNewTemplate({ ...newTemplate, checklistSteps: updatedSteps });
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-8 animate-entrance w-full">
      
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
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
              >
                📤 Export CSV
              </button>
              <button 
                onClick={() => fileInputRef.current.click()}
                className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
              >
                📥 Import CSV
              </button>
              <button 
                onClick={handleMassDeleteSOPs}
                className="flex-1 sm:flex-none px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-200 transition-colors"
              >
                🧨 Wipe List
              </button>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
            </div>
          )}
        </div>

        <input 
          type="text" 
          placeholder="Search by Title, Category, Dept, or Doc #..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full xl:w-96 text-xs rounded-lg border border-gray-300 p-3 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
        />
      </div>

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
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#00A1E4]"></div>

                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-black text-gray-800 text-sm leading-tight pr-4">{template.name}</h4>
                  </div>

                  {(template.docControlNumber || template.ecnNumber) && (
                    <div className="flex space-x-3 mb-3 text-[9px] font-mono bg-gray-50 p-2 rounded border border-gray-100">
                      {template.docControlNumber && <div className="text-gray-500"><span className="font-bold">DOC:</span> {template.docControlNumber}</div>}
                      {template.ecnNumber && <div className="text-indigo-500"><span className="font-bold">REV:</span> {template.ecnNumber}</div>}
                    </div>
                  )}
                  
                  <div className="mb-4 flex flex-wrap gap-2">
                    {template.executionMode === 'route' ? (
                      <span className="inline-flex items-center space-x-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider">
                        <span>🚶‍♂️</span> <span>Grouped Route</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 bg-blue-50 text-[#005596] border border-blue-200 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider">
                        <span>⚙️</span> <span>Asset PMs</span>
                      </span>
                    )}

                    <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                        template.sopType === 'Calibration' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        template.sopType === 'Inspection' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-[#005596]/10 text-[#005596] border-[#005596]/20'
                    }`}>
                      {template.sopType || 'Preventive Maintenance'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-5">
                    <div className="flex items-center text-[10px]">
                      <span className="font-bold text-gray-500 uppercase tracking-wider w-16 shrink-0">Actions:</span>
                      <span className="text-gray-700 font-mono font-bold">{template.checklistSteps?.length || 0} Steps Configured</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button onClick={() => handleDuplicateTemplate(template)} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider transition-colors">
                    📋 Duplicate
                  </button>
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

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-entrance relative">
            
            <datalist id="available-asset-tags">
              {availableTags.map((tag, i) => <option key={`dl-${i}`} value={tag} />)}
            </datalist>

            <button onClick={() => setShowTemplateModal(false)} className="absolute top-4 right-5 text-white hover:text-gray-200 font-bold text-xl z-10">&times;</button>
            
            <div className="bg-[#005596] text-white px-6 py-4">
              <h3 className="font-bold text-sm tracking-wide uppercase">
                {newTemplate.id ? 'Edit Custom SOP Protocol' : 'Construct Custom SOP Protocol'}
              </h3>
              <p className="text-xs text-blue-200 mt-1">Global Library Definition</p>
            </div>
            
            <form onSubmit={handleLocalSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="md:col-span-2 border-b border-gray-100 pb-5 mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Checklist Title</label>
                  <input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Annual Precision ISO Check" className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" required />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Doc Control # <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                  <input type="text" value={newTemplate.docControlNumber} onChange={(e) => setNewTemplate({...newTemplate, docControlNumber: e.target.value})} placeholder="e.g. Form 248 Rev G" className="w-full text-xs font-mono rounded border-gray-300 shadow-sm p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">ECN / Rev # <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                  <input type="text" value={newTemplate.ecnNumber} onChange={(e) => setNewTemplate({...newTemplate, ecnNumber: e.target.value})} placeholder="e.g. ECN 250061" className="w-full text-xs font-mono rounded border-gray-300 shadow-sm p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Type</label>
                  <select 
                    value={newTemplate.sopType || "Preventive Maintenance"} 
                    onChange={(e) => setNewTemplate({...newTemplate, sopType: e.target.value})} 
                    className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 bg-white border cursor-pointer focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none"
                  >
                    <option value="Preventive Maintenance">⚙️ Preventive Maintenance</option>
                    <option value="Calibration">🔬 Calibration</option>
                    <option value="Inspection">📋 Inspection</option>
                  </select>
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Dynamic Protocol Actions</label>
                    <span className="text-[10px] text-gray-400 font-bold">💡 Tip: Drag ⠿ handle to reorder rows</span>
                  </div>
                  
                  <div className="mb-4 max-h-96 overflow-y-auto border border-gray-200 rounded shadow-inner bg-white">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-3 py-3 w-14 text-center border-r border-gray-200">#</th>
                          <th className="px-4 py-3 w-48 border-r border-gray-200">Asset / Section Tag</th>
                          <th className="px-4 py-3 border-r border-gray-200">Checklist Action</th>
                          <th className="px-4 py-3 w-40 border-r border-gray-200">Limits / Notes</th>
                          <th className="px-4 py-3 w-32 border-r border-gray-200">Input Type</th>
                          <th className="px-4 py-3 w-28 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {newTemplate.checklistSteps?.map((step, idx) => {
                          // --- THE FIX: Smart Visual Grouping for the Builder Table ---
                          const isSameSection = idx > 0 && newTemplate.checklistSteps[idx - 1].section === step.section && step.section !== "";

                          return (
                          <tr 
                            key={idx} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, idx)}
                            className={`transition-colors group ${draggedIndex === idx ? 'bg-purple-100/70 opacity-50' : 'hover:bg-blue-50/30'}`}
                          >
                            <td className="px-2 py-3 text-center font-mono font-bold text-gray-500 border-r border-gray-100 bg-gray-50/50 flex items-center justify-center space-x-1 cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">
                              <span className="text-gray-400 group-hover:text-purple-600 font-bold">⠿</span>
                              <span>{idx + 1}</span>
                            </td>
                            
                            <td className="px-2 py-2 border-r border-gray-100">
                              <input 
                                type="text" 
                                list="available-asset-tags"
                                value={step.section || ""} 
                                onChange={(e) => {
                                  const newSteps = [...newTemplate.checklistSteps];
                                  newSteps[idx].section = e.target.value;
                                  setNewTemplate({...newTemplate, checklistSteps: newSteps});
                                }}
                                placeholder="-- No Tag --"
                                title={step.section}
                                className={`w-full text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded outline-none transition-all cursor-text truncate ${
                                  isSameSection 
                                    ? 'text-gray-300 border-transparent hover:text-indigo-500 focus:text-indigo-700 focus:bg-indigo-50' 
                                    : 'text-indigo-700 border-transparent hover:border-gray-200 focus:bg-indigo-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
                                }`}
                              />
                            </td>

                            <td className="px-2 py-2 border-r border-gray-100">
                              <input 
                                type="text" 
                                value={step.label || ""} 
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
                              <input 
                                type="text" 
                                value={step.limits || ""} 
                                onChange={(e) => {
                                  const newSteps = [...newTemplate.checklistSteps];
                                  newSteps[idx].limits = e.target.value;
                                  setNewTemplate({...newTemplate, checklistSteps: newSteps});
                                }}
                                placeholder="e.g. 40-50 PSI"
                                className="w-full text-xs font-medium text-gray-600 bg-transparent border border-transparent hover:border-gray-200 focus:bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] px-2 py-1.5 rounded outline-none transition-all"
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
                                className={`w-full uppercase text-[9px] font-bold px-1.5 py-1.5 rounded border border-transparent focus:bg-white focus:outline-none cursor-pointer transition-all outline-none ${
                                  step.type === 'checkbox' ? 'text-slate-600 bg-slate-100 hover:border-slate-300 focus:border-slate-400' :
                                  step.type === 'text' ? 'text-blue-600 bg-blue-50 hover:border-blue-300 focus:border-blue-400' :
                                  step.type === 'number' ? 'text-indigo-600 bg-indigo-50 hover:border-indigo-300 focus:border-indigo-400' :
                                  step.type === 'passfail' ? 'text-emerald-700 bg-emerald-50 hover:border-emerald-300 focus:border-emerald-400' :
                                  'text-gray-600 bg-gray-50 hover:border-gray-200'
                                }`}
                              >
                                <option value="checkbox">CHECKBOX</option>
                                <option value="text">SHORT TEXT</option>
                                <option value="number">NUMERIC</option>
                                <option value="passfail">PASS/FAIL</option>
                              </select>
                            </td>

                            <td className="px-2 py-3 text-center flex justify-center items-center space-x-2 mt-1">
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newSteps = [...newTemplate.checklistSteps];
                                  newSteps.splice(idx + 1, 0, { type: 'checkbox', section: step.section || "", label: '', limits: '' });
                                  setNewTemplate({...newTemplate, checklistSteps: newSteps});
                                }} 
                                className="text-emerald-600 hover:text-emerald-800 transition-colors text-sm font-bold" 
                                title="Insert New Row Below"
                              >
                                ➕
                              </button>

                              <button 
                                type="button" 
                                onClick={() => {
                                  const newSteps = [...newTemplate.checklistSteps];
                                  newSteps.splice(idx + 1, 0, { ...step }); 
                                  setNewTemplate({...newTemplate, checklistSteps: newSteps});
                                }} 
                                className="text-blue-400 hover:text-blue-600 transition-colors" 
                                title="Duplicate Row"
                              >
                                📋
                              </button>

                              <button 
                                type="button" 
                                onClick={() => {
                                  const newSteps = [...newTemplate.checklistSteps];
                                  newSteps.splice(idx, 1);
                                  setNewTemplate({...newTemplate, checklistSteps: newSteps});
                                }} 
                                className="text-gray-300 hover:text-red-600 font-bold text-lg leading-none transition-colors" 
                                title="Remove Step"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                    
                    {(!newTemplate.checklistSteps || newTemplate.checklistSteps.length === 0) && (
                      <div className="text-xs text-gray-400 italic p-8 text-center bg-gray-50/50">No action steps added yet. Use the builder below to construct the grid.</div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 items-stretch bg-gray-50 p-3 rounded border border-gray-200">
                    <select id="builderTypeSOPModal" className="text-xs border border-gray-300 rounded p-2.5 bg-white cursor-pointer w-full md:w-40 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]">
                        <option value="checkbox">Checkbox (Done/Not Done)</option>
                        <option value="text">Short Text (Serial, Note)</option>
                        <option value="number">Numeric (PSI, Temp)</option>
                        <option value="passfail">Pass/Fail Dropdown</option>
                    </select>
                    
                    <input 
                      type="text" 
                      id="builderSectionSOPModal" 
                      list="available-asset-tags"
                      placeholder="Asset / Section Tag" 
                      className="w-full md:w-48 text-[11px] font-bold text-indigo-700 uppercase tracking-wider border border-gray-300 rounded p-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]" 
                    />
                    
                    <input type="text" id="builderLabelSOPModal" placeholder="Action description, question, or parameter..." className="flex-1 text-xs border border-gray-300 rounded p-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddStepSOPModal').click(); }}} />
                    
                    <input type="text" id="builderLimitsSOPModal" placeholder="Limits or Notes (Opt.)" className="w-full md:w-40 text-xs border border-gray-300 rounded p-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00A1E4]" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddStepSOPModal').click(); }}} />

                    <button type="button" id="btnAddStepSOPModal" onClick={() => {
                        const type = document.getElementById('builderTypeSOPModal').value;
                        const section = document.getElementById('builderSectionSOPModal').value.trim();
                        const label = document.getElementById('builderLabelSOPModal').value.trim();
                        const limits = document.getElementById('builderLimitsSOPModal').value.trim();
                        if(!label) return;
                        
                        setNewTemplate({...newTemplate, checklistSteps: [...(newTemplate.checklistSteps || []), { type, section, label, limits }]});
                        
                        document.getElementById('builderLabelSOPModal').value = '';
                        document.getElementById('builderLimitsSOPModal').value = '';
                    }} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm whitespace-nowrap">Add Row</button>
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
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-5 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isSaving} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isSaving ? 'Saving...' : (newTemplate.id ? 'Update Protocol' : 'Lock & Save Protocol')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {syncProgress.active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center animate-entrance">
            <span className="text-5xl mb-4 block animate-bounce">
              {syncProgress.action === 'Deleting' ? '🗑️' : '📥'}
            </span>
            <h3 className={`font-black text-xl uppercase tracking-wider mb-2 ${syncProgress.action === 'Deleting' ? 'text-red-600' : 'text-[#005596]'}`}>
              {syncProgress.action === 'Deleting' ? 'Wiping Database...' : 'Importing Protocols...'}
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