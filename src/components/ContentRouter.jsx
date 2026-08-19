import React from 'react';
import DashboardTab from './DashboardTab';
import WorkOrdersTab from './WorkOrdersTab';
import AssetsTab from './AssetsTab';

// --- NEW MODULE IMPORTS ---
import HardwareVendorsTab from './HardwareVendorsTab';
import KeyManagementTab from './KeyManagementTab'; 

import ManualsTab from './ManualsTab';
import TemplatesTab from './TemplatesTab';
import HistoryTab from './HistoryTab';
import ApprovalsTab from './ApprovalsTab';

export default function ContentRouter(props) {
  // Security Check for Key Tab
  const isFacilities = props.currentUser?.department === "Facilities";
  const canSeeKeys = props.isSystemAdmin || isFacilities;

  return (
    <main className="flex-grow p-4 md:p-8">
      {props.activeTab === "dashboard" && <DashboardTab {...props} />}
      {props.activeTab === "workOrders" && <WorkOrdersTab {...props} />}
      {props.activeTab === "assets" && <AssetsTab {...props} />}
      
      {/* --- NEW TABS ROUTED HERE --- */}
      {props.activeTab === "hardware" && <HardwareVendorsTab {...props} />}
      {props.activeTab === "keys" && canSeeKeys && <KeyManagementTab {...props} />}
      
      {props.activeTab === "manuals" && <ManualsTab {...props} />}
      {props.activeTab === "templates" && <TemplatesTab {...props} />}
      {props.activeTab === "history" && <HistoryTab {...props} />}
      {props.activeTab === "approvals" && props.isSystemAdmin && <ApprovalsTab {...props} />}
    </main>
  );
}