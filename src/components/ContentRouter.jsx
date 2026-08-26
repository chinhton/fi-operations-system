import React from 'react';
import DashboardTab from './DashboardTab';
import WorkOrdersTab from './WorkOrdersTab';
import AssetsTab from './AssetsTab';
import HardwareVendorsTab from './HardwareVendorsTab';
import KeyManagementTab from './KeyManagementTab'; 
import CorrectiveActionsTab from './CorrectiveActionsTab';
import ManualsTab from './ManualsTab';
import TemplatesTab from './TemplatesTab';
import HistoryTab from './HistoryTab';
import ApprovalsTab from './ApprovalsTab';

// --- NEW MODULE IMPORT ---
import ContractorReportsTab from './ContractorReportsTab';

export default function ContentRouter(props) {
  // Security Check for Key Tab
  const isFacilities = props.currentUser?.department === "Facilities";
  const canSeeKeys = props.isSystemAdmin || isFacilities;

  return (
    <main className="flex-grow p-4 md:p-8">
      {props.activeTab === "dashboard" && <DashboardTab {...props} />}
      {props.activeTab === "corrective" && <CorrectiveActionsTab {...props} />}
      {props.activeTab === "workOrders" && <WorkOrdersTab {...props} />}
      {props.activeTab === "assets" && <AssetsTab {...props} />}
      {props.activeTab === "hardware" && <HardwareVendorsTab {...props} />}
      {props.activeTab === "keys" && canSeeKeys && <KeyManagementTab {...props} />}
      
      {/* --- DOCUMENTS ROUTING --- */}
      {props.activeTab === "manuals" && <ManualsTab {...props} />}
      {props.activeTab === "contractors" && <ContractorReportsTab {...props} />}
      
      {props.activeTab === "templates" && <TemplatesTab {...props} />}
      {props.activeTab === "history" && <HistoryTab {...props} />}
      {props.activeTab === "approvals" && props.isSystemAdmin && <ApprovalsTab {...props} />}
    </main>
  );
}