import React, { useState, useEffect } from 'react';

// UI Components
import GlobalAlertModal from './components/GlobalAlertModal';
import TopHeader from './components/TopHeader';
import DashboardTab from './components/DashboardTab';
import ApprovalsTab from './components/ApprovalsTab';
import HistoryTab from './components/HistoryTab';
import WorkOrdersTab from './components/WorkOrdersTab';
import AssetsTab from './components/AssetsTab';
import TemplatesTab from './components/TemplatesTab';
import ManualsTab from './components/ManualsTab';
import HardwareVendorModal from './components/HardwareVendorModal';
import PmExecutionModal from './components/PmExecutionModal';

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
  const [navOrder] = useState(['dashboard', 'workOrders', 'assets', 'manuals', 'templates', 'history']);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Shared States (Hydrated by Cosmos DB)
  const [history, setHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [pmTemplates, setPmTemplates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [users, setUsers] = useState([]);

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

  // 2. Initialize Hooks
  const { customModal, triggerModal, closeModal } = useModals();
  const { deleteHistoryLog } = useHistory(triggerModal, closeModal);

  const {
    currentUser, isSystemAdmin, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, registerName, setRegisterName, authError, authSuccess, 
    isRegistering, isSigningIn, handleSignIn, handleRegister, handleLogout, 
    handleApproveUser, handleDenyUser, handleRevokeUser
  } = useAuth(changeTab, triggerModal, history, setHistory);

  // Cosmos DB Hydration (Runs safely inside the component!)
  useCosmosSync(currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory);

  const { 
    isAddingAsset, newAsset, setNewAsset, showAssetModal, setShowAssetModal, 
    activeAssetDetails, newPart, setNewPart, newVendor, setNewVendor,
    handleAddAssetSubmit, handleUpdateAssetStatus, deleteAsset, deleteAssetCategory, 
    handleOpenAssetModal, addPart, removePart, addVendor, removeVendor
  } = useAssets(triggerModal, closeModal, currentUser);

  const { 
    newWo, setNewWo, isSubmittingWo, handleAddWorkOrder, handleUpdateWoStatus, deleteWorkOrder 
  } = useWorkOrders(currentUser, users, assets, triggerModal, closeModal, setHistory);

  const {
    newTemplate, setNewTemplate, editingTemplateId, isAddingTemplate,
    handleAddTemplateSubmit, handleEditTemplateClick, cancelEditTemplate, 
    deleteTemplate, deleteTemplateCategory
  } = useTemplates(triggerModal, closeModal, pmTemplates, setPmTemplates);

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

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Computed UI Stats & Calculations
  const pendingApprovals = users.filter(u => !u.approved);
  const activeAccounts = users.filter(u => u.approved);
  
  const operationalCount = assets.filter(a => a.status === "Operational").length;
  const overdueCount = assets.filter(a => a.status === "Maintenance Due").length;
  const calibrationCount = assets.filter(a => a.status === "Out of Calibration").length;
  const correctiveCount = assets.filter(a => a.status === "Corrective Maintenance").length;
  
  const complianceRate = (() => { 
    if (assets.length === 0) return 100; 
    const nonCompliant = overdueCount + calibrationCount + correctiveCount; 
    return Math.round(((assets.length - nonCompliant) / assets.length) * 100); 
  })();

  const manualCount = assets.reduce((sum, a) => sum + (a.manuals ? a.manuals.length : (a.manual ? 1 : 0)), 0);
  const assetsWithManuals = assets.filter(a => (a.manuals && a.manuals.length > 0) || a.manual);
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

  const navData = {
    dashboard: { icon: '📊', label: 'Operations Dashboard' },
    workOrders: { icon: '🔧', label: 'Dispatch Work Orders', badge: workOrders.filter(w => w.status !== "Completed").length },
    assets: { icon: '🏭', label: 'Facility Assets', badge: assets.length },
    manuals: { icon: '📖', label: 'Equipment Manuals', badge: manualCount },
    templates: { icon: '⚙️', label: 'PM Task Configurations', badge: pmTemplates.length },
    history: { icon: '📜', label: 'Executed Audits', badge: history.length }
  };

  const calculateDaysRemaining = (lastDateStr, freq) => { return 30; }; // Placeholder logic
  const calculateNextPmDate = (lastDateStr, freq) => { return "TBD"; }; // Placeholder logic

  // 4. Render Logic
  if (!currentUser) {
    return (
      <div className="min-h-screen animated-gradient-bg flex flex-col justify-center items-center px-4 py-12 antialiased">
        <style>{customStyles}</style>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center animate-entrance">
            <h2 className="text-xl font-bold text-[#005596] mb-6">FI-Operations Auth</h2>
            {authError && <div className="mb-4 text-red-600 text-sm font-bold">{authError}</div>}
            {authSuccess && <div className="mb-4 text-green-600 text-sm font-bold">{authSuccess}</div>}
            
            <form onSubmit={authMode === "signin" ? handleSignIn : handleRegister} className="space-y-4">
               {authMode === "register" && (
                 <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Full Name" required className="w-full p-3 border rounded" />
               )}
               <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" required className="w-full p-3 border rounded" />
               <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" required className="w-full p-3 border rounded" />
               
               <button type="submit" disabled={isSigningIn || isRegistering} className="w-full bg-[#005596] text-white p-3 rounded font-bold transition transform hover:-translate-y-0.5">
                 {authMode === "signin" ? "Sign In" : "Request Access"}
               </button>
            </form>
            <button onClick={() => setAuthMode(authMode === "signin" ? "register" : "signin")} className="mt-4 text-sm text-[#00A1E4] hover:underline">
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

      {/* COMPLIANCE KPI TRACKER BANNER */}
      <section className="bg-gradient-to-r from-[#005596] to-[#00A1E4] text-white py-6 px-4 sm:px-6 lg:px-8 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
        <div className="max-w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <div onClick={() => changeTab('workOrders')} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg transform hover:-translate-y-1 hover:bg-white/20 transition-all duration-300 cursor-pointer">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-100 drop-shadow-sm">Pending Actions</span>
            <div className="text-3xl sm:text-4xl font-black mt-2 text-yellow-300 drop-shadow-md">{workOrders.filter(w => w.status !== "Completed").length}</div>
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

      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto mt-4">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-4 space-y-2">
          {navOrder.map((tabId) => {
            const info = navData[tabId];
            if (!info) return null;
            return (
              <button 
                key={tabId} 
                onClick={() => changeTab(tabId)} 
                className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === tabId ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
              >
                <div className="flex items-center space-x-3">
                  <span>{info.icon}</span> <span>{info.label}</span>
                </div>
                {info.badge !== undefined && info.badge !== 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === tabId ? "bg-[#005596] text-white" : "bg-gray-100 text-gray-600"}`}>
                    {info.badge}
                  </span>
                )}
              </button>
            );
          })}
          
          {isSystemAdmin && (
            <button 
              onClick={() => changeTab("approvals")} 
              className={`w-full flex items-center justify-between px-3 py-3 mt-4 border-t text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === "approvals" ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
              <div className="flex items-center space-x-3">
                <span>🔑</span> <span>Account Approvals</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${activeTab === "approvals" ? "bg-red-600 text-white" : "bg-red-100 text-red-700"}`}>
                {pendingApprovals.length}
              </span>
            </button>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
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

          {activeTab === "manuals" && (
            <ManualsTab 
              assetsWithManuals={assetsWithManuals} viewingManualAsset={viewingManualAsset} 
              setViewingManualAsset={setViewingManualAsset} activeManualIndex={activeManualIndex} 
              setActiveManualIndex={setActiveManualIndex} handleAttachManualSubmit={handleAttachManualSubmit} 
              assets={assets} manualAssetIds={manualAssetIds} setManualAssetIds={setManualAssetIds} 
              manualFileInputRef={manualFileInputRef} manualFile={manualFile} 
              handleManualFileChange={handleManualFileChange} manualText={manualText} 
              setManualText={setManualText} isAttachingManual={isAttachingManual} 
              isSystemAdmin={isSystemAdmin} handleRemoveManual={handleRemoveManual}
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

      {/* GLOBAL MODALS */}
      {showAssetModal && activeAssetDetails && (
        <HardwareVendorModal 
          show={showAssetModal} activeAssetDetails={activeAssetDetails} onClose={() => setShowAssetModal(false)}
          newPart={newPart} setNewPart={setNewPart} addPart={addPart} removePart={removePart}
          newVendor={newVendor} setNewVendor={setNewVendor} addVendor={addVendor} removeVendor={removeVendor}
        />
      )}
      
      <PmExecutionModal 
        isPmModalOpen={isPmModalOpen} closePmModal={closePmModal} handlePmSubmit={handlePmSubmit}
        selectedPmAsset={selectedPmAsset} selectedPmTemplate={selectedPmTemplate} 
        setSelectedPmTemplate={setSelectedPmTemplate} pmTemplates={pmTemplates} pmAnswers={pmAnswers} 
        setPmAnswers={setPmAnswers} pmStatusState={pmStatusState} setPmStatusState={setPmStatusState} 
        pmComments={pmComments} setPmComments={setPmComments} isSubmittingPm={isSubmittingPm}
      />

      <GlobalAlertModal show={customModal.show} title={customModal.title} message={customModal.message} type={customModal.type} onConfirm={customModal.onConfirm} onClose={closeModal} />
    </div>
  );
}