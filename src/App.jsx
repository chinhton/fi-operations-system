import React, { useState, useEffect, useRef } from 'react';

import TopHeader from './components/TopHeader';
import AuthScreen from './components/AuthScreen';
import KpiBanner from './components/KpiBanner';
import SidebarNav from './components/SidebarNav';
import ContentRouter from './components/ContentRouter';
import GlobalModals from './components/GlobalModals';

import useModals from './hooks/useModals';
import useAuth from './hooks/useAuth';
import useWorkOrders from './hooks/useWorkOrders';
import useTemplates from './hooks/useTemplates';
import useAssets from './hooks/useAssets';
import useHistory from './hooks/useHistory';
import useManuals from './hooks/useManuals';
import usePmExecution from './hooks/usePmExecution';
import useDashboardStats from './hooks/useDashboardStats';

const useIdleTimeout = (onTimeout, idleTime = 300000) => {
  const timeoutRef = useRef(null);

  const handleActivity = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(onTimeout, idleTime);
  };

  useEffect(() => {
    handleActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);
};

const customStyles = `
  body { font-family: 'Verdana', Geneva, sans-serif !important; background-color: #F4F6F8; color: #1A2530; }
  @keyframes movingGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
  .animated-gradient-bg { background: linear-gradient(-45deg, #005596, #1A2530, #003058, #00A1E4); background-size: 400% 400%; animation: movingGradient 15s ease infinite; }
  @media print { @page { margin: 0; } body { padding: 1.5cm; } }
`;

const PM_CYCLE_OPTIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annually", "Annually", "2-Year", "3-Year", "4-Year", "5-Year", "Calibration (Semi-Annual)", "Calibration (Annual)"];

const isCategoryMatch = (templateCat, assetCat) => {
  if (!templateCat) return false;
  if (templateCat === "Global" || (Array.isArray(templateCat) && templateCat.includes("Global"))) return true;
  if (Array.isArray(templateCat)) return templateCat.includes(assetCat);
  return templateCat === assetCat;
};

export default function App() {

  useIdleTimeout(() => {
    if (currentUser) {
      alert("🔒 For security purposes, you have been logged out due to 5 minutes of inactivity.");
      localStorage.removeItem("fi_oms_session"); 
      setCurrentUser(null); 
    }
  }, 300000);
  
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("fi_current_tab");
    return saved ? saved : "dashboard";
  });
  
  const [navOrder, setNavOrder] = useState(['dashboard', 'corrective', 'assets', 'hardware', 'keys', 'manuals', 'templates', 'history']);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isAppLoading, setIsAppLoading] = useState(false);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const [hasFetchedManuals, setHasFetchedManuals] = useState(false);

  const [history, setHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]); 
  const [users, setUsers] = useState([]);
  const [manuals, setManuals] = useState([]); 
  
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [keys, setKeys] = useState([]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("fi_current_tab", tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const modals = useModals();
  const historyHooks = useHistory(modals.triggerModal, modals.closeModal);
  const auth = useAuth(changeTab, modals.triggerModal, history, setHistory);
  
  const { currentUser, setCurrentUser, isSystemAdmin } = auth;

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchCoreData = async () => {
      setIsAppLoading(true);
      try {
        const [usersRes, assetsRes, woRes, templatesRes, partsRes, vendorsRes, keysRes] = await Promise.all([
          window.fetch('/api/users').then(r => r.ok ? r.json() : []),
          window.fetch('/api/assets').then(r => r.ok ? r.json() : []),
          window.fetch('/api/workorders').then(r => r.ok ? r.json() : []),
          window.fetch('/api/templates').then(r => r.ok ? r.json() : []),
          window.fetch('/api/parts').then(r => r.ok ? r.json() : []),
          window.fetch('/api/vendors').then(r => r.ok ? r.json() : []),
          window.fetch('/api/keys').then(r => r.ok ? r.json() : [])
        ]);

        setUsers(usersRes);
        setAssets(assetsRes);
        setWorkOrders(woRes);
        setPmTemplates(templatesRes);
        setParts(partsRes);
        setVendors(vendorsRes);
        setKeys(keysRes);

        const me = usersRes.find(u => u.email === currentUser.email);
        if (me && me.preferences && me.preferences.navOrder) {
          setNavOrder(me.preferences.navOrder);
        }

      } catch (err) {
        console.error("Failed to load core system data:", err);
      } finally {
        setIsAppLoading(false);
      }
    };

    fetchCoreData();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && activeTab === 'history' && !hasFetchedHistory) {
      window.fetch('/api/history').then(r => r.ok ? r.json() : []).then(data => {
        setHistory(data);
        setHasFetchedHistory(true);
      }).catch(console.error);
    }
  }, [currentUser, activeTab, hasFetchedHistory]);

  useEffect(() => {
    if (currentUser && activeTab === 'manuals' && !hasFetchedManuals) {
      window.fetch('/api/manuals').then(r => r.ok ? r.json() : []).then(data => {
        setManuals(data);
        setHasFetchedManuals(true);
      }).catch(console.error);
    }
  }, [currentUser, activeTab, hasFetchedManuals]);

  useEffect(() => {
    if (currentUser && users.length > 0) {
      const liveAccount = users.find(u => u.email === currentUser.email);
      if (!liveAccount || liveAccount.status !== 'Active') {
        setCurrentUser(null);
        localStorage.removeItem('fi_oms_session');
      }
    }
  }, [users, currentUser, setCurrentUser]);

  const userEmailRaw = currentUser?.email || "";
  const userEmail = userEmailRaw.toLowerCase();
  const realRole = currentUser?.role;
  const userDept = currentUser?.department || ""; 
  
  const isGodMode = isSystemAdmin || realRole === 'System Admin' || realRole === 'admin' || userEmail === 'admin@fcimg.com' || userDept === 'System Administration';

  const handlePersonalNavChange = async (newOrder) => {
    setNavOrder(newOrder); 
    
    const updatedUser = {
      ...currentUser,
      preferences: {
        ...(currentUser.preferences || {}),
        navOrder: newOrder
      }
    };
    
    try {
      await window.fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      
      setCurrentUser(updatedUser);
      localStorage.setItem('fi_oms_session', JSON.stringify(updatedUser));
      setUsers(users.map(u => u.email === currentUser.email ? updatedUser : u));
    } catch (err) {
      console.error("Failed to save personal nav order to database:", err);
    }
  };

  const calculateNextPmDate = (lastDateStr, freqRaw) => {
    if (!lastDateStr || !freqRaw) return null;
    const freq = freqRaw.replace(/ Cycle/gi, '').trim();
    const lastDate = new Date(lastDateStr);
    let nextDate = new Date(lastDate);
    switch (freq) {
      case "Daily": nextDate.setDate(lastDate.getDate() + 1); break;
      case "Weekly": nextDate.setDate(lastDate.getDate() + 7); break;
      case "Monthly": nextDate.setMonth(lastDate.getMonth() + 1); break;
      case "Quarterly": nextDate.setMonth(lastDate.getMonth() + 3); break;
      case "Semi-Annually":
      case "Calibration (Semi-Annual)": nextDate.setMonth(lastDate.getMonth() + 6); break;
      case "Annually":
      case "Calibration (Annual)": nextDate.setFullYear(lastDate.getFullYear() + 1); break;
      case "2-Year": nextDate.setFullYear(lastDate.getFullYear() + 2); break;
      case "3-Year": nextDate.setFullYear(lastDate.getFullYear() + 3); break;
      case "4-Year": nextDate.setFullYear(lastDate.getFullYear() + 4); break;
      case "5-Year": nextDate.setFullYear(lastDate.getFullYear() + 5); break;
      default: return null;
    }
    return nextDate.toLocaleDateString(); 
  };

  const calculateDaysRemaining = (lastDateStr, freq) => {
    if (!lastDateStr || !freq) return null;
    const nextDateStr = calculateNextPmDate(lastDateStr, freq);
    if (!nextDateStr) return null;
    const nextDate = new Date(nextDateStr);
    const today = new Date();
    nextDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = nextDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filterHierarchy = (item) => {
    if (isGodMode) return true; 
    if (Array.isArray(item.department)) return item.department.includes(userDept);
    return item.department === userDept; 
  };

  const triggerEmailAlert = async (toAddress, subjectLine, bodyText) => {
    try {
      await fetch('/api/sendEmail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: toAddress || "admin@fcimg.com", subject: subjectLine, body: bodyText }) });
      return true;
    } catch (err) { return false; }
  };

  const triggerTeamsAlert = async (toAddress, subjectLine, bodyText) => {
    const TEAMS_WORKFLOW_URL = "https://default219b57d412c64e939bb9034df55e5a.7d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/16/workflows/4e37b9d1b1384e2bb2185bf5825d2bf7/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=BQdLjB2TG8j6w0oqYYkQeCCnJstPI8MyXL-xqcqsFyg";
    
    try {
      const targetEmails = toAddress && toAddress !== "" ? toAddress : "admin@fcimg.com";
      const emailArray = targetEmails.split(';');

      for (const email of emailArray) {
          const cleanEmail = email.trim();
          if (!cleanEmail) continue;

          const payload = {
            recipientEmail: cleanEmail,
            subject: subjectLine,
            bodyText: bodyText
          };

          await fetch(TEAMS_WORKFLOW_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
          });
      }
      return true;
    } catch (err) { 
      console.error("Teams Workflow Error:", err);
      return false; 
    }
  };

  const hasSwept = useRef(false);

  useEffect(() => {
    if (!currentUser || assets.length === 0 || pmTemplates.length === 0 || hasSwept.current) return;
    const runDailySweep = async () => {
      hasSwept.current = true; 
      let sweptCount = 0;
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Helper to find the manager email for automatic notifications
      const getManagerEmails = (dept) => {
          if (!users || users.length === 0 || !dept || dept === "Unassigned") return "admin@fcimg.com";
          const deptArray = Array.isArray(dept) ? dept : [dept];
          const managers = users.filter(u => deptArray.includes(u.department) && u.role === "Manager").map(u => u.email);
          return managers.length > 0 ? managers.join(';') : "admin@fcimg.com";
      };

      for (const asset of assets) {
        if (["Inactive", "Corrective Maintenance", "Out of Calibration"].includes(asset.status)) continue;
        
        let isPmOverdue = false;
        let isInspectionOverdue = false;
        
        const pmTemplatesForAsset = pmTemplates.filter(t => t.executionMode !== 'route' && isCategoryMatch(t.targetCategory, asset.category));
        const pmFreqs = [...new Set(pmTemplatesForAsset.map(t => t.interval))];
        pmFreqs.forEach(freq => {
          const targetDate = asset.pmDates?.[freq] || asset.lastPmDate;
          if (targetDate && targetDate !== todayStr) {
            const daysLeft = calculateDaysRemaining(targetDate, freq);
            if (daysLeft !== null && daysLeft < 0) isPmOverdue = true;
          }
        });

        const routeTemplatesForAsset = pmTemplates.filter(t => t.executionMode === 'route' && isCategoryMatch(t.targetCategory, asset.category));
        const routeFreqs = [...new Set(routeTemplatesForAsset.map(t => t.interval))];
        routeFreqs.forEach(freq => {
          const targetDate = asset.pmDates?.[freq] || asset.lastPmDate;
          if (targetDate && targetDate !== todayStr) {
            const daysLeft = calculateDaysRemaining(targetDate, freq);
            if (daysLeft !== null && daysLeft < 0) isInspectionOverdue = true;
          }
        });

        let newStatus = asset.status;
        if (isPmOverdue) {
            newStatus = "Maintenance Due";
        } else if (isInspectionOverdue && asset.status !== "Maintenance Due") {
            newStatus = "Inspection Due";
        }

        if (newStatus !== asset.status && (newStatus === "Maintenance Due" || newStatus === "Inspection Due")) {
          try {
            await window.fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...asset, status: newStatus }) });
            sweptCount++;

            // --- AUTO NOTIFICATION SYSTEM PING ---
            const operatorEmail = asset.operatorEmail && asset.operatorEmail.includes('@') ? asset.operatorEmail : null;
            const managerEmails = getManagerEmails(asset.department);
            const emailSet = new Set(managerEmails.split(';').filter(Boolean));
            if (operatorEmail) emailSet.add(operatorEmail);
            const targetEmails = Array.from(emailSet).join(';');

            const subject = `🚨 SYSTEM ESCALATION: ${newStatus} for ${asset.name}`;
            const bodyText = `**FI-MMS Automated Alert**<br><br>**Target Asset:** ${asset.name}<br>**Serial / Details:** ${asset.serial || "N/A"}<br>**System Flag:** ${newStatus}<br>**Assigned Operator:** ${asset.operatorEmail || "Unassigned"}<br><br>The background sweep has flagged this system as overdue for its required cycle. Please log into the FI-Maintenance Management System to execute the required protocol immediately.`;

            triggerTeamsAlert(targetEmails, subject, bodyText);

          } catch (err) {}
        }
      }
      if (sweptCount > 0) window.fetch('/api/assets').then(r => r.json()).then(setAssets).catch(console.error);
    };
    runDailySweep();
  }, [assets, pmTemplates, currentUser, users]);

  const visibleWorkOrders = workOrders.filter(filterHierarchy);
  const visibleTemplates = pmTemplates.filter(filterHierarchy);
  const visibleUsers = users.filter(u => { if (isGodMode) return true; return u.department === userDept; });
  const visibleAssets = assets.filter(filterHierarchy);

  const visibleHistory = isGodMode ? history : history.filter(h => {
    if (h.executionMode === 'route' && h.assetsIncluded) {
        return h.assetsIncluded.some(assetName => visibleAssets.some(va => va.name === assetName));
    }
    return visibleAssets.some(va => va.id === h.assetId || va.name === h.assetName);
  });

  const visibleManuals = isGodMode ? manuals : manuals.filter(m => {
    if (!m.linkedAssets || m.linkedAssets.length === 0) return true;
    return m.linkedAssets.some(assetId => visibleAssets.some(va => va.id === assetId || va.name === assetId));
  });

  const visibleParts = isGodMode ? parts : parts.filter(p => {
    if (!p.targetAssets || p.targetAssets.length === 0) return true;
    return p.targetAssets.some(assetId => visibleAssets.some(va => va.id === assetId || va.name === assetId));
  });

  const visibleVendors = isGodMode ? vendors : vendors; 
  const visibleKeys = isGodMode || userDept === 'Facilities' ? keys : [];
  
  const stats = useDashboardStats(visibleUsers, visibleAssets, visibleWorkOrders, visibleTemplates, visibleHistory);

  const assetHooks = useAssets(assets, setAssets, history, setHistory, modals.triggerModal, modals.closeModal, currentUser);
  const templateHooks = useTemplates(modals.triggerModal, modals.closeModal, pmTemplates, setPmTemplates); 
  const manualHooks = useManuals(manuals, setManuals, assets, setHistory, currentUser, modals.triggerModal, modals.closeModal);
  const pmHooks = usePmExecution(assets, setAssets, history, setHistory, currentUser, modals.triggerModal);
  const woHooks = useWorkOrders(currentUser, users, assets, modals.triggerModal, modals.closeModal, setHistory);

  const scorableAssets = visibleAssets.filter(a => a.status !== "Inactive");
  const dynamicComplianceRate = scorableAssets.length > 0 ? Math.round((scorableAssets.filter(a => a.status === "Active").length / scorableAssets.length) * 100) : 100;
  
  const activeCount = visibleAssets.filter(a => a.status === "Active").length;
  const inactiveCount = visibleAssets.filter(a => a.status === "Inactive").length;
  const overdueCount = visibleAssets.filter(a => a.status === "Maintenance Due").length;
  const inspectionCount = visibleAssets.filter(a => a.status === "Inspection Due").length;
  const calibrationCount = visibleAssets.filter(a => a.status === "Out of Calibration").length;
  const correctiveCount = visibleAssets.filter(a => a.status === "Corrective Maintenance").length;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingApprovals = users.filter(u => u.status !== 'Active');
  const activeAccounts = users.filter(u => u.status === 'Active');

  const handleApproveUser = async (email) => {
    const targetUser = users.find(u => u.email === email && u.status !== "Active");
    if (!targetUser) return;
    try {
      await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...targetUser, status: "Active" }) });
      setUsers(users.map(u => (u.email === email && u.status !== "Active") ? { ...targetUser, status: "Active" } : u));
    } catch (err) {}
  };

  const handleDenyUser = async (email) => {
    const targetUser = users.find(u => u.email === email && u.status !== "Active");
    if (!targetUser) return;
    try {
      await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
      setUsers(users.filter(u => !(u.email === email && u.status !== "Active")));
    } catch (err) {}
  };

  const handleRevokeUser = async (email) => {
    const targetUser = users.find(u => u.email === email && u.status === "Active");
    if (!targetUser) return;
    modals.triggerModal("Confirm Revocation", `Are you sure you want to permanently revoke system access for ${email}?`, "confirm", async () => {
        try {
          await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
          setUsers(users.filter(u => !(u.email === email && u.status === "Active")));
          modals.closeModal();
        } catch (err) {}
      }
    );
  };

  const userRef = useRef(currentUser);
  useEffect(() => { userRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, config] = args;
      const response = await originalFetch(url, config);
      const activeUser = userRef.current;

      if (!activeUser && response.ok && config && config.method && config.method.toUpperCase() === 'POST' && typeof url === 'string' && url.includes('/api/users')) {
          let newUserDetails = {};
          if (config.body) { try { newUserDetails = JSON.parse(config.body); } catch (e) {} }
          
          // --- FORMATTED WITH <br> ---
          triggerTeamsAlert("admin@fcimg.com", "New Account Pending Approval", `A new user has registered for the Operations Management System.<br><br>**Name:** ${newUserDetails.name || 'Unknown'}<br>**Email:** ${newUserDetails.email || 'Unknown'}<br>**Department:** ${newUserDetails.department || 'Unknown'}<br><br>Please log in to grant access.`);
          return response;
      }

      if (activeUser && response.ok && config && config.method && config.method.toUpperCase() === 'POST' && typeof url === 'string' && url.includes('/api/history')) {
          let logDetails = {};
          if (config.body) { try { logDetails = JSON.parse(config.body); } catch(e){} }
          const commentText = logDetails.comments || logDetails.notes || "";
          const templateName = logDetails.templateName || "";
          
          const isSystemLog = !templateName || logDetails.assetId === "SYS-AUTO" || templateName.includes("System Action") || templateName.includes("Asset Profile Update") || commentText.includes("Registered new facility asset") || commentText.includes("Updated facility asset") || commentText.includes("Automated Tracker");

          if (!isSystemLog) {
              originalFetch('/api/history').then(r => r.json()).then(setHistory).catch(console.error);
              const targetEmails = `admin@fcimg.com;${activeUser.email}`;
              
              // --- FORMATTED WITH <br> ---
              triggerTeamsAlert(targetEmails, `✅ PM Executed: ${logDetails.assetName || 'Asset'}`, `**${activeUser.name}** has completed a preventative maintenance task.<br><br>**Asset:** ${logDetails.assetName || 'Unknown'}<br>**SOP:** ${templateName}<br>**Status:** ${logDetails.status || 'Completed'}<br>**Notes:** ${commentText || 'None'}<br>**Timestamp:** ${new Date().toLocaleString()}`);
          }
      }

      if (activeUser && response.ok && config && config.method && ['POST', 'PUT', 'DELETE'].includes(config.method.toUpperCase()) && typeof url === 'string' && url.startsWith('/api/')) {
        
        const isBulk = url.includes('bulk=true');

        if (!isBulk) {
          if (url.includes('/api/assets') && !url.includes('/api/history')) { originalFetch('/api/assets').then(r => r.json()).then(setAssets).catch(console.error); }
          if (url.includes('/api/templates')) { originalFetch('/api/templates').then(r => r.json()).then(setPmTemplates).catch(console.error); }
          
          if (url.includes('/api/users') && !url.includes('/api/history')) {
              originalFetch('/api/users').then(r => r.json()).then(data => {
                  setUsers(data);
                  const updatedMe = data.find(u => u.email === activeUser.email);
                  if (updatedMe) {
                      setCurrentUser(updatedMe);
                      localStorage.setItem('fi_oms_session', JSON.stringify(updatedMe));
                  }
              }).catch(console.error);
          }
          if (url.includes('/api/parts')) { originalFetch('/api/parts').then(r => r.json()).then(setParts).catch(console.error); }
          if (url.includes('/api/vendors')) { originalFetch('/api/vendors').then(r => r.json()).then(setVendors).catch(console.error); }
          if (url.includes('/api/keys')) { originalFetch('/api/keys').then(r => r.json()).then(setKeys).catch(console.error); }
        }
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []); 

  if (!currentUser) {
    return (
      <>
        <style>{customStyles}</style>
        <AuthScreen {...auth} triggerEmailAlert={triggerEmailAlert} />
      </>
    );
  }

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center">
        <style>{customStyles}</style>
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-[#005596] border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-[#005596] font-black tracking-widest uppercase text-lg">Initializing Operations System...</h2>
          <p className="text-gray-500 font-mono text-xs mt-2">Syncing with Azure Cloud database</p>
        </div>
      </div>
    );
  }

  const effectiveUser = { ...currentUser };
  
  const masterProps = {
    activeTab, changeTab, currentTime, PM_CYCLE_OPTIONS, expandedActionQueue: [], 
    ...modals, ...historyHooks, ...auth, ...assetHooks, ...woHooks, ...templateHooks, ...manualHooks, ...pmHooks, ...stats,
    complianceRate: dynamicComplianceRate,
    currentUser: effectiveUser,
    isSystemAdmin: isGodMode, 
    triggerEmailAlert, triggerTeamsAlert, 
    pendingApprovals, activeAccounts, handleApproveUser, handleDenyUser, handleRevokeUser,
    
    history: visibleHistory, setHistory, 
    assets: visibleAssets, setAssets, 
    pmTemplates: visibleTemplates, setPmTemplates, 
    workOrders: visibleWorkOrders, setWorkOrders, 
    users: visibleUsers, setUsers,
    manuals: visibleManuals, setManuals, 
    parts: visibleParts, setParts,      
    vendors: visibleVendors, setVendors,  
    keys: visibleKeys, setKeys, 
    
    calculateDaysRemaining, calculateNextPmDate,
    activeCount, inactiveCount, overdueCount, inspectionCount, calibrationCount, correctiveCount,
    assetsCount: visibleAssets.length,
    templatesCount: visibleTemplates.length,
    historyCount: visibleHistory.length,
    manualsCount: visibleManuals.length,
    keysCount: visibleKeys.length,
    navOrder,
    onOrderChange: handlePersonalNavChange
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col antialiased">
      <style>{customStyles}</style>
      <TopHeader {...masterProps} />
      <KpiBanner {...masterProps} />
      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto mt-4">
        <SidebarNav pendingApprovalsCount={isGodMode ? pendingApprovals.length : 0} {...masterProps} />
        <ContentRouter {...masterProps} />
      </div>
      <GlobalModals {...masterProps} />
    </div>
  );
}