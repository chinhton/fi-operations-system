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
  // 1. Core State
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("fi_current_tab") || "dashboard";
  });
  
  const [navOrder] = useState(['dashboard', 'workOrders', 'assets', 'manuals', 'templates', 'history']);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Data State (This is what got accidentally deleted!) ---
  const [history, setHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [users, setUsers] = useState([]);
  // -----------------------------------------------------------

  const changeTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("fi_current_tab", tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 2. Custom Hooks
  const modals = useModals();
  const historyHooks = useHistory(modals.triggerModal, modals.closeModal);
  const auth = useAuth(changeTab, modals.triggerModal, history, setHistory);

  useCosmosSync(auth.currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory);

  const assetHooks = useAssets(assets, setAssets, history, setHistory, modals.triggerModal, modals.closeModal, auth.currentUser);  const templateHooks = useTemplates(modals.triggerModal, modals.closeModal, pmTemplates, setPmTemplates);
  const manualHooks = useManuals(assets, setAssets, setHistory, auth.currentUser, modals.triggerModal, modals.closeModal);
  const pmHooks = usePmExecution(assets, setAssets, history, setHistory, auth.currentUser, modals.triggerModal);
  const woHooks = useWorkOrders(auth.currentUser, users, assets, modals.triggerModal, modals.closeModal, setHistory);
  const stats = useDashboardStats(users, assets, workOrders, pmTemplates, history);

  // Utilities
  const calculateDaysRemaining = (lastDateStr, freq) => { return 30; };
  const calculateNextPmDate = (lastDateStr, freq) => { return "TBD"; };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Render
  if (!auth.currentUser) {
    return (
      <>
        <style>{customStyles}</style>
        <AuthScreen {...auth} />
      </>
    );
  }

  // 4. Master Props Object
  const masterProps = {
    activeTab, changeTab, currentTime, PM_CYCLE_OPTIONS,
    expandedActionQueue: [], 
    
    // Spread the hooks FIRST...
    ...modals, ...historyHooks, ...auth, ...assetHooks, ...woHooks, ...templateHooks, ...manualHooks, ...pmHooks, ...stats,
    
    // Put live data LAST so it NEVER gets overwritten!
    history, setHistory, assets, setAssets, pmTemplates, setPmTemplates, workOrders, setWorkOrders, users, setUsers,
    calculateDaysRemaining, calculateNextPmDate,
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col antialiased">
      <style>{customStyles}</style>
      <TopHeader {...masterProps} />
      
      <KpiBanner 
        changeTab={changeTab} 
        workOrdersCount={(workOrders || []).filter(w => w.status !== "Completed").length}
        assetsCount={(assets || []).length} 
        complianceRate={stats.complianceRate || 100} 
        historyCount={(history || []).length}
      />

      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto mt-4">
        <SidebarNav navOrder={navOrder} pendingApprovalsCount={stats.pendingApprovals.length} {...masterProps} />
        <ContentRouter {...masterProps} />
      </div>

      <GlobalModals {...masterProps} />
    </div>
  );
}