import React, { useState } from 'react';

export default function AccountSettingsModal({ currentUser, isSystemAdmin, closeModal, triggerModal, setCurrentUser }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(currentUser?.role || "Operator");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
            triggerModal("Error", "Passwords do not match. Please try again.", "error");
            return;
        }
        if (newPassword.length < 8) {
            triggerModal("Error", "Password must be at least 8 characters long.", "error");
            return;
        }
    }

    setIsSubmitting(true);

    try {
      const updatedUser = {
        ...currentUser,
        role: isSystemAdmin ? selectedRole : currentUser.role, 
      };

      if (newPassword) {
          updatedUser.password = newPassword; 
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });

      if (res.ok) {
        const savedUser = await res.json();
        setCurrentUser(savedUser);
        triggerModal("Success", "Account settings have been updated successfully.", "success");
        closeModal();
      } else {
        throw new Error("Failed to update user profile in database.");
      }
    } catch (error) {
      console.error(error);
      triggerModal("Error", "Could not connect to the database to update account.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
        
        <div className="bg-[#005596] px-6 py-4 flex justify-between items-center border-b border-[#00407a]">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">Account Settings</h2>
          <button onClick={closeModal} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          <div className="bg-slate-50 p-3 rounded border border-slate-100 mb-4">
            <span className="block text-xs font-bold text-slate-400 uppercase">Account Profile</span>
            <span className="block text-sm font-bold text-slate-800 mt-1">{currentUser.name}</span>
            <span className="block text-xs text-slate-500 font-mono">{currentUser.email}</span>
          </div>

          {isSystemAdmin && (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Account Privilege Level
              </label>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#005596] focus:border-[#005596] outline-none"
              >
                <option value="Operator">Standard Operator</option>
                <option value="Manager">Department Manager</option>
                <option value="Admin">System Administrator</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Warning: Granting Admin privileges allows global queue access.</p>
            </div>
          )}

          <hr className="border-slate-100" />

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              New Password (Optional)
            </label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="w-full text-sm p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#005596] focus:border-[#005596] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full text-sm p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#005596] focus:border-[#005596] outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
            <button 
              type="button" 
              onClick={closeModal}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#005596] hover:bg-[#00407a] rounded uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}