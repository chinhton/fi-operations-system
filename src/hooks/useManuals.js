import { useState, useRef } from 'react';

export default function useManuals(manuals, setManuals, assets, setHistory, currentUser, triggerModal, closeModal) {
  const [manualAssetIds, setManualAssetIds] = useState([]);
  const [manualFile, setManualFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [isAttachingManual, setIsAttachingManual] = useState(false);
  const [viewingManual, setViewingManual] = useState(null);
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
    
    // THE FIX: Grab the docType right off the form tag we injected. Defaults to 'manual' if missing.
    const docType = e.target.dataset.docType || 'manual';
    
    if (manualAssetIds.length === 0) { triggerModal("Field Required", "Please select at least one target asset.", "info"); return; }
    if (!manualFile && !manualText.trim()) { triggerModal("Input Required", "Please attach a file or draft a procedure.", "info"); return; }
    
    const targetAssets = assets.filter(a => manualAssetIds.includes(a.id));
    setIsAttachingManual(true);

    try {
      let finalFileUrl = "";
      let finalFileName = manualFile ? manualFile.name : `Quick_Manual_${Date.now().toString().slice(-4)}.txt`;

      if (manualFile) {
        triggerModal("Uploading", `Transferring file to Azure Blob Storage...`, "info");
        try {
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

      const manualPayload = { 
        id: `DOC-${Date.now().toString().slice(-6)}`, 
        fileName: finalFileName, 
        fileSize: manualFile ? manualFile.size : `${(new Blob([manualText]).size / 1024).toFixed(1)} KB`, 
        fileData: finalFileUrl, 
        manualText: manualText || "Refer to attached file.",
        linkedAssetIds: manualAssetIds,
        docType: docType // THE FIX: This tells the database if it is a 'contractor' or 'manual' doc!
      };

      // 1. Save the Manual Independently
      await fetch('/api/manuals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manualPayload) });
      setManuals(prev => [...prev, manualPayload]);

      // 2. Log History for Assets
      const newLogs = [];
      await Promise.all(targetAssets.map(async (targetAsset) => {
        const logEntry = { id: `LOG-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Manual Attachment", interval: "On-Demand", technician: currentUser?.name || "System Admin", email: currentUser?.email || "admin@fcimg.com", status: "Completed", comments: `Linked new independent manual documentation to device.` };
        try {
          const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) });
          if (logRes.ok) newLogs.push(await logRes.json());
        } catch (err) { console.error(err); }
      }));

      setHistory(prev => [...newLogs, ...prev]);
      
      closeModal(); setManualAssetIds([]); setManualFile(null); setManualText(""); 
      if (manualFileInputRef.current) manualFileInputRef.current.value = "";
      triggerModal("Success", `Document saved to global library and mapped to ${targetAssets.length} asset(s).`, "success");
    } finally { setIsAttachingManual(false); }
  };

  const handleRemoveManual = (docId) => {
    triggerModal("Delete Manual", "Permanently remove this document from the global library?", "confirm", async () => {
      try {
        await fetch(`/api/manuals?id=${docId}`, { method: 'DELETE' });
        setManuals(manuals.filter(m => m.id !== docId));
        if (viewingManual?.id === docId) setViewingManual(null);
        closeModal(); triggerModal("Success", "Document permanently removed.", "success");
      } catch (err) { closeModal(); triggerModal("Error", "Failed to remove manual.", "error"); }
    });
  };

  return { manualAssetIds, setManualAssetIds, manualFile, manualText, setManualText, isAttachingManual, viewingManual, setViewingManual, manualFileInputRef, handleManualFileChange, handleAttachManualSubmit, handleRemoveManual };
}