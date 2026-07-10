import { useState, useRef } from 'react';

export default function useManuals(assets, setAssets, setHistory, currentUser, triggerModal, closeModal) {
  const [manualAssetIds, setManualAssetIds] = useState([]);
  const [manualFile, setManualFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [isAttachingManual, setIsAttachingManual] = useState(false);
  const [viewingManualAsset, setViewingManualAsset] = useState(null);
  const [activeManualIndex, setActiveManualIndex] = useState(0);
  const manualFileInputRef = useRef(null);

  const handleManualFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setManualFile({ name: file.name, size: (file.size / 1024).toFixed(1) + " KB", data: reader.result, type: file.type }); };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachManualSubmit = async (e) => {
    e.preventDefault();
    if (isAttachingManual) return;
    
    if (manualAssetIds.length === 0) { triggerModal("Field Required", "Please select at least one target asset.", "info"); return; }
    if (!manualFile && !manualText.trim()) { triggerModal("Input Required", "Please attach a file or draft a procedure.", "info"); return; }
    
    const targetAssets = assets.filter(a => manualAssetIds.includes(a.id));
    setIsAttachingManual(true);

    try {
      let finalFileUrl = "";
      let finalFileName = manualFile ? manualFile.name : `Quick_Manual_${Date.now().toString().slice(-4)}.txt`;

      if (manualFile) {
        triggerModal("Uploading", `Transferring manual to Azure Blob Storage...`, "info");
        try {
          // --- AZURE BLOB STORAGE CONNECTION ---
          const uploadRes = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: manualFile.name, fileData: manualFile.data }) });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json(); finalFileUrl = uploadData.url; finalFileName = uploadData.fileName;
          } else {
            closeModal(); triggerModal("Upload Failed", "Could not transfer file to Azure Blob Storage.", "error"); return;
          }
        } catch (err) { closeModal(); triggerModal("Network Error", "Failed to reach the upload server.", "error"); return; }
      } else {
        finalFileUrl = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(manualText)))}`;
      }

      const attachmentPayload = { 
        id: `DOC-${Date.now().toString().slice(-6)}`, fileName: finalFileName, 
        fileSize: manualFile ? manualFile.size : `${(new Blob([manualText]).size / 1024).toFixed(1)} KB`, 
        fileData: finalFileUrl, manualText: manualText || "Refer to attached file." 
      };

      const updatedAssetsMap = {};
      const newLogs = [];

      await Promise.all(targetAssets.map(async (targetAsset) => {
        const existingManuals = targetAsset.manuals || (targetAsset.manual ? [targetAsset.manual] : []);
        const updatedAsset = { ...targetAsset, manual: null, manuals: [...existingManuals, attachmentPayload] };
        updatedAssetsMap[updatedAsset.id] = updatedAsset;

        const logEntry = { id: `LOG-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Operation Manual Attachment", interval: "On-Demand", technician: currentUser?.name || "System Admin", email: currentUser?.email || "admin@fcimg.com", status: "Completed Pass", comments: `Linked new manual documentation to device.` };
        
        try {
          await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });
          const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) });
          if (logRes.ok) newLogs.push(await logRes.json());
        } catch (err) { console.error(err); }
      }));

      setHistory(prev => [...newLogs, ...prev]);
      setAssets(prevAssets => prevAssets.map(ast => updatedAssetsMap[ast.id] || ast));
      
      closeModal(); setManualAssetIds([]); setManualFile(null); setManualText(""); 
      if (manualFileInputRef.current) manualFileInputRef.current.value = "";
      triggerModal("Success", `Document mapped to ${targetAssets.length} asset(s).`, "success");
    } finally { setIsAttachingManual(false); }
  };

  const handleRemoveManual = (assetId, docId) => {
    triggerModal("Remove Manual", "Permanently detach this document?", "confirm", async () => {
      const targetAsset = assets.find(a => a.id === assetId);
      const updatedManuals = (targetAsset.manuals || []).filter(m => m.id !== docId);
      const updatedAsset = { ...targetAsset, manuals: updatedManuals };
      
      try {
        await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });
        setAssets(assets.map(a => a.id === assetId ? updatedAsset : a));
        closeModal(); triggerModal("Success", "Document removed.", "success");
      } catch (err) { closeModal(); triggerModal("Error", "Failed to remove manual.", "error"); }
    });
  };

  return { manualAssetIds, setManualAssetIds, manualFile, manualText, setManualText, isAttachingManual, viewingManualAsset, setViewingManualAsset, activeManualIndex, setActiveManualIndex, manualFileInputRef, handleManualFileChange, handleAttachManualSubmit, handleRemoveManual };
}