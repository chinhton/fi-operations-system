import React, { useState, useRef, useEffect } from 'react';

const customStyles = `
  body {
    font-family: 'Verdana', Geneva, sans-serif !important;
    background-color: #F4F6F8;
    color: #1A2530;
  }
  .fairchild-navy-text { color: #005596; }
  .fairchild-navy-bg { background-color: #005596; }
  .logo-cyan-text { color: #00A1E4; }
  .logo-cyan-bg { background-color: #00A1E4; }
  .charcoal-text { color: #1A2530; }
  .charcoal-bg { background-color: #1A2530; }
`;

export default function App() {
  const [users, setUsers] = useState([
    {
      id: "USER-ADMIN",
      name: "Chinh Ton",
      email: "cton@fcimg.com",
      password: "admin",
      role: "System Admin",
      approved: true
    }
  ]);

  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = localStorage.getItem('fi_oms_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const [authMode, setAuthMode] = useState("signin"); 
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [history, setHistory] = useState([]);

  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [completedSteps, setCompletedSteps] = useState({});
  const [pmComments, setPmComments] = useState("");

  const [newAsset, setNewAsset] = useState({
    name: "", model: "", serial: "", location: "", category: "", pmFrequency: "Monthly"
  });

  const [newTemplate, setNewTemplate] = useState({
    name: "", interval: "Monthly", department: "", checklistInput: ""
  });

  const [manualAssetIds, setManualAssetIds] = useState([]);
  const [manualFile, setManualFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [viewingManualAsset, setViewingManualAsset] = useState(null);
  const [activeManualIndex, setActiveManualIndex] = useState(0);

  const [validationError, setValidationError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); 

  const [customModal, setCustomModal] = useState({
    show: false, title: "", message: "", type: "info", onConfirm: null
  });

  const manualFileInputRef = useRef(null);

  const isSystemAdmin = currentUser?.role === "System Admin" || currentUser?.role === "admin";

  useEffect(() => {
    fetch('/api/assets').then(res => res.json()).then(data => setAssets(data || [])).catch(err => console.error("Error pulling assets:", err));
    fetch('/api/templates').then(res => res.json()).then(data => setPmTemplates(data || [])).catch(err => console.error("Error pulling templates:", err));
    fetch('/api/history').then(res => res.json()).then(data => setHistory(data || [])).catch(err => console.error("Error pulling history:", err));
    fetch('/api/users').then(res => res.json()).then(data => {
        if (data && data.length > 0) {
          setUsers(prev => {
            const externalUsers = data.filter(u => u.email !== "cton@fcimg.com");
            return [prev[0], ...externalUsers];
          });
        }
      }).catch(err => console.error("Error pulling users:", err));
  }, []);

  const triggerModal = (title, message, type = "info", onConfirm = null) => {
    setCustomModal({ show: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setCustomModal({ show: false, title: "", message: "", type: "info", onConfirm: null });
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    setAuthError(""); setAuthSuccess("");
    if (!authEmail.trim() || !authPassword.trim()) { setAuthError("Email and password fields are required."); return; }
    
    const matchedUser = users.find(u => u.email.toLowerCase() === authEmail.toLowerCase().trim());
    
    if (!matchedUser || matchedUser.password !== authPassword) { setAuthError("Invalid corporate email or security password."); return; }
    if (!matchedUser.approved) { setAuthError("Your account registration is currently pending authorization from the System Admin."); return; }
    
    localStorage.setItem('fi_oms_session', JSON.stringify(matchedUser));
    
    setCurrentUser(matchedUser); 
    setAuthEmail(""); 
    setAuthPassword(""); 
    setActiveTab("dashboard");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError(""); setAuthSuccess("");
    if (!registerName.trim() || !authEmail.trim() || !authPassword.trim()) { setAuthError("All registration fields are required."); return; }
    if (!authEmail.toLowerCase().endsWith("@fcimg.com")) { setAuthError("Registration blocked: Only verified @fcimg.com emails are authorized."); return; }
    
    const alreadyExists = users.some(u => u.email.toLowerCase() === authEmail.toLowerCase().trim());
    if (alreadyExists) { setAuthError("An account with this email address already exists."); return; }

    const newUser = { 
      id: `USER-${Date.now().toString().slice(-4)}`, 
      name: registerName.trim(), 
      email: authEmail.toLowerCase().trim(), 
      password: authPassword, 
      role: "Operator", 
      approved: false 
    };

    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });

    if (res.ok) {
      const savedUser = await res.json();
      setUsers([...users, savedUser]); setRegisterName(""); setAuthEmail(""); setAuthPassword("");
      setAuthSuccess("Account request submitted. Please ask the System Admin to authorize your account."); setAuthMode("signin");
    } else {
      setAuthError("Failed to communicate credential request block packet to Azure.");
    }
  };

  const handleLogout = () => { 
    localStorage.removeItem('fi_oms_session');
    setCurrentUser(null); 
    setActiveTab("dashboard"); 
  };

  const handleApproveUser = async (email) => {
    const targetUser = users.find(u => u.email === email);
    if (!targetUser) return;
    
    const updatedUser = { ...targetUser, approved: true };
    setUsers(users.map(u => u.email === email ? updatedUser : u));

    try {
      await fetch('/api/users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(updatedUser) 
      });
    } catch (err) {
      console.error("Failed to approve user in database:", err);
    }

    const approvalLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-AUTH", assetName: "User Authentication Services", templateName: "User Access Provisioning", interval: "On-Demand", technician: "System Admin", email: "cton@fcimg.com", status: "Completed Pass", comments: `System Admin approved corporate access token for user account: ${email}` };
    const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approvalLog) });
    if (res.ok) {
      const savedLog = await res.json(); setHistory(prev => [savedLog, ...prev]); 
      triggerModal("Account Approved", `Access granted successfully for ${email}.`, "success");
    }
  };

  const handleDenyUser = (email) => {
    triggerModal("Confirm Action", `Decline and remove the access request for ${email}?`, "confirm", async () => {
        const targetUser = users.find(u => u.email === email);
        setUsers(prevUsers => prevUsers.filter(u => u.email !== email));

        if (targetUser && targetUser.id) {
            try {
                await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
            } catch (err) {
                console.error("Failed to delete user from database:", err);
            }
        }
    });
  };

  const handleRevokeUser = (email) => {
    triggerModal("Revoke Corporate Access", `Are you sure you want to permanently terminate access credentials for ${email}?`, "confirm", async () => {
      const targetUser = users.find(u => u.email === email);
      if (targetUser.email === "cton@fcimg.com") {
        triggerModal("Action Blocked", "System Admin account access restrictions cannot self-terminate.", "error");
        return;
      }

      setUsers(prevUsers => prevUsers.filter(u => u.email !== email));

      if (targetUser && targetUser.id) {
        try {
          await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
          
          const revokeLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-REVOKE", assetName: "User Authentication Services", templateName: "User Access Termination", interval: "On-Demand", technician: "System Admin", email: "cton@fcimg.com", status: "Incomplete Log", comments: `System Admin permanently revoked corporate access token for account: ${email}` };
          const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(revokeLog) });
          if (res.ok) {
            const savedLog = await res.json(); setHistory(prev => [savedLog, ...prev]);
          }
          
          triggerModal("Access Revoked", `Account credentials for ${email} have been purged from database configuration records.`, "success");
        } catch (err) {
          console.error("Failed to delete user from database:", err);
        }
      }
    });
  };

  const handleSelectAssetAndTemplate = (assetId, templateId) => {
    setSelectedAssetId(assetId); setSelectedTemplateId(templateId || ""); setCompletedSteps({}); setValidationError(""); setActiveTab("scheduler");
  };

  const handleUpdateAssetStatus = async (assetId, newStatus) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;

    const updatedAsset = { ...targetAsset, status: newStatus };
    setAssets(assets.map(ast => ast.id === assetId ? updatedAsset : ast));

    try {
      await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAsset)
      });
    } catch (err) {
      console.error("Failed to update status in DB:", err);
    }
  };

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
    if (manualAssetIds.length === 0) { triggerModal("Field Required", "Please select at least one target asset from the fleet directory.", "info"); return; }
    if (!manualFile && !manualText.trim()) { triggerModal("Input Required", "Please attach a documentation file or draft a quick-reference procedure layout.", "info"); return; }
    
    const targetAssets = assets.filter(a => manualAssetIds.includes(a.id));
    if (targetAssets.length === 0) return;

    let finalFileUrl = "";
    let finalFileName = manualFile ? manualFile.name : `Quick_Manual_${Date.now().toString().slice(-4)}.txt`;

    if (manualFile) {
      triggerModal("Uploading", `Transferring manual and mapping to ${targetAssets.length} asset(s)...`, "info");
      try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: manualFile.name, fileData: manualFile.data }) });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json(); finalFileUrl = uploadData.url; finalFileName = uploadData.fileName;
        } else {
          closeModal(); triggerModal("Upload Failed", "Could not transfer file to Azure Blob Storage. Check console logs.", "error"); return;
        }
      } catch (err) { closeModal(); triggerModal("Network Error", "Failed to reach the upload server.", "error"); return; }
    } else {
      finalFileUrl = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(manualText)))}`;
    }

    const attachmentPayload = { 
      id: `DOC-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
      fileName: finalFileName, 
      fileSize: manualFile ? manualFile.size : `${(new Blob([manualText]).size / 1024).toFixed(1)} KB`, 
      fileData: finalFileUrl, 
      manualText: manualText || "Refer to the attached downloaded instruction file." 
    };

    const updatedAssetsMap = {};
    const newLogs = [];

    await Promise.all(targetAssets.map(async (targetAsset) => {
      const existingManuals = targetAsset.manuals || (targetAsset.manual ? [targetAsset.manual] : []);
      const updatedAsset = { ...targetAsset, manual: null, manuals: [...existingManuals, attachmentPayload] };
      updatedAssetsMap[updatedAsset.id] = updatedAsset;

      const logEntry = { id: `LOG-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Operation Manual Attachment", interval: "On-Demand", technician: currentUser ? currentUser.name : "System Admin", email: currentUser ? currentUser.email : "cton@fcimg.com", status: "Completed Pass", comments: `Successfully linked new manual documentation [${attachmentPayload.fileName}] to device.` };
      
      try {
        await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });
        const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) });
        if (logRes.ok) {
          const savedLog = await logRes.json();
          newLogs.push(savedLog);
        }
      } catch (err) {
        console.error("Failed to sync manual for asset", targetAsset.id, err);
      }
    }));

    setHistory(prev => [...newLogs, ...prev]);
    setAssets(prevAssets => prevAssets.map(ast => updatedAssetsMap[ast.id] || ast));
    
    const firstUpdated = updatedAssetsMap[targetAssets[0].id];
    setViewingManualAsset(firstUpdated);
    setActiveManualIndex(firstUpdated.manuals.length - 1);
    
    closeModal(); 
    setManualAssetIds([]); 
    setManualFile(null); 
    setManualText(""); 
    if (manualFileInputRef.current) manualFileInputRef.current.value = "";
    triggerModal("Success", `Document successfully uploaded and mapped to ${targetAssets.length} asset(s).`, "success");
  };

  const handleRemoveManual = (assetId, docId) => {
    triggerModal("Remove Manual", "Are you sure you want to permanently detach and delete this specific document from the asset?", "confirm", async () => {
      const targetAsset = assets.find(a => a.id === assetId);
      const existingManuals = targetAsset.manuals || (targetAsset.manual ? [targetAsset.manual] : []);
      const updatedManuals = existingManuals.filter(m => m.id !== docId);
      
      const updatedAsset = { ...targetAsset, manual: null, manuals: updatedManuals };
      
      try {
        await fetch('/api/assets', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(updatedAsset) 
        });
        
        setAssets(assets.map(a => a.id === assetId ? updatedAsset : a));
        
        if (viewingManualAsset?.id === assetId) {
          setViewingManualAsset(updatedAsset);
          setActiveManualIndex(0); 
        }
        
        const logEntry = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Manual Removal", interval: "On-Demand", technician: currentUser.name, email: currentUser.email, status: "Completed Pass", comments: `Administrator securely detached a document from the asset.` };
        const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) });
        if (logRes.ok) {
          const savedLog = await logRes.json();
          setHistory([savedLog, ...history]);
        }
        
        closeModal();
        triggerModal("Success", "Document successfully removed from the system.", "success");
      } catch (err) {
        closeModal();
        triggerModal("Error", "Failed to remove manual from database.", "error");
      }
    });
  };

  const handleSubmitPm = (e) => {
    e.preventDefault(); setValidationError("");
    if (!selectedAssetId || !selectedTemplateId) { setValidationError("Error: You must select an active asset and protocol."); return; }
    const selectedAsset = assets.find(a => a.id === selectedAssetId); const selectedTemplate = pmTemplates.find(t => t.id === selectedTemplateId);
    if (!selectedAsset || !selectedTemplate) { setValidationError("Error: Match error for Asset or SOP protocol indices."); return; }

    const totalSteps = selectedTemplate.checklist.length;
    const checkedStepsCount = Object.values(completedSteps).filter(Boolean).length;
    
    if (checkedStepsCount < totalSteps) {
      triggerModal("Confirm Action", `Only ${checkedStepsCount}/${totalSteps} checklist items are marked as done. Sign-off on an incomplete checklist?`, "confirm", () => { executeChecklistSubmission(selectedAsset, selectedTemplate, "Incomplete Log"); });
    } else {
      executeChecklistSubmission(selectedAsset, selectedTemplate, "Completed Pass");
    }
  };

  const executeChecklistSubmission = async (selectedAsset, selectedTemplate, statusState) => {
    const newLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: selectedAsset.id, assetName: selectedAsset.name, templateName: selectedTemplate.name, interval: selectedTemplate.interval, technician: currentUser.name, email: currentUser.email, status: statusState, comments: pmComments || "No special operating comments provided." };
    const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLog) });
    if (res.ok) {
      const savedLog = await res.json(); setHistory([savedLog, ...history]);
      
      const finalStatus = statusState === "Completed Pass" ? "Operational" : "Under Service Review";
      const updatedAsset = { ...selectedAsset, status: finalStatus, lastPmDate: new Date().toISOString() };
      
      try {
        await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });
      } catch (err) {
        console.error("Failed to update asset PM date in DB", err);
      }

      setAssets(assets.map(ast => ast.id === selectedAsset.id ? updatedAsset : ast));
      setCompletedSteps({}); setPmComments(""); setSelectedAssetId(""); setSelectedTemplateId("");
      triggerModal("SOP Signature Logged", "Preventative maintenance log recorded successfully.", "success"); setActiveTab("dashboard");
    }
  };

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.serial) { triggerModal("Error", "Asset name and Serial Number are strictly required.", "info"); return; }
    
    const created = { 
      id: `FI-${Date.now().toString().slice(-3)}`, 
      ...newAsset, 
      category: newAsset.category.trim() || "Uncategorized", 
      status: "Operational", 
      lastPmDate: new Date().toISOString(),
      manuals: [] 
    };

    const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
    if (res.ok) {
      const savedAsset = await res.json(); setAssets([...assets, savedAsset]);
      setNewAsset({ name: "", model: "", serial: "", location: "", category: "", pmFrequency: "Monthly" });
      triggerModal("Asset Added", "New equipment hardware standard profile integrated.", "success"); setActiveTab("dashboard");
    }
  };

  const handleAddTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplate.name) { triggerModal("Error", "SOP Template Title is strictly required.", "info"); return; }
    
    const steps = newTemplate.checklistInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (steps.length === 0) {
      triggerModal("Error", "Please provide at least one individual action step item.", "info");
      return;
    }

    const created = {
      id: `SOP-${Date.now().toString().slice(-3)}`,
      name: newTemplate.name.trim(),
      interval: newTemplate.interval,
      department: newTemplate.department.trim() || "General Engineering",
      checklist: steps
    };

    const res = await fetch('/api/templates', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(created) 
    });
    
    if (res.ok) {
      const savedTemplate = await res.json();
      setPmTemplates([...pmTemplates, savedTemplate]);
      setNewTemplate({ name: "", interval: "Monthly", department: "", checklistInput: "" });
      triggerModal("Standard Created", "New preventative maintenance guideline profile cataloged.", "success");
    } else {
      triggerModal("Database Error", "Failed to transfer template payload standard to Cosmos DB.", "error");
    }
  };

  const deleteAsset = (id) => { 
    triggerModal("Confirm Removal", "Confirm permanent removal of this asset from the database?", "confirm", async () => { 
      try {
        const res = await fetch(`/api/assets?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setAssets(assets.filter(a => a.id !== id)); 
          setManualAssetIds(prev => prev.filter(aId => aId !== id));
        } else {
          triggerModal("Error", "Failed to delete asset from Azure Cosmos DB.", "error");
        }
      } catch (err) {
        triggerModal("Error", "Network error while deleting.", "error");
      }
    }); 
  };
  
  const deleteTemplate = (id) => { 
    triggerModal("Confirm Deletion", "Confirm permanent deletion of this template from the database?", "confirm", async () => { 
      try {
        const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setPmTemplates(pmTemplates.filter(t => t.id !== id)); 
        } else {
          triggerModal("Error", "Failed to delete template from Azure Cosmos DB.", "error");
        }
      } catch (err) {
        triggerModal("Error", "Network error while deleting.", "error");
      }
    }); 
  };

  const calculateDaysRemaining = (lastDateStr, frequency) => {
    if (!lastDateStr || frequency === "None" || !frequency) return null;
    const lastDate = new Date(lastDateStr);
    const now = new Date();
    const daysPassed = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    let cycleDays = 0;
    
    switch(frequency) {
      case "Weekly": cycleDays = 7; break;
      case "Monthly": cycleDays = 30; break;
      case "Quarterly": cycleDays = 90; break;
      case "Semi-Annually": cycleDays = 182; break;
      case "Annually": cycleDays = 365; break;
      default: return null;
    }
    return cycleDays - daysPassed;
  };

  const operationalCount = assets.filter(a => a.status === "Operational").length;
  const overdueCount = assets.filter(a => a.status === "Maintenance Due").length;
  const calibrationCount = assets.filter(a => a.status === "Out of Calibration").length;
  const correctiveCount = assets.filter(a => a.status === "Corrective Maintenance").length;
  
  const manualCount = assets.reduce((sum, a) => sum + (a.manuals ? a.manuals.length : (a.manual ? 1 : 0)), 0);
  const complianceRate = (() => { if (assets.length === 0) return 100; const nonCompliant = overdueCount + calibrationCount + correctiveCount; return Math.round(((assets.length - nonCompliant) / assets.length) * 100); })();
  
  const pendingApprovals = users.filter(u => !u.approved);
  const activeAccounts = users.filter(u => u.approved);

  const actionQueue = assets.filter(a => a.status !== "Operational");
  
  const assetsWithManuals = assets.filter(a => (a.manuals && a.manuals.length > 0) || a.manual);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center px-4 py-12 antialiased">
        <style>{customStyles}</style>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-[#005596] px-8 py-8 text-center text-white relative">
            <div className="mb-4 flex justify-center">
                <img src="/logo.png" alt="Fairchild Imaging Logo" className="h-24 w-auto max-w-[350px] object-contain rounded bg-white p-2" />
            </div>
            <h2 className="text-xl font-bold tracking-tight font-sans">FI-Operation Management System</h2>
          </div>

          <div className="p-8">
            {authError && <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-3 text-xs font-semibold text-red-800 leading-relaxed">{authError}</div>}
            {authSuccess && <div className="mb-5 bg-green-50 border-l-4 border-green-500 p-3 text-xs font-semibold text-green-800 leading-relaxed">{authSuccess}</div>}

            {authMode === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="name@fcimg.com" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 border bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Security Password</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 border bg-white" />
                </div>
                <button type="submit" className="w-full bg-[#005596] hover:bg-[#005596]/95 text-white py-3 rounded text-xs font-bold uppercase tracking-wider shadow-sm font-sans">Authorized Sign In</button>
                <p className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
                  New Operator? <button type="button" onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccess(""); }} className="text-[#00A1E4] hover:underline font-bold">Request Account Access</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name / Initials</label>
                  <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Technician Name" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 border bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Corporate Email Address (@fcimg.com)</label>
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="user@fcimg.com" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 border bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Choose Security Password</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 border bg-white" />
                </div>
                <button type="submit" className="w-full bg-[#00A1E4] hover:bg-[#00A1E4]/95 text-white py-3 rounded text-xs font-bold uppercase tracking-wider shadow-sm font-sans">Submit Access Request</button>
                <p className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
                  Already registered? <button type="button" onClick={() => { setAuthMode("signin"); setAuthError(""); setAuthSuccess(""); }} className="text-[#005596] hover:underline font-bold">Back to Sign In</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col antialiased">
      <style>{customStyles}</style>

      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 flex items-center">
              <img src="/logo.png" alt="Fairchild Imaging Logo" className="h-16 w-auto max-w-[280px] object-contain" />
            </div>
            <span className="h-10 w-px bg-gray-200"></span>
            <div><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#005596] m-0 font-sans">FI-Operation Management System</h1></div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-gray-900 block font-sans">{currentUser.name}</span>
              <span className={`text-[10px] font-bold font-mono block uppercase ${isSystemAdmin ? 'text-[#005596]' : 'text-gray-500'}`}>{currentUser.role}</span>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 bg-[#1A2530] text-white hover:bg-black text-xs font-bold rounded shadow-sm transition">Sign Out</button>
          </div>
        </div>
      </header>

      {/* COMPLIANCE KPI TRACKER BANNER */}
      <section className="bg-gradient-to-r from-[#005596] to-[#00A1E4] text-white py-6 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100">Facility Assets</span>
            <div className="text-2xl sm:text-3xl font-black mt-1">{assets.length}</div>
            <div className="text-[11px] text-blue-200 mt-1">Monitored high-value systems</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100">Compliance Factor</span>
            <div className="text-2xl sm:text-3xl font-black mt-1">{complianceRate}%</div>
            <div className="text-[11px] text-blue-200 mt-1">Optimal health ratio</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100">Pending Actions</span>
            <div className="text-2xl sm:text-3xl font-black mt-1 text-yellow-300">{overdueCount + calibrationCount}</div>
            <div className="text-[11px] text-blue-200 mt-1">Schedules in queue</div>
          </div>
          <div 
            onClick={() => setActiveTab('history')} 
            className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 cursor-pointer hover:bg-white/20 transition-all">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100">Executed Audits</span>
            <div className="text-2xl sm:text-3xl font-black mt-1">{history.length}</div>
            <div className="text-[11px] text-blue-200 mt-1">Traceable sign-off operations &rarr;</div>
          </div>
        </div>
      </section>

      {/* CORE WRAPPER LAYOUT WITH LEFT NAVIGATION SIDEBAR */}
      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto">
        
        {/* REFACTORED NAVIGATION SIDEBAR PANEL */}
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-4 space-y-1 flex flex-col shrink-0">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 hidden md:block">
            Main Navigation
          </div>
          
          <button 
            onClick={() => setActiveTab("dashboard")} 
            className={`w-full flex items-center space-x-3 px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "dashboard" ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <span>📊</span> <span>Operations Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("assets")} 
            className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "assets" ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <div className="flex items-center space-x-3">
              <span>🏭</span> <span>Asset Directory</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === "assets" ? "bg-[#005596] text-white" : "bg-gray-100 text-gray-600"}`}>{assets.length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("scheduler")} 
            className={`w-full flex items-center space-x-3 px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "scheduler" ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <span>📋</span> <span>PM Execution & Sign-Off</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("manuals")} 
            className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "manuals" ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <div className="flex items-center space-x-3">
              <span>📖</span> <span>Equipment Manuals</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === "manuals" ? "bg-[#005596] text-white" : "bg-gray-100 text-gray-600"}`}>{manualCount}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("templates")} 
            className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "templates" ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <div className="flex items-center space-x-3">
              <span>⚙️</span> <span>PM Task Configurations</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === "templates" ? "bg-[#005596] text-white" : "bg-gray-100 text-gray-600"}`}>{pmTemplates.length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("history")} 
            className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "history" ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <div className="flex items-center space-x-3">
              <span>📜</span> <span>Audit Logs & PM History</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === "history" ? "bg-[#005596] text-white" : "bg-gray-100 text-gray-600"}`}>{history.length}</span>
          </button>
          
          {isSystemAdmin && (
            <button 
              onClick={() => setActiveTab("approvals")} 
              className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "approvals" ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
              <div className="flex items-center space-x-3">
                <span>🔑</span> <span>Account Approvals</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${activeTab === "approvals" ? "bg-red-600 text-white" : "bg-red-100 text-red-700"}`}>{pendingApprovals.length}</span>
            </button>
          )}
        </aside>

        {/* WORKPLACE MAIN PANEL CONTENT WINDOW */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-x-hidden">

          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                  <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Operational Health</span><div className="text-3xl font-black mt-2 text-green-600">{operationalCount}</div></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                  <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Overdue Maintenance</span><div className="text-3xl font-black mt-2 text-yellow-600">{overdueCount}</div></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                  <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Out Of Calibration</span><div className="text-3xl font-black mt-2 text-red-600">{calibrationCount}</div></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                  <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Corrective Action</span><div className="text-3xl font-black mt-2 text-orange-600">{correctiveCount}</div></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-[#005596] text-white px-5 py-4 flex items-center justify-between">
                      <h3 className="font-bold text-xs uppercase tracking-wider">SOP & Maintenance Actions Queue</h3>
                      {actionQueue.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{actionQueue.length} Pending</span>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                      {actionQueue.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-xs">
                          No pending maintenance actions. All systems are operational.
                        </div>
                      ) : (
                        actionQueue.map(asset => (
                          <div key={asset.id} className="p-4 hover:bg-gray-50 transition flex justify-between items-center">
                            <div>
                              <span className="font-bold text-gray-900 text-xs block">{asset.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">S/N: {asset.serial}</span>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                asset.status === "Maintenance Due" ? "bg-yellow-100 text-yellow-800" :
                                asset.status === "Out of Calibration" ? "bg-red-100 text-red-800" :
                                "bg-orange-100 text-orange-800"
                              }`}>{asset.status}</span>
                              <button 
                                onClick={() => { setSelectedAssetId(asset.id); setActiveTab("scheduler"); }} 
                                className="block w-full text-right mt-1.5 text-[10px] text-[#005596] font-bold hover:underline">
                                Execute PM ➔
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h4 className="font-bold text-xs text-[#005596] uppercase tracking-wider mb-3">Technician Duty Board</h4>
                    <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isSystemAdmin ? 'bg-[#005596]/10 text-[#005596]' : 'bg-slate-100 text-slate-700'}`}>
                        {isSystemAdmin ? 'SYS' : 'OP'}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-900 font-sans">{currentUser.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{currentUser.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Register New Dynamic Lab/Cleanroom Asset</h3></div>
                <form onSubmit={handleAddAssetSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Equipment Name</label><input type="text" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. sCMOS Chamber" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                    <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Model Identifier</label><input type="text" value={newAsset.model} onChange={(e) => setNewAsset({...newAsset, model: e.target.value})} placeholder="e.g. VCC-2020-X" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                    <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number</label><input type="text" value={newAsset.serial} onChange={(e) => setNewAsset({...newAsset, serial: e.target.value})} placeholder="e.g. FC-90812-C" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                    <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location / Bay</label><input type="text" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g. Cleanroom Bay 3" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                    <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Type</label><input type="text" value={newAsset.category} onChange={(e) => setNewAsset({...newAsset, category: e.target.value})} placeholder="e.g. Vacuum Chamber" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PM Frequency</label>
                      <select value={newAsset.pmFrequency} onChange={(e) => setNewAsset({...newAsset, pmFrequency: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                        <option value="None">None (Run to Fail)</option>
                        <option value="Weekly">Weekly Cycle</option>
                        <option value="Monthly">Monthly Cycle</option>
                        <option value="Quarterly">Quarterly Cycle</option>
                        <option value="Semi-Annually">Semi-Annually Cycle</option>
                        <option value="Annually">Annually Cycle</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end"><button type="submit" className="bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all">Commit Asset</button></div>
                </form>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between"><h3 className="font-bold text-sm tracking-wide uppercase">Hardware Directory</h3></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      <tr><th className="px-6 py-3.5">Asset Name</th><th className="px-6 py-3.5">Model / Serial No</th><th className="px-6 py-3.5">Category</th><th className="px-6 py-3.5">Status & PM Cycle</th><th className="px-6 py-3.5 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {assets.map((asset) => (
                        <tr key={asset.serial} className="hover:bg-gray-50/55 transition">
                          <td className="px-6 py-4"><span className="font-bold text-gray-900 block">{asset.name}</span></td>
                          <td className="px-6 py-4 font-mono"><span className="block text-gray-700">Mod: {asset.model}</span><span className="block text-[11px] text-gray-400">S/N: {asset.serial}</span></td>
                          <td className="px-6 py-4"><span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-[#005596] border inline-block">{asset.category}</span></td>
                          <td className="px-6 py-4">
                            <select
                              value={asset.status}
                              onChange={(e) => handleUpdateAssetStatus(asset.id, e.target.value)}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005596] ${
                                asset.status === "Operational" ? "bg-green-100 text-green-800" :
                                asset.status === "Maintenance Due" ? "bg-yellow-100 text-yellow-800" :
                                asset.status === "Out of Calibration" ? "bg-red-100 text-red-800" :
                                "bg-orange-100 text-orange-800"
                              }`}
                            >
                              <option value="Operational">Operational</option>
                              <option value="Maintenance Due">Maintenance Due</option>
                              <option value="Out of Calibration">Out of Calibration</option>
                              <option value="Corrective Maintenance">Corrective Action</option>
                            </select>
                            <div className="flex flex-col mt-2 space-y-1.5">
                              <div className="text-[9px] text-gray-500 font-bold uppercase pl-1">Cycle: <span className="text-[#005596]">{asset.pmFrequency || "None"}</span></div>
                              {(() => {
                                const daysRemaining = calculateDaysRemaining(asset.lastPmDate, asset.pmFrequency);
                                if (asset.pmFrequency && asset.pmFrequency !== "None" && daysRemaining === null) {
                                  return <div className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-gray-100 text-gray-600 inline-block w-max">⏳ Needs Initial PM Baseline</div>;
                                }
                                if (daysRemaining !== null) {
                                  return (
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block w-max ${daysRemaining < 0 ? 'bg-red-50 text-red-600' : daysRemaining <= 7 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                      ⏳ {daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days` : `Due in ${daysRemaining} days`}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-4">
                            <button onClick={() => { setSelectedAssetId(asset.id); setActiveTab("scheduler"); }} className="text-xs font-bold text-[#005596] hover:text-[#005596]/80 transition">Execute PM</button>
                            {isSystemAdmin && (
                              <button onClick={() => deleteAsset(asset.id)} className="text-xs font-bold text-red-600 hover:text-red-800 transition">Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "scheduler" && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-6 py-4 flex items-center justify-between">
                  <div><h3 className="font-bold text-sm tracking-wide uppercase">Active Maintenance Sign-Off Form</h3></div>
                </div>
                <form onSubmit={handleSubmitPm} className="p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">1. Select Hardware System for Action</label>
                    <select value={selectedAssetId} onChange={(e) => handleSelectAssetAndTemplate(e.target.value, selectedTemplateId)} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                      <option value="">-- Choose Hardware System from Directory --</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name} (SN: {a.serial})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">2. Select SOP Protocol</label>
                    <select value={selectedTemplateId} onChange={(e) => { setSelectedTemplateId(e.target.value); setCompletedSteps({}); }} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                      <option value="">-- Choose Protocol Template to Execute --</option>
                      {pmTemplates.map(t => <option key={t.id} value={t.id}>[{t.interval}] {t.name}</option>)}
                    </select>
                  </div>
                  {selectedTemplateId && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wide mb-4">3. Mandatory Task Checklist Steps</h4>
                      <div className="space-y-3.5">
                        {pmTemplates.find(t => t.id === selectedTemplateId)?.checklist.map((step, idx) => (
                          <label key={idx} className={`flex items-start p-2 rounded cursor-pointer transition ${completedSteps[idx] ? "bg-green-50/50" : "hover:bg-gray-100"}`}>
                            <input type="checkbox" checked={!!completedSteps[idx]} onChange={(e) => setCompletedSteps({ ...completedSteps, [idx]: e.target.checked })} className="h-4.5 w-4.5 text-[#005596] border-gray-300 rounded mt-0.5" />
                            <span className="ml-3 text-xs text-gray-700 font-medium">{step}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div><button type="submit" className="w-full bg-[#005596] hover:bg-[#005596]/95 text-white py-3 px-4 rounded text-xs font-bold uppercase tracking-widest shadow-sm">Commit Maintenance Action</button></div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "manuals" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                    <button type="submit" className="w-full bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white py-2.5 rounded text-xs font-bold uppercase transition-all">Distribute Manual to Assets</button>
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
          )}

          {activeTab === "templates" && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Construct Custom SOP Template</h3></div>
                <form onSubmit={handleAddTemplateSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Checklist Title</label><input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Annual Precision ISO Check" className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 border bg-white" /></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Interval Frequency</label>
                      <select value={newTemplate.interval} onChange={(e) => setNewTemplate({...newTemplate, interval: e.target.value})} className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 bg-white border cursor-pointer">
                        <option value="Weekly">Weekly Cycle</option><option value="Monthly">Monthly Cycle</option><option value="Quarterly">Quarterly Cycle</option><option value="Semi-Annually">Semi-Annually Cycle</option><option value="Annually">Annually Cycle</option>
                      </select>
                    </div>
                    <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assigned Responsible Department</label><input type="text" value={newTemplate.department} onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})} placeholder="e.g. Cleanroom Operations" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                    <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Checklist Actions (One per line)</label><textarea value={newTemplate.checklistInput} onChange={(e) => setNewTemplate({...newTemplate, checklistInput: e.target.value})} rows="4" placeholder="Verify seal safety configurations..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea></div>
                  </div>
                  <div className="mt-6 flex justify-end"><button type="submit" className="bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all">Generate Protocol</button></div>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pmTemplates.map((template) => (
                  <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div><span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase">{template.id}</span><h4 className="font-bold text-base text-gray-900 mt-0.5 leading-tight">{template.name}</h4></div>
                        <span className="bg-blue-50 text-[#005596] text-[10px] font-bold px-2 py-1 rounded uppercase">{template.interval}</span>
                      </div>
                      <div className="mt-2 text-xs text-[#00A1E4] font-semibold">Managed by: {template.department}</div>
                      <ul className="mt-4 space-y-1.5 pl-4 list-decimal text-xs text-gray-600">
                        {template.checklist.map((item, idx) => <li key={idx}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">{template.checklist.length} individual tasks</span>
                      {isSystemAdmin && (
                        <button onClick={() => deleteTemplate(template.id)} className="text-red-600 hover:text-red-800 font-bold">Delete Standard</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm tracking-wide uppercase">Traceable Activity Logs & History Records</h3>
                <span className="text-xs text-gray-400 font-semibold">{history.length} operations on file</span>
              </div>
              <div className="p-4 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                This log officially timestamps and records all executed PMs, protocol sign-offs, and administrative actions performed within the system.
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <tr><th className="px-6 py-3.5">Timestamp</th><th className="px-6 py-3.5">Asset & Category</th><th className="px-6 py-3.5">Executed Protocol</th><th className="px-6 py-3.5">Technician / Inspector</th><th className="px-6 py-3.5">Execution Status</th><th className="px-6 py-3.5">Operating Notes</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {history.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400 text-xs">No historical log entries found.</td></tr>
                    ) : (
                      history.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 text-gray-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                          <td className="px-6 py-4"><span className="font-bold text-gray-900 block">{log.assetName}</span><span className="text-[10px] text-gray-400 font-mono">{log.assetId}</span></td>
                          <td className="px-6 py-4"><span className="font-bold text-gray-800 block">{log.templateName}</span><span className="text-[10px] bg-blue-50 text-[#005596] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block">{log.interval} Cycle</span></td>
                          <td className="px-6 py-4"><span className="font-bold text-gray-900 block">{log.technician}</span><span className="text-xs text-gray-500 font-mono block">{log.email}</span></td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === "Completed Pass" ? "bg-green-100 text-green-800" : log.status === "Incomplete Log" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{log.status}</span></td>
                          <td className="px-6 py-4 text-gray-600 max-w-xs break-words">{log.comments}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "approvals" && isSystemAdmin && (
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* CARD 1: PENDING ACCOUNT REQUESTS */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide uppercase">🔑 Pending Account Approvals</h3>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">{pendingApprovals.length} Gate Requests</span>
                </div>
                <div className="p-6">
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    {pendingApprovals.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs font-sans">No pending registration requests. All tokens are processed.</div>
                    ) : (
                      pendingApprovals.map((u) => (
                        <div key={u.email} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div><h4 className="font-bold text-xs text-gray-900">{u.name}</h4><span className="text-xs text-gray-500 font-mono block mt-1">{u.email}</span></div>
                          <div className="flex space-x-2">
                            <button onClick={() => handleApproveUser(u.email)} className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold uppercase py-1.5 px-3 rounded shadow transition">Approve Access</button>
                            <button onClick={() => handleDenyUser(u.email)} className="border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold uppercase py-1.5 px-3 rounded transition">Decline</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: ACTIVE AUTHORIZED USERS DIRECTORY */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide uppercase">🟢 Active Authorized Accounts</h3>
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full font-bold">{activeAccounts.length} Total Users</span>
                </div>
                <div className="p-6">
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    {activeAccounts.map((u) => (
                      <div key={u.email} className="p-4 bg-white hover:bg-gray-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-xs text-gray-900">{u.name}</h4>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${u.role === 'admin' || u.role === 'System Admin' ? 'bg-blue-100 text-[#005596]' : 'bg-slate-100 text-slate-700'}`}>
                              {u.role}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono block mt-1">{u.email}</span>
                        </div>
                        <div>
                          {u.email === "cton@fcimg.com" ? (
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-3 py-1.5 block">Root Immutable</span>
                          ) : (
                            <button onClick={() => handleRevokeUser(u.email)} className="text-xs font-bold text-red-600 hover:text-red-800 transition py-1.5 px-3 uppercase tracking-wider">
                              Revoke Access
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* GLOBAL MODALS */}
      {customModal.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden">
            <div className={`p-4 text-white text-xs font-bold uppercase tracking-wider ${customModal.type === "error" ? "bg-red-600" : "bg-[#005596]"}`}>{customModal.type === "error" ? "⚠️ System Error" : "ℹ️ System Message"}</div>
            <div className="p-5"><p className="text-xs text-gray-700 leading-relaxed font-medium">{customModal.message}</p></div>
            <div className="bg-gray-50 px-5 py-3.5 flex justify-end space-x-2 border-t border-gray-100">
              {customModal.onConfirm ? (
                <>
                  <button onClick={() => { customModal.onConfirm(); setCustomModal({ show: false }); }} className="bg-[#005596] text-white text-[11px] font-bold uppercase px-3 py-1.5 rounded transition">Confirm</button>
                  <button onClick={closeModal} className="border bg-white text-gray-700 text-[11px] font-bold uppercase px-3 py-1.5 rounded transition">Cancel</button>
                </>
              ) : (
                <button onClick={closeModal} className="bg-[#005596] text-white text-[11px] font-bold uppercase px-4 py-1.5 rounded transition">OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}