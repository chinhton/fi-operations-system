import React, { useState, useEffect } from 'react';

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
`;

const PM_CYCLE_OPTIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annually", "Annually", "2-Year", "3-Year", "4-Year", "5-Year", "Calibration (Semi-Annual)", "Calibration (Annual)"];

export default function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("fi_current_tab") || "dashboard");
  
  // Notice 'workOrders' is permanently removed from the nav to keep the UI strictly focused on Assets/PMs
  const [navOrder] = useState(['dashboard', 'assets', 'manuals', 'templates', 'history']);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // --- IMPERSONATION STATE ---
  const [impersonatedRole, setImpersonatedRole] = useState("System Admin");

  // --- RAW Data State ---
  const [history, setHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("fi_current_tab", tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const modals = useModals();
  const historyHooks = useHistory(modals.triggerModal, modals.closeModal);
  const auth = useAuth(changeTab, modals.triggerModal, history, setHistory);
  
  const { currentUser, setCurrentUser, isSystemAdmin } = auth;

  useCosmosSync(currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory);

  // --- ROLE-BASED VISIBILITY FILTERING (3-TIER HIERARCHY) ---
  const userEmail = currentUser?.email;
  const realRole = currentUser?.role;
  
  const isRealAdmin = isSystemAdmin || userEmail === 'admin@fcimg.com';
  const activeRole = isRealAdmin ? impersonatedRole : realRole;
  
  const isGodMode = activeRole === 'System Admin' || activeRole === 'admin';
  const isManager = activeRole === 'Department Manager';

  const filterHierarchy = (item) => {
    if (isGodMode) return true; // Tier 1
    if (isManager) return item.managerEmail === userEmail || item.operatorEmail === userEmail; // Tier 2
    return item.operatorEmail === userEmail; // Tier 3
  };

  const visibleAssets = assets.filter(filterHierarchy);
  const visibleWorkOrders = workOrders.filter(filterHierarchy);
  const visibleTemplates = pmTemplates.filter(filterHierarchy);
  
  const visibleUsers = users.filter(u => {
    if (isGodMode) return true; 
    if (isManager) return u.email === userEmail || u.role === 'Operator'; 
    return u.email === userEmail; 
  });
  // -----------------------------------------------------------

  const assetHooks = useAssets(visibleAssets, setAssets, history, setHistory, modals.triggerModal, modals.closeModal, currentUser);
  const templateHooks = useTemplates(modals.triggerModal, modals.closeModal, visibleTemplates, setPmTemplates); 
  const manualHooks = useManuals(visibleAssets, setAssets, setHistory, currentUser, modals.triggerModal, modals.closeModal);
  const pmHooks = usePmExecution(visibleAssets, setAssets, history, setHistory, currentUser, modals.triggerModal);
  const woHooks = useWorkOrders(currentUser, visibleUsers, visibleAssets, modals.triggerModal, modals.closeModal, setHistory);
  const stats = useDashboardStats(visibleUsers, visibleAssets, visibleWorkOrders, visibleTemplates, history);

  const calculateDaysRemaining = (lastDateStr, freq) => { return 30; };
  const calculateNextPmDate = (lastDateStr, freq) => { return "TBD"; };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- GLOBAL AUDIT TRAIL, AUTO-REFRESH & EMAIL INTERCEPTOR ---
  useEffect(() => {
    if (!currentUser) return;
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, config] = args;
      const response = await originalFetch(url, config);

      if (response.ok && config && ['POST', 'PUT', 'DELETE'].includes(config.method) && typeof url === 'string' && !url.includes('/api/history') && !url.includes('/api/sendEmail')) {
        
        // 1. DETERMINE WHAT WAS MODIFIED AND WHICH EXACT TAB IT CAME FROM
        let actionName = "System Event";
        let tabSource = "System Background";

        if (url.includes('/api/assets')) { 
            actionName = "Facility Asset"; 
            tabSource = "Facility Assets Tab"; 
        }
        if (url.includes('/api/pmTemplates')) { 
            actionName = "PM Configuration"; 
            tabSource = "PM Task Configurations Tab"; 
        }
        if (url.includes('/api/users')) { 
            actionName = "User Directory"; 
            tabSource = "Account Approvals Tab"; 
        }

        // 2. UNIVERSAL AUTO-REFRESH
        if (actionName === "Facility Asset") {
            originalFetch('/api/assets').then(r => r.json()).then(setAssets).catch(console.error);
        } else if (actionName === "PM Configuration") {
            originalFetch('/api/pmTemplates').then(r => r.json()).then(setPmTemplates).catch(console.error);
        } else if (actionName === "User Directory") {
            originalFetch('/api/users').then(r => r.json()).then(data => {
                setUsers(data);
                const updatedMe = data.find(u => u.email === currentUser.email);
                if (updatedMe) {
                    setCurrentUser(updatedMe);
                    localStorage.setItem('fi_oms_session', JSON.stringify(updatedMe));
                }
            }).catch(console.error);
        }

        // 3. GENERATE THE AUDIT LOG WITH TAB IDENTIFIER
        let itemName = "";
        let itemDetails = {};
        if (config.body) {
            try {
                const parsedBody = JSON.parse(config.body);
                itemDetails = parsedBody;
                itemName = parsedBody.name || parsedBody.title || parsedBody.id || "";
            } catch (e) {}
        }

        const actionTaken = config.method === 'DELETE' ? 'Deleted' : 'Created/Updated';
        const logComment = itemName 
            ? `Automated Tracker: ${currentUser.name} ${actionTaken.toLowerCase()} a ${actionName} (${itemName}).` 
            : `Automated Tracker: ${currentUser.name} ${actionTaken.toLowerCase()} a ${actionName}.`;

        const auditLog = { 
            id: `LOG-${Date.now().toString().slice(-4)}`, 
            timestamp: new Date().toLocaleString(), 
            assetId: "SYS-AUTO", 
            assetName: actionName, 
            templateName: `System Action - ${tabSource}`, // Exactly indicates the tab
            interval: "Automated", 
            technician: currentUser.name, 
            email: currentUser.email, 
            status: "Completed Pass", 
            comments: logComment 
        };

        originalFetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditLog) })
        .then(res => res.json())
        .then(savedLog => { setHistory(prev => [savedLog, ...prev]); }).catch(console.error);

        // 4. FIRE AUTOMATED EMAIL BLAST FOR CMMS ALERTS
        if (actionName === "Facility Asset" || actionName === "PM Configuration") {
             const emailPayload = {
                 to: itemDetails.managerEmail || "admin@fcimg.com", // Sends to the assigned manager or defaults to Admin
                 subject: `FI-OMS Alert: ${actionName} ${actionTaken}`,
                 body: `System Notification:\n\n${currentUser.name} has ${actionTaken.toLowerCase()} a ${actionName} via the ${tabSource}.\n\nDetails: ${logComment}\nTimestamp: ${new Date().toLocaleString()}\n\nPlease log in to the Operations Management System to review the changes.`
             };

             originalFetch('/api/sendEmail', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(emailPayload)
             }).catch(err => console.error("Automated email dispatch failed:", err));
        }
      }
      return response;
    };

    return () => { window.fetch = originalFetch; };
  }, [currentUser, setCurrentUser, setHistory, setAssets, setPmTemplates, setUsers]); 
  // ----------------------------------------

  // Render Authentication
  if (!currentUser) {
    return (
      <>
        <style>{customStyles}</style>
        <AuthScreen {...auth} />
      </>
    );
  }

  // Master Props Object
  const masterProps = {
    activeTab, changeTab, currentTime, PM_CYCLE_OPTIONS, expandedActionQueue: [], 
    impersonatedRole, setImpersonatedRole, isRealAdmin,
    ...modals, ...historyHooks, ...auth, ...assetHooks, ...woHooks, ...templateHooks, ...manualHooks, ...pmHooks, ...stats,
    
    history, setHistory, 
    assets: visibleAssets, setAssets, 
    pmTemplates: visibleTemplates, setPmTemplates, 
    workOrders: visibleWorkOrders, setWorkOrders, 
    users: visibleUsers, setUsers,
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
        complianceRate={stats.complianceRate || 100} 
        historyCount={(history || []).length}
      />

      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto mt-4">
        <SidebarNav navOrder={navOrder} pendingApprovalsCount={isGodMode ? stats.pendingApprovals.length : 0} {...masterProps} />
        <ContentRouter {...masterProps} />
      </div>

      <GlobalModals {...masterProps} />
    </div>
  );
}