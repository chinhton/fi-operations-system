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
import AuthScreen from './components/AuthScreen';
import KpiBanner from './components/KpiBanner';
import SidebarNav from './components/SidebarNav';
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

  // Cosmos DB Hydration
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
  const pendingApprovals = (users || []).filter(u => u && !u.approved);
  const activeAccounts = (users || []).filter(u => u && u.approved);
  
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
  
  const navData = {
    dashboard: { icon: '📊', label: 'Operations Dashboard' },
    workOrders: { icon: '🔧', label: 'Dispatch Work Orders', badge: workOrders.filter(w => w.status !== "Completed").length },
    assets: { icon: '🏭', label: 'Facility Assets', badge: assets.length },
    manuals: { icon: '📖', label: 'Equipment Manuals', badge: manualCount },
    templates: { icon: '⚙️', label: 'PM Task Configurations', badge: pmTemplates.length },
    history: { icon: '📜', label: 'Executed Audits', badge: history.length }
  };

  const calculateDaysRemaining = (lastDateStr, freq) => { return 30; }; 
  const calculateNextPmDate = (lastDateStr, freq) => { return "TBD"; }; 

  // 4. Render Logic
  if (!currentUser) {
    return (
      <>
        <style>{customStyles}</style>
        <AuthScreen 
          authMode={authMode} setAuthMode={setAuthMode}
          authEmail={authEmail} setAuthEmail={setAuthEmail}
          authPassword={authPassword} setAuthPassword={setAuthPassword}
          registerName={registerName} setRegisterName={setRegisterName}
          authError={authError} authSuccess={authSuccess}
          isSigningIn={isSigningIn} isRegistering={isRegistering}
          handleSignIn={handleSignIn} handleRegister={handleRegister}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col antialiased">
      <style>{customStyles}</style>
      
      <TopHeader currentTime={currentTime} currentUser={currentUser} isSystemAdmin={isSystemAdmin} handleLogout={handleLogout} />

      <KpiBanner 
        changeTab={changeTab}
        workOrdersCount={workOrders.filter(w => w.status !== "Completed").length}
        assetsCount={assets.length}
        complianceRate={complianceRate}
        historyCount={history.length}
      />

      <div className="flex flex-1 flex-col md:flex-row w-full max-w-full mx-auto mt-4">
        
        <SidebarNav 
          navOrder={navOrder}
          navData={navData}
          activeTab={activeTab}
          changeTab={changeTab}
          isSystemAdmin={isSystemAdmin}
          pendingApprovalsCount={pendingApprovals.length}
        />

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
              currentUser={currentUser} 
              handleAddWorkOrder={handleAddWorkOrder} newWo={newWo} setNewWo={setNewWo}
              isSubmittingWo={isSubmittingWo} assets={assets} activeAccounts={activeAccounts}
              workOrders={workOrders}
              isSystemAdmin={isSystemAdmin}
              handleUpdateWoStatus={handleUpdateWoStatus} deleteWorkOrder={deleteWorkOrder}
              pmTemplates={pmTemplates}
            />
          )}

          {activeTab === "assets" && (
             <AssetsTab 
               handleAddAssetSubmit={handleAddAssetSubmit} isAddingAsset={isAddingAsset} 
               newAsset={newAsset} setNewAsset={setNewAsset} PM_CYCLE_OPTIONS={PM_CYCLE_OPTIONS}
               assets={assets}
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
              currentUser={currentUser} 
              handleAddTemplateSubmit={handleAddTemplateSubmit} newTemplate={newTemplate} setNewTemplate={setNewTemplate}
              pmTemplates={pmTemplates} activeAccounts={activeAccounts} editingTemplateId={editingTemplateId}
              cancelEditTemplate={cancelEditTemplate} isAddingTemplate={isAddingTemplate}
              isSystemAdmin={isSystemAdmin} deleteTemplateCategory={deleteTemplateCategory}
              handleEditTemplateClick={handleEditTemplateClick} deleteTemplate={deleteTemplate} uniqueCategories={uniqueCategories}
            />
          )}

          {activeTab === "history" && (
             <HistoryTab 
               history={history}
               isSystemAdmin={isSystemAdmin} 
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
      <GlobalModals 
        showAssetModal={showAssetModal} activeAssetDetails={activeAssetDetails} setShowAssetModal={setShowAssetModal}
        newPart={newPart} setNewPart={setNewPart} addPart={addPart} removePart={removePart}
        newVendor={newVendor} setNewVendor={setNewVendor} addVendor={addVendor} removeVendor={removeVendor}
        isPmModalOpen={isPmModalOpen} closePmModal={closePmModal} handlePmSubmit={handlePmSubmit}
        selectedPmAsset={selectedPmAsset} selectedPmTemplate={selectedPmTemplate} setSelectedPmTemplate={setSelectedPmTemplate}
        pmTemplates={pmTemplates} pmAnswers={pmAnswers} setPmAnswers={setPmAnswers} pmStatusState={pmStatusState}
        setPmStatusState={setPmStatusState} pmComments={pmComments} setPmComments={setPmComments} isSubmittingPm={isSubmittingPm}
        customModal={customModal} closeModal={closeModal}
      />
    </div>
  );
}