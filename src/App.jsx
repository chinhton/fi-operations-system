import React, { useState, useEffect } from 'react';
import GlobalAlertModal from './components/GlobalAlertModal';
import TopHeader from './components/TopHeader';
import DashboardTab from './components/DashboardTab';
import ApprovalsTab from './components/ApprovalsTab';
import HistoryTab from './components/HistoryTab';
import WorkOrdersTab from './components/WorkOrdersTab';
import AssetsTab from './components/AssetsTab';
import TemplatesTab from './components/TemplatesTab';
import useAuth from './hooks/useAuth';
import useModals from './hooks/useModals';
import useWorkOrders from './hooks/useWorkOrders';
import useTemplates from './hooks/useTemplates';

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

export default function App() {
  // 1. Core Top-Level State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [history, setHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [navOrder, setNavOrder] = useState(['dashboard', 'workOrders', 'assets', 'templates', 'history']);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Search / Filter States
  const [filterSearch, setFilterSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [assetSearch, setAssetSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const changeTab = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 2. Initialize Custom Hooks
  const { customModal, triggerModal, closeModal } = useModals();

  const {
    users, currentUser, isSystemAdmin, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, registerName, setRegisterName, registerRole, setRegisterRole,
    authError, authSuccess, isRegistering, isSigningIn, handleSignIn, handleRegister, 
    handleLogout, handleApproveUser, handleDenyUser, handleRevokeUser
  } = useAuth(changeTab, triggerModal, history, setHistory);

  const { 
    workOrders, newWo, setNewWo, isSubmittingWo, 
    handleAddWorkOrder, handleUpdateWoStatus, deleteWorkOrder 
  } = useWorkOrders(currentUser, users, assets, triggerModal, closeModal, setHistory);

  const {
    newTemplate, setNewTemplate, editingTemplateId, isAddingTemplate,
    handleAddTemplateSubmit, handleEditTemplateClick, cancelEditTemplate, 
    deleteTemplate, deleteTemplateCategory
  } = useTemplates(triggerModal, closeModal, pmTemplates, setPmTemplates);

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute stats for UI
  const pendingApprovals = users.filter(u => !u.approved);
  const activeAccounts = users.filter(u => u.approved);
  const operationalCount = assets.filter(a => a.status === "Operational").length;
  const filteredWorkOrders = workOrders.filter(w => w.title.includes(filterSearch) && (filterPriority === "All" || w.priority === filterPriority));
  
  // (Stubbed openPmModal for Dashboard linking)
  const openPmModal = () => { console.log("PM Modal triggered"); };

  if (!currentUser) {
    return (
      <div className="min-h-screen animated-gradient-bg flex flex-col justify-center items-center px-4 py-12 antialiased">
        <style>{customStyles}</style>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-[#005596] mb-6">FI-Operations Auth</h2>
            {authError && <div className="mb-4 text-red-600 text-sm font-bold">{authError}</div>}
            {authSuccess && <div className="mb-4 text-green-600 text-sm font-bold">{authSuccess}</div>}
            
            <form onSubmit={authMode === "signin" ? handleSignIn : handleRegister} className="space-y-4">
               {authMode === "register" && (
                 <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Full Name" required className="w-full p-3 border rounded" />
               )}
               <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" required className="w-full p-3 border rounded" />
               <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" required className="w-full p-3 border rounded" />
               
               <button type="submit" disabled={isSigningIn || isRegistering} className="w-full bg-[#005596] text-white p-3 rounded font-bold">
                 {authMode === "signin" ? "Sign In" : "Request Access"}
               </button>
            </form>
            <button onClick={() => setAuthMode(authMode === "signin" ? "register" : "signin")} className="mt-4 text-sm text-[#00A1E4]">
               {authMode === "signin" ? "Need an account?" : "Back to login"}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col antialiased">
      <style>{customStyles}</style>
      
      <TopHeader currentTime={currentTime} currentUser={currentUser} isSystemAdmin={isSystemAdmin} handleLogout={handleLogout} />

      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto mt-4">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-4 space-y-2">
          {navOrder.map(tabId => (
             <button key={tabId} onClick={() => changeTab(tabId)} className={`w-full text-left p-3 rounded font-bold ${activeTab === tabId ? 'bg-[#005596]/10 text-[#005596]' : 'text-gray-600 hover:bg-gray-50'}`}>
                {tabId.toUpperCase()}
             </button>
          ))}
          {isSystemAdmin && (
            <button onClick={() => changeTab('approvals')} className={`w-full text-left p-3 rounded font-bold mt-4 border-t ${activeTab === 'approvals' ? 'bg-red-50 text-red-700' : 'text-gray-600'}`}>
                ACCOUNT APPROVALS ({pendingApprovals.length})
            </button>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-grow p-4 md:p-8">
          {activeTab === "dashboard" && <DashboardTab operationalCount={operationalCount} expandedActionQueue={[]} openPmModal={openPmModal} />}
          
          {activeTab === "workOrders" && (
            <WorkOrdersTab 
              handleAddWorkOrder={handleAddWorkOrder} newWo={newWo} setNewWo={setNewWo}
              isSubmittingWo={isSubmittingWo} assets={assets} activeAccounts={activeAccounts}
              filterSearch={filterSearch} setFilterSearch={setFilterSearch} 
              filterPriority={filterPriority} setFilterPriority={setFilterPriority}
              filteredWorkOrders={filteredWorkOrders} isSystemAdmin={isSystemAdmin}
              handleUpdateWoStatus={handleUpdateWoStatus} deleteWorkOrder={deleteWorkOrder}
            />
          )}

          {activeTab === "templates" && (
            <TemplatesTab 
              handleAddTemplateSubmit={handleAddTemplateSubmit} newTemplate={newTemplate} setNewTemplate={setNewTemplate}
              pmTemplates={pmTemplates} activeAccounts={activeAccounts} editingTemplateId={editingTemplateId}
              cancelEditTemplate={cancelEditTemplate} isAddingTemplate={isAddingTemplate}
              templateSearch={templateSearch} setTemplateSearch={setTemplateSearch}
              isSystemAdmin={isSystemAdmin} deleteTemplateCategory={deleteTemplateCategory}
              handleEditTemplateClick={handleEditTemplateClick} deleteTemplate={deleteTemplate} uniqueCategories={[]}
            />
          )}

          {activeTab === "assets" && <AssetsTab />}
          {activeTab === "history" && <HistoryTab />}

          {activeTab === "approvals" && isSystemAdmin && (
            <ApprovalsTab 
              pendingApprovals={pendingApprovals} activeAccounts={activeAccounts}
              handleApproveUser={handleApproveUser} handleDenyUser={handleDenyUser} handleRevokeUser={handleRevokeUser}
            />
          )}
        </main>
      </div>

      <GlobalAlertModal show={customModal.show} title={customModal.title} message={customModal.message} type={customModal.type} onConfirm={customModal.onConfirm} onClose={closeModal} />
    </div>
  );
}