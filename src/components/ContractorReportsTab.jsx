import React, { useState } from 'react';

export default function ContractorReportsTab({
  manuals = [], viewingManual, setViewingManual, 
  handleAttachManualSubmit, assets, manualAssetIds, setManualAssetIds, 
  manualFileInputRef, manualFile, handleManualFileChange, manualText, 
  setManualText, isAttachingManual, isSystemAdmin, handleRemoveManual
}) {

  const [isMaximized, setIsMaximized] = useState(false);

  // Filter only contractor reports
  const contractorDocs = manuals.filter(m => m.docType === 'contractor');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-entrance">
      <div className="lg:col-span-5 space-y-6">
        
        {/* Document Library */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1A2530] text-white px-5 py-4 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider">🗂️ Contractor & Vendor Reports</h3>
            <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full">{contractorDocs.length} files</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
            {contractorDocs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">No contractor reports currently uploaded. Use the upload tool below to add vendor service sheets or calibration certificates.</div>
            ) : (
              contractorDocs.map(doc => (
                <div 
                  key={doc.id} 
                  onClick={() => { 
                    setViewingManual(doc); 
                    setIsMaximized(false); 
                  }}
                  className={`p-4 cursor-pointer hover:bg-amber-50 transition flex justify-between items-center ${viewingManual?.id === doc.id ? 'bg-amber-50 border-l-4 border-amber-600' : ''}`}
                >
                  <div>
                    <span className="font-bold text-gray-900 text-xs block truncate max-w-[250px]">{doc.fileName}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5 block truncate max-w-[200px]">
                      Mapped to {doc.linkedAssetIds?.length || 0} systems • {doc.fileSize}
                    </span>
                  </div>
                  <span className="text-amber-600 text-lg font-bold">➔</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-amber-600 text-white px-5 py-4"><h3 className="font-bold text-xs uppercase tracking-wider">Upload Contractor Report</h3></div>
          <form onSubmit={(e) => {
             // Attach the tag so it goes to contractor storage
             e.target.dataset.docType = 'contractor';
             handleAttachManualSubmit(e);
          }} className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Fleet Assets (Select Multiple)</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-3 bg-white space-y-2 shadow-inner">
                {assets.length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No assets registered in directory.</div>
                ) : (
                  assets.map(a => (
                    <label key={a.id} className="flex items-center space-x-3 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded transition">
                      <input 
                        type="checkbox" 
                        checked={manualAssetIds.includes(a.id)}
                        onChange={(e) => {
                          if (e.target.checked) setManualAssetIds([...manualAssetIds, a.id]);
                          else setManualAssetIds(manualAssetIds.filter(id => id !== a.id));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" 
                      />
                      <span className="font-medium text-gray-700">{a.name} <span className="text-gray-400 font-mono text-[10px] ml-1">(SN: {a.serial})</span></span>
                    </label>
                  ))
                )}
              </div>
              {manualAssetIds.length > 0 && (
                <div className="mt-1.5 text-[10px] text-amber-700 font-bold">
                  {manualAssetIds.length} asset(s) selected for mapping.
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Upload Report File (PDF / Invoice)</label>
              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100" onClick={() => manualFileInputRef.current.click()}>
                <span className="text-2xl mb-1">📄</span><span className="text-[11px] text-gray-500 font-semibold uppercase">{manualFile ? manualFile.name : "Select contractor report"}</span>
                <input type="file" ref={manualFileInputRef} onChange={handleManualFileChange} className="hidden" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Contractor Service Notes / Summary</label>
              <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows="5" placeholder="Enter vendor findings, calibration values, or service notes..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea>
            </div>
            <button type="submit" disabled={isAttachingManual} className={`w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded text-xs font-bold uppercase transition-all ${isAttachingManual ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isAttachingManual ? 'Uploading Data...' : 'Save Report to Library'}
            </button>
          </form>
        </div>
      </div>

      {/* Report Viewer */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex flex-col justify-between h-full">
          <div>
            <div className="bg-[#1A2530] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider">Embedded Contractor Report Reader</h3>
            </div>
            
            {viewingManual ? (
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-base text-amber-700">{viewingManual.fileName}</h4>
                    <span className="text-xs text-gray-500 block font-mono mt-1">ID: {viewingManual.id} • Associated Systems: {viewingManual.linkedAssetIds?.length || 0}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => setIsMaximized(true)} className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold uppercase py-2 px-3 rounded shadow transition">🖥️ Maximize</button>
                    <a href={viewingManual.fileData} download={viewingManual.fileName} target="_blank" rel="noopener noreferrer" className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase py-2 px-3 rounded shadow transition">📥 Download</a>
                    {isSystemAdmin && (
                      <button onClick={() => handleRemoveManual(viewingManual.id)} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase py-2 px-3 rounded shadow transition">🗑️ Delete</button>
                    )}
                  </div>
                </div>
                
                <div className={isMaximized 
                  ? "fixed inset-0 z-[9999] bg-black/90 p-4 md:p-8 flex flex-col" 
                  : "w-full h-[500px] border border-gray-200 rounded-lg overflow-hidden shadow-inner flex-grow bg-gray-50"
                }>
                  {isMaximized && (
                    <div className="flex justify-end mb-4">
                      <button onClick={() => setIsMaximized(false)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase py-2 px-4 rounded shadow transition">
                        Close Fullscreen ✖
                      </button>
                    </div>
                  )}
                  
                  {viewingManual.fileData && !viewingManual.fileData.startsWith("data:text/plain") ? (
                    <iframe 
                      src={viewingManual.fileData} 
                      title={viewingManual.fileName}
                      className={`w-full ${isMaximized ? 'flex-grow rounded-lg bg-white' : 'h-full'}`}
                      frameBorder="0"
                    >
                      <p className="p-4 text-gray-500 text-xs">
                        Your browser does not support inline PDFs. <a href={viewingManual.fileData} download={viewingManual.fileName} className="text-amber-600 underline">Download the report here</a>.
                      </p>
                    </iframe>
                  ) : (
                    <div className="p-4 text-xs font-mono whitespace-pre-wrap text-gray-700 h-full overflow-y-auto bg-white rounded-lg">
                      {viewingManual.manualText || "No notes provided."}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 mt-20"><span className="text-4xl block mb-3">📁</span><p className="text-sm font-semibold">Select a contractor report from the Library<br/>to inspect its contents.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}