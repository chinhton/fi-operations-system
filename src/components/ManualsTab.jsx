import React, { useState } from 'react';

export default function ManualsTab({
  manuals = [], viewingManual, setViewingManual, 
  handleAttachManualSubmit, assets = [], manualAssetIds = [], setManualAssetIds, 
  manualFileInputRef, manualFile, handleManualFileChange, manualText, 
  setManualText, isAttachingManual, isSystemAdmin, handleRemoveManual
}) {

  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Filter out Contractor Reports
  const standardManuals = manuals.filter(m => m.docType !== 'contractor');

  // --- THE FIX: Helper function to grab actual machine names ---
  const getMappedAssetNames = (ids) => {
    if (!ids || ids.length === 0) return "Unassigned";
    return ids.map(id => {
        const found = assets.find(a => a.id === id);
        return found ? found.name : "Unknown Asset";
    }).join(', ');
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleManualFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-entrance">
      <div className="lg:col-span-5 space-y-6">
        
        {/* Document Library */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1A2530] text-white px-5 py-4 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider">📚 Document Library</h3>
            <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full">{standardManuals.length} manuals</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
            {standardManuals.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">No documentation manuals currently in the global library. Use the upload tool to attach a file.</div>
            ) : (
              standardManuals.map(doc => (
                <div 
                  key={doc.id} 
                  onClick={() => { 
                    setViewingManual(doc); 
                    setIsMaximized(false); 
                  }}
                  className={`p-4 cursor-pointer hover:bg-blue-50 transition flex justify-between items-center ${viewingManual?.id === doc.id ? 'bg-blue-50 border-l-4 border-[#005596]' : ''}`}
                >
                  <div>
                    <span className="font-bold text-gray-900 text-xs block truncate max-w-[250px]" title={doc.fileName}>{doc.fileName}</span>
                    <span 
                      className="text-[10px] text-gray-500 font-mono mt-0.5 block truncate max-w-[200px]"
                      title={`Systems: ${getMappedAssetNames(doc.linkedAssetIds)}`}
                    >
                      Systems: <span className="text-gray-700">{getMappedAssetNames(doc.linkedAssetIds)}</span> • {doc.fileSize}
                    </span>
                  </div>
                  <span className="text-[#005596] text-lg font-bold">➔</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#005596] text-white px-5 py-4"><h3 className="font-bold text-xs uppercase tracking-wider">Upload New Manual</h3></div>
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
                          if (e.target.checked) setManualAssetIds([...manualAssetIds, a.id]);
                          else setManualAssetIds(manualAssetIds.filter(id => id !== a.id));
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
                  {manualAssetIds.length} asset(s) selected for mapping.
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Upload Manual File</label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging ? 'border-[#005596] bg-blue-50 scale-[1.02] shadow-inner' : 'border-gray-300 bg-slate-50 hover:bg-slate-100'
                }`}
                onClick={() => manualFileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <span className="text-3xl mb-2">{isDragging ? '📥' : '📁'}</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${isDragging ? 'text-[#005596]' : 'text-gray-500'}`}>
                  {isDragging ? "Drop file here!" : (manualFile ? manualFile.name : "Drag & Drop or Click to Select File")}
                </span>
                <input type="file" ref={manualFileInputRef} onChange={handleManualFileChange} className="hidden" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Quick Manual SOP Text Layout</label>
              <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows="5" placeholder="Input procedures..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea>
            </div>
            <button type="submit" disabled={isAttachingManual} className={`w-full bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white py-2.5 rounded text-xs font-bold uppercase transition-all shadow-sm ${isAttachingManual ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isAttachingManual ? 'Uploading Data...' : 'Save Manual to Library'}
            </button>
          </form>
        </div>
      </div>

      {/* Manual Viewer */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex flex-col justify-between h-full">
          <div>
            <div className="bg-[#1A2530] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider">Embedded Manual / SOP Guidelines Reader</h3>
            </div>
            
            {viewingManual ? (
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-base text-[#005596]">{viewingManual.fileName}</h4>
                    <span className="text-xs text-gray-500 block font-mono mt-1">
                      ID: {viewingManual.id} • Systems: <span className="text-gray-800 font-bold">{getMappedAssetNames(viewingManual.linkedAssetIds)}</span>
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => setIsMaximized(true)} className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold uppercase py-2 px-3 rounded shadow transition">🖥️ Maximize</button>
                    <a href={viewingManual.fileData} download={viewingManual.fileName} target="_blank" rel="noopener noreferrer" className="bg-[#005596] hover:bg-[#005596]/95 text-white text-[10px] font-bold uppercase py-2 px-3 rounded shadow transition">📥 Download</a>
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
                        Your browser does not support inline PDFs. <a href={viewingManual.fileData} download={viewingManual.fileName} className="text-[#005596] underline">Download the manual here</a>.
                      </p>
                    </iframe>
                  ) : (
                    <div className="p-4 text-xs font-mono whitespace-pre-wrap text-gray-700 h-full overflow-y-auto bg-white rounded-lg">
                      {viewingManual.manualText || "No manual text provided."}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 mt-20"><span className="text-4xl block mb-3">📖</span><p className="text-sm font-semibold">Select a document from the Library<br/>to inspect its contents.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}