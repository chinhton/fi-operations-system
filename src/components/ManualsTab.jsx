import React from 'react';

export default function ManualsTab({
  assetsWithManuals, viewingManualAsset, setViewingManualAsset, 
  activeManualIndex, setActiveManualIndex, handleAttachManualSubmit, 
  assets, manualAssetIds, setManualAssetIds, manualFileInputRef, 
  manualFile, handleManualFileChange, manualText, setManualText, 
  isAttachingManual, isSystemAdmin, handleRemoveManual
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-entrance">
      <div className="lg:col-span-5 space-y-6">
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1A2530] text-white px-5 py-4 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider">📚 Document Library</h3>
            <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full">{assetsWithManuals.length} systems</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
            {assetsWithManuals.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">No documentation manuals currently attached to any systems. Use the upload tool to attach a file.</div>
            ) : (
              assetsWithManuals.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => { setViewingManualAsset(asset); setActiveManualIndex(0); }}
                  className={`p-4 cursor-pointer hover:bg-blue-50 transition flex justify-between items-center ${viewingManualAsset?.id === asset.id ? 'bg-blue-50 border-l-4 border-[#005596]' : ''}`}
                >
                  <div>
                    <span className="font-bold text-gray-900 text-xs block">{asset.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5 block truncate max-w-[200px]">
                      {asset.manuals ? `${asset.manuals.length} documents` : (asset.manual ? "1 document" : "")}
                    </span>
                  </div>
                  <span className="text-[#005596] text-lg font-bold">➔</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#005596] text-white px-5 py-4"><h3 className="font-bold text-xs uppercase tracking-wider">Attach Documentation Manual</h3></div>
          <form onSubmit={handleAttachManualSubmit} className="p-5 space-y-5">
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
                          if (e.target.checked) {
                            setManualAssetIds([...manualAssetIds, a.id]);
                          } else {
                            setManualAssetIds(manualAssetIds.filter(id => id !== a.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#005596] focus:ring-[#005596]" 
                      />
                      <span className="font-medium text-gray-700">{a.name} <span className="text-gray-400 font-mono text-[10px] ml-1">(SN: {a.serial})</span></span>
                    </label>
                  ))
                )}
              </div>
              {manualAssetIds.length > 0 && (
                <div className="mt-1.5 text-[10px] text-[#005596] font-bold">
                  {manualAssetIds.length} asset(s) selected for bulk upload mapping.
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Upload Manual File</label>
              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100" onClick={() => manualFileInputRef.current.click()}>
                <span className="text-2xl mb-1">📁</span><span className="text-[11px] text-gray-500 font-semibold uppercase">{manualFile ? manualFile.name : "Select manual file"}</span>
                <input type="file" ref={manualFileInputRef} onChange={handleManualFileChange} className="hidden" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Quick Manual SOP Text Layout</label>
              <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows="5" placeholder="Input procedures..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea>
            </div>
            <button type="submit" disabled={isAttachingManual} className={`w-full bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white py-2.5 rounded text-xs font-bold uppercase transition-all ${isAttachingManual ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isAttachingManual ? 'Uploading Data...' : 'Distribute Manual to Assets'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex flex-col justify-between h-full">
          <div>
            <div className="bg-[#1A2530] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider">Embedded Manual / SOP Guidelines Reader</h3>
            </div>
            
            {viewingManualAsset && ((viewingManualAsset.manuals && viewingManualAsset.manuals.length > 0) || viewingManualAsset.manual) ? (
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                
                {(() => {
                  const currentManuals = viewingManualAsset.manuals || (viewingManualAsset.manual ? [{...viewingManualAsset.manual, id: viewingManualAsset.manual.id || 'LEGACY-DOC'}] : []);
                  const activeManual = currentManuals[activeManualIndex] || currentManuals[0];
                  
                  return (
                    <>
                      {currentManuals.length > 1 && (
                        <div className="flex space-x-2 border-b border-gray-100 pb-3 mb-4 overflow-x-auto">
                          {currentManuals.map((doc, idx) => (
                            <button 
                              key={doc.id || idx}
                              onClick={() => setActiveManualIndex(idx)}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition whitespace-nowrap ${activeManualIndex === idx ? 'bg-[#005596] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {doc.fileName.length > 20 ? doc.fileName.substring(0, 20) + '...' : doc.fileName}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-base text-[#005596]">{viewingManualAsset.name}</h4>
                          <span className="text-xs text-gray-500 block font-mono mt-1">SN: {viewingManualAsset.serial} • Doc: {activeManual.fileName}</span>
                        </div>
                        <div className="flex space-x-2">
                          <a href={activeManual.fileData} download={activeManual.fileName} target="_blank" rel="noopener noreferrer" className="bg-[#005596] hover:bg-[#005596]/95 text-white text-[10px] font-bold uppercase py-2 px-3 rounded shadow transition">📥 Download</a>
                          {isSystemAdmin && (
                            <button onClick={() => handleRemoveManual(viewingManualAsset.id, activeManual.id)} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase py-2 px-3 rounded shadow transition">🗑️ Remove</button>
                          )}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-700 h-[500px] overflow-y-auto shadow-inner flex-grow">
                        {activeManual.manualText}
                      </div>
                    </>
                  );
                })()}

              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 mt-20"><span className="text-4xl block mb-3">📖</span><p className="text-sm font-semibold">Select an asset from the Document Library<br/>to inspect its attached manuals.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}