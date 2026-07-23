import React from 'react';

export default function SidebarNav({ 
  navOrder, 
  navData, 
  activeTab, 
  changeTab, 
  isSystemAdmin, 
  pendingApprovalsCount 
}) {
  return (
    // Added flex-shrink-0 to prevent the massive data tables from squishing the sidebar
    <aside className="w-full md:w-64 flex-shrink-0 bg-white border-r border-gray-200 p-4 space-y-2">
      {navOrder.map((tabId) => {
        const info = navData?.[tabId];
        if (!info) return null;

        // --- THE FIX: Intercept the legacy label and dynamically update it ---
        let displayLabel = info.label;
        if (tabId === 'templates' || displayLabel === "PM Task Configurations") {
            displayLabel = "Established SOPs";
        }
        // ---------------------------------------------------------------------

        return (
          <button 
            key={tabId} 
            onClick={() => changeTab(tabId)} 
            className={`w-full flex items-center justify-between px-3 py-3 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${activeTab === tabId ? "bg-[#005596]/10 text-[#005596]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <div className="flex items-center space-x-3">
              <span>{info.icon}</span> <span>{displayLabel}</span>
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
            {pendingApprovalsCount}
          </span>
        </button>
      )}
    </aside>
  );
}