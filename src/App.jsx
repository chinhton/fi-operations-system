import React, { useState, useEffect } from 'react';
import GlobalAlertModal from './components/GlobalAlertModal';
import TopHeader from './components/TopHeader';
import DashboardTab from './components/DashboardTab';
import ApprovalsTab from './components/ApprovalsTab';
import HistoryTab from './components/HistoryTab';
import WorkOrdersTab from './components/WorkOrdersTab';
import AssetsTab from './components/AssetsTab';
import TemplatesTab from './components/TemplatesTab';
import HardwareVendorModal from './components/HardwareVendorModal';

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
  // 1. Top-Level UI State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [navOrder] = useState(['dashboard', 'workOrders', 'assets', 'templates', 'history']);
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

  // 2. Initialize Hooks (Safely INSIDE the component)
  const { customModal, triggerModal, closeModal } = useModals();
  const { history, setHistory, deleteHistoryLog } = useHistory(triggerModal, closeModal);

  const {
    users, setUsers, currentUser, isSystemAdmin, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, registerName, setRegisterName, authError, authSuccess, 
    isRegistering, isSigningIn, handleSignIn, handleRegister, handleLogout, 
    handleApproveUser, handleDenyUser, handleRevokeUser
  } = useAuth(changeTab, triggerModal, history, setHistory);

  const { 
    assets, setAssets, isAddingAsset, newAsset, setNewAsset, 
    showAssetModal, setShowAssetModal, activeAssetDetails, 
    newPart, setNewPart, newVendor, setNewVendor,
    handleAddAssetSubmit, handleUpdateAssetStatus, deleteAsset, deleteAssetCategory, 
    handleOpenAssetModal, addPart, removePart, addVendor, removeVendor
  } = useAssets(triggerModal, closeModal, currentUser);

  const { 
    workOrders, setWorkOrders, newWo, setNewWo, isSubmittingWo, 
    handleAddWorkOrder, handleUpdateWoStatus, deleteWorkOrder 
  } = useWorkOrders(currentUser, users, assets, triggerModal, closeModal, setHistory);

  const {
    pmTemplates, setPmTemplates, 
    newTemplate, setNewTemplate, editingTemplateId, isAddingTemplate,
    handleAddTemplateSubmit, handleEditTemplateClick, cancelEditTemplate, 
    deleteTemplate, deleteTemplateCategory
  } = useTemplates(triggerModal, closeModal);

  // Initialize missing hooks for Blob Storage and PM Emails
  const { 
    manualAssetIds, setManualAssetIds, manualFile, manualText, setManualText, 
    isAttachingManual, viewingManualAsset, setViewingManualAsset, activeManualIndex, 
    setActiveManualIndex, manualFileInputRef, handleManualFileChange, 
    handleAttachManualSubmit, handleRemoveManual 
  } = useManuals(assets, setAssets, setHistory, currentUser, triggerModal, closeModal);

  const { 
    isPmModalOpen, selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate, 
    pmAnswers, setPmAnswers, pmStatusState, setPmStatusState, pmComments, 
    setPmComments, isSubmittingPm, openPmModal, closePmModal, handlePmSubmit 
  } = usePmExecution(assets, setAssets, history, setHistory, currentUser, triggerModal);

  // Hydrate all state from Azure Cosmos DB on load (Called AFTER all setters are defined)
  useCosmosSync(currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory);

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Computed UI Stats
  const pendingApprovals = users.filter(u => !u.approved);
  const activeAccounts = users.filter(u => u.approved);
  
  const operationalCount = assets.filter(a => a.status === "Operational").length;
  const overdueCount = assets.filter(a => a.status === "Maintenance Due").length;
  const calibrationCount = assets.filter(a => a.status === "Out of Calibration").length;
  const correctiveCount = assets.filter(a => a.status === "Corrective Maintenance").length;
  
  const uniqueCategories = Array.from(new Set((assets || []).map(a => a.category).filter(Boolean)));
  
  const filteredWorkOrders = workOrders.filter(w => w.title.includes(filterSearch) && (filterPriority === "All" || w.priority === filterPriority));
  
  const filteredHistory = history.filter(log => 
    (log.assetName || "").toLowerCase().includes(historySearch.toLowerCase()) || 
    (log.technician || "").toLowerCase().includes(historySearch.toLowerCase()) ||
    (log.templateName || "").toLowerCase().includes(historySearch.toLowerCase())
  );

  const groupedAssets = assets.filter(a => 
    (a.name || "").toLowerCase().includes(assetSearch.toLowerCase()) || 
    (a.serial || "").toLowerCase().includes(assetSearch.toLowerCase()) ||
    (a.category || "").toLowerCase().includes(assetSearch.toLowerCase())
  ).reduce((acc, asset) => {
    const cat = asset.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  // Utilities
  const calculateDaysRemaining = (lastDateStr, freq) => { return 30; }; // Add your actual date math logic here
  const calculateNextPmDate = (lastDateStr, freq) => { return "TBD"; }; // Add your actual date math logic here

  // 4. Render Logic
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

        <main className="flex-grow p-4 md:p-8">
          {activeTab === "dashboard" && (
            <DashboardTab 
              operationalCount={operationalCount} overdueCount={overdueCount}
              calibrationCount={calibrationCount} correctiveCount={correctiveCount}
              expandedActionQueue={[]} openPmModal={openPmModal} 
              currentUser={currentUser} isSystemAdmin={isSystemAdmin}
            />
          )}
          
          {activeTab === "workOrders" && (
            <WorkOrdersTab 
              handleAddWorkOrder={handleAddWorkOrder} newWo={newWo} setNewWo={setNewWo}
              isSubmittingWo={isSubmittingWo} assets={assets} activeAccounts={activeAccounts}
              filterSearch={filterSearch} setFilterSearch={setFilterSearch} 
              filterPriority={filterPriority} setFilterPriority={setFilterPriority}
              filteredWorkOrders={filteredWorkOrders} isSystemAdmin={isSystemAdmin}
              handleUpdateWoStatus={handleUpdateWoStatus} deleteWorkOrder={deleteWorkOrder}
              pmTemplates={pmTemplates}
            />
          )}

          {activeTab === "templates" && (
            <TemplatesTab 
              handleAddTemplateSubmit={handleAddTemplateSubmit} newTemplate={newTemplate} setNewTemplate={setNewTemplate}
              pmTemplates={pmTemplates} activeAccounts={activeAccounts} editingTemplateId={editingTemplateId}
              cancelEditTemplate={cancelEditTemplate} isAddingTemplate={isAddingTemplate}
              templateSearch={templateSearch} setTemplateSearch={setTemplateSearch}
              isSystemAdmin={isSystemAdmin} deleteTemplateCategory={deleteTemplateCategory}
              handleEditTemplateClick={handleEditTemplateClick} deleteTemplate={deleteTemplate} uniqueCategories={uniqueCategories}
            />
          )}

          {activeTab === "assets" && (
             <AssetsTab 
               handleAddAssetSubmit={handleAddAssetSubmit} isAddingAsset={isAddingAsset} 
               newAsset={newAsset} setNewAsset={setNewAsset} PM_CYCLE_OPTIONS={PM_CYCLE_OPTIONS}
               assetSearch={assetSearch} setAssetSearch={setAssetSearch} groupedAssets={groupedAssets} 
               isSystemAdmin={isSystemAdmin} deleteAssetCategory={deleteAssetCategory} 
               handleUpdateAssetStatus={handleUpdateAssetStatus} calculateDaysRemaining={calculateDaysRemaining} 
               calculateNextPmDate={calculateNextPmDate} handleOpenAssetModal={handleOpenAssetModal} 
               openPmModal={openPmModal} deleteAsset={deleteAsset}
             />
          )}

          {activeTab === "history" && (
             <HistoryTab 
               filteredHistory={filteredHistory} historySearch={historySearch} 
               setHistorySearch={setHistorySearch} isSystemAdmin={isSystemAdmin} 
               deleteHistoryLog={deleteHistoryLog}
             />
          )}

          {activeTab === "approvals" && isSystemAdmin && (
            <ApprovalsTab 
              pendingApprovals={pendingApprovals} activeAccounts={activeAccounts}
              handleApproveUser={handleApproveUser} handleDenyUser={handleDenyUser} handleRevokeUser={handleRevokeUser}
            />
          )}
        </main>
      </div>

      {showAssetModal && activeAssetDetails && (
        <HardwareVendorModal 
          show={showAssetModal} activeAssetDetails={activeAssetDetails} onClose={() => setShowAssetModal(false)}
          newPart={newPart} setNewPart={setNewPart} addPart={addPart} removePart={removePart}
          newVendor={newVendor} setNewVendor={setNewVendor} addVendor={addVendor} removeVendor={removeVendor}
        />
      )}
      <GlobalAlertModal show={customModal.show} title={customModal.title} message={customModal.message} type={customModal.type} onConfirm={customModal.onConfirm} onClose={closeModal} />
    </div>
  );
}