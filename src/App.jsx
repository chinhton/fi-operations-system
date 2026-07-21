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
  const [navOrder] = useState(['dashboard', 'workOrders', 'assets', 'manuals', 'templates', 'history']);
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
  
  // Destructure for safe useEffect dependencies
  const { currentUser, setCurrentUser, isSystemAdmin } = auth;

  useCosmosSync(currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory);

  // --- ROLE-BASED VISIBILITY FILTERING (3-TIER HIERARCHY) ---
  const userEmail = currentUser?.email;
  const realRole = currentUser?.role;
  
  // 1. Check if they are legally an admin in the database
  const isRealAdmin = isSystemAdmin || userEmail === 'admin@fcimg.com';

  // 2. Determine their active role (If real admin, use the toggle. If not, use their real role)
  const activeRole = isRealAdmin ? impersonatedRole : realRole;
  
  // 3. Identify their exact tier level based on the active role
  const isGodMode = activeRole === 'System Admin' || activeRole === 'admin';
  const isManager = activeRole === 'Department Manager';

  // 4. Global Data Filter Logic
  const filterHierarchy = (item) => {
    if (isGodMode) return true; // Tier 1
    if (isManager) return item.managerEmail === userEmail || item.operatorEmail === userEmail; // Tier 2
    return item.operatorEmail === userEmail; // Tier 3
  };

  // 5. Apply the filters globally to all system data
  const visibleAssets = assets.filter(filterHierarchy);
  const visibleWorkOrders = workOrders.filter(filterHierarchy);
  const visibleTemplates = pmTemplates.filter(filterHierarchy);
  
  // 6. User Directory Filtering (Dictates assignment dropdowns)
  const visibleUsers = users.filter(u => {
    if (isGodMode) return true; 
    if (isManager) return u.email === userEmail || u.role === 'Operator'; 
    return u.email === userEmail; 
  });
  // -----------------------------------------------------------

  // Hooks process ONLY the filtered "visible" data
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

  // --- GLOBAL AUDIT TRAIL & AUTO-REFRESH INTERCEPTOR ---
  useEffect(() => {
    if (!currentUser) return;
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, config] = args;
      const response = await originalFetch(url, config);

      if (response.ok && config && ['POST', 'PUT', 'DELETE'].includes(config.method) && typeof url === 'string' && !url.includes('/api/history') && !url.includes('/api/sendEmail')) {
        
        // 1. DETERMINE WHAT WAS MODIFIED
        let actionName = "System Event";
        if (url.includes('/api/assets')) actionName = "Facility Asset";
        if (url.includes('/api/workorders')) actionName = "Work Order/PM";
        if (url.includes('/api/pmTemplates')) actionName = "PM Configuration";
        if (url.includes('/api/users')) actionName = "User Directory";

        // 2. UNIVERSAL AUTO-REFRESH
        if (actionName === "Facility Asset") {
            originalFetch('/api/assets').then(r => r.json()).then(setAssets).catch(console.error);
        } else if (actionName === "Work Order/PM") {
            originalFetch('/api/workorders').then(r => r.json()).then(setWorkOrders).catch(console.error);
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

        // 3. GENERATE THE AUDIT LOG
        let itemName = "";
        if (config.body) {
            try {
                const parsedBody = JSON.parse(config.body);
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
            templateName: `${actionTaken} Record`, 
            interval: "Automated", 
            technician: currentUser.name, 
            email: currentUser.email, 
            status: "Completed Pass", 
            comments: logComment 
        };

        originalFetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditLog) })
        .then(res => res.json())
        .then(savedLog => { setHistory(prev => [savedLog, ...prev]); }).catch(console.error);
      }
      return response;
    };

    return () => { window.fetch = originalFetch; };
  }, [currentUser, setCurrentUser, setHistory, setAssets, setWorkOrders, setPmTemplates, setUsers]); 
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