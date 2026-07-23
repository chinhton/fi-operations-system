import React from 'react';

export default function AuthScreen({
  authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword,
  registerName, setRegisterName, registerRole, setRegisterRole, 
  registerDepartment, setRegisterDepartment,
  authError, authSuccess, isSigningIn, isRegistering,
  handleSignIn, handleRegister
}) {
  return (
    <div className="min-h-screen animated-gradient-bg flex flex-col justify-center items-center px-4 py-12 antialiased">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 animate-entrance overflow-hidden">
        
        <div className="bg-[#005596] px-8 py-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
          <div className="mb-4 flex justify-center relative z-10">
            <img src="/logo.png" alt="Fairchild Imaging Logo" className="h-24 w-auto max-w-[350px] object-contain rounded-xl bg-white p-3 shadow-md transform hover:scale-105 transition-transform duration-300" />
          </div>
          <h2 className="text-xl font-bold tracking-tight font-sans relative z-10 drop-shadow-sm">FI-Operations Management System</h2>
        </div>

        <div className="p-8">
          {authError && <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-3 text-xs font-semibold text-red-800 leading-relaxed animate-pulse">{authError}</div>}
          {authSuccess && <div className="mb-5 bg-green-50 border-l-4 border-green-500 p-3 text-xs font-semibold text-green-800 leading-relaxed">{authSuccess}</div>}

          <form onSubmit={authMode === "signin" ? handleSignIn : handleRegister} className="space-y-5">
            {authMode === "register" && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Technician Name" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] p-3 border bg-white outline-none" />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Corporate Department</label>
                  <select 
                    value={registerDepartment || ""} 
                    onChange={(e) => setRegisterDepartment(e.target.value)} 
                    required 
                    className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] p-3 border bg-white outline-none"
                  >
                    <option value="" disabled>-- Select Department --</option>
                    <option value="Facilities">Facilities</option>
                    <option value="Production: Sensor Assembly">Production: Sensor Assembly</option>
                    <option value="Production: Final Assembly and Test">Production: Final Assembly and Test</option>
                    <option value="Production Engineering">Production Engineering</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Corporate Email Address</label>
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="user@fcimg.com" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] p-3 border bg-white outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Security Password</label>
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-[#005596] focus:ring-1 focus:ring-[#005596] p-3 border bg-white outline-none" />
            </div>
            
            <button type="submit" disabled={isSigningIn || isRegistering} className="w-full bg-[#005596] text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5">
              {authMode === "signin" ? "Authorized Sign In" : "Submit Access Request"}
            </button>
          </form>
          
          <p className="text-center text-xs text-gray-500 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={() => setAuthMode(authMode === "signin" ? "register" : "signin")} className="text-[#00A1E4] hover:underline font-bold">
              {authMode === "signin" ? "Request Account Access" : "Back to Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}