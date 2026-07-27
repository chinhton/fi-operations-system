import { useState, useEffect } from 'react';

export default function useAuth(changeTab, triggerModal, history, setHistory) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('fi_oms_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerRole, setRegisterRole] = useState("Operator");
  
  const [registerDepartment, setRegisterDepartment] = useState(""); 

  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const isSystemAdmin = currentUser?.role === 'System Admin' || currentUser?.role === 'admin';

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsSigningIn(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const res = await fetch('/api/users');
      const users = await res.json();
      
      const user = users.find(u => u.email.toLowerCase() === authEmail.toLowerCase() && u.password === authPassword);
      
      if (user) {
        // --- STRICT STATUS CHECK ---
        if (user.status !== "Active") {
            setAuthError("Access Denied: Your account is pending administrator approval.");
            setIsSigningIn(false);
            return;
        }
        // --------------------------------------------

        setCurrentUser(user);
        localStorage.setItem('fi_oms_session', JSON.stringify(user));
        setAuthEmail("");
        setAuthPassword("");
        changeTab("dashboard");
      } else {
        setAuthError("Invalid credentials or account not found.");
      }
    } catch (err) {
      setAuthError("Network error during sign in.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // --- STRICT DOMAIN LOCK ---
    const normalizedEmail = authEmail.toLowerCase();
    if (!normalizedEmail.endsWith('@fcimg.com')) {
      setAuthError("Access Denied: Registration is strictly restricted to @fcimg.com accounts.");
      return;
    }
    // -----------------------------------
    
    if (!registerDepartment) {
      setAuthError("Please select a Corporate Department.");
      return;
    }

    setIsRegistering(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      // --- THE FIX: DUPLICATE EMAIL GUARD ---
      // Fetch the current user list to check for duplicates before proceeding
      const checkRes = await fetch('/api/users');
      const existingUsers = await checkRes.json();
      
      const emailExists = existingUsers.some(u => u.email.toLowerCase() === normalizedEmail);
      if (emailExists) {
          setAuthError("Registration Error: An account with this email address already exists.");
          setIsRegistering(false);
          return;
      }
      // ---------------------------------------

      const newUser = {
        id: `USR-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        name: registerName,
        email: authEmail,
        password: authPassword,
        role: registerRole,
        department: registerDepartment,
        status: "Pending" // Locked out by default
      };

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (res.ok) {
        setAuthSuccess("Access request submitted. Pending administrator approval.");
        setAuthMode("signin");
        setRegisterName("");
        setRegisterDepartment("");
        setAuthPassword("");
      } else {
        setAuthError("Failed to register account.");
      }
    } catch (err) {
      setAuthError("Network error during registration.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('fi_oms_session');
    changeTab("dashboard");
  };

  return {
    currentUser, setCurrentUser, isSystemAdmin,
    authMode, setAuthMode,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    registerName, setRegisterName,
    registerRole, setRegisterRole,
    registerDepartment, setRegisterDepartment,
    authError, authSuccess,
    isSigningIn, isRegistering,
    handleSignIn, handleRegister,
    handleSignOut
  };
}