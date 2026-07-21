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

  useCosmosSync(auth.currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory);

  // --- ROLE-BASED VISIBILITY FILTERING ---
  // Calculates exactly what the user is allowed to see based on their role
  const isGodMode = auth.isSystemAdmin;
  const userEmail = auth.currentUser?.email;

  const visibleAssets = isGodMode ? assets : assets.filter(a => a.managerEmail === userEmail || a.operatorEmail === userEmail);
  const visibleWorkOrders = isGodMode ? workOrders : workOrders.filter(w => w.managerEmail === userEmail || w.operatorEmail === userEmail);
  const visibleTemplates = isGodMode ? pmTemplates : pmTemplates.filter(t => t.managerEmail === userEmail || t.operatorEmail === userEmail);
  const visibleUsers = isGodMode ? users : users.filter(u => u.email === userEmail);
  // ---------------------------------------

  // Hooks process ONLY the filtered "visible" data
  const assetHooks = useAssets(visibleAssets, setAssets, history, setHistory, modals.triggerModal, modals.closeModal, auth.currentUser);
  const templateHooks = useTemplates(modals.triggerModal, modals.closeModal, visibleTemplates, setPmTemplates); 
  const manualHooks = useManuals(visibleAssets, setAssets, setHistory, auth.currentUser, modals.triggerModal, modals.closeModal);
  const pmHooks = usePmExecution(visibleAssets, setAssets, history, setHistory, auth.currentUser, modals.triggerModal);
  const woHooks = useWorkOrders(auth.currentUser, visibleUsers, visibleAssets, modals.triggerModal, modals.closeModal, setHistory);
  const stats = useDashboardStats(visibleUsers, visibleAssets, visibleWorkOrders, visibleTemplates, history);

  const calculateDaysRemaining = (lastDateStr, freq) => { return 30; };
  const calculateNextPmDate = (lastDateStr, freq) => { return "TBD"; };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- GLOBAL AUDIT TRAIL INTERCEPTOR ---
  useEffect(() => {
    if (!auth.currentUser) return;
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, config] = args;
      const response = await originalFetch(url, config);

      if (response.ok && config && ['POST', 'PUT', 'DELETE'].includes(config.method) && typeof url === 'string' && !url.includes('/api/history') && !url.includes('/api/sendEmail')) {
        let actionName = "System Event";
        if (url.includes('/api/assets')) actionName = "Facility Asset";
        if (url.includes('/api/workorders')) actionName = "Work Order/PM";
        if (url.includes('/api/pmTemplates')) actionName = "PM Configuration";
        if (url.includes('/api/users')) actionName = "User Directory";

        let itemName = "";
        if (config.body) {
            try {
                const parsedBody = JSON.parse(config.body);
                itemName = parsedBody.name || parsedBody.title || parsedBody.id || "";
            } catch (e) {}
        }

        const actionTaken = config.method === 'DELETE' ? 'Deleted' : 'Created/Updated';
        const auditLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-AUTO", assetName: actionName, templateName: `${actionTaken} Record`, interval: "Automated", technician: auth.currentUser.name, email: auth.currentUser.email, status: "Completed Pass", comments: `Automated Tracker: ${auth.currentUser.name} ${actionTaken.toLowerCase()} a ${actionName} ${itemName ? `(${itemName})` : ''}.` };

        originalFetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(auditLog) })
        .then(res => res.json())
        .then(savedLog => { setHistory(prev => [savedLog, ...prev]); }).catch(err => console.error("Auto-audit failed:", err));
      }
      return response;
    };

    return () => { window.fetch = originalFetch; };
  }, [auth.currentUser, setHistory]); 

  // Render Authentication
  if (!auth.currentUser) {
    return (
      <>
        <style>{customStyles}</style>
        <AuthScreen {...auth} />
      </>
    );
  }

  // Master Props Object (Passes ONLY authorized arrays downwards)
  const masterProps = {
    activeTab, changeTab, currentTime, PM_CYCLE_OPTIONS, expandedActionQueue: [], 
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