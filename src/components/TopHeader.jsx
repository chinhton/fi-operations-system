import React, { useState } from 'react';
import AccountSettingsModal from './AccountSettingsModal';

export default function TopHeader({ 
  currentTime, 
  currentUser, 
  isSystemAdmin, 
  handleSignOut, 
  setCurrentUser, 
  triggerModal,
  closeModal // <-- Added closeModal to break the loop
}) {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 flex items-center">
              <img src="/logo.png" alt="Fairchild Imaging Logo" className="h-16 w-auto max-w-[280px] object-contain" />
            </div>
            <span className="h-10 w-px bg-gray-200"></span>
            <div><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#005596] m-0 font-sans">FI-Operation Management System</h1></div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden lg:block text-right border-r border-gray-200 pr-6">
               <span className="block text-xs font-bold text-gray-800">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
               <span className="block text-[10px] text-gray-500 font-mono mt-0.5">{currentTime.toLocaleTimeString('en-US')}</span>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-gray-900 block font-sans">{currentUser.name}</span>
              <span className={`text-[10px] font-bold font-mono block uppercase ${isSystemAdmin ? 'text-[#005596]' : 'text-gray-500'}`}>
                {currentUser.role}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsAccountModalOpen(true)} 
                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 text-xs font-bold rounded shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Settings
              </button>
              <button 
                // Explicitly calling closeModal() so it doesn't freeze on the screen
                onClick={() => triggerModal("Confirm Sign Out", "Are you sure you want to securely sign out of the system?", "confirm", () => { handleSignOut(); closeModal(); })} 
                className="px-3 py-1.5 bg-[#1A2530] text-white hover:bg-red-600 hover:shadow-md transform hover:-translate-y-0.5 text-xs font-bold rounded shadow-sm transition-all duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {isAccountModalOpen && (
        <AccountSettingsModal 
          currentUser={currentUser}
          isSystemAdmin={isSystemAdmin}
          setCurrentUser={setCurrentUser}
          triggerModal={triggerModal}
          closeModal={() => setIsAccountModalOpen(false)} 
        />
      )}
    </>
  );
}