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
      name: "Chinh Ton",
      email: "cton@fcimg.com",
      password: "admin",
      role: "admin",
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
  const [emailLogs, setEmailLogs] = useState([]);

  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [completedSteps, setCompletedSteps] = useState({});
  const [pmComments, setPmComments] = useState("");

  const [newAsset, setNewAsset] = useState({
    name: "", model: "", serial: "", location: "", category: "", status: "Operational"
  });

  const [newTemplate, setNewTemplate] = useState({
    name: "", interval: "Monthly", department: "", checklistInput: ""
  });

  const [manualAssetId, setManualAssetId] = useState("");
  const [manualFile, setManualFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [viewingManualAsset, setViewingManualAsset] = useState(null);

  const [reminderAssetId, setReminderAssetId] = useState("");
  const [reminderRecipientEmail, setReminderRecipientEmail] = useState("");
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");

  const [validationError, setValidationError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); 

  const [customModal, setCustomModal] = useState({
    show: false, title: "", message: "", type: "info", onConfirm: null
  });

  const manualFileInputRef = useRef(null);

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

    const newUser = { name: registerName.trim(), email: authEmail.toLowerCase().trim(), password: authPassword, role: "technician", approved: false };
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
    const updatedUsers = users.map(u => u.email === email ? { ...u, approved: true } : u);
    setUsers(updatedUsers);
    const approvalLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-AUTH", assetName: "User Authentication Services", templateName: "User Access Provisioning", interval: "On-Demand", technician: "Admin", email: "cton@fcimg.com", status: "Completed Pass", comments: `Admin approved corporate access token for user account: ${email}` };
    const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approvalLog) });
    if (res.ok) {
      const savedLog = await res.json(); setHistory(prev => [savedLog, ...prev]); triggerModal("Account Approved", `Access granted successfully for ${email}.`, "success");
    }
  };

  const handleDenyUser = (email) => {
    triggerModal("Confirm Action", `Decline and remove the access request for ${email}?`, "confirm", () => {
        setUsers(prevUsers => prevUsers.filter(u => u.email !== email));
    });
  };

  const handleSelectAssetAndTemplate = (assetId, templateId) => {
    setSelectedAssetId(assetId); setSelectedTemplateId(templateId || ""); setCompletedSteps({}); setValidationError(""); setActiveTab("scheduler");
  };

  const handleInitiateEmailReminder = (assetId) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;
    setReminderAssetId(assetId);
    const otherTech = users.find(u => u.email !== "cton@fcimg.com" && u.approved);
    setReminderRecipientEmail(otherTech ? otherTech.email : "");
    setReminderSubject(`[ACTION REQUIRED] Urgent SOP/PM Pending: ${targetAsset.name} (${targetAsset.serial})`);
    setReminderBody(`Dear Team Member,\n\nThis is an automated system reminder regarding ${targetAsset.name}.\n\nAccording to the FI-Operation Management System, this equipment currently has an active status of: [${targetAsset.status}]. Please log in to your account, review the linked equipment manual, and execute the standard sign-off checklists to update compliance metrics.\n\nS/N: ${targetAsset.serial}\nModel: ${targetAsset.model}\nLocation: ${targetAsset.location}\n\nBest regards,\n\nSystem Administrator`);
    setActiveTab("reminders");
  };

  const handleDispatchEmailReminder = async (e) => {
    e.preventDefault();
    if (!reminderAssetId || !reminderRecipientEmail.trim() || !reminderSubject.trim() || !reminderBody.trim()) { triggerModal("Input Error", "Please fill in all email reminder fields.", "info"); return; }
    const targetAsset = assets.find(a => a.id === reminderAssetId);
    if (!targetAsset) return;

    const newMailLog = { id: `EML-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetName: targetAsset.name, recipient: reminderRecipientEmail, subject: reminderSubject, body: reminderBody };
    setEmailLogs([newMailLog, ...emailLogs]);

    const systemLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Email Reminder Dispatched", interval: "On-Demand", technician: currentUser ? currentUser.name : "System Admin", email: currentUser ? currentUser.email : "cton@fcimg.com", status: "Completed Pass", comments: `Dispatched compliance warning email to ${reminderRecipientEmail}` };
    const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(systemLog) });

    if (res.ok) {
      const savedLog = await res.json(); setHistory([savedLog, ...history]);
      const mailtoLink = `mailto:${encodeURIComponent(reminderRecipientEmail)}?subject=${encodeURIComponent(reminderSubject)}&body=${encodeURIComponent(reminderBody)}`;
      triggerModal("Reminder Sent", "Email reminder successfully logged inside OMS database! Click Confirm below to launch Outlook/Native Mail.", "confirm", () => { window.location.href = mailtoLink; });
      setReminderAssetId(""); setReminderRecipientEmail(""); setReminderSubject(""); setReminderBody("");
    }
  };

  const handleReturnToService = async (assetId) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;
    const recoveryLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Corrective Action Log-out Recovery", interval: "On-Demand", technician: currentUser ? currentUser.name : "System Admin", email: currentUser ? currentUser.email : "cton@fcimg.com", status: "Completed Pass", comments: `Manual operational override. Equipment status updated to Operational.` };
    const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recoveryLog) });
    if (res.ok) {
      const savedLog = await res.json(); setHistory(prevHistory => [savedLog, ...prevHistory]);
      setAssets(prevAssets => prevAssets.map(ast => ast.id === assetId ? { ...ast, status: "Operational" } : ast));
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
    if (!manualAssetId) { triggerModal("Field Required", "Please select a target asset from your registered directory.", "info"); return; }
    if (!manualFile && !manualText.trim()) { triggerModal("Input Required", "Please attach a documentation file or draft a quick-reference procedure layout.", "info"); return; }
    const targetAsset = assets.find(a => a.id === manualAssetId);
    if (!targetAsset) return;

    let finalFileUrl = "";
    let finalFileName = manualFile ? manualFile.name : "Quick_Manual_SOP.txt";

    if (manualFile) {
      triggerModal("Uploading", "Transferring equipment manual to Azure Blob Storage...", "info");
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

    const attachmentPayload = { fileName: finalFileName, fileSize: manualFile ? manualFile.size : `${(new Blob([manualText]).size / 1024).toFixed(1)} KB`, fileData: finalFileUrl, manualText: manualText || "Refer to the attached downloaded instruction file." };
    const logEntry = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Operation Manual Attachment", interval: "On-Demand", technician: currentUser ? currentUser.name : "System Admin", email: currentUser ? currentUser.email : "cton@fcimg.com", status: "Completed Pass", comments: `Successfully linked manual documentation standard [${attachmentPayload.fileName}] to device.` };

    const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) });
    if (logRes.ok) {
      const savedLog = await logRes.json(); setHistory(prev => [savedLog, ...prev]);
      setAssets(prevAssets => prevAssets.map(ast => ast.id === manualAssetId ? { ...ast, manual: attachmentPayload } : ast));
      closeModal(); setManualAssetId(""); setManualFile(null); setManualText(""); if (manualFileInputRef.current) manualFileInputRef.current.value = "";
      triggerModal("Success", `Manual successfully uploaded and attached to asset: ${targetAsset.name}`, "success");
    }
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
      setAssets(assets.map(ast => ast.id === selectedAsset.id ? { ...ast, status: statusState === "Completed Pass" ? "Operational" : "Under Service Review" } : ast));
      setCompletedSteps({}); setPmComments(""); setSelectedAssetId(""); setSelectedTemplateId("");
      triggerModal("SOP Signature Logged", "Preventative maintenance log recorded successfully.", "success"); setActiveTab("dashboard");
    }
  };

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.serial) { triggerModal("Error", "Asset name and Serial Number are strictly required.", "info"); return; }
    const created = { id: `FI-${Date.now().toString().slice(-3)}`, ...newAsset, category: newAsset.category.trim() || "Uncategorized", manual: null };
    const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
    if (res.ok) {
      const savedAsset = await res.json(); setAssets([...assets, savedAsset]);
      setNewAsset({ name: "", model: "", serial: "", location: "", category: "", status: "Operational" });
      triggerModal("Asset Added", "New equipment hardware standard profile integrated.", "success"); setActiveTab("dashboard");
    }
  };

  const handleAddTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.checklistInput) { triggerModal("Error", "Template title and Checklist lines are required.", "info"); return; }
    const items = newTemplate.checklistInput.split("\n").map(item => item.trim()).filter(item => item.length > 0);
    const created = { id: `PMT-${Date.now().toString().slice(-3)}`, name: newTemplate.name, interval: newTemplate.interval, department: newTemplate.department.trim() || "General", checklist: items };
    const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
    if (res.ok) {
      const savedTemplate = await res.json(); setPmTemplates([...pmTemplates, savedTemplate]);
      setNewTemplate({ name: "", interval: "Monthly", department: "", checklistInput: "" });
      triggerModal("SOP Initialized", "New SOP preventative standard configuration template integrated.", "success"); setActiveTab("dashboard");
    }
  };

  // --- NEW PERSISTENT DELETE FUNCTIONS ---
  const deleteAsset = (id) => { 
    triggerModal("Confirm Removal", "Confirm permanent removal of this asset from the database?", "confirm", async () => { 
      try {
        const res = await fetch(`/api/assets?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setAssets(assets.filter(a => a.id !== id)); 
          if (manualAssetId === id) setManualAssetId(""); 
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

  const operationalCount = assets.filter(a => a.status === "Operational").length;
  const overdueCount = assets.filter(a => a.status === "Maintenance Due").length;
  const calibrationCount = assets.filter(a => a.status === "Out of Calibration").length;
  const correctiveCount = assets.filter(a => a.status === "Corrective Maintenance").length;
  const manualCount = assets.filter(a => a.manual).length;
  const complianceRate = (() => { if (assets.length === 0) return 100; const nonCompliant = overdueCount + calibrationCount + correctiveCount; return Math.round(((assets.length - nonCompliant) / assets.length) * 100); })();
  const pendingApprovals = users.filter(u => !u.approved);

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
                  New technician? <button type="button" onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccess(""); }} className="text-[#00A1E4] hover:underline font-bold">Request Account Access</button>
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

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
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
              <span className="text-[10px] text-gray-500 font-mono block capitalize">{currentUser.role} Account</span>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 bg-[#1A2530] text-white hover:bg-black text-xs font-bold rounded shadow-sm transition">Sign Out</button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-r from-[#005596] to-[#00A1E4] text-white py-6 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100">Executed Audits</span>
            <div className="text-2xl sm:text-3xl font-black mt-1">{history.length}</div>
            <div className="text-[11px] text-blue-200 mt-1">Traceable sign-off operations</div>
          </div>
        </div>
      </section>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap border-b border-gray-200 mb-6 gap-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`mr-4 pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "dashboard" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>📊 Operations Dashboard</button>
          <button onClick={() => setActiveTab("assets")} className={`mr-4 pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "assets" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>🏭 Asset Directory ({assets.length})</button>
          <button onClick={() => setActiveTab("scheduler")} className={`mr-4 pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "scheduler" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>📋 PM Execution & Sign-Off</button>
          <button onClick={() => setActiveTab("reminders")} className={`mr-4 pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "reminders" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>📧 Email Dispatcher ({overdueCount + calibrationCount})</button>
          <button onClick={() => setActiveTab("manuals")} className={`mr-4 pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "manuals" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>📖 Equipment Manuals ({manualCount})</button>
          <button onClick={() => setActiveTab("templates")} className={`mr-4 pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "templates" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>⚙️ PM Task Configurations ({pmTemplates.length})</button>
          <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "history" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>📜 Audit Logs & History ({history.length})</button>
          {currentUser.role === "admin" && <button onClick={() => setActiveTab("approvals")} className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 px-1 ${activeTab === "approvals" ? "border-[#005596] text-[#005596]" : "border-transparent text-gray-500 hover:text-red-700 hover:border-gray-300"}`}>🔑 Account Approvals ({pendingApprovals.length})</button>}
        </div>

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
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto p-6 text-center text-gray-500 text-xs">
                    Select the Asset Directory or PM Execution tab to manage hardware protocols.
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h4 className="font-bold text-xs text-[#005596] uppercase tracking-wider mb-3">Technician Duty Board</h4>
                  <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#005596]/10 flex items-center justify-center font-bold text-[#005596] text-sm">SYS</div>
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
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Initial Status</label>
                    <select value={newAsset.status} onChange={(e) => setNewAsset({...newAsset, status: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                      <option value="Operational">Operational (Ready)</option>
                      <option value="Maintenance Due">Maintenance Due (Alert)</option>
                      <option value="Out of Calibration">Out of Calibration (Lockout)</option>
                      <option value="Corrective Maintenance">Corrective Maintenance (Down)</option>
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
                    <tr><th className="px-6 py-3.5">Asset Name</th><th className="px-6 py-3.5">Model / Serial No</th><th className="px-6 py-3.5">Category</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {assets.map((asset) => (
                      <tr key={asset.serial} className="hover:bg-gray-50/55 transition">
                        <td className="px-6 py-4"><span className="font-bold text-gray-900 block">{asset.name}</span></td>
                        <td className="px-6 py-4 font-mono"><span className="block text-gray-700">Mod: {asset.model}</span><span className="block text-[11px] text-gray-400">S/N: {asset.serial}</span></td>
                        <td className="px-6 py-4"><span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-[#005596] border inline-block">{asset.category}</span></td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${asset.status === "Operational" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{asset.status}</span></td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => deleteAsset(asset.id)} className="text-xs font-bold text-red-600 hover:text-red-800">Delete</button>
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
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">1. Select System Asset for Action</label>
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

        {activeTab === "reminders" && (
          <div className="p-8 bg-white border rounded-xl shadow-sm text-center">
            <h3 className="font-bold text-gray-700 text-sm">Email Dispatcher</h3>
            <p className="text-xs text-gray-500 mt-2">Use this tab to dispatch alerts for non-compliant equipment directly to specific technician accounts.</p>
          </div>
        )}

        {activeTab === "manuals" && (
          <div className="p-8 bg-white border rounded-xl shadow-sm text-center">
             <h3 className="font-bold text-gray-700 text-sm">Azure Blob Storage Gateway</h3>
             <p className="text-xs text-gray-500 mt-2">Connect PDF manuals and diagrams directly to equipment assets to support SOP execution.</p>
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
                    <button onClick={() => deleteTemplate(template.id)} className="text-red-600 hover:text-red-800 font-bold">Delete Standard</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-8 bg-white border rounded-xl shadow-sm text-center">
            <h3 className="font-bold text-gray-700 text-sm">System Audit Log</h3>
            <p className="text-xs text-gray-500 mt-2">Immutable ledger of all verified operations processed through the application.</p>
          </div>
        )}

        {activeTab === "approvals" && currentUser.role === "admin" && (
          <div className="p-8 bg-white border rounded-xl shadow-sm text-center">
            <h3 className="font-bold text-gray-700 text-sm">Access Control Roster</h3>
            <p className="text-xs text-gray-500 mt-2">Approve incoming security requests for internal network routing.</p>
          </div>
        )}

      </main>

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