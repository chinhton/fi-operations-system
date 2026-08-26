import React, { useState } from 'react';

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
  keysCount = 0,
  correctiveCount = 0, 
  navOrder = [],      
  onOrderChange,
  manuals = [] // <-- THE FIX: Added manuals array so it doesn't crash when counting them!
}) {

  const isFacilities = currentUser?.department === 'Facilities';
  const canSeeKeys = isSystemAdmin || isFacilities;
  const hardwareCount = (parts?.length || 0) + (vendors?.length || 0);

  const navData = {
    dashboard: { icon: "📊", label: "Operations Dashboard" },
    corrective: { icon: "🚨", label: "Action Queue", badge: correctiveCount },
    assets: { icon: "🏢", label: "Facility Assets", badge: assetsCount },
    hardware: { icon: "🔩", label: "Hardware & Vendors", badge: hardwareCount },
    keys: { icon: "🔑", label: "Hard Key Tracking", badge: keysCount },
    manuals: { icon: "📖", label: "Equipment Manuals", badge: manualsCount },
    contractors: { icon: "🗂️", label: "Contractor Reports", badge: manuals.filter(m => m.docType === 'contractor').length }, // <-- Works perfectly now
    templates: { icon: "⚙️", label: "Established SOPs", badge: templatesCount },
    history: { icon: "📜", label: "Executed Audits", badge: historyCount }
  };

  const fallbackOrder = ['dashboard', 'corrective', 'assets', 'hardware', 'keys', 'manuals', 'contractors', 'templates', 'history'];
  const currentOrder = navOrder.length > 0 ? navOrder : fallbackOrder;

  const [draggedTab, setDraggedTab] = useState(null);

  const handleDragStart = (e, tabId) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTabId) => {
    if (!draggedTab || draggedTab === targetTabId) return;
    e.preventDefault();
    
    const newOrder = [...currentOrder];
    const draggedIdx = newOrder.indexOf(draggedTab);
    const targetIdx = newOrder.indexOf(targetTabId);
    
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedTab);
    
    if (onOrderChange) {
      onOrderChange(newOrder); 
    }
    setDraggedTab(null);
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0 bg-white border-r border-gray-200 p-4 space-y-2 flex flex-col">
      <div className="flex-1 space-y-2">
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b border-gray-100">
          Drag ⠿ to customize your layout
        </div>
        
        {currentOrder.map((tabId) => {
          if (tabId === 'keys' && !canSeeKeys) return null; 

          const info = navData[tabId];
          if (!info) return null;

          return (
            <div
              key={tabId}
              draggable={true} 
              onDragStart={(e) => handleDragStart(e, tabId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tabId)}
              className={`relative group ${draggedTab === tabId ? 'opacity-50' : ''}`}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 flex items-center px-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 text-gray-400 hover:text-[#005596]"
                title="Drag to lock your personal layout"
              >
                ⠿
              </div>
              <button 
                onClick={() => changeTab(tabId)} 
                className={`w-full flex items-center justify-between px-3 py-3 pl-6 text-xs font-bold tracking-wide rounded-lg transition-all text-left ${
                  activeTab === tabId 
                    ? "bg-[#005596]/10 text-[#005596]" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center space-x-3 pointer-events-none">
                  <span className="text-lg">{info.icon}</span> 
                  <span>{info.label}</span>
                </div>
                {info.badge !== undefined && info.badge !== 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono pointer-events-none ${
                    activeTab === tabId 
                      ? "bg-[#005596] text-white" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {info.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      
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