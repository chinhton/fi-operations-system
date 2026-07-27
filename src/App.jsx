import React, { useState, useEffect, useRef } from 'react';

// Layout Components
import TopHeader from './components/TopHeader';
import AuthScreen from './components/AuthScreen';
import KpiBanner from './components/KpiBanner';
import SidebarNav from './components/SidebarNav';
import ContentRouter from './components/ContentRouter';
import GlobalModals from './components/GlobalModals';

// Hook Imports
import useModals from './hooks/useModals';
import useAuth from './hooks/useAuth';
import useWorkOrders from './hooks/useWorkOrders';
import useTemplates from './hooks/useTemplates';
import useAssets from './hooks/useAssets';
import useHistory from './hooks/useHistory';
import useCosmosSync from './hooks/useCosmosSync';
import useManuals from './hooks/useManuals';
import usePmExecution from './hooks/usePmExecution';
import useDashboardStats from './hooks/useDashboardStats';

const customStyles = `
  body {
    font-family: 'Verdana', Geneva, sans-serif !important;
    background-color: #F4F6F8;
    color: #1A2530;
  }
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

  /* --- HARDCODED PDF EXPORT FIX: Removes Browser Headers/Footers --- */
  @media print {
    @page { 
      margin: 0; 
    }
    body { 
      padding: 1.5cm; 
    }
  }
`;

const PM_CYCLE_OPTIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annually", "Annually", "2-Year", "3-Year", "4-Year", "5-Year", "Calibration (Semi-Annual)", "Calibration (Annual)"];

export default function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("fi_current_tab") || "dashboard");
  const [navOrder] = useState(['dashboard', 'assets', 'manuals', 'templates', 'history']);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [history, setHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [manuals, setManuals] = useState([]); 

  const changeTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("fi_current_tab", tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const modals = useModals();
  const historyHooks = useHistory(modals.triggerModal, modals.closeModal);
  const auth = useAuth(changeTab, modals.triggerModal, history, setHistory);
  
  const { currentUser, setCurrentUser, isSystemAdmin } = auth;

  useCosmosSync(currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory, setManuals);

  useEffect(() => {
    if (currentUser && users.length > 0) {
      const liveAccount = users.find(u => u.email === currentUser.email);
      if (!liveAccount || liveAccount.status !== 'Active') {
        console.warn("FI-OMS Security: Account revoked or pending. Forcing session termination.");
        setCurrentUser(null);
        localStorage.removeItem('fi_oms_session');
      }
    }
  }, [users, currentUser, setCurrentUser]);

  const userEmailRaw = currentUser?.email || "";
  const userEmail = userEmailRaw.toLowerCase();
  const realRole = currentUser?.role;
  const userDept = currentUser?.department || ""; 
  
  const isGodMode = isSystemAdmin || realRole === 'System Admin' || realRole === 'admin' || userEmail === 'admin@fcimg.com';

  const calculateNextPmDate = (lastDateStr, freq) => {
    if (!lastDateStr || !freq) return null;
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
    if (isGodMode || userDept === "Facilities" || userDept.includes("Engineering")) return true; 
    return item.department === userDept; 
  };

  const visibleWorkOrders = workOrders.filter(filterHierarchy);
  const visibleTemplates = pmTemplates.filter(filterHierarchy);
  
  const visibleUsers = users.filter(u => {
    if (isGodMode || userDept === "Facilities" || userDept.includes("Engineering")) return true; 
    return u.department === userDept; 
  });

  const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const visibleAssets = assets.filter(filterHierarchy).map(asset => {
    let isOverdue = false;
    const assetTemplates = pmTemplates.filter(t => t.targetCategory === "Global" || t.targetCategory === asset.category);
    const freqs = [...new Set(assetTemplates.map(t => t.interval))];

    freqs.forEach(freq => {
      const targetDate = asset.pmDates?.[freq] || asset.lastPmDate;
      if (targetDate === todayStr) return; 
      
      const daysLeft = calculateDaysRemaining(targetDate, freq);
      if (daysLeft !== null && daysLeft < 0) {
        isOverdue = true;
      }
    });

    if (isOverdue && asset.status === "Operational") {
      return { ...asset, status: "Maintenance Due" };
    }
    return asset;
  });

  const assetHooks = useAssets(visibleAssets, setAssets, history, setHistory, modals.triggerModal, modals.closeModal, currentUser);
  const templateHooks = useTemplates(modals.triggerModal, modals.closeModal, visibleTemplates, setPmTemplates); 
  const manualHooks = useManuals(manuals, setManuals, visibleAssets, setHistory, currentUser, modals.triggerModal, modals.closeModal);
  const pmHooks = usePmExecution(visibleAssets, setAssets, history, setHistory, currentUser, modals.triggerModal);
  const woHooks = useWorkOrders(currentUser, visibleUsers, visibleAssets, modals.triggerModal, modals.closeModal, setHistory);
  const stats = useDashboardStats(visibleUsers, visibleAssets, visibleWorkOrders, visibleTemplates, history);

  const dynamicComplianceRate = visibleAssets.length > 0 
    ? Math.round((visibleAssets.filter(a => a.status === "Operational").length / visibleAssets.length) * 100) 
    : 100;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerEmailAlert = async (toAddress, subjectLine, bodyText) => {
    try {
      const emailPayload = { to: toAddress || "admin@fcimg.com", subject: subjectLine, body: bodyText };
      await fetch('/api/sendEmail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emailPayload) });
      return true;
    } catch (err) {
      console.error("❌ Email Blast Failed:", err);
      return false;
    }
  };

  const triggerTeamsAlert = async (toAddress, subjectLine, bodyText) => {
    const TEAMS_WEBHOOK_URL = "https://default219b57d412c64e939bb9034df55e5a.7d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/00ae5d02a393435fb76c7dea7d3cb551/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MYYSeuAlrrqTxDXF5os3v3oG5sbcx5r6YHWBUpJOoDw";

    try {
      const isTargeted = toAddress && toAddress !== "admin@fcimg.com";
      const mentionTag = isTargeted ? `<at>${toAddress}</at>` : "";
      const formattedBody = isTargeted ? `**Attention:** ${mentionTag}\n\n${bodyText}` : bodyText;

      const payload = {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: `🚨 ${subjectLine}`,
                  weight: "Bolder",
                  size: "Medium",
                  color: "Accent"
                },
                {
                  type: "TextBlock",
                  text: formattedBody,
                  wrap: true,
                  spacing: "Medium"
                }
              ],
              msteams: isTargeted ? {
                entities: [
                  {
                    type: "mention",
                    text: mentionTag,
                    mentioned: { id: toAddress, name: toAddress }
                  }
                ]
              } : undefined
            }
          }
        ]
      };

      await fetch(TEAMS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (err) {
      console.error("❌ FI-OMS Teams Blast Failed:", err);
      return false;
    }
  };

  const pendingApprovals = users.filter(u => u.status !== 'Active');
  const activeAccounts = users.filter(u => u.status === 'Active');

  // FIXED: Now looking up by ID instead of Email
  const handleApproveUser = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    
    const updatedUser = { ...targetUser, status: "Active" };
    try {
      await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedUser) });
      setUsers(users.map(u => u.id === id ? updatedUser : u));
    } catch (err) { console.error("User approval failed:", err); }
  };

  // FIXED: Now looking up by ID instead of Email
  const handleDenyUser = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    try {
      await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) { console.error("User denial failed:", err); }
  };

  // FIXED: Now looking up by ID instead of Email
  const handleRevokeUser = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    modals.triggerModal("Confirm Revocation", `Are you sure you want to permanently revoke system access for ${targetUser.email}?`, "confirm", async () => {
        try {
          await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
          setUsers(users.filter(u => u.id !== id));
          modals.closeModal();
        } catch (err) { console.error("User revocation failed:", err); }
      }
    );
  };

  const userRef = useRef(currentUser);
  useEffect(() => { userRef.current = currentUser; }, [currentUser]);

  const assetsRef = useRef(assets);
  useEffect(() => { assetsRef.current = assets; }, [assets]);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, config] = args;
      const response = await originalFetch(url, config);
      const activeUser = userRef.current;

      if (!activeUser && response.ok && config && config.method && config.method.toUpperCase() === 'POST' && typeof url === 'string' && url.includes('/api/users')) {
          let newUserDetails = {};
          if (config.body) { try { newUserDetails = JSON.parse(config.body); } catch (e) {} }
          
          triggerTeamsAlert(
              "admin@fcimg.com",
              "New Account Pending Approval",
              `A new user has registered for the Operations Management System.\n\n**Name:** ${newUserDetails.name || 'Unknown'}\n**Email:** ${newUserDetails.email || 'Unknown'}\n**Department:** ${newUserDetails.department || 'Unknown'}\n\nPlease log in to grant access.`
          );
          return response;
      }

      if (activeUser && response.ok && config && config.method && config.method.toUpperCase() === 'POST' && typeof url === 'string' && url.includes('/api/history')) {
          let logDetails = {};
          if (config.body) { try { logDetails = JSON.parse(config.body); } catch(e){} }
          
          const commentText = logDetails.comments || logDetails.notes || "";
          
          const isSystemLog = 
            logDetails.assetId === "SYS-AUTO" ||
            commentText.includes("Registered new facility asset") ||
            commentText.includes("Updated facility asset") ||
            commentText.includes("Automated Tracker");

          if (!isSystemLog) {
              originalFetch('/api/history').then(r => r.json()).then(setHistory).catch(console.error);
          }
      }

      if (activeUser && response.ok && config && config.method && ['POST', 'PUT', 'DELETE'].includes(config.method.toUpperCase()) && typeof url === 'string' && !url.includes('/api/history') && !url.includes('/api/sendEmail') && !url.includes('/api/manuals') && !url.includes('/api/upload')) {
        
        let actionName = "System Event";
        let tabSource = "System Background";

        if (url.includes('/api/assets')) { actionName = "Facility Asset"; tabSource = "Facility Assets Tab"; }
        if (url.includes('/api/pmTemplates')) { actionName = "Established SOP"; tabSource = "Established SOPs Tab"; }
        if (url.includes('/api/users')) { actionName = "User Directory"; tabSource = "Account Approvals Tab"; }

        if (actionName === "Facility Asset") { originalFetch('/api/assets').then(r => r.json()).then(setAssets).catch(console.error); } 
        else if (actionName === "Established SOP") { originalFetch('/api/pmTemplates').then(r => r.json()).then(setPmTemplates).catch(console.error); } 
        else if (actionName === "User Directory") {
            originalFetch('/api/users').then(r => r.json()).then(data => {
                setUsers(data);
                const updatedMe = data.find(u => u.email === activeUser.email);
                if (updatedMe) {
                    setCurrentUser(updatedMe);
                    localStorage.setItem('fi_oms_session', JSON.stringify(updatedMe));
                }
            }).catch(console.error);
        }

        let itemName = "";
        let itemDetails = {};
        if (config.body) {
            try {
                const parsedBody = JSON.parse(config.body);
                itemDetails = parsedBody;
                itemName = parsedBody.name || parsedBody.title || parsedBody.id || "";
            } catch (e) {}
        }

        let actionTaken = 'Updated';
        if (config.method.toUpperCase() === 'DELETE') {
            actionTaken = 'Deleted';
        } else {
            if (actionName === "Facility Asset" && itemDetails && itemDetails.id) {
                const isExisting = assetsRef.current.some(a => String(a.id) === String(itemDetails.id));
                actionTaken = isExisting ? 'Updated' : 'Created';
            } else {
                actionTaken = config.method.toUpperCase() === 'POST' ? 'Created' : 'Updated';
            }
        }

        const logComment = itemName 
            ? `Automated Tracker: ${activeUser.name} ${actionTaken.toLowerCase()} a ${actionName} (${itemName}).` 
            : `Automated Tracker: ${activeUser.name} ${actionTaken.toLowerCase()} a ${actionName}.`;

        const auditLog = { 
            id: `LOG-${Date.now().toString().slice(-4)}`, 
            timestamp: new Date().toLocaleString(), 
            assetId: "SYS-AUTO", 
            assetName: actionName, 
            templateName: `System Action - ${tabSource}`,
            interval: "Automated", 
            technician: activeUser.name, 
            email: activeUser.email, 
            status: "Completed Pass", 
            comments: logComment 
        };

        originalFetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditLog) })
        .then(res => res.json())
        .then(savedLog => { setHistory(prev => [savedLog, ...prev]); }).catch(console.error);

        const shouldAlertSOP = actionName === "Established SOP";
        const shouldAlertAsset = actionName === "Facility Asset" && (actionTaken === "Created" || actionTaken === "Deleted");

        if (shouldAlertSOP || shouldAlertAsset) {
             triggerTeamsAlert(
                 "admin@fcimg.com",
                 `${actionName} ${actionTaken}`,
                 `**${activeUser.name}** has ${actionTaken.toLowerCase()} a ${actionName} via the ${tabSource}.\n\n**Details:** ${logComment}\n**Timestamp:** ${new Date().toLocaleString()}`
             );
        } else if (actionName === "User Directory") {
             triggerTeamsAlert(
                 "admin@fcimg.com",
                 `Account Status Updated`,
                 `**${activeUser.name}** has updated a user account status.\n\n**Action Logged:** ${logComment}\n**Timestamp:** ${new Date().toLocaleString()}`
             );
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

  const effectiveUser = { ...currentUser };
  
  const masterProps = {
    activeTab, changeTab, currentTime, PM_CYCLE_OPTIONS, expandedActionQueue: [], 
    ...modals, ...historyHooks, ...auth, ...assetHooks, ...woHooks, ...templateHooks, ...manualHooks, ...pmHooks, ...stats,
    complianceRate: dynamicComplianceRate,
    currentUser: effectiveUser,
    isSystemAdmin: isGodMode, 
    triggerEmailAlert, 
    triggerTeamsAlert, 
    pendingApprovals,
    activeAccounts,
    handleApproveUser,
    handleDenyUser,
    handleRevokeUser,
    history, setHistory, 
    assets: visibleAssets, setAssets, 
    pmTemplates: visibleTemplates, setPmTemplates, 
    workOrders: visibleWorkOrders, setWorkOrders, 
    users: visibleUsers, setUsers,
    manuals, setManuals, 
    calculateDaysRemaining, calculateNextPmDate,
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col antialiased">
      <style>{customStyles}</style>
      <TopHeader {...masterProps} />
      
      <KpiBanner 
        changeTab={changeTab} 
        workOrdersCount={(visibleWorkOrders || []).filter(w => w.status !== "Completed").length}
        assetsCount={(visibleAssets || []).length} 
        complianceRate={dynamicComplianceRate} 
        historyCount={(history || []).length}
      />

      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto mt-4">
        <SidebarNav navOrder={navOrder} pendingApprovalsCount={isGodMode ? pendingApprovals.length : 0} {...masterProps} />
        <ContentRouter {...masterProps} />
      </div>

      <GlobalModals {...masterProps} />
    </div>
  );
}