import React from 'react';

export default function PmExecutionModal({
  isPmModalOpen, closePmModal, handlePmSubmit, 
  selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate, 
  pmTemplates, pmAnswers, setPmAnswers, 
  pmStatusState, setPmStatusState, pmComments, setPmComments, 
  isSubmittingPm
}) {
  if (!isPmModalOpen || !selectedPmAsset) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-entrance">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-300">
          <div className="bg-[#005596] px-6 py-4 flex justify-between items-center shrink-0">
             <h3 className="text-white font-bold text-sm tracking-widest uppercase">Execute Protocol Standard</h3>
             <button onClick={closePmModal} className="text-white hover:text-red-400 text-2xl leading-none transition">&times;</button>
          </div>
          
          <form onSubmit={handlePmSubmit} className="flex flex-col flex-1 overflow-hidden">
             <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-gray-50 p-4 border border-gray-200 rounded shadow-inner">
                   <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Target Asset Identity</div>
                   <div className="text-lg font-extrabold text-[#005596]">{selectedPmAsset.name}</div>
                   <div className="text-xs text-gray-600 font-mono mt-1">SN: {selectedPmAsset.serial} | Lock: {selectedPmAsset.category}</div>
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
                    className="w-full text-xs rounded border-gray-300 p-3 bg-white border cursor-pointer focus:ring-2 focus:ring-[#00A1E4] focus:outline-none shadow-sm"
                  >
                    <option value="">-- Choose Assigned SOP Template --</option>
                    {pmTemplates.filter(t => t.targetCategory === "Global" || t.targetCategory === selectedPmAsset.category).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.interval})</option>
                    ))}
                  </select>
                </div>

                {/* DYNAMIC CHECKLIST RENDERER */}
                {selectedPmTemplate && selectedPmTemplate.checklist && (
                   <div className="border border-[#00A1E4] rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-blue-50 px-4 py-2.5 border-b border-[#00A1E4] text-[10px] font-extrabold text-[#005596] uppercase tracking-wider flex justify-between">
                        <span>Protocol Execution Steps</span>
                        <span>{selectedPmTemplate.checklist.length} Actions</span>
                      </div>
                      <div className="p-4 space-y-4 bg-white">
                         {selectedPmTemplate.checklist.map((step, idx) => {
                            const stepType = typeof step === 'string' ? 'checkbox' : step.type;
                            const stepLabel = typeof step === 'string' ? step : step.label;
                            
                            return (
                              <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0 gap-3">
                                <span className="text-xs text-gray-800 font-semibold pr-2">{stepLabel}</span>
                                <div className="w-full md:w-1/3 shrink-0">
                                  {stepType === 'checkbox' && (
                                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border border-gray-200">
                                      <input type="checkbox" checked={!!pmAnswers[idx]} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.checked})} className="w-4 h-4 text-[#00A1E4] rounded border-gray-300 focus:ring-[#00A1E4]" />
                                      <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">Completed</span>
                                    </label>
                                  )}
                                  {stepType === 'text' && (
                                    <input type="text" placeholder="Enter value..." value={pmAnswers[idx] || ""} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.value})} className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#00A1E4] focus:outline-none shadow-inner" required />
                                  )}
                                  {stepType === 'number' && (
                                    <input type="number" placeholder="0.00" value={pmAnswers[idx] || ""} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.value})} className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#00A1E4] focus:outline-none shadow-inner" required />
                                  )}
                                  {stepType === 'passfail' && (
                                    <select value={pmAnswers[idx] || ""} onChange={(e) => setPmAnswers({...pmAnswers, [idx]: e.target.value})} className="w-full text-xs p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-[#00A1E4] focus:outline-none shadow-sm cursor-pointer" required>
                                      <option value="">- Select -</option>
                                      <option value="Pass">🟢 PASS</option>
                                      <option value="Fail">🔴 FAIL</option>
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                         })}
                      </div>
                   </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-200">
                   <div>
                     <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Final Equipment Status</label>
                     <select value={pmStatusState} onChange={(e) => setPmStatusState(e.target.value)} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer focus:ring-2 focus:ring-[#00A1E4]">
                        <option value="Operational">Operational</option>
                        <option value="Maintenance Required">Maintenance Required</option>
                        <option value="Out of Calibration">Out of Calibration</option>
                        <option value="Offline / Lockout">Offline / Lockout</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Sign-Off Notes</label>
                     <textarea value={pmComments} onChange={(e) => setPmComments(e.target.value)} rows="2" className="w-full text-xs rounded border-gray-300 p-2.5 border placeholder-gray-400 focus:ring-2 focus:ring-[#00A1E4]" placeholder="Optional inspector comments..."></textarea>
                   </div>
                </div>
             </div>
             
             <div className="bg-gray-100 px-6 py-4 flex justify-end space-x-3 shrink-0 border-t border-gray-200">
                <button type="button" onClick={closePmModal} className="px-6 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-white transition shadow-sm">Cancel</button>
                <button type="submit" disabled={isSubmittingPm || !selectedPmTemplate} className={`bg-[#00A1E4] text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-sm ${(!selectedPmTemplate || isSubmittingPm) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#008cc2]'}`}>
                  {isSubmittingPm ? 'Committing...' : 'Commit Protocol & Sign Off'}
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}