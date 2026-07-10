import React, { useState } from 'react';

export default function TemplatesTab({
  handleAddTemplateSubmit, newTemplate, setNewTemplate, 
  uniqueCategories, activeAccounts, editingTemplateId, cancelEditTemplate, 
  isAddingTemplate, pmTemplates, // <-- Removed search props, kept raw pmTemplates
  isSystemAdmin, deleteTemplateCategory, handleEditTemplateClick, deleteTemplate
}) {
  // Moved from App.jsx!
  const [templateSearch, setTemplateSearch] = useState("");

  return (
    <div className="space-y-8 animate-entrance">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Construct Custom SOP Template</h3></div>
        <form onSubmit={handleAddTemplateSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Checklist Title</label>
              <input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Annual Precision ISO Check" className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Interval Frequency</label>
              <select value={newTemplate.interval} onChange={(e) => setNewTemplate({...newTemplate, interval: e.target.value})} className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 bg-white border cursor-pointer">
                <option value="Daily">Daily Cycle</option>
                <option value="Weekly">Weekly Cycle</option>
                <option value="Monthly">Monthly Cycle</option>
                <option value="Quarterly">Quarterly Cycle</option>
                <option value="Semi-Annually">Semi-Annually Cycle</option>
                <option value="Annually">Annually Cycle</option>
                <option value="2-Year">2-Year Cycle</option>
                <option value="3-Year">3-Year Cycle</option>
                <option value="4-Year">4-Year Cycle</option>
                <option value="5-Year">5-Year Cycle</option>
                <option value="Calibration (Semi-Annual)">Calibration (Semi-Annual)</option>
                <option value="Calibration (Annual)">Calibration (Annual)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assigned Responsible Department</label>
              <input type="text" value={newTemplate.department} onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})} placeholder="e.g. Cleanroom Operations" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Asset Mapping (Category Lock)</label>
              <select value={newTemplate.targetCategory} onChange={(e) => setNewTemplate({...newTemplate, targetCategory: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                <option value="Global">Global (All Assets)</option>
                {uniqueCategories.map(cat => <option key={cat} value={cat}>Strict Map: {cat}</option>)}
              </select>
            </div>
            <div> 
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Manager Email (For Notifications)</label>
              <select value={newTemplate.managerEmail} onChange={(e) => setNewTemplate({...newTemplate, managerEmail: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                <option value="">-- Select Manager Account --</option>
                {activeAccounts.map(u => <option key={`mgr-${u.email}`} value={u.email}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Operator Email (Primary Notification)</label>
              <select value={newTemplate.operatorEmail} onChange={(e) => setNewTemplate({...newTemplate, operatorEmail: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
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
            </div> 
          <div className="mt-6 flex justify-end space-x-3">
            {editingTemplateId && (
              <button type="button" onClick={cancelEditTemplate} className="px-5 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel Edit</button>
            )}
            <button type="submit" disabled={isAddingTemplate} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isAddingTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isAddingTemplate ? 'Processing...' : (editingTemplateId ? 'Update Protocol' : 'Generate Protocol')}
            </button>
          </div>
        </form>
      </div>

      <div className="flex justify-end mb-4 px-1">
        <input 
          type="text" 
          placeholder="Search SOP Templates by Name, Category, or Dept..." 
          value={templateSearch}
          onChange={(e) => setTemplateSearch(e.target.value)}
          className="w-full md:w-80 text-xs rounded border border-gray-300 p-2.5 bg-white shadow-sm focus:outline-none focus:border-[#005596]"
        />
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
          <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">No SOP templates matching search.</div>
        ) : (
          Object.entries(groupedTemplates).map(([category, catTemplates]) => (
            <div key={category} className="mb-8">
              <div className="flex items-center space-x-4 mb-2">
                  <span className="font-bold text-gray-700 text-sm">📁 Category Lock: {category}</span>
                  {isSystemAdmin && category !== "Global" && <button onClick={() => deleteTemplateCategory(category)} className="text-[10px] text-red-500 hover:text-red-700">Delete Category &times;</button>}
                  <span className="bg-gray-200 text-gray-600 px-2.5 py-1 rounded-full text-[10px]">{catTemplates.length} Protocol{catTemplates.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
                {catTemplates.map((template) => (
                  <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between relative hover:shadow-md transition">
                    {template.targetCategory !== "Global" && (
                      <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-2 py-1 uppercase rounded-bl-lg shadow-sm border-b border-l border-yellow-500 z-10">Locked: {template.targetCategory}</div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase">{template.id}</span>
                          <h4 className="font-bold text-base text-gray-900 mt-0.5 leading-tight">{template.name}</h4>
                        </div>
                        <span className="bg-blue-50 text-[#005596] text-[10px] font-bold px-2 py-1 rounded uppercase">{template.interval}</span>
                      </div>
                      <div className="mt-2 text-xs text-[#00A1E4] font-semibold">Managed by: {template.department}</div>
                      {(template.managerEmail || template.operatorEmail) && (
                        <div className="mt-3 text-[10px] text-gray-500 font-mono bg-gray-50 p-2.5 rounded border border-gray-100 shadow-inner">
                          {template.managerEmail && <span className="block"><strong className="text-gray-700">Mgr Alert:</strong> {template.managerEmail}</span>}
                          {template.operatorEmail && <span className="block mt-1"><strong className="text-gray-700">Tech Alert:</strong> {template.operatorEmail}</span>}
                        </div>
                      )}
                      <ul className="mt-4 space-y-1.5 pl-4 list-decimal text-xs text-gray-600">
                        {template.checklist.map((item, idx) => {
                          const label = typeof item === 'string' ? item : item.label;
                          const type = typeof item === 'string' ? 'checkbox' : item.type;
                          return (
                            <li key={idx} className="mb-1"><span className="uppercase text-[9px] font-bold text-[#00A1E4] bg-blue-50 px-1 py-0.5 rounded mr-1.5 border border-blue-100">[{type}]</span> {label}</li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">{template.checklist.length} tasks</span>
                      {isSystemAdmin && (
                        <div className="flex space-x-4">
                          <button onClick={() => handleEditTemplateClick(template)} className="text-[#005596] hover:text-[#00407a] font-bold uppercase tracking-wider text-[10px]">Edit</button>
                          <button onClick={() => deleteTemplate(template.id)} className="text-red-600 hover:text-red-800 font-bold uppercase tracking-wider text-[10px]">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        );
      })()}
    </div>
  );
}