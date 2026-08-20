import React from 'react';

export default function PmExecutionModal({
  isPmModalOpen, closePmModal, handlePmSubmit, 
  selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate, 
  pmTemplates, pmAnswers, setPmAnswers, 
  pmStatusState, setPmStatusState, pmComments, setPmComments, 
  isSubmittingPm
}) {
  if (!isPmModalOpen || !selectedPmAsset) return null;

  // Safely grab the steps using the new upgraded schema
  const activeSteps = selectedPmTemplate?.checklistSteps || selectedPmTemplate?.checklist || [];

  // --- THE FIX: STRICT MANUAL VALIDATION WRAPPER ---
  const validateAndSubmit = (e) => {
    e.preventDefault();

    if (!selectedPmTemplate) {
        alert("⚠️ Action Required: Please select a PM Protocol SOP to execute.");
        return; // Halts execution, modal stays open
    }

    // Loop through every single step to guarantee nothing was missed
    for (let i = 0; i < activeSteps.length; i++) {
        const step = activeSteps[i];
        const answer = pmAnswers[i];
        
        const stepType = typeof step === 'string' ? 'checkbox' : step.type;
        const stepLabel = typeof step === 'string' ? step : step.label;

        // If a checkbox isn't checked, throw a hard stop
        if (stepType === 'checkbox' && !answer) {
            alert(`⚠️ Incomplete Protocol: Please confirm Step #${i + 1} (${stepLabel})`);
            return; // Halts execution, modal stays open
        }
        
        // If a text, number, or pass/fail dropdown is completely blank, throw a hard stop
        if (['text', 'number', 'passfail'].includes(stepType) && (!answer || answer.toString().trim() === '')) {
            alert(`⚠️ Missing Data: Please provide a valid response for Step #${i + 1} (${stepLabel})`);
            return; // Halts execution, modal stays open
        }
    }

    // If it survives the gauntlet, pass it back to the database engine!
    handlePmSubmit(e);
  };

  // Support for the new Array structure in Target Categories from the hybrid update
  const availableTemplates = pmTemplates.filter(t => {
      if (t.executionMode === 'route') return false; // Hides master routes from individual asset execution
      if (!t.targetCategory || t.targetCategory === "Global") return true;
      if (Array.isArray(t.targetCategory)) return t.targetCategory.includes(selectedPmAsset.category);
      return t.targetCategory === selectedPmAsset.category;
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-entrance">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-300">
          <div className="bg-[#005596] px-6 py-4 flex justify-between items-center shrink-0 border-b border-[#003058]">
             <h3 className="text-white font-black text-sm tracking-widest uppercase flex items-center gap-2">
                <span>⚙️</span> Execute Individual Protocol
             </h3>
             <button onClick={closePmModal} className="text-blue-200 hover:text-white text-2xl font-bold leading-none transition">&times;</button>
          </div>
          
          <form onSubmit={validateAndSubmit} className="flex flex-col flex-1 overflow-hidden">
             <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/50">
                
                <div className="bg-white p-5 border border-gray-200 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                       <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider mb-1">Target Asset Identity</div>
                       <div className="text-xl font-black text-[#005596]">{selectedPmAsset.name}</div>
                       <div className="text-xs text-gray-600 font-mono mt-1">S/N: {selectedPmAsset.serial}</div>
                   </div>
                   <div className="bg-gray-100 px-3 py-2 rounded border border-gray-200 text-right w-full md:w-auto">
                       <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">Asset Category Lock</span>
                       <span className="block text-xs font-black text-gray-800">{selectedPmAsset.category}</span>
                   </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Select Active Protocol</label>
                  <select 
                    value={selectedPmTemplate?.id || ""} 
                    onChange={(e) => {
                      const tmpl = pmTemplates.find(t => t.id === e.target.value);
                      setSelectedPmTemplate(tmpl || "");
                      setPmAnswers({});
                    }} 
                    className="w-full text-xs rounded border-gray-300 p-3 bg-white border cursor-pointer focus:ring-2 focus:ring-[#00A1E4] focus:outline-none shadow-sm font-bold text-[#005596]"
                  >
                    <option value="">-- Choose Assigned SOP Template --</option>
                    {availableTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.interval})</option>
                    ))}
                  </select>
                </div>

                {/* DYNAMIC CHECKLIST RENDERER */}
                {selectedPmTemplate && activeSteps.length > 0 && (
                   <div className="border border-[#00A1E4] rounded-lg overflow-hidden shadow-sm bg-white">
                      <div className="bg-blue-50 px-4 py-3 border-b border-[#00A1E4] text-[10px] font-black text-[#005596] uppercase tracking-wider flex justify-between items-center">
                        <span>Protocol Execution Steps</span>
                        <span className="bg-white px-2 py-1 rounded shadow-inner border border-blue-200">{activeSteps.length} Actions Required</span>
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                         {activeSteps.map((step, idx) => {
                            const stepType = typeof step === 'string' ? 'checkbox' : step.type;
                            const stepLabel = typeof step === 'string' ? step : step.label;
                            
                            return (
                              <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50 transition-colors">
                                
                                <div className="w-full md:w-1/3 shrink-0">
                                  {step.section ? (
                                    <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm">
                                      {step.section}
                                    </span>
                                  ) : (
                                    <span className="inline-block bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm">
                                      General Parameter
                                    </span>
                                  )}
                                </div>
                                
                                <div className="w-full md:w-1/3">
                                  <span className="text-sm font-bold text-gray-800">{stepLabel}</span>
                                </div>
                                
                                <div className="w-full md:w-1/3 flex justify-end">
                                  {stepType === 'checkbox' && (
                                    <label className="flex items-center space-x-2 cursor-pointer bg-white border border-gray-300 rounded px-3 py-2 shadow-inner hover:bg-gray-50 w-full md:w-auto">
                                      <input type="checkbox" checked={!!pmAnswers[idx]} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-[#00A1E4] focus:ring-[#00A1E4]" />
                                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Confirm</span>
                                    </label>
                                  )}
                                  {stepType === 'text' && (
                                    <input type="text" placeholder="Enter value..." value={pmAnswers[idx] || ""} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.value})} className="w-full text-xs p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#00A1E4] focus:border-[#00A1E4] shadow-inner outline-none" />
                                  )}
                                  {stepType === 'number' && (
                                    <input type="number" placeholder="0.0" value={pmAnswers[idx] || ""} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.value})} className="w-full text-xs p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#00A1E4] focus:border-[#00A1E4] shadow-inner outline-none" />
                                  )}
                                  {stepType === 'passfail' && (
                                    <select value={pmAnswers[idx] || ""} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.value})} className="w-full md:w-auto text-xs p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#00A1E4] focus:border-[#00A1E4] shadow-inner outline-none bg-white font-bold cursor-pointer">
                                      <option value="">-- Result --</option>
                                      <option value="Pass">PASS (In Spec)</option>
                                      <option value="Fail">FAIL (Out of Spec)</option>
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                         })}
                      </div>
                   </div>
                )}

                {selectedPmTemplate && activeSteps.length === 0 && (
                   <div className="p-8 border border-gray-200 rounded-lg text-center text-gray-400 text-xs italic bg-white shadow-sm">
                      No specific actions were configured for this protocol. Proceed to sign-off.
                   </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                   <div>
                     <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Final Equipment Status</label>
                     <select value={pmStatusState} onChange={(e) => setPmStatusState(e.target.value)} className="w-full text-xs rounded border-gray-300 p-2.5 bg-gray-50 border cursor-pointer focus:ring-2 focus:ring-[#00A1E4] outline-none font-bold text-gray-700">
                        <option value="Operational">Operational</option>
                        <option value="Maintenance Required">Maintenance Required</option>
                        <option value="Out of Calibration">Out of Calibration</option>
                        <option value="Offline / Lockout">Offline / Lockout</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Sign-Off Notes</label>
                     <textarea value={pmComments} onChange={(e) => setPmComments(e.target.value)} rows="2" className="w-full text-xs rounded border-gray-300 p-2.5 border placeholder-gray-400 focus:ring-2 focus:ring-[#00A1E4] outline-none bg-gray-50 shadow-inner" placeholder="Optional inspector comments..."></textarea>
                   </div>
                </div>
             </div>
             
             <div className="bg-gray-100 px-6 py-4 flex justify-end space-x-3 shrink-0 border-t border-gray-300">
                <button type="button" onClick={closePmModal} className="px-6 py-2.5 border border-gray-300 bg-white rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition shadow-sm">Cancel</button>
                <button type="submit" disabled={isSubmittingPm || !selectedPmTemplate} className={`bg-[#005596] text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center space-x-2 ${(!selectedPmTemplate || isSubmittingPm) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00407a]'}`}>
                  {isSubmittingPm ? (
                    <span>Committing to Database...</span>
                  ) : (
                    <span>Commit Protocol & Sign Off</span>
                  )}
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}