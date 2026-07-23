import { useState } from 'react';

export default function useAssets(assets, setAssets, history, setHistory, triggerModal, closeModal, currentUser) {
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  
  // Stripped out the legacy pmFrequencies, parts, and vendors arrays from the default empty state
  const [newAsset, setNewAsset] = useState({ name: "", model: "", serial: "", location: "", category: "", parentId: "", department: "", operatorEmail: "" });
  
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [activeAssetDetails, setActiveAssetDetails] = useState(null);
  const [newPart, setNewPart] = useState({ partNumber: "", name: "", stock: "" });
  const [newVendor, setNewVendor] = useState({ name: "", contactInfo: "", serviceType: "" });

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    if (isAddingAsset) return;
    
    if (!newAsset.name || !newAsset.serial) { 
      triggerModal("Error", "Asset name and Serial Number are strictly required.", "info"); 
      return; 
    }
    
    setIsAddingAsset(true);
    try {
      const isEditing = !!newAsset.id;
      const assetId = newAsset.id || `FI-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;

      // Build payload, keeping existing fields intact if we are in Edit Mode
      const payload = { 
        ...newAsset,
        id: assetId, 
        category: newAsset.category?.trim() || "Uncategorized", 
        parentId: newAsset.parentId || "",
        department: newAsset.department || "",
        operatorEmail: newAsset.operatorEmail || ""
      };

      // Only inject the blank underlying arrays if this is a brand new registration
      if (!isEditing) {
        payload.status = "Operational";
        payload.lastPmDate = new Date().toISOString();
        payload.pmFrequencies = []; // Handled exclusively by protocols now
        payload.pmDates = {};
        payload.manuals = []; 
        payload.parts = []; 
        payload.vendors = [];
      }

      // Upsert to Azure
      const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      
      if (res.ok) {
        const savedAsset = await res.json(); 
        
        // Update local React state dynamically based on New vs Edit
        if (isEditing) {
          setAssets(assets.map(a => a.id === savedAsset.id ? savedAsset : a));
        } else {
          setAssets([...assets, savedAsset]); 
        }
        
        const auditLog = {
          id: `LOG-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toLocaleString(),
          assetId: savedAsset.id,
          assetName: savedAsset.name,
          templateName: isEditing ? "Asset Profile Update" : "Asset Registration",
          interval: "On-Demand",
          technician: currentUser?.name || "System Administrator",
          status: "Completed Pass",
          comments: isEditing 
            ? `Updated facility asset profile: ${savedAsset.name} (S/N: ${savedAsset.serial})`
            : `Registered new facility asset: ${savedAsset.name} (Model: ${savedAsset.model}, S/N: ${savedAsset.serial})`
        };

        try {
          const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditLog) });
          if (logRes.ok) {
            const savedLog = await logRes.json();
            setHistory(prev => [savedLog, ...prev]);
          }
        } catch (logErr) {
          console.error("Failed to write audit log:", logErr);
        }

        // Reset form and notify operator
        setNewAsset({ name: "", model: "", serial: "", location: "", category: "", parentId: "", department: "", operatorEmail: "" });
        triggerModal(isEditing ? "Asset Updated" : "Asset Added", isEditing ? "Hardware profile successfully updated." : "New equipment hardware standard profile integrated.", "success"); 
      }
    } finally { 
      setIsAddingAsset(false); 
    }
  };

  const handleUpdateAssetStatus = async (assetId, newStatus) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;

    const updatedAsset = { ...targetAsset, status: newStatus };
    setAssets(assets.map(ast => ast.id === assetId ? updatedAsset : ast));

    try {
      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });
    } catch (err) { console.error("Failed to update status in DB:", err); }
  };

  const deleteAsset = (id) => { 
    triggerModal("Confirm Removal", "Confirm permanent removal of this asset from the database?", "confirm", async () => { 
      try {
        const res = await fetch(`/api/assets?id=${id}`, { method: 'DELETE' });
        if (res.ok) { setAssets(assets.filter(a => a.id !== id)); closeModal(); } 
      } catch (err) { triggerModal("Error", "Network error.", "error"); }
    }); 
  };

  const deleteAssetCategory = (categoryName) => {
    triggerModal("Nuke Category", `Are you sure you want to permanently delete ALL assets in the "${categoryName}" category?`, "error", async () => {
      try {
        const assetsToNuke = assets.filter(a => a.category === categoryName);
        await Promise.all(assetsToNuke.map(a => fetch(`/api/assets?id=${a.id}`, { method: 'DELETE' })));
        setAssets(assets.filter(a => a.category !== categoryName));
        closeModal();
      } catch(err) { triggerModal("Error", "Failed to clear category.", "error"); }
    });
  };

  const handleOpenAssetModal = (asset) => {
    setActiveAssetDetails(asset);
    setNewPart({ partNumber: "", name: "", stock: "" });
    setNewVendor({ name: "", contactInfo: "", serviceType: "" });
    setShowAssetModal(true);
  };

  const updateAssetSubDoc = async (updatedAsset) => {
    setActiveAssetDetails(updatedAsset);
    setAssets(assets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    try { await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) }); } catch(err){}
  };

  const addPart = (e) => {
    e.preventDefault();
    if (!newPart.name || !newPart.partNumber) return;
    const updatedAsset = { ...activeAssetDetails, parts: [...(activeAssetDetails.parts || []), { id: Date.now().toString(), ...newPart }] };
    setNewPart({ partNumber: "", name: "", stock: "" });
    updateAssetSubDoc(updatedAsset);
  };

  const removePart = (partId) => {
    const updatedAsset = { ...activeAssetDetails, parts: activeAssetDetails.parts.filter(p => p.id !== partId) };
    updateAssetSubDoc(updatedAsset);
  };

  const addVendor = (e) => {
    e.preventDefault();
    if (!newVendor.name) return;
    const updatedAsset = { ...activeAssetDetails, vendors: [...(activeAssetDetails.vendors || []), { id: Date.now().toString(), ...newVendor }] };
    setNewVendor({ name: "", contactInfo: "", serviceType: "" });
    updateAssetSubDoc(updatedAsset);
  };

  const removeVendor = (vendorId) => {
    const updatedAsset = { ...activeAssetDetails, vendors: activeAssetDetails.vendors.filter(v => v.id !== vendorId) };
    updateAssetSubDoc(updatedAsset);
  };

  return { 
    assets, setAssets, isAddingAsset, newAsset, setNewAsset, 
    showAssetModal, setShowAssetModal, activeAssetDetails, 
    newPart, setNewPart, newVendor, setNewVendor,
    handleAddAssetSubmit, handleUpdateAssetStatus, deleteAsset, deleteAssetCategory, 
    handleOpenAssetModal, addPart, removePart, addVendor, removeVendor
  };
}