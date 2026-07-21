import { useState } from 'react';

// Notice history and setHistory are now pulled in here!
export default function useAssets(assets, setAssets, history, setHistory, triggerModal, closeModal, currentUser) {
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  
  // Added managerEmail and operatorEmail to the default state
  const [newAsset, setNewAsset] = useState({ name: "", model: "", serial: "", location: "", category: "", managerEmail: "", operatorEmail: "", pmFrequencies: [], parts: [], vendors: [] });
  
  // Asset Modal State
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [activeAssetDetails, setActiveAssetDetails] = useState(null);
  const [newPart, setNewPart] = useState({ partNumber: "", name: "", stock: "" });
  const [newVendor, setNewVendor] = useState({ name: "", contactInfo: "", serviceType: "" });

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    if (isAddingAsset) return;
    
    if (!newAsset.name || !newAsset.serial) { triggerModal("Error", "Asset name and Serial Number are strictly required.", "info"); return; }
    
    setIsAddingAsset(true);
    try {
      const initialPmDates = {};
      newAsset.pmFrequencies.forEach(freq => { initialPmDates[freq] = new Date().toISOString(); });

      const created = { 
        id: `FI-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`, 
        ...newAsset, 
        category: newAsset.category.trim() || "Uncategorized", 
        managerEmail: newAsset.managerEmail || "",
        operatorEmail: newAsset.operatorEmail || "",
        status: "Operational", 
        lastPmDate: new Date().toISOString(),
        pmFrequencies: newAsset.pmFrequencies,
        pmDates: initialPmDates,
        manuals: [], parts: [], vendors: []
      };

      const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
      if (res.ok) {
        const savedAsset = await res.json(); 
        
        setAssets([...assets, savedAsset]); 
        
        // --- THE FIX: Create the Audit Log ---
        const auditLog = {
          id: `LOG-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
          date: new Date().toLocaleString(),
          assetId: savedAsset.id,
          assetName: savedAsset.name,
          templateName: "Asset Registration",
          interval: "On-Demand",
          technician: currentUser?.name || "System Administrator",
          status: "Completed Pass",
          comments: `Registered new facility asset: ${savedAsset.name} (Model: ${savedAsset.model}, S/N: ${savedAsset.serial})`
        };

        try {
          const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditLog) });
          if (logRes.ok) {
            const savedLog = await logRes.json();
            // Instantly update the Executed Audits tab!
            setHistory(prev => [savedLog, ...prev]);
          }
        } catch (logErr) {
          console.error("Failed to write audit log:", logErr);
        }
        // -------------------------------------

        // Reset state with the new email fields included
        setNewAsset({ name: "", model: "", serial: "", location: "", category: "", managerEmail: "", operatorEmail: "", pmFrequencies: [], parts: [], vendors: [] });
        triggerModal("Asset Added", "New equipment hardware standard profile integrated.", "success"); 
      }
    } finally { setIsAddingAsset(false); }
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

  // Vendor & Part Management
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