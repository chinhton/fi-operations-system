import React, { useState, useRef } from 'react';

export default function CorrectiveActionsTab({ 
  workOrders = [], setWorkOrders, 
  assets = [], setAssets, 
  currentUser 
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [attachedPhoto, setAttachedPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // --- THE FIX: Look directly at the Assets to catch manual status overrides ---
  const offlineStatuses = ["Corrective Maintenance", "Out of Calibration", "Offline / Lockout"];
  const downAssets = assets.filter(a => offlineStatuses.includes(a.status));

  // Map the down assets into Action Queue tickets
  const activeCorrectives = downAssets.map(asset => {
    // Check if a formal Work Order was created via the PM execution hook
    const relatedWO = workOrders.find(wo => wo.assetId === asset.id && wo.category === "Corrective" && wo.status !== "Closed");
    
    return {
        id: relatedWO ? relatedWO.id : `FLAG-${asset.id.slice(-6).toUpperCase()}`,
        assetId: asset.id,
        assetName: asset.name,
        title: relatedWO ? relatedWO.title : `System Flag: ${asset.status}`,
        description: relatedWO ? relatedWO.description : `Asset profile was updated to ${asset.status}. Immediate resolution required to return to active service.`,
        priority: relatedWO ? relatedWO.priority : "High",
        dateCreated: relatedWO ? relatedWO.dateCreated : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        associatedWO: relatedWO // Store this so we can close it later if it exists
    };
  });

  // Handle local image upload and convert to Base64 string
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedPhoto(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleResolveAction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const exactTimestamp = new Date().toLocaleString('en-US');

    try {
      // 1. Reactivate the Asset back to "Active"
      const targetAsset = assets.find(a => a.id === selectedAction.assetId);
      if (targetAsset) {
        const updatedAsset = { ...targetAsset, status: "Active" };
        await window.fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAsset)
        });
      }

      // 2. If there was an actual Work Order ticket tied to it, close it out
      if (selectedAction.associatedWO) {
        const updatedWO = {
          ...selectedAction.associatedWO,
          status: "Closed",
          resolutionNotes: resolutionNotes,
          photoEvidence: attachedPhoto,
          resolvedBy: currentUser?.name || "System Operator",
          dateResolved: todayStr,
          timestampResolved: exactTimestamp
        };

        await window.fetch('/api/workorders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedWO)
        });
      }

      // 3. Generate a History Audit Log for the Repair
      const historyPayload = {
        id: `REP-${Date.now().toString().slice(-4)}`,
        assetId: selectedAction.assetId, 
        assetName: selectedAction.assetName, 
        actionType: 'Corrective Action Resolution', 
        templateName: 'System Repair Sign-Off', 
        performedBy: currentUser?.name || "System Operator", 
        performedByEmail: currentUser?.email || "",          
        date: todayStr,                                      
        timestamp: exactTimestamp,                           
        status: 'Operational', 
        comments: resolutionNotes 
      };
      
      await window.fetch('/api/history', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(historyPayload) 
      });

      alert("Corrective Action resolved, audit log generated, and equipment reactivated!");
      window.location.reload();

    } catch (err) {
      console.error(err);
      alert("Failed to submit resolution.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-entrance">
      
      {/* PRINT CSS FOR DOWNTIME REPORT */}
      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden; }
          #downtime-report-area, #downtime-report-area * { visibility: visible; }
          #downtime-report-area { position: absolute; left: 0; top: 0; width: 100% !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-700 text-white px-6 py-4 flex items-center justify-between border-b border-red-900">
          <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <span>🚨</span> Active Corrective Actions
          </h2>
          <span className="bg-white text-red-700 text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
            {activeCorrectives.length} Equipment Offline
          </span>
        </div>

        <div className="p-6 bg-gray-50/50 min-h-[400px]">
          {activeCorrectives.length === 0 ? (
            <div className="text-center text-gray-400 py-16 font-medium text-sm">
              All equipment is operational. No pending corrective actions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCorrectives.map(action => (
                <div key={action.id} className="bg-white border-2 border-red-200 rounded-xl shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                      {action.priority} Priority
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono font-bold">{action.dateCreated}</span>
                  </div>

                  <h3 className="font-black text-gray-900 text-sm mb-1">{action.assetName}</h3>
                  <p className="text-xs text-red-600 font-bold mb-4 line-clamp-2">{action.title}</p>

                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-[10px] text-gray-600 font-mono mb-5 line-clamp-3">
                    {action.description}
                  </div>

                  <button 
                    onClick={() => setSelectedAction(action)}
                    className="w-full bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-700 transition-colors py-2.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm"
                  >
                    Open Action Ticket &rarr;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CORRECTIVE ACTION MODAL */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90dvh] overflow-hidden flex flex-col animate-entrance relative">
            
            <div className="bg-red-700 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-red-900 no-print">
              <div>
                <h3 className="font-black text-sm tracking-widest uppercase flex items-center gap-2">
                  <span>🛠️</span> Resolve Corrective Action
                </h3>
                <p className="text-[10px] text-red-200 mt-1 uppercase font-bold tracking-wider">Ticket: {selectedAction.id}</p>
              </div>
              <button onClick={() => { setSelectedAction(null); setAttachedPhoto(null); setResolutionNotes(""); }} className="text-red-200 hover:text-white font-bold text-2xl transition-colors">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 flex flex-col lg:flex-row gap-6">
              
              {/* LEFT COLUMN: DOWNTIME REPORT */}
              <div className="w-full lg:w-1/2 space-y-4">
                
                <div className="flex justify-between items-center mb-2 no-print">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Failure Documentation</h4>
                  <button 
                    onClick={() => window.print()}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>🖨️</span> Print Report
                  </button>
                </div>

                {/* THE PRINTABLE DOWNTIME REPORT AREA */}
                <div id="downtime-report-area" className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="border-b-2 border-red-700 pb-4 mb-4">
                    <img src="/logo.png" alt="Fairchild Imaging" className="h-10 w-auto mb-3" />
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">Equipment Downtime Report</h2>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-1">Ref: {selectedAction.id}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Target System</span>
                      <span className="block text-sm font-black text-red-700">{selectedAction.assetName}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Date Flagged Offline</span>
                      <span className="block text-xs font-mono font-bold text-gray-800">{selectedAction.dateCreated}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Failure Reason / SOP Note</span>
                      <div className="mt-1 p-3 bg-red-50 text-red-900 text-xs font-mono rounded border border-red-100 whitespace-pre-wrap">
                        {selectedAction.description}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: RESOLUTION & MEDIA */}
              <div className="w-full lg:w-1/2 space-y-6 no-print">
                
                {/* PHOTO UPLOAD */}
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Media Evidence</h4>
                  
                  {attachedPhoto ? (
                    <div className="relative group">
                      <img src={attachedPhoto} alt="Corrective Action Evidence" className="w-full h-48 object-cover rounded border border-gray-300" />
                      <button 
                        type="button"
                        onClick={() => setAttachedPhoto(null)}
                        className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-[#005596] hover:text-[#005596] cursor-pointer transition-colors"
                    >
                      <span className="text-3xl mb-2">📸</span>
                      <span className="text-xs font-bold uppercase tracking-wider">Tap to Upload Photo Evidence</span>
                      <span className="text-[9px] mt-1">(JPEG, PNG, HEIC)</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                </div>

                {/* RESOLUTION INPUT */}
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">Action Resolution</h4>
                  <textarea 
                    value={resolutionNotes} 
                    onChange={(e) => setResolutionNotes(e.target.value)} 
                    rows="4" 
                    className="w-full text-xs rounded border-gray-300 p-3 border placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 shadow-inner" 
                    placeholder="Detail the repairs made, parts replaced, and confirm the system is ready to return to operational status..."
                    required
                  ></textarea>
                </div>

              </div>
            </div>

            <div className="bg-gray-100 px-6 py-4 flex justify-end space-x-3 shrink-0 border-t border-gray-300 no-print">
              <button type="button" onClick={() => setSelectedAction(null)} className="px-6 py-2.5 border border-gray-300 bg-white rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition shadow-sm">Cancel</button>
              <button 
                type="button" 
                onClick={handleResolveAction}
                disabled={isSubmitting || !resolutionNotes} 
                className={`bg-emerald-600 text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center space-x-2 ${(!resolutionNotes || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'}`}
              >
                {isSubmitting ? (
                  <span>Saving Record...</span>
                ) : (
                  <span>✅ Reactivate System</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}