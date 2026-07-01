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

  /* NEW ANIMATIONS FOR SIGN-IN PAGE */
  @keyframes movingGradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  .animated-gradient-bg {
    /* Fairchild Corporate Palette: Navy, Charcoal, Deep Blue, Cyan */
    background: linear-gradient(-45deg, #005596, #1A2530, #003058, #00A1E4);
    background-size: 400% 400%;
    animation: movingGradient 15s ease infinite;
  }
  
  @keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  .animate-entrance {
    animation: slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

const PM_CYCLE_OPTIONS = ["Weekly", "Monthly", "Quarterly", "Semi-Annually", "Annually", "Calibration (Semi-Annual)", "Calibration (Annual)"];

export default function App() {
  const [users, setUsers] = useState([
    {
      id: "USER-ADMIN",
      name: "System Administrator",
      email: "admin@fcimg.com",
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
  
  // ANTI-SPAM LOCK STATES
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isAttachingManual, setIsAttachingManual] = useState(false);
  const [isSubmittingPm, setIsSubmittingPm] = useState(false);
  const [isSubmittingWo, setIsSubmittingWo] = useState(false);
  
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  // PM EXECUTION MODAL STATES
  const [showPmModal, setShowPmModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [completedSteps, setCompletedSteps] = useState({});
  const [pmComments, setPmComments] = useState("");

  const [newAsset, setNewAsset] = useState({
    name: "", model: "", serial: "", location: "", category: "", pmFrequencies: []
  });

  const [newTemplate, setNewTemplate] = useState({
    name: "", interval: "Monthly", department: "", targetCategory: "Global", checklistInput: ""
  });

  const [newWo, setNewWo] = useState({
    title: "", description: "", assetId: "", assignedTo: "", priority: "Medium"
  });

  const [manualAssetIds, setManualAssetIds] = useState([]);
  const [manualFile, setManualFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [viewingManualAsset, setViewingManualAsset] = useState(null);
  const [activeManualIndex, setActiveManualIndex] = useState(0);

  const [validationError, setValidationError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const [historySearch, setHistorySearch] = useState("");

  const [customModal, setCustomModal] = useState({
    show: false, title: "", message: "", type: "info", onConfirm: null
  });

  // REAL-TIME CLOCK STATE
  const [currentTime, setCurrentTime] = useState(new Date());

  // NAVIGATION FLOW STATE
  const [navOrder, setNavOrder] = useState(() => {
    const saved = localStorage.getItem('fi_nav_order');
    if (saved) {
      let parsed = JSON.parse(saved);
      // Inject work orders into legacy saved layouts
      if (!parsed.includes('workOrders')) {
        parsed.splice(1, 0, 'workOrders');
        localStorage.setItem('fi_nav_order', JSON.stringify(parsed));
      }
      return parsed;
    }
    return ['dashboard', 'workOrders', 'assets', 'manuals', 'templates', 'history'];
  });
  const [isEditingNav, setIsEditingNav] = useState(false);

  const manualFileInputRef = useRef(null);

  const isSystemAdmin = currentUser?.role === "System Admin" || currentUser?.role === "admin";

  const calculateDaysRemaining = (lastDateStr, frequency) => {
    if (!lastDateStr || frequency === "None" || !frequency) return null;
    const lastDate = new Date(lastDateStr);
    const now = new Date();

    if (frequency === "Weekly") {
      const nextMonday = new Date(lastDate);
      const day = nextMonday.getDay();
      const diff = day === 0 ? 1 : 8 - day;
      nextMonday.setDate(nextMonday.getDate() + diff);
      nextMonday.setHours(0, 0, 0, 0);

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return Math.ceil((nextMonday - today) / (1000 * 60 * 60 * 24));
    }

    const daysPassed = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    let cycleDays = 0;
    
    switch(frequency) {
      case "Monthly": cycleDays = 30; break;
      case "Quarterly": cycleDays = 90; break;
      case "Semi-Annually":
      case "Calibration (Semi-Annual)": cycleDays = 182; break;
      case "Annually":
      case "Calibration (Annual)": cycleDays = 365; break;
      default: return null;
    }
    return cycleDays - daysPassed;
  };

// NEW: Navigation wrapper to sync with browser history
  const changeTab = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    fetch('/api/assets').then(res => res.json()).then(data => {
      if (!data) return;
      
      const evaluatedData = data.map(asset => {
        if (asset.status === "Corrective Maintenance") return asset; 
        
        let hasOverdueCalibration = false;
        let hasDueMaint = false;
        const freqs = asset.pmFrequencies && asset.pmFrequencies.length > 0 ? asset.pmFrequencies : (asset.pmFrequency && asset.pmFrequency !== "None" ? [asset.pmFrequency] : []);
        
        freqs.forEach(freq => {
          const lastDate = asset.pmDates?.[freq] || asset.lastPmDate;
          const daysLeft = calculateDaysRemaining(lastDate, freq);
          const threshold = freq === "Weekly" ? 0 : 7;
          if (daysLeft !== null && daysLeft < 0 && freq.includes("Calibration")) hasOverdueCalibration = true;
          else if (daysLeft !== null && daysLeft <= threshold) hasDueMaint = true;
        });
        
        let computedStatus = "Operational";
        if (hasOverdueCalibration) computedStatus = "Out of Calibration";
        else if (hasDueMaint) computedStatus = "Maintenance Due";

        if (asset.status !== computedStatus) {
          const updated = { ...asset, status: computedStatus };
          fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(()=>console.log("Silent DB Sync Failed"));
          return updated;
        }
        return asset;
      });
      
      // NEW: Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      // Grab the word after the '#' in the URL
      const hash = window.location.hash.replace('#', '');
      
      // If it's a valid tab, switch to it. Otherwise default to dashboard.
      const validTabs = ['dashboard', 'workOrders', 'assets', 'manuals', 'templates', 'history', 'approvals'];
      
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else if (currentUser) {
        setActiveTab('dashboard');
        window.location.hash = 'dashboard';
      }
    };

    window.addEventListener('hashchange', handlePopState);
    return () => window.removeEventListener('hashchange', handlePopState);
  }, [currentUser]);

      setAssets(evaluatedData);
    }).catch(err => console.error("Error pulling assets:", err));

    fetch('/api/templates').then(res => res.json()).then(data => setPmTemplates(data || [])).catch(err => console.error("Error pulling templates:", err));
    fetch('/api/history').then(res => res.json()).then(data => setHistory(data || [])).catch(err => console.error("Error pulling history:", err));
    fetch('/api/workorders').then(res => res.json()).then(data => setWorkOrders(data || [])).catch(err => console.error("Error pulling work orders:", err));
    
    fetch('/api/users').then(res => res.json()).then(data => {
        if (data && data.length > 0) {
          setUsers(prev => {
            const externalUsers = data.filter(u => u.email !== "admin@fcimg.com");
            return [prev[0], ...externalUsers];
          });
        }
      }).catch(err => console.error("Error pulling users:", err));

    return () => clearInterval(timer);
  }, []);

  const triggerModal = (title, message, type = "info", onConfirm = null) => {
    setCustomModal({ show: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setCustomModal({ show: false, title: "", message: "", type: "info", onConfirm: null });
  };

  const moveNav = (index, direction) => {
    const newOrder = [...navOrder];
    if (direction === -1 && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 1 && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setNavOrder(newOrder);
    localStorage.setItem('fi_nav_order', JSON.stringify(newOrder));
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(""); setAuthSuccess("");
    
    try {
      if (!authEmail.trim() || !authPassword.trim()) { setAuthError("Username/Email and password fields are required."); return; }
      
      const matchedUser = users.find(u => u.email.toLowerCase() === authEmail.toLowerCase().trim());
      
      if (!matchedUser || matchedUser.password !== authPassword) { setAuthError("Invalid credentials."); return; }
      if (!matchedUser.approved) { setAuthError("Your account registration is currently pending authorization from the System Admin."); return; }
      
      localStorage.setItem('fi_oms_session', JSON.stringify(matchedUser));
      
      setCurrentUser(matchedUser); 
      setAuthEmail(""); 
      setAuthPassword(""); 
      setActiveTab("dashboard");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isRegistering) return;
    
    setAuthError(""); setAuthSuccess("");
    if (!registerName.trim() || !authEmail.trim() || !authPassword.trim()) { setAuthError("All registration fields are required."); return; }
    if (!authEmail.toLowerCase().endsWith("@fcimg.com")) { setAuthError("Registration blocked: Only verified @fcimg.com emails are authorized."); return; }
    
    const alreadyExists = users.some(u => u.email.toLowerCase() === authEmail.toLowerCase().trim());
    if (alreadyExists) { setAuthError("An account with this email address already exists."); return; }

    setIsRegistering(true);

    const newUser = { 
      id: `USER-${Date.now().toString().slice(-4)}`, 
      name: registerName.trim(), 
      email: authEmail.toLowerCase().trim(), 
      password: authPassword, 
      role: "Operator", 
      approved: false 
    };

    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });

      if (res.ok) {
        const savedUser = await res.json();
        setUsers([...users, savedUser]); setRegisterName(""); setAuthEmail(""); setAuthPassword("");
        setAuthSuccess("Account request submitted. Please ask the System Admin to authorize your account."); setAuthMode("signin");

        try {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: 'cton@fcimg.com',
              subject: 'Action Required: New Account Request - FI Operations System',
              body: `System Admin,\n\nA new user has submitted a registration request for the Fairchild Imaging Operations System and is pending authorization.\n\nName: ${newUser.name}\nEmail: ${newUser.email}\nRole: ${newUser.role}\n\nPlease log in to the dashboard to approve or decline this request.`
            }),
          });
        } catch (err) {
          console.error('Failed to trigger admin notification email:', err);
        }

      } else {
        setAuthError("Failed to communicate credential request block packet to Azure.");
      }
    } catch (err) {
      setAuthError("Network communication error. Please try again.");
      console.error(err);
    } finally {
      setIsRegistering(false);
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

    const approvalLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-AUTH", assetName: "User Authentication Services", templateName: "User Access Provisioning", interval: "On-Demand", technician: "System Admin", email: "admin@fcimg.com", status: "Completed Pass", comments: `System Admin approved corporate access token for user account: ${email}` };
    const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approvalLog) });
    if (res.ok) {
      const savedLog = await res.json(); setHistory(prev => [savedLog, ...prev]); 
    }

    try {
      await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          cc: 'cton@fcimg.com',
          subject: 'Account Approved - FI Operations System',
          body: `Hello ${targetUser.name},\n\nYour account access request for the Fairchild Imaging Operations System has been approved by the System Administrator. You can now log in using your corporate email and security password.\n\nThank you.`
        }),
      });
    } catch (err) {
      console.error('Failed to trigger approval email:', err);
    }

    triggerModal("Account Approved", `Access granted successfully for ${email}. An automated notification email has been dispatched to the user.`, "success");
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
      if (targetUser.email === "admin@fcimg.com") {
        triggerModal("Action Blocked", "System Admin account access restrictions cannot self-terminate.", "error");
        return;
      }

      setUsers(prevUsers => prevUsers.filter(u => u.email !== email));

      if (targetUser && targetUser.id) {
        try {
          await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
          
          const revokeLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-REVOKE", assetName: "User Authentication Services", templateName: "User Access Termination", interval: "On-Demand", technician: "System Admin", email: "admin@fcimg.com", status: "Incomplete Log", comments: `System Admin permanently revoked corporate access token for account: ${email}` };
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

  const handleOpenPmModal = (assetId) => {
    setSelectedAssetId(assetId); 
    setSelectedTemplateId(""); 
    setCompletedSteps({}); 
    setValidationError(""); 
    setShowPmModal(true);
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
    if (isAttachingManual) return;
    
    if (manualAssetIds.length === 0) { triggerModal("Field Required", "Please select at least one target asset from the fleet directory.", "info"); return; }
    if (!manualFile && !manualText.trim()) { triggerModal("Input Required", "Please attach a documentation file or draft a quick-reference procedure layout.", "info"); return; }
    
    const targetAssets = assets.filter(a => manualAssetIds.includes(a.id));
    if (targetAssets.length === 0) return;

    setIsAttachingManual(true);

    try {
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

        const logEntry = { id: `LOG-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toLocaleString(), assetId: targetAsset.id, assetName: targetAsset.name, templateName: "Operation Manual Attachment", interval: "On-Demand", technician: currentUser ? currentUser.name : "System Admin", email: currentUser ? currentUser.email : "admin@fcimg.com", status: "Completed Pass", comments: `Successfully linked new manual documentation [${attachmentPayload.fileName}] to device.` };
        
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
    } finally {
      setIsAttachingManual(false);
    }
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
    e.preventDefault(); 
    if (isSubmittingPm) return;
    
    setValidationError("");
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
    setIsSubmittingPm(true);
    try {
      const newLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: selectedAsset.id, assetName: selectedAsset.name, templateName: selectedTemplate.name, interval: selectedTemplate.interval, technician: currentUser.name, email: currentUser.email, status: statusState, comments: pmComments || "No special operating comments provided." };
      const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLog) });
      if (res.ok) {
        const savedLog = await res.json(); setHistory([savedLog, ...history]);
        
        const currentPmDates = { ...selectedAsset.pmDates };
        const activeFreqs = selectedAsset.pmFrequencies || (selectedAsset.pmFrequency && selectedAsset.pmFrequency !== "None" ? [selectedAsset.pmFrequency] : []);
        
        activeFreqs.forEach(f => {
            if (!currentPmDates[f]) {
                currentPmDates[f] = selectedAsset.lastPmDate;
            }
        });

        const interval = selectedTemplate.interval; 
        const updatedPmDates = { ...currentPmDates, [interval]: new Date().toISOString() };

        let updatedFrequencies = selectedAsset.pmFrequencies || (selectedAsset.pmFrequency && selectedAsset.pmFrequency !== "None" ? [selectedAsset.pmFrequency] : []);
        if (!updatedFrequencies.includes(interval) && interval !== "On-Demand") {
            updatedFrequencies = [...updatedFrequencies, interval];
        }

        let computedStatus = "Operational";
        let hasOverdueCalibration = false;
        let hasDueMaint = false;
        
        updatedFrequencies.forEach(freq => {
          const lastDate = updatedPmDates[freq] || selectedAsset.lastPmDate;
          const daysLeft = calculateDaysRemaining(lastDate, freq);
          const threshold = freq === "Weekly" ? 0 : 7;
          if (daysLeft !== null && daysLeft < 0 && freq.includes("Calibration")) hasOverdueCalibration = true;
          else if (daysLeft !== null && daysLeft <= threshold) hasDueMaint = true;
        });

        if (hasOverdueCalibration) computedStatus = "Out of Calibration";
        else if (hasDueMaint) computedStatus = "Maintenance Due";

        const finalStatus = statusState === "Completed Pass" ? computedStatus : "Corrective Maintenance";

        const updatedAsset = { 
          ...selectedAsset, 
          status: finalStatus, 
          lastPmDate: new Date().toISOString(), 
          pmDates: updatedPmDates,
          pmFrequencies: updatedFrequencies
        };
        
        try {
          await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });
        } catch (err) {
          console.error("Failed to update asset PM date in DB", err);
        }

        setAssets(assets.map(ast => ast.id === selectedAsset.id ? updatedAsset : ast));
        setCompletedSteps({}); setPmComments(""); setSelectedAssetId(""); setSelectedTemplateId("");
        
        setShowPmModal(false); 
        triggerModal("SOP Signature Logged", `Preventative maintenance log recorded successfully. Specific [${interval}] cycle timer has been reset.`, "success");
      }
    } finally {
      setIsSubmittingPm(false);
    }
  };

  const handleAddWorkOrder = async (e) => {
    e.preventDefault();
    if (isSubmittingWo) return;
    
    if (!newWo.title.trim() || !newWo.assignedTo) { 
      triggerModal("Input Required", "Work Order Title and Assigned Operator are strictly required fields.", "info"); 
      return; 
    }
    
    setIsSubmittingWo(true);
    try {
      const created = { 
        id: `WO-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`, 
        ...newWo, 
        status: "Open", 
        createdBy: currentUser.name,
        timestamp: new Date().toISOString()
      };

      const res = await fetch('/api/workorders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
      if (res.ok) {
        const savedWo = await res.json(); 
        setWorkOrders([savedWo, ...workOrders]);
        setNewWo({ title: "", description: "", assetId: "", assignedTo: "", priority: "Medium" });
        triggerModal("Work Order Dispatched", `Task successfully assigned and queued for operator action.`, "success");

        const assignedUser = users.find(u => u.email === newWo.assignedTo);
        const assignedName = assignedUser ? assignedUser.name : 'Technician';
        try {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: newWo.assignedTo,
              subject: `New Work Order Assigned: ${newWo.title} - FI Operations System`,
              body: `Hello ${assignedName},\n\nYou have been assigned a new work order in the Fairchild Imaging Operations System.\n\nTicket: ${newWo.title}\nPriority: ${newWo.priority}\nDescription: ${newWo.description || 'No additional details provided.'}\n\nPlease log in to the dashboard to review and update the status of this job.\n\nThank you.`
            }),
          });
        } catch (err) {
          console.error('Failed to trigger work order notification email:', err);
        }
      }
    } catch (err) {
      console.error("Failed to generate work order:", err);
    } finally {
      setIsSubmittingWo(false);
    }
  };

  const handleUpdateWoStatus = async (woId, newStatus) => {
    const targetWo = workOrders.find(w => w.id === woId);
    if (!targetWo) return;
    
    const updatedWo = { ...targetWo, status: newStatus };
    setWorkOrders(workOrders.map(w => w.id === woId ? updatedWo : w));

    try {
      await fetch('/api/workorders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedWo) });

      if (newStatus === "Completed") {
        const logEntry = {
          id: `LOG-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toLocaleString(),
          assetId: targetWo.assetId || "FACILITY-GEN",
          assetName: targetWo.assetId ? (assets.find(a=>a.id === targetWo.assetId)?.name || "Unknown") : "General Facility Area",
          templateName: `Ad-Hoc Work Order: ${targetWo.title}`,
          interval: "On-Demand",
          technician: currentUser.name,
          email: currentUser.email,
          status: "Completed Pass",
          comments: targetWo.description || "Work order marked resolved by technician."
        };
        const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) });
        if (logRes.ok) {
          const savedLog = await logRes.json();
          setHistory([savedLog, ...history]);
        }
      }
    } catch (err) {
      console.error("Failed to update Work Order status:", err);
    }
  };

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
        status: "Operational", 
        lastPmDate: new Date().toISOString(),
        pmFrequencies: newAsset.pmFrequencies,
        pmDates: initialPmDates,
        manuals: [] 
      };

      const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
      if (res.ok) {
        const savedAsset = await res.json(); setAssets([...assets, savedAsset]);
        setNewAsset({ name: "", model: "", serial: "", location: "", category: "", pmFrequencies: [] });
        triggerModal("Asset Added", "New equipment hardware standard profile integrated.", "success"); setActiveTab("dashboard");
      }
    } finally {
      setIsAddingAsset(false);
    }
  };

  const handleAddTemplateSubmit = async (e) => {
    e.preventDefault();
    if (isAddingTemplate) return;
    
    if (!newTemplate.name) { triggerModal("Error", "SOP Template Title is strictly required.", "info"); return; }
    
    const steps = newTemplate.checklistInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (steps.length === 0) {
      triggerModal("Error", "Please provide at least one individual action step item.", "info");
      return;
    }

    setIsAddingTemplate(true);
    try {
      const created = {
        id: `SOP-${Date.now().toString().slice(-3)}`,
        name: newTemplate.name.trim(),
        interval: newTemplate.interval,
        department: newTemplate.department.trim() || "General Engineering",
        targetCategory: newTemplate.targetCategory,
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
        setNewTemplate({ name: "", interval: "Monthly", department: "", targetCategory: "Global", checklistInput: "" });
        triggerModal("Standard Created", "New preventative maintenance guideline profile cataloged.", "success");
      } else {
        triggerModal("Database Error", "Failed to transfer template payload standard to Cosmos DB.", "error");
      }
    } finally {
      setIsAddingTemplate(false);
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

  const deleteHistoryLog = (id) => {
    triggerModal("Delete Audit Record", "Delete this system log permanently? This overrides compliance tracking.", "confirm", async () => {
      try {
        await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
        setHistory(history.filter(h => h.id !== id));
        closeModal();
      } catch (err) {
        closeModal();
        triggerModal("Error", "Failed to delete log from database.", "error");
      }
    });
  };

  const calculateNextPmDate = (lastDateStr, frequency) => {
    if (!lastDateStr || frequency === "None" || !frequency) return null;
    const lastDate = new Date(lastDateStr);

    if (frequency === "Weekly") {
      const nextMonday = new Date(lastDate);
      const day = nextMonday.getDay();
      const diff = day === 0 ? 1 : 8 - day;
      nextMonday.setDate(nextMonday.getDate() + diff);
      return nextMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    let cycleDays = 0;
    
    switch(frequency) {
      case "Monthly": cycleDays = 30; break;
      case "Quarterly": cycleDays = 90; break;
      case "Semi-Annually":
      case "Calibration (Semi-Annual)": cycleDays = 182; break;
      case "Annually":
      case "Calibration (Annual)": cycleDays = 365; break;
      default: return null;
    }
    
    const nextDate = new Date(lastDate.getTime() + (cycleDays * 24 * 60 * 60 * 1000));
    return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const operationalCount = assets.filter(a => a.status === "Operational").length;
  const overdueCount = assets.filter(a => a.status === "Maintenance Due").length;
  const calibrationCount = assets.filter(a => a.status === "Out of Calibration").length;
  const correctiveCount = assets.filter(a => a.status === "Corrective Maintenance").length;
  
  const manualCount = assets.reduce((sum, a) => sum + (a.manuals ? a.manuals.length : (a.manual ? 1 : 0)), 0);
  const complianceRate = (() => { if (assets.length === 0) return 100; const nonCompliant = overdueCount + calibrationCount + correctiveCount; return Math.round(((assets.length - nonCompliant) / assets.length) * 100); })();
  
  const pendingApprovals = users.filter(u => !u.approved);
  const activeAccounts = users.filter(u => u.approved);

  const expandedActionQueue = [];
  assets.forEach(asset => {
    if (asset.status !== "Operational") {
      expandedActionQueue.push({
        ...asset,
        queueId: `${asset.id}-status`,
        displayStatus: asset.status,
        displayDate: null,
        badgeColor: asset.status === "Maintenance Due" ? "bg-yellow-100 text-yellow-800" : asset.status === "Out of Calibration" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
      });
      return; 
    }

    const freqs = asset.pmFrequencies && asset.pmFrequencies.length > 0 ? asset.pmFrequencies : (asset.pmFrequency && asset.pmFrequency !== "None" ? [asset.pmFrequency] : []);

    freqs.forEach(freq => {
      const lastDate = asset.pmDates?.[freq] || asset.lastPmDate;
      const daysLeft = calculateDaysRemaining(lastDate, freq);

      const threshold = freq === "Weekly" ? 0 : 7;

      if (daysLeft !== null && daysLeft <= threshold) {
        expandedActionQueue.push({
          ...asset,
          queueId: `${asset.id}-${freq}`,
          displayStatus: daysLeft < 0 ? `${freq.toUpperCase()} PM OVERDUE` : `${freq.toUpperCase()} PM DUE`,
          displayDate: calculateNextPmDate(lastDate, freq),
          badgeColor: daysLeft < 0 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
        });
      }
    });
  });
  
  const assetsWithManuals = assets.filter(a => (a.manuals && a.manuals.length > 0) || a.manual);

  const uniqueCategories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));

  const filteredHistory = history.filter(log => 
    log.assetName?.toLowerCase().includes(historySearch.toLowerCase()) || 
    log.technician?.toLowerCase().includes(historySearch.toLowerCase()) ||
    log.templateName?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const groupedAssets = assets.reduce((acc, asset) => {
    const cat = asset.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  // ADDED THIS LINE: Filter out completed work orders for the active dispatch board
  const activeWorkOrders = workOrders.filter(w => w.status !== "Completed");

  // DYNAMIC SIDEBAR RENDER MAPPING
  const navData = {
    dashboard: { icon: '📊', label: 'Operations Dashboard' },
    workOrders: { icon: '🔧', label: 'Dispatch Work Orders', badge: workOrders.filter(w => w.status !== "Completed").length },
    assets: { icon: '🏭', label: 'Asset Directory', badge: assets.length },
    manuals: { icon: '📖', label: 'Equipment Manuals', badge: manualCount },
    templates: { icon: '⚙️', label: 'PM Task Configurations', badge: pmTemplates.length },
    history: { icon: '📜', label: 'Audit Logs & PM History', badge: history.length }
  };

 if (!currentUser) {
    return (
      <div className="min-h-screen animated-gradient-bg flex flex-col justify-center items-center px-4 py-12 antialiased">
        <style>{customStyles}</style>
        
        {/* Added animate-entrance for a smooth slide-up load and increased shadow/ring */}
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 animate-entrance overflow-hidden">
          
          {/* Header Area */}
          <div className="bg-[#005596] px-8 py-8 text-center text-white relative overflow-hidden">
            {/* Optional: Add a subtle overlay pattern or sheen to the blue header */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
            
            <div className="mb-4 flex justify-center relative z-10">
                <img src="/logo.png" alt="Fairchild Imaging Logo" className="h-24 w-auto max-w-[350px] object-contain rounded-xl bg-white p-3 shadow-md transform hover:scale-105 transition-transform duration-300" />
            </div>
            <h2 className="text-xl font-bold tracking-tight font-sans relative z-10 drop-shadow-sm">FI-Operation Management System</h2>
          </div>

          <div className="p-8">
            {authError && <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-3 text-xs font-semibold text-red-800 leading-relaxed animate-pulse">{authError}</div>}
            {authSuccess && <div className="mb-5 bg-green-50 border-l-4 border-green-500 p-3 text-xs font-semibold text-green-800 leading-relaxed">{authSuccess}</div>}

            {authMode === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Username / Email Address</label>
                  <input type="text" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="admin@fcimg.com or name@fcimg.com" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] focus:bg-blue-50/30 p-3 border bg-white transition-all duration-200 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Security Password</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] focus:bg-blue-50/30 p-3 border bg-white transition-all duration-200 outline-none" />
                </div>
                <button type="submit" disabled={isSigningIn} className={`w-full bg-[#005596] hover:bg-[#00407a] text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ${isSigningIn ? 'opacity-70 cursor-not-allowed animate-pulse' : ''}`}>
                  {isSigningIn ? 'Authenticating...' : 'Authorized Sign In'}
                </button>
                <p className="text-center text-xs text-gray-500 mt-6 pt-5 border-t border-gray-100">
                  New Operator? <button type="button" onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccess(""); }} className="text-[#00A1E4] hover:text-[#0081b8] hover:underline font-bold transition-colors">Request Account Access</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name / Initials</label>
                  <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Technician Name" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] focus:bg-blue-50/30 p-3 border bg-white transition-all duration-200 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Corporate Email Address</label>
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="user@fcimg.com" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] focus:bg-blue-50/30 p-3 border bg-white transition-all duration-200 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Choose Security Password</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] focus:bg-blue-50/30 p-3 border bg-white transition-all duration-200 outline-none" />
                </div>
                <button type="submit" disabled={isRegistering} className={`w-full bg-[#00A1E4] hover:bg-[#0081b8] text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ${isRegistering ? 'opacity-70 cursor-not-allowed animate-pulse' : ''}`}>
                  {isRegistering ? 'Submitting...' : 'Submit Access Request'}
                </button>
                <p className="text-center text-xs text-gray-500 mt-6 pt-5 border-t border-gray-100">
                  Already registered? <button type="button" onClick={() => { setAuthMode("signin"); setAuthError(""); setAuthSuccess(""); }} className="text-[#005596] hover:text-[#00407a] hover:underline font-bold transition-colors">Back to Sign In</button>
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

          <div className="flex items-center space-x-6">
            <div className="hidden lg:block text-right border-r border-gray-200 pr-6">
               <span className="block text-xs font-bold text-gray-800">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
               <span className="block text-[10px] text-gray-500 font-mono mt-0.5">{currentTime.toLocaleTimeString('en-US')}</span>
            </div>
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
            <div className="text-2xl sm:text-3xl font-black mt-1 text-yellow-300">{expandedActionQueue.length}</div>
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
        
        {/* DYNAMIC NAVIGATION SIDEBAR PANEL */}
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-4 space-y-1 flex flex-col shrink-0">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 hidden md:block">
            Main Navigation
          </div>
          
          {navOrder.map((tabId, index) => {
            const info = navData[tabId];
            if (!info) return null;
            return (
              <div key={tabId} className="relative flex items-center group">
                {isEditingNav && isSystemAdmin && (
                  <div className="absolute left-[-8px] flex flex-col space-y-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveNav(index, -1)} className="text-[10px] bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5">▲</button>
                    <button onClick={() => moveNav(index, 1)} className="text-[10px] bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5">▼</button>
                  </div>
                )}
                <button 
                  onClick={() => !isEditingNav && setActiveTab(tabId)} 
                  className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === tabId && !isEditingNav ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"} ${isEditingNav ? 'pl-6 border border-dashed border-gray-300 cursor-move' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <span>{info.icon}</span> <span>{info.label}</span>
                  </div>
                  {info.badge !== undefined && info.badge !== 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === tabId && !isEditingNav ? "bg-[#005596] text-white" : "bg-gray-100 text-gray-600"}`}>
                      {info.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
          
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

          {isSystemAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => setIsEditingNav(!isEditingNav)} className={`w-full text-[10px] uppercase font-bold transition flex items-center justify-center space-x-2 py-2 rounded ${isEditingNav ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' : 'text-gray-400 hover:text-[#005596] hover:bg-gray-50'}`}>
                  <span>{isEditingNav ? '✅ Save Flow' : '⚙️ Edit Navigation Flow'}</span>
              </button>
            </div>
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
                      {expandedActionQueue.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{expandedActionQueue.length} Pending</span>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                      {expandedActionQueue.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-xs">
                          No pending maintenance actions. All systems are operational.
                        </div>
                      ) : (
                        expandedActionQueue.map(item => (
                          <div key={item.queueId} className="p-4 hover:bg-gray-50 transition flex justify-between items-center border-l-4" style={{ borderLeftColor: item.badgeColor.includes('red') ? '#ef4444' : item.badgeColor.includes('yellow') ? '#eab308' : '#f97316' }}>
                            <div>
                              <span className="font-bold text-gray-900 text-xs block">{item.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">S/N: {item.serial}</span>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.badgeColor}`}>
                                {item.displayStatus}
                              </span>
                              {item.displayDate && (
                                <div className="mt-1 text-[10px] text-gray-500 font-mono">
                                  Due: {item.displayDate}
                                </div>
                              )}
                              <button 
                                onClick={() => handleOpenPmModal(item.id)} 
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

          {activeTab === "workOrders" && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Dispatch Ad-Hoc Work Order</h3></div>
                <form onSubmit={handleAddWorkOrder} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Work Order Title</label>
                      <input type="text" value={newWo.title} onChange={(e) => setNewWo({...newWo, title: e.target.value})} placeholder="e.g. Replace worn HEPA filter in cleanroom" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Asset (Optional)</label>
                      <select value={newWo.assetId} onChange={(e) => setNewWo({...newWo, assetId: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                        <option value="">-- General Facility (No specific asset) --</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} (SN: {a.serial})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assign To Operator</label>
                      <select value={newWo.assignedTo} onChange={(e) => setNewWo({...newWo, assignedTo: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                        <option value="">-- Select Active Technician --</option>
                        {activeAccounts.map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Priority Level</label>
                      <select value={newWo.priority} onChange={(e) => setNewWo({...newWo, priority: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="High">High Priority</option>
                        <option value="Critical">Critical Issue</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Job Description & Notes</label>
                      <textarea value={newWo.description} onChange={(e) => setNewWo({...newWo, description: e.target.value})} rows="3" placeholder="Provide detailed instructions for the technician..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={isSubmittingWo} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${isSubmittingWo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isSubmittingWo ? 'Dispatching...' : 'Dispatch Ticket'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide uppercase">Active Dispatch Board</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Ticket Info</th>
                        <th className="px-6 py-3.5">Priority</th>
                        <th className="px-6 py-3.5">Target Hardware</th>
                        <th className="px-6 py-3.5">Assigned To</th>
                        <th className="px-6 py-3.5 text-right">Job Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {activeWorkOrders.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 text-xs">No active work orders in the system.</td></tr>
                      ) : (
                        activeWorkOrders.map((wo) => (
                          <tr key={wo.id} className="hover:bg-gray-50/55 transition">
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-900 block">{wo.title}</span>
                              <span className="text-[9px] text-gray-400 font-mono mt-0.5 block">{wo.id} • Created: {new Date(wo.timestamp).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${wo.priority === 'Critical' ? 'bg-red-100 text-red-800' : wo.priority === 'High' ? 'bg-orange-100 text-orange-800' : wo.priority === 'Medium' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                {wo.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {wo.assetId ? (
                                <span className="font-medium text-[#005596]">{assets.find(a => a.id === wo.assetId)?.name || 'Unknown'}</span>
                              ) : (
                                <span className="text-gray-500 italic text-[10px]">Facility General</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${wo.assignedTo === currentUser.email ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                <span className="font-mono text-gray-700">{wo.assignedTo}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {wo.status === "Completed" ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800">
                                  Completed ✓
                                </span>
                              ) : (
                                <select
                                  value={wo.status}
                                  onChange={(e) => handleUpdateWoStatus(wo.id, e.target.value)}
                                  disabled={!isSystemAdmin && wo.assignedTo !== currentUser.email}
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent ${!isSystemAdmin && wo.assignedTo !== currentUser.email ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-300'} ${wo.status === "Open" ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-[#005596]"}`}
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Mark Completed</option>
                                </select>
                              )}
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

          {activeTab === "assets" && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Register New Dynamic Lab/Cleanroom Asset</h3></div>
                <form onSubmit={handleAddAssetSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Equipment Name</label>
                      <input type="text" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. sCMOS Chamber" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Model Identifier</label>
                      <input type="text" value={newAsset.model} onChange={(e) => setNewAsset({...newAsset, model: e.target.value})} placeholder="e.g. VCC-2020-X" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number</label>
                      <input type="text" value={newAsset.serial} onChange={(e) => setNewAsset({...newAsset, serial: e.target.value})} placeholder="e.g. FC-90812-C" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location / Bay</label>
                      <input type="text" value={newAsset.location} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g. Cleanroom Bay 3" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Type</label>
                      <input type="text" value={newAsset.category} onChange={(e) => setNewAsset({...newAsset, category: e.target.value})} placeholder="e.g. Vacuum Chamber" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
                    </div>
                    
                    {/* UPDATED MULTI-SELECT PM FREQUENCY LAYOUT */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">PM Frequencies (Select Multiple)</label>
                      <div className="flex flex-wrap gap-3 mt-2.5">
                        {PM_CYCLE_OPTIONS.map(freq => (
                          <label key={freq} className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-700 font-medium bg-gray-50 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-100 transition">
                            <input
                              type="checkbox"
                              checked={newAsset.pmFrequencies?.includes(freq) || false}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAsset({ ...newAsset, pmFrequencies: [...(newAsset.pmFrequencies || []), freq] });
                                } else {
                                  setNewAsset({ ...newAsset, pmFrequencies: (newAsset.pmFrequencies || []).filter(f => f !== freq) });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-[#005596] focus:ring-[#005596]"
                            />
                            <span>{freq}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>
                  <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={isAddingAsset} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${isAddingAsset ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isAddingAsset ? 'Committing...' : 'Commit Asset'}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide uppercase">Hardware Directory</h3>
                </div>
                
                {Object.keys(groupedAssets).length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">No assets registered in the database.</div>
                ) : (
                  Object.entries(groupedAssets).map(([category, catAssets]) => (
                    <div key={category} className="mb-4">
                      <div className="bg-gray-100 px-6 py-2 border-y border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider shadow-inner">
                        📁 Category: {category} <span className="ml-2 font-normal text-gray-400">({catAssets.length} Assets)</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                            <tr>
                              <th className="px-6 py-3.5">Asset Name</th>
                              <th className="px-6 py-3.5">Model / Serial No</th>
                              <th className="px-6 py-3.5">Status & PM Cycle Tracker</th>
                              <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {catAssets.map((asset) => {
                              // Extract array of frequencies with fallback for legacy DB entries
                              const freqs = asset.pmFrequencies && asset.pmFrequencies.length > 0 ? asset.pmFrequencies : (asset.pmFrequency && asset.pmFrequency !== "None" ? [asset.pmFrequency] : []);
                              
                              return (
                                <tr key={asset.serial} className="hover:bg-gray-50/55 transition">
                                  <td className="px-6 py-4">
                                    <span className="font-bold text-gray-900 block">{asset.name}</span>
                                  </td>
                                  <td className="px-6 py-4 font-mono">
                                    <span className="block text-gray-700">Mod: {asset.model}</span>
                                    <span className="block text-[11px] text-gray-400">S/N: {asset.serial}</span>
                                  </td>
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
                                    
                                    {/* MULTIPLE PM DATES RENDERER */}
                                    <div className="flex flex-col mt-3 space-y-2 border-t border-gray-100 pt-2">
                                      {freqs.length === 0 ? (
                                        <span className="text-[9px] text-gray-400 uppercase font-bold">No Active Cycles</span>
                                      ) : (
                                        freqs.map(freq => {
                                          const targetDate = asset.pmDates?.[freq] || asset.lastPmDate;
                                          const daysRemaining = calculateDaysRemaining(targetDate, freq);
                                          
                                          return (
                                            <div key={freq} className="flex flex-col text-[10px]">
                                              <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-[#005596] font-bold uppercase tracking-wider">{freq}</span>
                                                {daysRemaining !== null ? (
                                                  <span className={`font-bold px-1.5 py-0.5 rounded-sm w-max ${daysRemaining < 0 ? 'bg-red-50 text-red-600' : daysRemaining <= 7 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    ⏳ {daysRemaining < 0 ? `Overdue (${Math.abs(daysRemaining)}d)` : `Due in ${daysRemaining}d`}
                                                  </span>
                                                ) : (
                                                  <span className="font-bold px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-600">⏳ Needs Baseline</span>
                                                )}
                                              </div>
                                              {targetDate && <span className="text-gray-500 font-mono text-[9px]">Next: {calculateNextPmDate(targetDate, freq)}</span>}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-4">
                                    <button onClick={() => handleOpenPmModal(asset.id)} className="text-xs font-bold text-[#005596] hover:text-[#005596]/80 transition">Execute PM</button>
                                    {isSystemAdmin && (
                                      <button onClick={() => deleteAsset(asset.id)} className="text-xs font-bold text-red-600 hover:text-red-800 transition">Delete</button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
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
          )}

          {activeTab === "templates" && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#005596] text-white px-6 py-4"><h3 className="font-bold text-sm tracking-wide uppercase">Construct Custom SOP Template</h3></div>
                <form onSubmit={handleAddTemplateSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">SOP Checklist Title</label>
                      <input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Annual Precision ISO Check" className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 border bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Interval Frequency</label>
                      <select value={newTemplate.interval} onChange={(e) => setNewTemplate({...newTemplate, interval: e.target.value})} className="w-full text-xs rounded border-gray-300 shadow-sm p-2.5 bg-white border cursor-pointer">
                        <option value="Weekly">Weekly Cycle</option>
                        <option value="Monthly">Monthly Cycle</option>
                        <option value="Quarterly">Quarterly Cycle</option>
                        <option value="Semi-Annually">Semi-Annually Cycle</option>
                        <option value="Annually">Annually Cycle</option>
                        <option value="Calibration (Semi-Annual)">Calibration (Semi-Annual)</option>
                        <option value="Calibration (Annual)">Calibration (Annual)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assigned Responsible Department</label>
                      <input type="text" value={newTemplate.department} onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})} placeholder="e.g. Cleanroom Operations" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white" />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Asset Mapping (Category Lock)</label>
                      <select value={newTemplate.targetCategory} onChange={(e) => setNewTemplate({...newTemplate, targetCategory: e.target.value})} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                        <option value="Global">Global (All Assets)</option>
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>Strict Map: {cat}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Checklist Actions (One per line)</label>
                      <textarea value={newTemplate.checklistInput} onChange={(e) => setNewTemplate({...newTemplate, checklistInput: e.target.value})} rows="4" placeholder="Verify seal safety configurations..." className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono"></textarea>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={isAddingTemplate} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isAddingTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isAddingTemplate ? 'Generating Protocol...' : 'Generate Protocol'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pmTemplates.map((template) => (
                  <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between relative">
                    {template.targetCategory !== "Global" && (
                      <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-2 py-1 uppercase rounded-bl-lg shadow-sm border-b border-l border-yellow-500 z-10">Locked: {template.targetCategory}</div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase">{template.id}</span>
                          <h4 className="font-bold text-base text-gray-900 mt-0.5 leading-tight">{template.name}</h4>
                        </div>
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
                <span className="text-xs text-gray-400 font-semibold">{filteredHistory.length} records matching</span>
              </div>
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <span className="text-xs text-gray-600 max-w-lg hidden md:block">
                  This log officially timestamps and records all executed PMs, protocol sign-offs, and administrative actions performed within the system.
                </span>
                <input 
                  type="text" 
                  value={historySearch} 
                  onChange={(e) => setHistorySearch(e.target.value)} 
                  placeholder="Filter by Asset, Tech, or SOP..." 
                  className="w-full md:w-64 text-xs rounded border border-gray-300 shadow-sm p-2 bg-white focus:outline-none focus:border-[#005596]" 
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Timestamp</th>
                      <th className="px-6 py-3.5">Asset & Category</th>
                      <th className="px-6 py-3.5">Executed Protocol</th>
                      <th className="px-6 py-3.5">Technician / Inspector</th>
                      <th className="px-6 py-3.5">Execution Status</th>
                      <th className="px-6 py-3.5">Operating Notes</th>
                      {isSystemAdmin && <th className="px-6 py-3.5 text-right">Admin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={isSystemAdmin ? "7" : "6"} className="px-6 py-12 text-center text-gray-400 text-xs">
                          No historical log entries found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 text-gray-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900 block">{log.assetName}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{log.assetId}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-800 block">{log.templateName}</span>
                            <span className="text-[10px] bg-blue-50 text-[#005596] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block">{log.interval} Cycle</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900 block">{log.technician}</span>
                            <span className="text-xs text-gray-500 font-mono block">{log.email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === "Completed Pass" ? "bg-green-100 text-green-800" : log.status === "Incomplete Log" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 max-w-xs break-words">{log.comments}</td>
                          {isSystemAdmin && (
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => deleteHistoryLog(log.id)} className="text-[10px] font-bold text-red-500 hover:text-red-800 transition uppercase tracking-wider">Delete</button>
                            </td>
                          )}
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
                          <div>
                            <h4 className="font-bold text-xs text-gray-900">{u.name}</h4>
                            <span className="text-xs text-gray-500 font-mono block mt-1">{u.email}</span>
                          </div>
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
                          {u.email === "admin@fcimg.com" ? (
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

      {/* QUICK EXECUTE PM MODAL */}
      {showPmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#005596] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-sm tracking-wide uppercase">Active Maintenance Sign-Off</h3>
              <button onClick={() => setShowPmModal(false)} className="text-white hover:text-blue-200 text-xl font-bold leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow">
              <form onSubmit={handleSubmitPm} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">1. Select Hardware System for Action</label>
                  <select value={selectedAssetId} onChange={(e) => { setSelectedAssetId(e.target.value); setSelectedTemplateId(""); }} className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer">
                    <option value="">-- Choose Hardware System from Directory --</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} (SN: {a.serial})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">2. Select SOP Protocol</label>
                  <select 
                    value={selectedTemplateId} 
                    onChange={(e) => { setSelectedTemplateId(e.target.value); setCompletedSteps({}); }} 
                    className="w-full text-xs rounded border-gray-300 p-2.5 bg-white border cursor-pointer"
                    disabled={!selectedAssetId}
                  >
                    <option value="">-- Choose Protocol Template to Execute --</option>
                    {pmTemplates
                      .filter(t => !selectedAssetId || t.targetCategory === "Global" || t.targetCategory === assets.find(a => a.id === selectedAssetId)?.category)
                      .map(t => <option key={t.id} value={t.id}>[{t.interval}] {t.name} {t.targetCategory !== "Global" ? `(Locked to ${t.targetCategory})` : ''}</option>)}
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
                
                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowPmModal(false)} className="px-5 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={isSubmittingPm || !selectedTemplateId} className={`bg-[#005596] hover:bg-[#005596]/95 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest shadow-sm transition-all ${isSubmittingPm || !selectedTemplateId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isSubmittingPm ? 'Committing Action...' : 'Commit Action'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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