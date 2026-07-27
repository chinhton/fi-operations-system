import React from 'react';

export default function ApprovalsTab({ 
  pendingApprovals, activeAccounts, 
  handleApproveUser, handleDenyUser, handleRevokeUser 
}) {
  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-entrance">
      {/* CARD 1: PENDING ACCOUNT REQUESTS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#005596] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">🔑 Pending Account Approvals</h3>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">{pendingApprovals.length} Gate Requests</span>
        </div>
        <div className="p-6">
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {pendingApprovals.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs font-sans">No pending registration requests. All tokens are processed.</div>
            ) : (
              pendingApprovals.map((u) => (
                <div key={`${u.email}-pending`} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-xs text-gray-900">{u.name}</h4>
                      {u.department && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-purple-100 text-purple-700">
                          {u.department}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-mono block mt-1">{u.email}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleApproveUser(u.email)} className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold uppercase py-1.5 px-3 rounded shadow transition">Approve Access</button>
                    <button onClick={() => handleDenyUser(u.email)} className="border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold uppercase py-1.5 px-3 rounded transition">Decline</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CARD 2: ACTIVE AUTHORIZED USERS DIRECTORY */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">🟢 Active Authorized Accounts</h3>
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full font-bold">{activeAccounts.length} Total Users</span>
        </div>
        <div className="p-6">
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {activeAccounts.map((u) => (
              <div key={`${u.email}-active`} className="p-4 bg-white hover:bg-gray-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4 className="font-bold text-xs text-gray-900">{u.name}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${u.role === 'admin' || u.role === 'System Admin' ? 'bg-blue-100 text-[#005596]' : 'bg-slate-100 text-slate-700'}`}>
                      {u.role}
                    </span>
                    {u.department && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-purple-100 text-purple-700">
                        {u.department}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-mono block mt-1">{u.email}</span>
                </div>
                <div>
                  {u.email === "admin@fcimg.com" ? (
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-3 py-1.5 block">Root Immutable</span>
                  ) : (
                    <button onClick={() => handleRevokeUser(u.email)} className="text-xs font-bold text-red-600 hover:text-red-800 transition py-1.5 px-3 uppercase tracking-wider">
                      Revoke Access
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}