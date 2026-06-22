import React, { useState, useRef, useEffect } from 'react';

// Custom Style Block to guarantee exact Verdana typography and corporate colors
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
  // Brand States
  const [companyLogo, setCompanyLogo] = useState(null);

  // User Management State
  const [users, setUsers] = useState([
    {
      name: "Chinh Ton",
      email: "cton@fcimg.com",
      password: "admin",
      role: "admin",
      approved: true
    }
  ]);

  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin"); // signin, register
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  
  // Data States (Synched with Cosmos DB via Managed API)
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]); // Keeps track of dispatched reminders

  // UI Interactive States
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [completedSteps, setCompletedSteps] = useState({});
  const [pmComments, setPmComments] = useState("");

  // New Asset Form
  const [newAsset, setNewAsset] = useState({
    name: "",
    model: "",
    serial: "",
    location: "",
    category: "",
    status: "Operational"
  });

  // New PM Template Form
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    interval: "Monthly",
    department: "",
    checklistInput: ""
  });

  // Manual Tab Form States
  const [manualAssetId, setManualAssetId] = useState("");
  const [manualFile, setManualFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [viewingManualAsset, setViewingManualAsset] = useState(null);

  // Custom Email Reminder Workspace States
  const [reminderAssetId, setReminderAssetId] = useState("");
  const [reminderRecipientEmail, setReminderRecipientEmail] = useState("");
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");

  const [validationError, setValidationError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); // default to Dashboard

  // Custom Modal State (strictly replacing window.alert and window.confirm for iframe compliance)
  const [customModal, setCustomModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "info", // info, confirm, success
    onConfirm: null
  });

  const fileInputRef = useRef(null);
  const authFileInputRef = useRef(null);
  const manualFileInputRef = useRef(null);

  // --- DYNAMIC AZURE COSMOS DB DATA SYNCHRONIZATION ---
  useEffect(() => {
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => setAssets(data || []))
      .catch(err => console.error("Error pulling assets:", err));

    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setPmTemplates(data || []))
      .catch(err => console.error("Error pulling templates:", err));

    fetch('/api/history')
      .then(res => res.json())
      .then(data => setHistory(data || []))
      .catch(err => console.error("Error pulling operations log history:", err));

    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setUsers(prev => {
            const externalUsers = data.filter(u => u.email !== "cton@fcimg.com");
            return [prev[0], ...externalUsers];
          });
        }
      })
      .catch(err => console.error("Error pulling user provisioning rosters:", err));
  }, []);

  // Custom Modal Action Handlers
  const triggerModal = (title, message, type = "info", onConfirm = null) => {
    setCustomModal({
      show: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  const closeModal = () => {
    setCustomModal({
      show: false,
      title: "",
      message: "",
      type: "info",
      onConfirm: null
    });
  };

  // Sign In Process
  const handleSignIn = (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and password fields are required.");
      return;
    }

    const matchedUser = users.find(
      u => u.email.toLowerCase() === authEmail.toLowerCase().trim()
    );

    if (!matchedUser || matchedUser.password !== authPassword) {
      setAuthError("Invalid corporate email or security password.");
      return;
    }

    if (!matchedUser.approved) {
      setAuthError("Your account registration is currently pending authorization from System Admin Chinh Ton.");
      return;
    }

    // Login Success
    setCurrentUser(matchedUser);
    setAuthEmail("");
    setAuthPassword("");
    setActiveTab("dashboard");
  };

  // Register Process
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!registerName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError("All registration fields are required.");
      return;
    }

    if (!authEmail.toLowerCase().endsWith("@fcimg.com")) {
      setAuthError("Registration blocked: Only verified @fcimg.com emails are authorized.");
      return;
    }

    const alreadyExists = users.some(
      u => u.email.toLowerCase() === authEmail.toLowerCase().trim()
    );

    if (alreadyExists) {
      setAuthError("An account with this email address already exists.");
      return;
    }

    const newUser = {
      name: registerName.trim(),
      email: authEmail.toLowerCase().trim(),
      password: authPassword,
      role: "technician",
      approved: false // Enforces Chinh Ton admin approval
    };

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (res.ok) {
      const savedUser = await res.json();
      setUsers([...users, savedUser]);
      setRegisterName("");
      setAuthEmail("");
      setAuthPassword("");
      setAuthSuccess("Account request submitted. Please ask Chinh Ton to authorize your account.");
      setAuthMode("signin");
    } else {
      setAuthError("Failed to communicate credential request block packet to Azure instance Cloud infrastructure.");
    }
  };

  // Logout Process
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("dashboard");
  };

  // Approve User Account Helper
  const handleApproveUser = async (email) => {
    const updatedUsers = users.map(u => u.email === email ? { ...u, approved: true } : u);
    setUsers(updatedUsers);

    const approvalLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
      assetId: "SYS-AUTH",
      assetName: "User Authentication Services",
      templateName: "User Access Provisioning",
      interval: "On-Demand",
      technician: "Chinh Ton (Admin)",
      email: "cton@fcimg.com",
      status: "Completed Pass",
      comments: `Admin approved corporate access token for user account: ${email}`
    };

    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvalLog)
    });

    if (res.ok) {
      const savedLog = await res.json();
      setHistory(prev => [savedLog, ...prev]);
      triggerModal("Account Approved", `Access granted successfully for ${email}.`, "success");
    }
  };

  // Deny / Reject User Account Helper
  const handleDenyUser = (email) => {
    triggerModal(
      "Confirm Action",
      `Are you sure you want to decline and remove the access request for ${email}?`,
      "confirm",
      () => {
        setUsers(prevUsers => prevUsers.filter(u => u.email !== email));
      }
    );
  };

  // Auto-fill PM form selection helpers and switch view tab
  const handleSelectAssetAndTemplate = (assetId, templateId) => {
    setSelectedAssetId(assetId);
    setSelectedTemplateId(templateId || "");
    setCompletedSteps({});
    setValidationError("");
    setActiveTab("scheduler");
  };

  // Auto-route to Email Tab with target asset prefilled
  const handleInitiateEmailReminder = (assetId) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;

    setReminderAssetId(assetId);
    const otherTech = users.find(u => u.email !== "cton@fcimg.com" && u.approved);
    setReminderRecipientEmail(otherTech ? otherTech.email : "");
    setReminderSubject(`[ACTION REQUIRED] Urgent SOP/PM Pending: ${targetAsset.name} (${targetAsset.serial})`);
    setReminderBody(`Dear Team Member,\n\nThis is Chinh Ton sending a reminder regarding ${targetAsset.name}.\n\nAccording to the FI-Operation Management System, this equipment currently has an active status of: [${targetAsset.status}]. Please log in to your account, review the linked equipment manual, and execute the standard sign-off checklists to update compliance metrics.\n\nS/N: ${targetAsset.serial}\nModel: ${targetAsset.model}\nLocation: ${targetAsset.location}\n\nBest regards,\n\nChinh Ton\nSystem Administrator\ncton@fcimg.com`);
    
    setActiveTab("reminders");
  };

  // Dispatch Email Notification Trigger
  const handleDispatchEmailReminder = async (e) => {
    e.preventDefault();
    if (!reminderAssetId || !reminderRecipientEmail.trim() || !reminderSubject.trim() || !reminderBody.trim()) {
      triggerModal("Input Error", "Please fill in all email reminder fields.", "info");
      return;
    }

    const targetAsset = assets.find(a => a.id === reminderAssetId);
    if (!targetAsset) return;

    const newMailLog = {
      id: `EML-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
      assetName: targetAsset.name,
      recipient: reminderRecipientEmail,
      subject: reminderSubject,
      body: reminderBody
    };

    setEmailLogs([newMailLog, ...emailLogs]);

    const systemLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
      assetId: targetAsset.id,
      assetName: targetAsset.name,
      templateName: "Email Reminder Dispatched",
      interval: "On-Demand",
      technician: currentUser ? currentUser.name : "Chinh Ton",
      email: currentUser ? currentUser.email : "cton@fcimg.com",
      status: "Completed Pass",
      comments: `Dispatched compliance warning email to ${reminderRecipientEmail} regarding ${targetAsset.status} state.`
    };

    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemLog)
    });

    if (res.ok) {
      const savedLog = await res.json();
      setHistory([savedLog, ...history]);

      const mailtoLink = `mailto:${encodeURIComponent(reminderRecipientEmail)}?subject=${encodeURIComponent(reminderSubject)}&body=${encodeURIComponent(reminderBody)}`;
      
      triggerModal(
        "Reminder Sent", 
        "Email reminder successfully logged inside OMS database! Click Confirm below if you would also like to launch your local device client (Outlook/Native Mail) to send the mail standard from cton@fcimg.com.", 
        "confirm",
        () => {
          window.location.href = mailtoLink;
        }
      );

      setReminderAssetId("");
      setReminderRecipientEmail("");
      setReminderSubject("");
      setReminderBody("");
    }
  };

  // Quick state update helper to return down equipment to service
  const handleReturnToService = async (assetId) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;

    const recoveryLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
      assetId: targetAsset.id,
      assetName: targetAsset.name,
      templateName: "Corrective Action Log-out Recovery",
      interval: "On-Demand",
      technician: currentUser ? currentUser.name : "Chinh Ton",
      email: currentUser ? currentUser.email : "cton@fcimg.com",
      status: "Completed Pass",
      comments: `Manual operational override. Equipment status updated from Corrective Maintenance to Operational.`
    };

    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recoveryLog)
    });

    if (res.ok) {
      const savedLog = await res.json();
      setHistory(prevHistory => [savedLog, ...prevHistory]);
      setAssets(prevAssets => 
        prevAssets.map(ast => ast.id === assetId ? { ...ast, status: "Operational" } : ast)
      );
    }
  };

  // Logo Importer File Handlers
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Manual File Reader
  const handleManualFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualFile({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + " KB",
          data: reader.result,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Attach manual handler
  const handleAttachManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualAssetId) {
      triggerModal("Field Required", "Please select a target asset from your registered directory.", "info");
      return;
    }
    if (!manualFile && !manualText.trim()) {
      triggerModal("Input Required", "Please attach a documentation file or draft a quick-reference procedure layout.", "info");
      return;
    }

    const targetAsset = assets.find(a => a.id === manualAssetId);
    if (!targetAsset) return;

    const attachmentPayload = {
      fileName: manualFile ? manualFile.name : "Quick_Manual_SOP.txt",
      fileSize: manualFile ? manualFile.size : `${(new Blob([manualText]).size / 1024).toFixed(1)} KB`,
      fileData: manualFile ? manualFile.data : `data:text/plain;base64,${btoa(unescape(encodeURIComponent(manualText)))}`,
      manualText: manualText || "Refer to the attached downloaded instruction file."
    };

    const logEntry = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
      assetId: targetAsset.id,
      assetName: targetAsset.name,
      templateName: "Operation Manual Attachment",
      interval: "On-Demand",
      technician: currentUser ? currentUser.name : "Chinh Ton",
      email: currentUser ? currentUser.email : "cton@fcimg.com",
      status: "Completed Pass",
      comments: `Successfully linked manual documentation standard [${attachmentPayload.fileName}] to device.`
    };

    const logRes = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    });

    if (logRes.ok) {
      const savedLog = await logRes.json();
      setHistory(prev => [savedLog, ...prev]);
      setAssets(prevAssets => 
        prevAssets.map(ast => ast.id === manualAssetId ? { ...ast, manual: attachmentPayload } : ast)
      );

      setManualAssetId("");
      setManualFile(null);
      setManualText("");
      if (manualFileInputRef.current) manualFileInputRef.current.value = "";
      triggerModal("Success", `Manual successfully attached to asset: ${targetAsset.name}`, "success");
    }
  };

  // Submit Completed PM Sign-off
  const handleSubmitPm = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!selectedAssetId) {
      setValidationError("Error: You must select an active asset from the directory.");
      return;
    }
    if (!selectedTemplateId) {
      setValidationError("Error: You must select an active SOP protocol.");
      return;
    }

    const selectedAsset = assets.find(a => a.id === selectedAssetId);
    const selectedTemplate = pmTemplates.find(t => t.id === selectedTemplateId);

    if (!selectedAsset || !selectedTemplate) {
      setValidationError("Error: Match error for Asset or SOP protocol identity indices.");
      return;
    }

    const totalSteps = selectedTemplate.checklist.length;
    const checkedStepsCount = Object.values(completedSteps).filter(Boolean).length;
    
    if (checkedStepsCount < totalSteps) {
      triggerModal(
        "Confirm Action",
        `Warning: Only ${checkedStepsCount}/${totalSteps} checklist items are marked as done. Sign-off on an incomplete checklist?`,
        "confirm",
        () => {
          executeChecklistSubmission(selectedAsset, selectedTemplate, "Incomplete Log");
        }
      );
    } else {
      executeChecklistSubmission(selectedAsset, selectedTemplate, "Completed Pass");
    }
  };

  // Sub-routine PM executor
  const executeChecklistSubmission = async (selectedAsset, selectedTemplate, statusState) => {
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      templateName: selectedTemplate.name,
      interval: selectedTemplate.interval,
      technician: currentUser.name,
      email: currentUser.email,
      status: statusState,
      comments: pmComments || "No special operating comments provided during verification."
    };

    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    });

    if (res.ok) {
      const savedLog = await res.json();
      setHistory([savedLog, ...history]);
      setAssets(assets.map(ast => ast.id === selectedAsset.id ? { ...ast, status: statusState === "Completed Pass" ? "Operational" : "Under Service Review" } : ast));

      setCompletedSteps({});
      setPmComments("");
      setSelectedAssetId("");
      setSelectedTemplateId("");
      triggerModal("SOP Signature Logged", "Preventative maintenance log recorded successfully.", "success");
      setActiveTab("dashboard");
    }
  };

  // Add Asset Submission
  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.serial) {
      triggerModal("Error", "Asset name and Serial Number are strictly required.", "info");
      return;
    }

    const created = {
      id: `FI-${Date.now().toString().slice(-3)}`,
      ...newAsset,
      category: newAsset.category.trim() || "Uncategorized",
      manual: null
    };

    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created)
    });

    if (res.ok) {
      const savedAsset = await res.json();
      setAssets([...assets, savedAsset]);
      setNewAsset({ name: "", model: "", serial: "", location: "", category: "", status: "Operational" });
      triggerModal("Asset Added", "New equipment hardware standard profile integrated.", "success");
      setActiveTab("dashboard");
    }
  };

  // Add PM Template Submission
  const handleAddTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.checklistInput) {
      triggerModal("Error", "Template title and Checklist lines are strictly required.", "info");
      return;
    }

    const items = newTemplate.checklistInput
      .split("\n")
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const created = {
      id: `PMT-${Date.now().toString().slice(-3)}`,
      name: newTemplate.name,
      interval: newTemplate.interval,
      department: newTemplate.department.trim() || "General",
      checklist: items
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
      triggerModal("SOP Initialized", "New SOP preventative standard configuration template integrated.", "success");
      setActiveTab("dashboard");
    }
  };

  // Delete helpers with Custom Modal triggers
  const deleteAsset = (id) => {
    triggerModal(
      "Confirm Removal",
      "Confirm removal of this asset from the OMS database?",
      "confirm",
      () => {
        setAssets(assets.filter(a => a.id !== id));
        if (manualAssetId === id) setManualAssetId("");
      }
    );
  };

  const deleteTemplate = (id) => {
    triggerModal(
      "Confirm Deletion",
      "Confirm deletion of this standard protocol template configuration?",
      "confirm",
      () => {
        setPmTemplates(pmTemplates.filter(t => t.id !== id));
      }
    );
  };

  // Calculated Metrics
  const operationalCount = assets.filter(a => a.status === "Operational").length;
  const overdueCount = assets.filter(a => a.status === "Maintenance Due").length;
  const calibrationCount = assets.filter(a => a.status === "Out of Calibration").length;
  const correctiveCount = assets.filter(a => a.status === "Corrective Maintenance").length;
  const manualCount = assets.filter(a => a.manual).length;

  const complianceRate = (() => {
    if (assets.length === 0) return 100;
    const nonCompliant = overdueCount + calibrationCount + correctiveCount;
    return Math.round(((assets.length - nonCompliant) / assets.length) * 100);
  })();

  const pendingApprovals = users.filter(u => !u.approved);

  // GUEST LOGIN SCREEN ROUTER
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center px-4 py-12 antialiased">
        <style>{customStyles}</style>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-[#005596] px-8 py-8 text-center text-white relative">
            <div className="mb-4 flex justify-center">
              {companyLogo ? (
                <div className="relative inline-block group">
                  <img src={companyLogo} alt="Imported Brand Logo" className="h-12 w-auto max-w-[220px] object-contain rounded bg-white p-1" />
                  <button onClick={() => setCompanyLogo(null)} className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</button>
                </div>
              ) : (
                <div onClick={() => authFileInputRef.current.click()} className="border-2 border-dashed border-white/30 hover:border-white/60 hover:bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center h-14 w-48 transition cursor-pointer">
                  <span className="text-[9px] uppercase font-bold tracking-wider">Company Logo Spot</span>
                  <span className="text-[8px] underline text-blue-200">Import image file</span>
                </div>
              )}
              <input type="file" ref={authFileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
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
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="name@fcimg.com" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Security Password</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" />
                </div>
                <button type="submit" className="w-full bg-[#005596] hover:bg-[#005596]/95 text-white py-3 rounded text-xs font-bold uppercase tracking-wider transition shadow-sm font-sans">Authorized Sign In</button>
                <p className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
                  New technician? <button type="button" onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccess(""); }} className="text-[#00A1E4] hover:underline font-bold">Request Account Access</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name / Initials</label>
                  <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Chinh Ton" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Corporate Email Address (@fcimg.com)</label>
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="user@fcimg.com" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Choose Security Password</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" />
                </div>
                <button type="submit" className="w-full bg-[#00A1E4] hover:bg-[#00A1E4]/95 text-white py-3 rounded text-xs font-bold uppercase tracking-wider transition shadow-sm font-sans">Submit Access Request</button>
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

  // CORE SYSTEMS MASTER WORKSPACE VIEW LAYOUT
  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col antialiased">
      <style>{customStyles}</style>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 flex items-center">
              {companyLogo ? (
                <div className="relative group">
                  <img src={companyLogo} alt="Imported Company Logo" className="h-12 w-auto max-w-[200px] object-contain rounded border border-gray-100" />
                  <button onClick={() => setCompanyLogo(null)} className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Logo">×</button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center justify-center bg-[#F4F6F8] h-14 w-44 hover:bg-gray-50 transition cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">Import Logo Needed</span>
                  <span className="text-[9px] text-[#00A1E4] underline font-semibold">Click to upload png/jpg</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
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

            {(assets.length > 0 || pmTemplates.length > 0 || history.length > 0) && (
              <button
                onClick={() => {
                  triggerModal(
                    "Confirm Reset View",
                    "This will clear the current local UI view tables. Your persistent operational data remains completely secure in your serverless Azure Cosmos DB containers.",
                    "confirm",
                    () => {
                      setAssets([]);
                      setPmTemplates([]);
                      setHistory([]);
                    }
                  );
                }}
                className="px-3 py-1.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-semibold rounded inline-flex items-center space-x-1 transition"
                title="Reset session view containers"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Reset View</span>
              </button>
            )}
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
            {assets.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-gray-700 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-bold text-amber-800 text-sm mb-1">📋 System Directory Ready</h4>
                  <p className="text-xs text-amber-700">Your Operation Management System is currently empty. To see live status updates, begin by adding assets and task protocols.</p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-2">
                  <button onClick={() => setActiveTab("assets")} className="bg-[#005596] hover:bg-[#005596]/95 text-white px-4 py-2 rounded text-xs font-bold uppercase transition">+ Register Asset</button>
                  <button onClick={() => setActiveTab("templates")} className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded text-xs font-bold uppercase transition">+ Configure SOP</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Operational Health</span><div className="text-3xl font-black mt-2 text-green-600">{operationalCount}</div></div>
                <div className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-2 flex justify-between"><span>In Service</span><span className="font-semibold text-green-600">{assets.length > 0 ? Math.round((operationalCount/assets.length)*100) : 100}%</span></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Overdue Maintenance</span><div className="text-3xl font-black mt-2 text-yellow-600">{overdueCount}</div></div>
                <div className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-2 flex justify-between"><span>Action Needed</span><span className="font-semibold text-yellow-600">SOP Required</span></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Out Of Calibration</span><div className="text-3xl font-black mt-2 text-red-600">{calibrationCount}</div></div>
                <div className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-2 flex justify-between"><span>Locked Out</span><span className="font-semibold text-red-600">Critical Check</span></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                <div><span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Corrective Action</span><div className="text-3xl font-black mt-2 text-orange-600">{correctiveCount}</div></div>
                <div className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-2 flex justify-between"><span>Down / Off-line</span><span className="font-semibold text-orange-600">Under Repair</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-[#005596] text-white px-5 py-4 flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider">SOP & Maintenance Actions Queue</h3>
                    <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded">Action Urgency</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {assets.filter(a => a.status === "Maintenance Due" || a.status === "Out of Calibration").length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs">No equipment registered as overdue or out-of-calibration. Excellent compliance!</div>
                    ) : (
                      assets.filter(a => a.status === "Maintenance Due" || a.status === "Out of Calibration").map(asset => {
                        const recommendedSop = pmTemplates[0] || null;
                        return (
                          <div key={asset.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${asset.status === "Out of Calibration" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"}`}>{asset.status}</span>
                              <h4 className="font-bold text-sm text-gray-900 mt-1.5 leading-tight">{asset.name}</h4>
                              <p className="text-xs text-gray-500 mt-1 font-mono">S/N: {asset.serial} • Model: {asset.model} • Location: {asset.location}</p>
                            </div>
                            <div className="flex-shrink-0 flex items-center space-x-2">
                              <button onClick={() => handleInitiateEmailReminder(asset.id)} className="bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] font-bold uppercase py-2 px-3 rounded shadow-sm transition inline-flex items-center space-x-1"><span>📧 Remind Tech</span></button>
                              <button onClick={() => handleSelectAssetAndTemplate(asset.id, recommendedSop?.id || "")} className="bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white text-[11px] font-bold uppercase py-2 px-3.5 rounded shadow-sm transition">Launch SOP &rarr;</button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-[#1A2530] text-white px-5 py-4"><h3 className="font-bold text-xs uppercase tracking-wider">Equipment Health Directory Overview</h3></div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr><th className="px-5 py-3">Equipment</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {assets.length === 0 ? (
                          <tr><td colSpan="4" className="px-5 py-8 text-center text-gray-400 text-xs">Register equipment in the directory to begin tracking health.</td></tr>
                        ) : (
                          assets.map(asset => (
                            <tr key={asset.id} className="hover:bg-gray-50/55">
                              <td className="px-5 py-3 font-semibold text-gray-900">{asset.name}<span className="block text-[10px] text-gray-400 font-mono mt-0.5">S/N: {asset.serial}</span></td>
                              <td className="px-5 py-3 text-gray-600 capitalize">{asset.category}</td>
                              <td className="px-5 py-3 text-gray-500">{asset.location}</td>
                              <td className="px-5 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${asset.status === 'Operational' ? 'bg-green-100 text-green-800' : asset.status === 'Maintenance Due' ? 'bg-yellow-100 text-yellow-800' : asset.status === 'Out of Calibration' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>{asset.status}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-orange-600 text-white px-5 py-4 flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider">Corrective Maintenance Logouts</h3>
                    <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded">Action Required</span>
                  </div>
                  <div className="p-4 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {assets.filter(a => a.status === "Corrective Maintenance").length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs">No equipment flagged as Down under corrective maintenance actions currently.</div>
                    ) : (
                      assets.filter(a => a.status === "Corrective Maintenance").map(asset => {
                        const suggestedSop = pmTemplates[0] || null;
                        return (
                          <div key={asset.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                            <div>
                              <h4 className="font-bold text-sm text-gray-900 leading-tight">{asset.name}</h4>
                              <p className="text-[11px] text-gray-500 font-mono mt-1">S/N: {asset.serial} • Model: {asset.model}</p>
                              <p className="text-[11px] text-[#005596] font-semibold mt-1">📍 Location: {asset.location}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleReturnToService(asset.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold uppercase py-2 px-3 rounded shadow-sm transition">Return to Service</button>
                              <button onClick={() => handleSelectAssetAndTemplate(asset.id, suggestedSop?.id || "")} className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-[11px] font-bold uppercase py-2 px-3 rounded shadow-sm transition text-center">SOP Sign-Off</button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h4 className="font-bold text-xs text-[#005596] uppercase tracking-wider mb-3">Technician Duty Board</h4>
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#005596]/10 flex items-center justify-center font-bold text-[#005596] text-sm">CT</div>
                      <div>
                        <span className="block text-xs font-bold text-gray-900 font-sans">Chinh Ton</span>
                        <span className="text-[10px] text-gray-500 font-mono">cton@fcimg.com</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-600 leading-relaxed bg-[#F4F6F8] p-3 rounded">Standard operating procedures require validated corporate email credentials to commit any state changes.</div>
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
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Equipment Name</label><input type="text" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. sCMOS Vacuum Calibration Chamber" className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Model Identifier</label><input type="text" value={newAsset.model} onChange={(e) => setNewAsset({...newAsset, model: e.target.value})} placeholder="e.g. VCC-2020-X" className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number</label><input type="text" value={newAsset.serial} onChange={(e) => setNewAsset({...newAsset, serial: e.target.value})} placeholder="e.g. FC-90812-C" className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location / Bay</label><input type="text" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g. Cleanroom Bay 3" className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Type</label><input type="text" value={newAsset.category} onChange={(e) => setNewAsset({...newAsset, category: e.target.value})} placeholder="e.g. Vacuum Chamber" className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-blue-500 p-2.5 border bg-white" /></div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Initial Status</label>
                    <select value={newAsset.status} onChange={(e) => setNewAsset({...newAsset, status: e.target.value})} className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 bg-white border cursor-pointer">
                      <option value="Operational">Operational (Ready)</option>
                      <option value="Maintenance Due">Maintenance Due (Alert)</option>
                      <option value="Out of Calibration">Out of Calibration (Lockout)</option>
                      <option value="Corrective Maintenance">Corrective Maintenance (Down)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end"><button type="submit" className="bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all">Commit Asset to Inventory</button></div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between"><h3 className="font-bold text-sm tracking-wide uppercase">Hardware System Directory</h3><span className="text-xs text-gray-400 font-semibold">{assets.length} Assets Registered</span></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <tr><th className="px-6 py-3.5">Asset Name</th><th className="px-6 py-3.5">Model / Serial No</th><th className="px-6 py-3.5">Category</th><th className="px-6 py-3.5">Location</th><th className="px-6 py-3.5">Manual</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {assets.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400 text-xs">No assets currently documented in the system database.</td></tr>
                    ) : (
                      assets.map((asset) => (
                        <tr key={asset.serial} className="hover:bg-gray-50/55 transition">
                          <td className="px-6 py-4"><span className="font-bold text-gray-900 block">{asset.name}</span></td>
                          <td className="px-6 py-4 font-mono"><span className="block text-gray-700">Mod: {asset.model || "N/A"}</span><span className="block text-[11px] text-gray-400">S/N: {asset.serial}</span></td>
                          <td className="px-6 py-4"><span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-[#005596] border border-blue-100/40 inline-block capitalize">{asset.category || "General"}</span></td>
                          <td className="px-6 py-4 text-gray-600 font-medium">📍 {asset.location}</td>
                          <td className="px-6 py-4">
                            {asset.manual ? (
                              <div className="flex flex-col space-y-1">
                                <a href={asset.manual.fileData} download={asset.manual.fileName} className="text-[#00A1E4] hover:underline font-bold text-[11px]">📥 Download</a>
                                <button onClick={() => { setViewingManualAsset(asset); setActiveTab("manuals"); }} className="text-[#005596] hover:underline font-medium text-[10px] text-left">👁️ View Guidelines</button>
                              </div>
                            ) : (
                              <button onClick={() => { setManualAssetId(asset.id); setActiveTab("manuals"); }} className="text-gray-400 hover:text-[#005596] hover:underline font-semibold text-[11px]">+ Attach Manual</button>
                            )}
                          </td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${asset.status === "Operational" ? "bg-green-100 text-green-800" : asset.status === "Maintenance Due" ? "bg-yellow-100 text-yellow-800" : asset.status === "Out of Calibration" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}`}>{asset.status}</span></td>
                          <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => handleSelectAssetAndTemplate(asset.id, "")} className="text-xs font-bold text-[#005596] hover:text-[#00A1E4] hover:underline">Run PM</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => handleInitiateEmailReminder(asset.id)} className="text-xs font-bold text-yellow-600 hover:text-yellow-700">Remind</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => deleteAsset(asset.id)} className="text-xs font-bold text-red-600 hover:text-red-800">Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
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
                <span className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded">Validation Required</span>
              </div>
              {validationError && <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-6"><p className="text-xs font-bold text-red-800">{validationError}</p></div>}
              
              <form onSubmit={handleSubmitPm} className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">1. Select System Asset for Action</label>
                  <select value={selectedAssetId} onChange={(e) => handleSelectAssetAndTemplate(e.target.value, selectedTemplateId)} className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 bg-white border cursor-pointer">
                    <option value="">-- Choose Hardware System from Directory --</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} (SN: {a.serial}) — Status: {a.status}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">2. Select SOP Protocol</label>
                  <select value={selectedTemplateId} onChange={(e) => { setSelectedTemplateId(e.target.value); setCompletedSteps({}); }} className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 bg-white border cursor-pointer">
                    <option value="">-- Choose Protocol Template to Execute --</option>
                    {pmTemplates.map(t => <option key={t.id} value={t.id}>[{t.interval}] {t.name} (By: {t.department})</option>)}
                  </select>
                </div>

                {selectedTemplateId && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
                      <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wide">3. Mandatory Task Checklist Steps</h4>
                      <span className="text-[11px] text-gray-500 font-semibold">Interval: {pmTemplates.find(t => t.id === selectedTemplateId)?.interval}</span>
                    </div>
                    <div className="space-y-3.5">
                      {pmTemplates.find(t => t.id === selectedTemplateId)?.checklist.map((step, idx) => (
                        <label key={idx} className={`flex items-start p-2 rounded cursor-pointer transition ${completedSteps[idx] ? "bg-green-50/50" : "hover:bg-gray-100"}`}>
                          <input type="checkbox" checked={!!completedSteps[idx]} onChange={(e) => setCompletedSteps({ ...completedSteps, [idx]: e.target.checked })} className="h-4.5 w-4.5 text-[#005596] border-gray-300 rounded cursor-pointer mt-0.5" />
                          <span className="ml-3 text-xs text-gray-700 font-medium">{step}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Technician Signature</label><span className="text-xs font-bold text-gray-800 block p-2 bg-white border rounded">{currentUser.name}</span></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Corporate Email</label><span className="text-xs font-mono text-gray-600 block p-2 bg-white border rounded">{currentUser.email}</span></div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">System Observations & Test Notes</label>
                  <textarea value={pmComments} onChange={(e) => setPmComments(e.target.value)} rows="3" placeholder="Write precise diagnostic readouts..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white"></textarea>
                </div>
                <div><button type="submit" className="w-full bg-[#005596] hover:bg-[#005596]/95 text-white py-3 px-4 rounded text-xs font-bold uppercase tracking-widest shadow-sm transition-all">Authenticate and Commit Maintenance Action</button></div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "reminders" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-5 py-4"><h3 className="font-bold text-xs uppercase tracking-wider">Configure Overdue Email Dispatch</h3></div>
                <form onSubmit={handleDispatchEmailReminder} className="p-5 space-y-5">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">1. Authorized Sender Account</label><input type="text" disabled value="Chinh Ton <cton@fcimg.com>" className="w-full text-xs rounded border-gray-200 bg-gray-100 p-2.5 text-gray-500 font-semibold" /></div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">2. Target Non-Compliant Asset</label>
                    <select value={reminderAssetId} onChange={(e) => handleInitiateEmailReminder(e.target.value)} className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 bg-white border cursor-pointer" required>
                      <option value="">-- Choose Overdue Asset --</option>
                      {assets.filter(a => a.status !== "Operational").map(a => <option key={a.id} value={a.id}>[{a.status}] {a.name} — S/N: {a.serial}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">3. Recipient Technician</label>
                    <select value={reminderRecipientEmail} onChange={(e) => setReminderRecipientEmail(e.target.value)} className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 bg-white border cursor-pointer" required>
                      <option value="">-- Select Approved Technician --</option>
                      {users.filter(u => u.approved).map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">4. Email Reminder Subject</label><input type="text" value={reminderSubject} onChange={(e) => setReminderSubject(e.target.value)} placeholder="Input header subject" required className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">5. Email Body Content</label><textarea value={reminderBody} onChange={(e) => setReminderBody(e.target.value)} rows="7" required className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea></div>
                  <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded text-xs font-bold uppercase tracking-wider transition-all">Send Simulated Email & Logs</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1A2530] text-white px-5 py-4"><h3 className="font-bold text-xs uppercase tracking-wider">Non-Compliant Equipment Requiring Dispatch</h3></div>
                <div className="divide-y divide-gray-100">
                  {assets.filter(a => a.status !== "Operational").length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">🎉 All hardware tools comply with continuous system tolerances.</div>
                  ) : (
                    assets.filter(a => a.status !== "Operational").map(asset => (
                      <div key={asset.serial} className="p-4 flex items-center justify-between">
                        <div><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 uppercase">{asset.status}</span><h4 className="font-bold text-xs text-gray-800 mt-1">{asset.name}</h4></div>
                        <button onClick={() => handleInitiateEmailReminder(asset.id)} className="bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white text-[11px] font-bold uppercase py-1.5 px-3 rounded shadow-sm">Draft Mail</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 text-gray-700 px-5 py-3 border-b border-gray-200"><span className="font-bold text-xs uppercase tracking-wider">Simulated Outbox Log Ledger</span></div>
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {emailLogs.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">No emails dispatched during this operating session.</div>
                  ) : (
                    emailLogs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-gray-50/50 transition space-y-2">
                        <div className="flex justify-between items-center"><span className="text-[10px] text-gray-400 font-mono">{log.timestamp}</span><span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded">{log.id}</span></div>
                        <div className="text-xs text-gray-700"><span className="text-gray-400">To:</span> <strong>{log.recipient}</strong></div>
                        <div className="bg-gray-50 p-2.5 rounded border text-[10px] font-mono whitespace-pre-wrap">{log.body}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "manuals" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-5 py-4"><h3 className="font-bold text-xs uppercase tracking-wider">Attach Documentation Manual</h3></div>
                <form onSubmit={handleAttachManualSubmit} className="p-5 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Equipment Asset</label>
                    <select value={manualAssetId} onChange={(e) => setManualAssetId(e.target.value)} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer" required>
                      <option value="">-- Choose Asset from Directory --</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
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
                  <button type="submit" className="w-full bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white py-2.5 rounded text-xs font-bold uppercase transition-all">Attach Manual to Asset</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex flex-col justify-between">
                <div>
                  <div className="bg-[#1A2530] text-white px-5 py-4 flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider">Embedded Manual / SOP Guidelines Reader</h3>
                  </div>
                  {viewingManualAsset && viewingManualAsset.manual ? (
                    <div className="p-6 space-y-5">
                      <div className="border-b border-gray-100 pb-3 flex justify-between items-start">
                        <div><h4 className="font-bold text-base text-[#005596]">{viewingManualAsset.name}</h4><span className="text-xs text-gray-500 block font-mono">SN: {viewingManualAsset.serial}</span></div>
                        <a href={viewingManualAsset.manual.fileData} download={viewingManualAsset.manual.fileName} className="bg-[#005596] hover:bg-[#005596]/95 text-white text-xs font-bold uppercase py-2 px-4 rounded shadow transition">📥 Download File</a>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono whitespace-pre-wrap">{viewingManualAsset.manual.manualText}</div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-gray-400"><span className="text-3xl block mb-2">📖</span><p className="text-xs">Select a device template manual to inspect blueprint layouts.</p></div>
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
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Checklist Title</label><input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Annual Precision ISO Air Filtration Check" className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 border bg-white" /></div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Interval Frequency</label>
                    <select value={newTemplate.interval} onChange={(e) => setNewTemplate({...newTemplate, interval: e.target.value})} className="w-full text-xs rounded border-gray-300 shadow-sm focus:border-[#005596] p-2.5 bg-white border cursor-pointer">
                      <option value="Weekly">Weekly Cycle</option><option value="Monthly">Monthly Cycle</option><option value="Quarterly">Quarterly Cycle</option><option value="Semi-Annually">Semi-Annually Cycle</option><option value="Annually">Annually Cycle</option>
                    </select>
                  </div>
                  <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assigned Responsible Department</label><input type="text" value={newTemplate.department} onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})} placeholder="e.g. Cleanroom Operations" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" /></div>
                  <div className="md:col-span-3"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Checklist Actions (One per line)</label><textarea value={newTemplate.checklistInput} onChange={(e) => setNewTemplate({...newTemplate, checklistInput: e.target.value})} rows="4" placeholder="Verify seal safety configurations..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea></div>
                </div>
                <div className="mt-6 flex justify-end"><button type="submit" className="bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all">Generate Protocol Template</button></div>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between"><h3 className="font-bold text-sm tracking-wide uppercase">Traceable Activity Logs & History Records</h3><span className="text-xs text-gray-400 font-semibold">{history.length} operations on file</span></div>
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
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === "Completed Pass" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{log.status}</span></td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs break-words">{log.comments}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "approvals" && currentUser.role === "admin" && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">🔑 Pending Account Approvals</h3></div>
              <div className="p-6">
                <p className="text-xs text-gray-600 leading-relaxed mb-6">Review access tokens for verification operations.</p>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {pendingApprovals.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs font-sans">🎉 No pending registration requests found. All user accounts are current.</div>
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
                  <button onClick={() => { customModal.onConfirm(); setCustomModal({ show: false }); }} className="bg-[#005596] hover:bg-[#005596]/95 text-white text-[11px] font-bold uppercase px-3 py-1.5 rounded transition">Confirm Action</button>
                  <button onClick={closeModal} className="border border-gray-300 bg-white text-gray-700 text-[11px] font-bold uppercase px-3 py-1.5 rounded hover:bg-gray-50 transition">Cancel</button>
                </>
              ) : (
                <button onClick={closeModal} className="bg-[#005596] hover:bg-[#005596]/95 text-white text-[11px] font-bold uppercase px-4 py-1.5 rounded transition">OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}