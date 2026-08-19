import React from 'react';

export default function SidebarNav({ 
  activeTab, 
  changeTab, 
  isSystemAdmin, 
  currentUser,
  pendingApprovalsCount,
  assetsCount = 0,
  manualsCount = 0,
  templatesCount = 0,
  historyCount = 0,
  parts = [],
  vendors = [],
  keysCount = 0
}) {

  // Security check for Keys tab
  const isFacilities = currentUser?.department === 'Facilities';
  const canSeeKeys = isSystemAdmin || isFacilities;

  // Combined count for Hardware & Vendors (Parts + Vendors)
  const hardwareCount = (parts?.length || 0) + (vendors?.length || 0);

  // Master definition of all sidebar buttons with live count badges
  const navData = {
    dashboard: { icon: "📊", label: "Operations Dashboard" },
    assets: { icon: "🏢", label: "Facility Assets", badge: assetsCount },
    hardware: { icon: "🔩", label: "Hardware & Vendors", badge: hardwareCount },
    keys: { icon: "🔑", label: "Hard Key Tracking", badge: keysCount },
    manuals: { icon: "📖", label: "Equipment Manuals", badge: manualsCount },
    templates: { icon: "⚙️", label: "Established SOPs", badge: templatesCount },
    history: { icon: "📜", label: "Executed Audits", badge: historyCount }
  };

  // Master Order
  const navOrder = ['dashboard', 'assets', 'hardware', 'keys', 'manuals', 'templates', 'history'];

  return (
    <aside className="w-full md:w-64 flex-shrink-0 bg-white border-r border-gray-200 p-4 space-y-2">
      {navOrder.map((tabId) => {
        if (tabId === 'keys' && !canSeeKeys) return null; 

        const info = navData[tabId];
        if (!info) return null;

        return (
          <button 
            key={tabId} 
            onClick={() => changeTab(tabId)} 
            className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${
              activeTab === tabId 
                ? "bg-[#005596]/10 text-[#005596]" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{info.icon}</span> 
              <span>{info.label}</span>
            </div>
            {info.badge !== undefined && info.badge !== 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                activeTab === tabId 
                  ? "bg-[#005596] text-white" 
                  : "bg-gray-100 text-gray-600"
              }`}>
                {info.badge}
              </span>
            )}
          </button>
        );
      })}
      
      {isSystemAdmin && (
        <button 
          onClick={() => changeTab("approvals")} 
          className={`w-full flex items-center justify-between px-3 py-3 mt-4 border-t text-xs font-bold tracking-wide rounded-lg transition-all text-left ${
            activeTab === "approvals" 
              ? "bg-red-50 text-red-700" 
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">🛡️</span> 
            <span>Account Approvals</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
            activeTab === "approvals" 
              ? "bg-red-600 text-white" 
              : "bg-red-100 text-red-700"
          }`}>
            {pendingApprovalsCount}
          </span>
        </button>
      )}
    </aside>
  );
}