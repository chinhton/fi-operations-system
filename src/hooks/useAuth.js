import { useState } from 'react';

export default function useAuth(changeTab, triggerModal, history, setHistory) {
  const [users, setUsers] = useState([
    {
      id: "USER-ADMIN",
      name: "System Administrator",
      email: "admin@fcimg.com",
      password: "admin",
      role: "System Admin",
      approved: true
    }
  ]);

  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = localStorage.getItem('fi_oms_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const [authMode, setAuthMode] = useState("signin"); 
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerRole, setRegisterRole] = useState("Operator"); 
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(""); setAuthSuccess("");
    
    try {
      if (!authEmail.trim() || !authPassword.trim()) { setAuthError("Username/Email and password fields are required."); return; }
      
      const matchedUser = users.find(u => u.email.toLowerCase() === authEmail.toLowerCase().trim());
      
      if (!matchedUser || matchedUser.password !== authPassword) { setAuthError("Invalid credentials."); return; }
      if (!matchedUser.approved) { setAuthError("Your account registration is currently pending authorization from the System Admin."); return; }
      
      localStorage.setItem('fi_oms_session', JSON.stringify(matchedUser));
      
      setCurrentUser(matchedUser); 
      setAuthEmail(""); 
      setAuthPassword(""); 
      changeTab("dashboard");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isRegistering) return;
    
    setAuthError(""); setAuthSuccess("");
    if (!registerName.trim() || !authEmail.trim() || !authPassword.trim()) { setAuthError("All registration fields are required."); return; }
    if (!authEmail.toLowerCase().endsWith("@fcimg.com")) { setAuthError("Registration blocked: Only verified @fcimg.com emails are authorized."); return; }
    
    const alreadyExists = users.some(u => u.email.toLowerCase() === authEmail.toLowerCase().trim());
    if (alreadyExists) { setAuthError("An account with this email address already exists."); return; }

    setIsRegistering(true);

    const newUser = { 
      id: `USER-${Date.now().toString().slice(-4)}`, 
      name: registerName.trim(), 
      email: authEmail.toLowerCase().trim(), 
      password: authPassword, 
      role: registerRole, 
      approved: false 
    };

    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });

      if (res.ok) {
        const savedUser = await res.json();
        setUsers([...users, savedUser]); 
        setRegisterName(""); 
        setAuthEmail(""); 
        setAuthPassword("");
        setRegisterRole("Operator");
        setAuthSuccess("Account request submitted. Please ask a System Admin to authorize your account."); 
        setAuthMode("signin");

        const adminEmails = users.filter(u => u.approved && (u.role === "System Admin" || u.role === "admin")).map(u => u.email);
        const adminMailingList = Array.from(new Set([...adminEmails, 'cton@fcimg.com'])).join(',');

        try {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: adminMailingList,
              subject: 'Action Required: New Account Request - FI Operations System',
              body: `System Admin,\n\nA new user has submitted a registration request for the Fairchild Imaging Operations System and is pending authorization.\n\nName: ${newUser.name}\nEmail: ${newUser.email}\nRequested Role: ${newUser.role}\n\nPlease log in to the dashboard to approve or decline this request.`
            }),
          });
        } catch (err) {
          console.error('Failed to trigger admin notification email:', err);
        }

      } else {
        setAuthError("Failed to communicate credential request block packet to Azure.");
      }
    } catch (err) {
      setAuthError("Network communication error. Please try again.");
      console.error(err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogout = () => { 
    localStorage.removeItem('fi_oms_session');
    setCurrentUser(null); 
    changeTab("dashboard"); 
  };

  const handleApproveUser = async (email) => {
    const targetUser = users.find(u => u.email === email);
    if (!targetUser) return;
    
    const updatedUser = { ...targetUser, approved: true };
    setUsers(users.map(u => u.email === email ? updatedUser : u));

    try {
      await fetch('/api/users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(updatedUser) 
      });
    } catch (err) {
      console.error("Failed to approve user in database:", err);
    }

    const approvalLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-AUTH", assetName: "User Authentication Services", templateName: "User Access Provisioning", interval: "On-Demand", technician: currentUser.name, email: currentUser.email, status: "Completed Pass", comments: `Admin approved corporate access token for user account: ${email} with role: ${targetUser.role}` };
    try {
      const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approvalLog) });
      if (res.ok) {
        const savedLog = await res.json(); setHistory(prev => [savedLog, ...prev]); 
      }
    } catch (err) { console.error(err); }

    const adminEmails = users.filter(u => u.approved && (u.role === "System Admin" || u.role === "admin")).map(u => u.email);
    const adminMailingList = Array.from(new Set([...adminEmails, 'cton@fcimg.com'])).join(',');

    try {
      await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          cc: adminMailingList,
          subject: 'Account Approved - FI Operations System',
          body: `Hello ${targetUser.name},\n\nYour account access request for the Fairchild Imaging Operations System has been approved by the System Administrator. You can now log in using your corporate email and security password.\n\nAssigned Role: ${targetUser.role}\n\nThank you.`
        }),
      });
    } catch (err) {
      console.error('Failed to trigger approval email:', err);
    }

    triggerModal("Account Approved", `Access granted successfully for ${email}. An automated notification email has been dispatched to the user.`, "success");
  };

  const handleDenyUser = (email) => {
    triggerModal("Confirm Action", `Decline and remove the access request for ${email}?`, "confirm", async () => {
        const targetUser = users.find(u => u.email === email);
        setUsers(prevUsers => prevUsers.filter(u => u.email !== email));

        if (targetUser && targetUser.id) {
            try {
                await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
            } catch (err) {
                console.error("Failed to delete user from database:", err);
            }
        }
    });
  };

  const handleRevokeUser = (email) => {
    triggerModal("Revoke Corporate Access", `Are you sure you want to permanently terminate access credentials for ${email}?`, "confirm", async () => {
      const targetUser = users.find(u => u.email === email);
      if (targetUser.email === "admin@fcimg.com") {
        triggerModal("Action Blocked", "System Admin account access restrictions cannot self-terminate.", "error");
        return;
      }

      setUsers(prevUsers => prevUsers.filter(u => u.email !== email));

      if (targetUser && targetUser.id) {
        try {
          await fetch(`/api/users?id=${targetUser.id}`, { method: 'DELETE' });
          
          const revokeLog = { id: `LOG-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString(), assetId: "SYS-REVOKE", assetName: "User Authentication Services", templateName: "User Access Termination", interval: "On-Demand", technician: currentUser.name, email: currentUser.email, status: "Incomplete Log", comments: `Admin permanently revoked corporate access token for account: ${email}` };
          const res = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(revokeLog) });
          if (res.ok) {
            const savedLog = await res.json(); setHistory(prev => [savedLog, ...prev]);
          }
          
          triggerModal("Access Revoked", `Account credentials for ${email} have been purged from database configuration records.`, "success");
        } catch (err) {
          console.error("Failed to delete user from database:", err);
        }
      }
    });
  };

  // Return everything App.jsx needs to function
  return {
    users, setUsers,
    currentUser, setCurrentUser,
    authMode, setAuthMode,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    registerName, setRegisterName,
    registerRole, setRegisterRole,
    authError, setAuthError,
    authSuccess, setAuthSuccess,
    isRegistering, isSigningIn,
    handleSignIn, handleRegister, handleLogout,
    handleApproveUser, handleDenyUser, handleRevokeUser
  };
}