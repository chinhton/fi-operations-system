import React, { useState, useRef, useEffect } from 'react';
import GlobalAlertModal from './components/GlobalAlertModal';
import TopHeader from './components/TopHeader';
import HardwareVendorModal from './components/HardwareVendorModal';
import PmExecutionModal from './components/PmExecutionModal';
import DashboardTab from './components/DashboardTab';
import ApprovalsTab from './components/ApprovalsTab';
import HistoryTab from './components/HistoryTab';
import WorkOrdersTab from './components/WorkOrdersTab';
import AssetsTab from './components/AssetsTab';
import ManualsTab from './components/ManualsTab';
import TemplatesTab from './components/TemplatesTab';

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
    background: linear-gradient(-45deg, #005596, #1A2530, #003058, #00A1E4);
    background-size: 400% 400%;
    animation: movingGradient 15s ease infinite;
  }
  
  @keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  .animate-entrance {
    animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

const PM_CYCLE_OPTIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annually", "Annually", "2-Year", "3-Year", "4-Year", "5-Year", "Calibration (Semi-Annual)", "Calibration (Annual)"];

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
  const [registerRole, setRegisterRole] = useState("Operator"); 
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  
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
  const [filterSearch, setFilterSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [assetSearch, setAssetSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");

  // --- FILTER ENGINE ---
  const filteredWorkOrders = workOrders.filter((wo) => {
    if (wo.status === "Completed") return false;

    const searchLower = filterSearch.toLowerCase();
    const matchesSearch = 
      (wo.title || "").toLowerCase().includes(searchLower) || 
      (wo.assignedTo || "").toLowerCase().includes(searchLower);
      
    const matchesPriority = filterPriority === "All" || (wo.priority || "").includes(filterPriority);
    
    return matchesSearch && matchesPriority;
  });

  const [showPmModal, setShowPmModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [activeAssetDetails, setActiveAssetDetails] = useState(null);
  
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [completedSteps, setCompletedSteps] = useState({});
  const [pmComments, setPmComments] = useState("");

  const [newAsset, setNewAsset] = useState({
    name: "", model: "", serial: "", location: "", category: "", pmFrequencies: [], parts: [], vendors: []
  });

  const [newPart, setNewPart] = useState({ partNumber: "", name: "", stock: "" });
  const [newVendor, setNewVendor] = useState({ name: "", contactInfo: "", serviceType: "" });

const [editingTemplateId, setEditingTemplateId] = useState(null);
const [newTemplate, setNewTemplate] = useState({
    name: "", interval: "Monthly", department: "", targetCategory: "Global", managerEmail: "", operatorEmail: "", checklistSteps: []
  });

  const [newWo, setNewWo] = useState({
    title: "", description: "", assetId: "", assignedTo: "", priority: ""
  });

  const [manualAssetIds, setManualAssetIds] = useState([]);
  const [manualFile, setManualFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [viewingManualAsset, setViewingManualAsset] = useState(null);
  const [activeManualIndex, setActiveManualIndex] = useState(0);

  const [validationError, setValidationError] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const [customModal, setCustomModal] = useState({
    show: false, title: "", message: "", type: "info", onConfirm: null
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  const [navOrder, setNavOrder] = useState(() => {
    const saved = localStorage.getItem('fi_nav_order');
    if (saved) {
      let parsed = JSON.parse(saved);
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

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'workOrders', 'assets', 'manuals', 'templates', 'history', 'approvals'];
    return validTabs.includes(hash) ? hash : "dashboard";
  });

  // --- PM EXECUTION MODAL STATE ---
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [selectedPmAsset, setSelectedPmAsset] = useState(null);
  const [selectedPmTemplate, setSelectedPmTemplate] = useState("");
  const [pmAnswers, setPmAnswers] = useState({});
  const [pmStatusState, setPmStatusState] = useState("Operational");

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    window.history.pushState(null, '', `#${tabId}`);
  };

  useEffect(() => {
    const handleRouting = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['dashboard', 'workOrders', 'assets', 'manuals', 'templates', 'history', 'approvals'];
      
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else if (currentUser) {
        setActiveTab('dashboard');
        window.history.replaceState(null, '', '#dashboard');
      }
    };

    window.addEventListener('popstate', handleRouting);
    window.addEventListener('hashchange', handleRouting);
    return () => {
      window.removeEventListener('popstate', handleRouting);
      window.removeEventListener('hashchange', handleRouting);
    };
  }, [currentUser]);

  // FULLY SCOPED DATE CALCULATORS
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
      case "Daily": cycleDays = 1; break;
      case "Monthly": cycleDays = 30; break;
      case "Quarterly": cycleDays = 90; break;
      case "Semi-Annually":
      case "Calibration (Semi-Annual)": cycleDays = 182; break;
      case "Annually":
      case "Calibration (Annual)": cycleDays = 365; break;
      case "2-Year": cycleDays = 730; break;
      case "3-Year": cycleDays = 1095; break;
      case "4-Year": cycleDays = 1460; break;
      case "5-Year": cycleDays = 1825; break;
      default: return null;
    }
    return cycleDays - daysPassed;
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
      case "Daily": cycleDays = 1; break;
      case "Monthly": cycleDays = 30; break;
      case "Quarterly": cycleDays = 90; break;
      case "Semi-Annually":
      case "Calibration (Semi-Annual)": cycleDays = 182; break;
      case "Annually":
      case "Calibration (Annual)": cycleDays = 365; break;
      case "2-Year": cycleDays = 730; break;
      case "3-Year": cycleDays = 1095; break;
      case "4-Year": cycleDays = 1460; break;
      case "5-Year": cycleDays = 1825; break;
      default: return null;
    }
    
    const nextDate = new Date(lastDate.getTime() + (cycleDays * 24 * 60 * 60 * 1000));
    return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const initializeData = async () => {
      try {
        const [templatesRes, assetsRes, historyRes, usersRes, workOrdersRes] = await Promise.all([
          fetch('/api/templates').catch(()=>({ok:false})),
          fetch('/api/assets').catch(()=>({ok:false})),
          fetch('/api/history').catch(()=>({ok:false})),
          fetch('/api/users').catch(()=>({ok:false})),
          fetch('/api/workorders').catch(()=>({ok:false}))
        ]);

        let loadedTemplates = [];
        if (templatesRes.ok) {
            const data = await templatesRes.json();
            loadedTemplates = Array.isArray(data) ? data : [];
            setPmTemplates(loadedTemplates);
        }

        if (historyRes.ok) setHistory(await historyRes.json() || []);
        if (workOrdersRes.ok) setWorkOrders(await workOrdersRes.json() || []);
        if (usersRes.ok) {
            const data = await usersRes.json();
            if (Array.isArray(data) && data.length > 0) {
              setUsers(prev => {
                const externalUsers = data.filter(u => u.email !== "admin@fcimg.com");
                return [prev[0], ...externalUsers];
              });
            }
        }

        if (assetsRes.ok) {
            const assetsData = await assetsRes.json();
            if (!Array.isArray(assetsData)) return;

            const todayStr = new Date().toDateString();

            const evaluatedData = assetsData.map(asset => {
                if (asset.status === "Corrective Maintenance") return asset; 
                
                let hasOverdueCalibration = false;
                let hasDueMaint = false;
                let needsDbSync = false;
                let updatedAsset = { ...asset };
                
                const freqs = asset.pmFrequencies && asset.pmFrequencies.length > 0 ? asset.pmFrequencies : (asset.pmFrequency && asset.pmFrequency !== "None" ? [asset.pmFrequency] : []);
                
                freqs.forEach(freq => {
                    const lastDate = updatedAsset.pmDates?.[freq] || updatedAsset.lastPmDate;
                    const daysLeft = calculateDaysRemaining(lastDate, freq);
                    const threshold = (freq === "Weekly" || freq === "Daily") ? 0 : 7;
                    
                    if (daysLeft !== null && daysLeft < 0 && freq.includes("Calibration")) hasOverdueCalibration = true;
                    else if (daysLeft !== null && daysLeft <= threshold) hasDueMaint = true;

                    // --- AUTOMATED NAG EMAIL ENGINE ---
                    if (daysLeft !== null && (daysLeft === 7 || daysLeft < 0)) {
                        const notifKey = `notified_${freq.replace(/[^a-zA-Z0-9]/g, '')}`;
                        // If we haven't nagged them yet TODAY...
                        if (updatedAsset[notifKey] !== todayStr) {
                            const matchedTemplate = loadedTemplates.find(t => t.interval === freq && (t.targetCategory === "Global" || t.targetCategory === updatedAsset.category));
                            if (matchedTemplate && (matchedTemplate.managerEmail || matchedTemplate.operatorEmail)) {
                                const emails = [matchedTemplate.managerEmail, matchedTemplate.operatorEmail].filter(Boolean).join(',');
                                const statusText = daysLeft < 0 ? `OVERDUE by ${Math.abs(daysLeft)} days` : `DUE in exactly 7 days`;
                                fetch('/api/sendEmail', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        to: emails,
                                        subject: `ACTION REQUIRED: ${updatedAsset.name} PM is ${statusText}`,
                                        body: `Hello,\n\nThe following facility equipment requires immediate action:\n\nAsset: ${updatedAsset.name} (SN: ${updatedAsset.serial})\nProtocol: ${matchedTemplate.name}\nCycle: ${freq}\nStatus: ${statusText}\n\nPlease log into the FI Operations System to assign or execute the preventative maintenance protocol to restore compliance.`
                                    })
                                }).catch(() => {});
                            }
                            // Tag the asset so we don't email them again today for this frequency
                            updatedAsset[notifKey] = todayStr;
                            needsDbSync = true;
                        }
                    }
                });
                
                let computedStatus = "Operational";
                if (hasOverdueCalibration) computedStatus = "Out of Calibration";
                else if (hasDueMaint) computedStatus = "Maintenance Due";

                if (updatedAsset.status !== computedStatus) {
                    updatedAsset.status = computedStatus;
                    needsDbSync = true;
                }

                if (needsDbSync) {
                    fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) }).catch(()=>{});
                }
                return updatedAsset;
            });
            
            setAssets(evaluatedData);
        }
      } catch (e) {
          console.error("Initialization error:", e);
      }
    };

    initializeData();

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
      changeTab("dashboard");
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
      role: registerRole, 
      approved: false 
    };

    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });

      if (res.ok) {
        const savedUser = await res.json();
        setUsers([...users, savedUser]); 
        setRegisterName(""); 
        setAuthEmail(""); 
        setAuthPassword("");
        setRegisterRole("Operator");
        setAuthSuccess("Account request submitted. Please ask a System Admin to authorize your account."); 
        setAuthMode("signin");

        const adminEmails = users.filter(u => u.approved && (u.role === "System Admin" || u.role === "admin")).map(u => u.email);
        const adminMailingList = Array.from(new Set([...adminEmails, 'cton@fcimg.com'])).join(',');

        try {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: adminMailingList,
              subject: 'Action Required: New Account Request - FI Operations System',
              body: `System Admin,\n\nA new user has submitted a registration request for the Fairchild Imaging Operations System and is pending authorization.\n\nName: ${newUser.name}\nEmail: ${newUser.email}\nRequested Role: ${newUser.role}\n\nPlease log in to the dashboard to approve or decline this request.`
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
    changeTab("dashboard"); 
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

    const approvalLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-AUTH", assetName: "User Authentication Services", templateName: "User Access Provisioning", interval: "On-Demand", technician: currentUser.name, email: currentUser.email, status: "Completed Pass", comments: `Admin approved corporate access token for user account: ${email} with role: ${targetUser.role}` };
    try {
      const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approvalLog) });
      if (res.ok) {
        const savedLog = await res.json(); setHistory(prev => [savedLog, ...prev]); 
      }
    } catch (err) { console.error(err); }

    const adminEmails = users.filter(u => u.approved && (u.role === "System Admin" || u.role === "admin")).map(u => u.email);
    const adminMailingList = Array.from(new Set([...adminEmails, 'cton@fcimg.com'])).join(',');

    try {
      await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          cc: adminMailingList,
          subject: 'Account Approved - FI Operations System',
          body: `Hello ${targetUser.name},\n\nYour account access request for the Fairchild Imaging Operations System has been approved by the System Administrator. You can now log in using your corporate email and security password.\n\nAssigned Role: ${targetUser.role}\n\nThank you.`
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
          
          const revokeLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-REVOKE", assetName: "User Authentication Services", templateName: "User Access Termination", interval: "On-Demand", technician: currentUser.name, email: currentUser.email, status: "Incomplete Log", comments: `Admin permanently revoked corporate access token for account: ${email}` };
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

  const handleOpenAssetModal = (asset) => {
    setActiveAssetDetails(asset);
    setNewPart({ partNumber: "", name: "", stock: "" });
    setNewVendor({ name: "", contactInfo: "", serviceType: "" });
    setShowAssetModal(true);
  };

  const addPart = async (e) => {
    e.preventDefault();
    if (!newPart.name || !newPart.partNumber) return;
    const updatedAsset = { ...activeAssetDetails, parts: [...(activeAssetDetails.parts || []), { id: Date.now().toString(), ...newPart }] };
    setNewPart({ partNumber: "", name: "", stock: "" });
    setActiveAssetDetails(updatedAsset);
    setAssets(assets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    try { await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) }); } catch(err){}
  };

  const removePart = async (partId) => {
    const updatedAsset = { ...activeAssetDetails, parts: activeAssetDetails.parts.filter(p => p.id !== partId) };
    setActiveAssetDetails(updatedAsset);
    setAssets(assets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    try { await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) }); } catch(err){}
  };

  const addVendor = async (e) => {
    e.preventDefault();
    if (!newVendor.name) return;
    const updatedAsset = { ...activeAssetDetails, vendors: [...(activeAssetDetails.vendors || []), { id: Date.now().toString(), ...newVendor }] };
    setNewVendor({ name: "", contactInfo: "", serviceType: "" });
    setActiveAssetDetails(updatedAsset);
    setAssets(assets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    try { await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) }); } catch(err){}
  };

  const removeVendor = async (vendorId) => {
    const updatedAsset = { ...activeAssetDetails, vendors: activeAssetDetails.vendors.filter(v => v.id !== vendorId) };
    setActiveAssetDetails(updatedAsset);
    setAssets(assets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    try { await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) }); } catch(err){}
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
          
          // --- AUTOMATED PM COMPLETION EMAIL ---
          const notifyEmails = [selectedTemplate.managerEmail, selectedTemplate.operatorEmail].filter(Boolean);
          if (notifyEmails.length > 0) {
             const mailList = Array.from(new Set(notifyEmails)).join(',');
             fetch('/api/sendEmail', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 to: mailList,
                 subject: `PM Executed: ${selectedTemplate.name} completed for ${selectedAsset.name}`,
                 body: `Hello,\n\nThe following maintenance protocol has been executed in the FI Operations System.\n\nAsset: ${selectedAsset.name} (SN: ${selectedAsset.serial})\nProtocol: ${selectedTemplate.name}\nCycle: ${selectedTemplate.interval}\nExecuted By: ${currentUser.name}\nStatus: ${statusState}\nNotes: ${pmComments || 'No additional comments.'}\n\nPlease log in to the dashboard to review the full audit trace.`
               })
             }).catch(err => console.log("Silent Email Dispatch Failed:", err));
          }
          // -------------------------------------

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
    
    if (!newWo.title.trim() || !newWo.assignedTo || !newWo.priority) {
      triggerModal("Input Required", "Title, Assigned Operator, and Priority Level are strictly required fields.", "info");
      return;
    }

    setIsSubmittingWo(true);
    try {
      const created = { 
        id: `WO-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`, 
        ...newWo, 
        status: "Open", 
        createdBy: currentUser.name,
        creatorEmail: currentUser.email,
        timestamp: new Date().toISOString()
      };

      const res = await fetch('/api/workorders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
      if (res.ok) {
        const savedWo = await res.json(); 
        setWorkOrders([savedWo, ...workOrders]);
        setNewWo({ title: "", description: "", assetId: "", assignedTo: "", priority: "" });
        triggerModal("Work Order Dispatched", `Task successfully assigned and queued for operator action.`, "success");

        const assignedUser = users.find(u => u.email === newWo.assignedTo);
        const assignedName = assignedUser ? assignedUser.name : 'Technician';
        
        const mailingList = Array.from(new Set([newWo.assignedTo, currentUser.email])).filter(Boolean).join(',');

        try {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: mailingList,
              subject: `New Work Order Assigned: ${newWo.title} - FI Operations System`,
              body: `Hello,\n\nA new work order has been created and assigned in the Fairchild Imaging Operations System.\n\nTicket: ${newWo.title}\nCreated By: ${currentUser.name}\nAssigned To: ${assignedName}\nPriority: ${newWo.priority}\nDescription: ${newWo.description || 'No additional details provided.'}\n\nPlease log in to the dashboard to review and update the status of this job.\n\nThank you.`
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

      if (newStatus === "In Progress" || newStatus === "Completed") {
        const mailingList = Array.from(new Set([targetWo.assignedTo, targetWo.creatorEmail || currentUser.email])).filter(Boolean).join(',');
        const assignedUser = users.find(u => u.email === targetWo.assignedTo);
        const assignedName = assignedUser ? assignedUser.name : 'Technician';
        
        try {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: mailingList,
              subject: `Work Order Update: ${targetWo.title} is now ${newStatus}`,
              body: `Hello,\n\nThe status for the following work order has been updated to: ${newStatus}\n\nTicket: ${targetWo.title}\nAssigned To: ${assignedName}\nUpdated By: ${currentUser.name}\n\nPlease log in to the FI Operations System dashboard for more details.\n\nThank you.`
            }),
          });
        } catch (err) {
          console.error('Failed to trigger work order status email:', err);
        }
      }

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
        manuals: [],
        parts: [],
        vendors: []
      };

      const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
      if (res.ok) {
        const savedAsset = await res.json(); setAssets([...assets, savedAsset]);
        setNewAsset({ name: "", model: "", serial: "", location: "", category: "", pmFrequencies: [], parts: [], vendors: [] });
        triggerModal("Asset Added", "New equipment hardware standard profile integrated.", "success"); changeTab("dashboard");
      }
    } finally {
      setIsAddingAsset(false);
    }
  };

const handleAddTemplateSubmit = async (e) => {
    e.preventDefault();
    if (isAddingTemplate) return;
    
    if (!newTemplate.name) { triggerModal("Error", "SOP Template Title is strictly required.", "info"); return; }
    
    if (!newTemplate.checklistSteps || newTemplate.checklistSteps.length === 0) {
      triggerModal("Error", "Please add at least one dynamic action step.", "info");
      return;
    }

    setIsAddingTemplate(true);
    try {
      const payload = {
        id: editingTemplateId || `SOP-${Date.now().toString().slice(-3)}`,
        name: newTemplate.name.trim(),
        interval: newTemplate.interval,
        department: newTemplate.department.trim() || "General Engineering",
        targetCategory: newTemplate.targetCategory,
        managerEmail: newTemplate.managerEmail || "",
        operatorEmail: newTemplate.operatorEmail || "",
        checklist: newTemplate.checklistSteps
      };

      const res = await fetch('/api/templates', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok) {
        const savedTemplate = await res.json();
        if (editingTemplateId) {
          setPmTemplates(pmTemplates.map(t => t.id === editingTemplateId ? savedTemplate : t));
          triggerModal("Standard Updated", "Preventative maintenance guideline profile has been successfully updated.", "success");
        } else {
          setPmTemplates([...pmTemplates, savedTemplate]);
          triggerModal("Standard Created", "New preventative maintenance guideline profile cataloged.", "success");

          const notifyEmails = [payload.managerEmail, payload.operatorEmail].filter(Boolean);
          if (notifyEmails.length > 0) {
              const mailList = Array.from(new Set(notifyEmails)).join(',');
              fetch('/api/sendEmail', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      to: mailList,
                      subject: `New SOP Configured: ${savedTemplate.name}`,
                      body: `Hello,\n\nA new PM Task Configuration has been mapped in the FI Operations System.\n\nSOP Title: ${savedTemplate.name}\nCycle: ${savedTemplate.interval}\nDepartment: ${savedTemplate.department}\n\nPlease log in to review the new standards for your department.`
                  })
              }).catch(() => console.log("Silent Email Dispatch Failed"));
          }
        }
        
        setNewTemplate({ name: "", interval: "Monthly", department: "", targetCategory: "Global", managerEmail: "", operatorEmail: "", checklistSteps: [] });
        setEditingTemplateId(null);
      } else {
        triggerModal("Database Error", "Failed to transfer template payload standard to Cosmos DB.", "error");
      }
    } finally {
      setIsAddingTemplate(false);
    }
  };

  const handleEditTemplateClick = (template) => {
    // Backward compatibility: Convert old string arrays to object arrays on the fly
    const mappedSteps = template.checklist.map(item => {
      return typeof item === 'string' ? { type: 'checkbox', label: item } : item;
    });
    
    setNewTemplate({
      name: template.name,
      interval: template.interval,
      department: template.department,
      targetCategory: template.targetCategory,
      managerEmail: template.managerEmail || "",
      operatorEmail: template.operatorEmail || "",
      checklistSteps: mappedSteps
    });
    setEditingTemplateId(template.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditTemplate = () => {
    setNewTemplate({ name: "", interval: "Monthly", department: "", targetCategory: "Global", managerEmail: "", operatorEmail: "", checklistSteps: "" });
    setEditingTemplateId(null);
  };
const deleteAssetCategory = (categoryName) => {
    triggerModal("Nuke Category", `Are you sure you want to permanently delete ALL assets in the "${categoryName}" category? This cannot be undone.`, "error", async () => {
      try {
        const assetsToNuke = assets.filter(a => a.category === categoryName);
        await Promise.all(assetsToNuke.map(a => fetch(`/api/assets?id=${a.id}`, { method: 'DELETE' })));
        setAssets(assets.filter(a => a.category !== categoryName));
        closeModal();
      } catch(err) { triggerModal("Error", "Failed to clear category.", "error"); }
    });
  };

  const deleteTemplateCategory = (categoryName) => {
    triggerModal("Nuke SOP Category", `Are you sure you want to permanently delete ALL templates locked to the "${categoryName}" category?`, "error", async () => {
      try {
        const templatesToNuke = pmTemplates.filter(t => t.targetCategory === categoryName);
        await Promise.all(templatesToNuke.map(t => fetch(`/api/templates?id=${t.id}`, { method: 'DELETE' })));
        setPmTemplates(pmTemplates.filter(t => t.targetCategory !== categoryName));
        closeModal();
      } catch(err) { triggerModal("Error", "Failed to clear SOP category.", "error"); }
    });
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
  
  const openPmModal = (asset) => {
    setSelectedPmAsset(asset);
    setSelectedPmTemplate("");
    setPmAnswers({});
    setPmComments("");
    setPmStatusState("Operational");
    setIsPmModalOpen(true);
  };

  const closePmModal = () => {
    setIsPmModalOpen(false);
    setSelectedPmAsset(null);
  };

  const handlePmSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPmTemplate) { triggerModal("Error", "Please select a PM Protocol SOP.", "info"); return; }
    setIsSubmittingPm(true);

    try {
      const updatedAsset = { ...selectedPmAsset };
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      if (!updatedAsset.pmDates) updatedAsset.pmDates = {};
      updatedAsset.pmDates[selectedPmTemplate.interval] = today;
      updatedAsset.status = pmStatusState;

      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });

      const historyPayload = {
        id: `AUDIT-${Date.now().toString().slice(-4)}`,
        assetId: selectedPmAsset.id,
        assetName: selectedPmAsset.name,
        assetSerial: selectedPmAsset.serial,
        templateName: selectedPmTemplate.name,
        interval: selectedPmTemplate.interval,
        executedBy: currentUser?.name || "System Operator",
        date: today,
        status: pmStatusState,
        comments: pmComments,
        answers: pmAnswers // <--- Saves the dynamic checklist data!
      };
      
      await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyPayload) });

      const notifyEmails = [selectedPmTemplate.managerEmail, selectedPmTemplate.operatorEmail].filter(Boolean);
      if (notifyEmails.length > 0) {
         const mailList = Array.from(new Set(notifyEmails)).join(',');
         fetch('/api/sendEmail', {
           method: 'POST', headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             to: mailList,
             subject: `PM Executed: ${selectedPmTemplate.name} completed for ${selectedPmAsset.name}`,
             body: `Hello,\n\nThe following maintenance protocol has been executed in the FI Operations System.\n\nAsset: ${selectedPmAsset.name} (SN: ${selectedPmAsset.serial})\nProtocol: ${selectedPmTemplate.name}\nCycle: ${selectedPmTemplate.interval}\nExecuted By: ${currentUser?.name || "System Operator"}\nStatus: ${pmStatusState}\nNotes: ${pmComments || 'No additional comments.'}\n\nPlease log in to the dashboard to review the full audit trace.`
           })
         }).catch(() => {});
      }

      setAssets(assets.map(a => a.id === selectedPmAsset.id ? updatedAsset : a));
      setHistory([historyPayload, ...history]);
      triggerModal("Protocol Logged", "Preventative Maintenance successfully recorded and routed.", "success");
      closePmModal();
    } catch (err) {
      triggerModal("Database Error", "Failed to commit PM action.", "error");
    } finally {
      setIsSubmittingPm(false);
    }
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

  const deleteWorkOrder = (id) => {
    triggerModal("Confirm Deletion", "Are you sure you want to permanently delete this dispatch ticket?", "confirm", async () => {
      try {
        const res = await fetch(`/api/workorders?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setWorkOrders(workOrders.filter(w => w.id !== id));
          closeModal();
        } else {
          triggerModal("Error", "Failed to delete work order from database.", "error");
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
    (log.assetName || "").toLowerCase().includes(historySearch.toLowerCase()) || 
    (log.technician || "").toLowerCase().includes(historySearch.toLowerCase()) ||
    (log.templateName || "").toLowerCase().includes(historySearch.toLowerCase())
  );
  
  const filteredAssets = assets.filter(a => 
    (a.name || "").toLowerCase().includes(assetSearch.toLowerCase()) || 
    (a.serial || "").toLowerCase().includes(assetSearch.toLowerCase()) ||
    (a.category || "").toLowerCase().includes(assetSearch.toLowerCase()) ||
    (a.model || "").toLowerCase().includes(assetSearch.toLowerCase())
  );

  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    const cat = asset.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  const navData = {
    dashboard: { icon: '📊', label: 'Operations Dashboard' },
    workOrders: { icon: '🔧', label: 'Dispatch Work Orders', badge: workOrders.filter(w => w.status !== "Completed").length },
    assets: { icon: '🏭', label: 'Facility Assets', badge: assets.length },
    manuals: { icon: '📖', label: 'Equipment Manuals', badge: manualCount },
    templates: { icon: '⚙️', label: 'PM Task Configurations', badge: pmTemplates.length },
    history: { icon: '📜', label: 'Executed Audits', badge: history.length }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen animated-gradient-bg flex flex-col justify-center items-center px-4 py-12 antialiased">
        <style>{customStyles}</style>
        
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 animate-entrance overflow-hidden">
          
          <div className="bg-[#005596] px-8 py-8 text-center text-white relative overflow-hidden">
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
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Requested Role</label>
                  <select value={registerRole} onChange={(e) => setRegisterRole(e.target.value)} className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] focus:bg-blue-50/30 p-3 border bg-white transition-all duration-200 outline-none cursor-pointer">
                    <option value="Operator">Operator (Standard)</option>
                    <option value="System Admin">System Admin (Elevated)</option>
                  </select>
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
      <TopHeader 
        currentTime={currentTime} 
        currentUser={currentUser} 
        isSystemAdmin={isSystemAdmin} 
        handleLogout={handleLogout} 
      />

      {/* COMPLIANCE KPI TRACKER BANNER */}
      <section className="bg-gradient-to-r from-[#005596] to-[#00A1E4] text-white py-6 px-4 sm:px-6 lg:px-8 shadow-md relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
        <div className="max-w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <div onClick={() => changeTab('workOrders')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Pending Actions</span>
            <div className="text-3xl sm:text-4xl font-black mt-2 text-yellow-300 drop-shadow-md">{expandedActionQueue.length}</div>
            <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Schedules in queue &rarr;</div>
          </div>
          <div onClick={() => changeTab('assets')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Facility Assets</span>
            <div className="text-3xl sm:text-4xl font-black mt-2 drop-shadow-md">{assets.length}</div>
            <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Monitored high-value systems &rarr;</div>
          </div>
          <div onClick={() => changeTab('dashboard')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Compliance Factor</span>
            <div className="text-3xl sm:text-4xl font-black mt-2 drop-shadow-md">{complianceRate}%</div>
            <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Optimal health ratio &rarr;</div>
          </div>
          <div onClick={() => changeTab('history')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Executed Audits</span>
            <div className="text-3xl sm:text-4xl font-black mt-2 drop-shadow-md">{history.length}</div>
            <div className="text-[11px] text-blue-200 mt-2 font-bold tracking-wide">Traceable sign-off operations &rarr;</div>
          </div>
        </div>
      </section>

      {/* CORE WRAPPER LAYOUT WITH LEFT NAVIGATION SIDEBAR */}
      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto">
        
        {/* DYNAMIC NAVIGATION SIDEBAR PANEL */}
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-4 space-y-1 flex flex-col shrink-0 z-10">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 hidden md:block">
            Main Navigation
          </div>
          
          {navOrder.map((tabId, index) => {
            const info = navData[tabId];
            if (!info) return null;
            return (
              <React.Fragment key={tabId}>
                <div className="relative flex items-center group w-full">
                  {isEditingNav && isSystemAdmin && (
                    <div className="absolute left-[-8px] flex flex-col space-y-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveNav(index, -1)} className="text-[10px] bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5">▲</button>
                      <button onClick={() => moveNav(index, 1)} className="text-[10px] bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5">▼</button>
                    </div>
                  )}
                  <button 
                    onClick={() => !isEditingNav && changeTab(tabId)} 
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

                {/* NEW UI SEPARATOR FOR DAILY VS STATIC TASKS */}
                {tabId === 'workOrders' && (
                  <div className="pt-2 pb-1 w-full">
                     <div className="border-t border-gray-200 w-full mb-3"></div>
                     <div className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:block">
                       Database & Records
                     </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          
          {isSystemAdmin && (
            <button 
              onClick={() => changeTab("approvals")} 
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
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-x-hidden relative z-0">

{activeTab === "dashboard" && (
            <DashboardTab 
              operationalCount={operationalCount}
              overdueCount={overdueCount}
              calibrationCount={calibrationCount}
              correctiveCount={correctiveCount}
              expandedActionQueue={expandedActionQueue}
              openPmModal={openPmModal}
              currentUser={currentUser}
              isSystemAdmin={isSystemAdmin}
            />
          )}

          {activeTab === "workOrders" && (
            <WorkOrdersTab 
              handleAddWorkOrder={handleAddWorkOrder}
              isSubmittingWo={isSubmittingWo}
              newWo={newWo}
              setNewWo={setNewWo}
              assets={assets}
              activeAccounts={activeAccounts}
              pmTemplates={pmTemplates}
              filterSearch={filterSearch}
              setFilterSearch={setFilterSearch}
              filterPriority={filterPriority}
              setFilterPriority={setFilterPriority}
              filteredWorkOrders={filteredWorkOrders}
              currentUser={currentUser}
              isSystemAdmin={isSystemAdmin}
              handleUpdateWoStatus={handleUpdateWoStatus}
              deleteWorkOrder={deleteWorkOrder}
            />
          )}
        
          {activeTab === "assets" && (
            <AssetsTab 
              handleAddAssetSubmit={handleAddAssetSubmit}
              isAddingAsset={isAddingAsset}
              newAsset={newAsset}
              setNewAsset={setNewAsset}
              PM_CYCLE_OPTIONS={PM_CYCLE_OPTIONS}
              assetSearch={assetSearch}
              setAssetSearch={setAssetSearch}
              groupedAssets={groupedAssets}
              isSystemAdmin={isSystemAdmin}
              deleteAssetCategory={deleteAssetCategory}
              handleUpdateAssetStatus={handleUpdateAssetStatus}
              calculateDaysRemaining={calculateDaysRemaining}
              calculateNextPmDate={calculateNextPmDate}
              handleOpenAssetModal={handleOpenAssetModal}
              openPmModal={openPmModal}
              deleteAsset={deleteAsset}
            />
          )}

          {activeTab === "manuals" && (
            <ManualsTab 
              assetsWithManuals={assetsWithManuals}
              viewingManualAsset={viewingManualAsset}
              setViewingManualAsset={setViewingManualAsset}
              activeManualIndex={activeManualIndex}
              setActiveManualIndex={setActiveManualIndex}
              handleAttachManualSubmit={handleAttachManualSubmit}
              assets={assets}
              manualAssetIds={manualAssetIds}
              setManualAssetIds={setManualAssetIds}
              manualFileInputRef={manualFileInputRef}
              manualFile={manualFile}
              handleManualFileChange={handleManualFileChange}
              manualText={manualText}
              setManualText={setManualText}
              isAttachingManual={isAttachingManual}
              isSystemAdmin={isSystemAdmin}
              handleRemoveManual={handleRemoveManual}
            />
          )}

          {activeTab === "templates" && (
            <TemplatesTab 
              handleAddTemplateSubmit={handleAddTemplateSubmit}
              newTemplate={newTemplate}
              setNewTemplate={setNewTemplate}
              uniqueCategories={uniqueCategories}
              activeAccounts={activeAccounts}
              editingTemplateId={editingTemplateId}
              cancelEditTemplate={cancelEditTemplate}
              isAddingTemplate={isAddingTemplate}
              templateSearch={templateSearch}
              setTemplateSearch={setTemplateSearch}
              pmTemplates={pmTemplates}
              isSystemAdmin={isSystemAdmin}
              deleteTemplateCategory={deleteTemplateCategory}
              handleEditTemplateClick={handleEditTemplateClick}
              deleteTemplate={deleteTemplate}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab 
              filteredHistory={filteredHistory}
              historySearch={historySearch}
              setHistorySearch={setHistorySearch}
              isSystemAdmin={isSystemAdmin}
              deleteHistoryLog={deleteHistoryLog}
            />
          )}

          {activeTab === "approvals" && isSystemAdmin && (
            <ApprovalsTab 
              pendingApprovals={pendingApprovals}
              activeAccounts={activeAccounts}
              handleApproveUser={handleApproveUser}
              handleDenyUser={handleDenyUser}
              handleRevokeUser={handleRevokeUser}
            />
          )}

        </main>
      </div>

      {/* HARDWARE AND VENDOR MODAL */}
      <HardwareVendorModal 
        show={showAssetModal} 
        activeAssetDetails={activeAssetDetails} 
        onClose={() => setShowAssetModal(false)}
        newPart={newPart} setNewPart={setNewPart} addPart={addPart} removePart={removePart}
        newVendor={newVendor} setNewVendor={setNewVendor} addVendor={addVendor} removeVendor={removeVendor}
      />

      {/* GLOBAL MODALS */}
      <GlobalAlertModal 
        show={customModal.show} 
        title={customModal.title} 
        message={customModal.message} 
        type={customModal.type} 
        onConfirm={customModal.onConfirm ? () => { customModal.onConfirm(); setCustomModal({ show: false, title: "", message: "", type: "info", onConfirm: null }); } : null} 
        onClose={closeModal} 
      />

      {/* THE DYNAMIC PM EXECUTION MODAL */}
      <PmExecutionModal 
        isPmModalOpen={isPmModalOpen}
        closePmModal={closePmModal}
        handlePmSubmit={handlePmSubmit}
        selectedPmAsset={selectedPmAsset}
        selectedPmTemplate={selectedPmTemplate}
        setSelectedPmTemplate={setSelectedPmTemplate}
        pmTemplates={pmTemplates}
        pmAnswers={pmAnswers}
        setPmAnswers={setPmAnswers}
        pmStatusState={pmStatusState}
        setPmStatusState={setPmStatusState}
        pmComments={pmComments}
        setPmComments={setPmComments}
        isSubmittingPm={isSubmittingPm}
      />
    </div>
  );
}