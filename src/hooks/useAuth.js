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
      const res = await fetch('/api/users?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error("Database fetch failed");
      
      const users = await res.json();
      
      const safeEmail = (authEmail || "").trim().toLowerCase();
      
      // THE FIX: Optional chaining (?.) prevents crashes if older database records are missing an email
      const user = users.find(u => u?.email?.trim().toLowerCase() === safeEmail && u.password === authPassword);
      
      if (user) {
        if (user.status !== "Active") {
            setAuthError("Access Denied: Your account is pending administrator approval.");
            setIsSigningIn(false);
            return;
        }

        setCurrentUser(user);
        localStorage.setItem('fi_oms_session', JSON.stringify(user));
        setAuthEmail("");
        setAuthPassword("");
        changeTab("dashboard");
      } else {
        setAuthError("Invalid credentials or account not found.");
      }
    } catch (err) {
      console.error("Sign In Error:", err);
      setAuthError("Network error during sign in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const safeEmail = (authEmail || "").trim().toLowerCase();
    
    // --- STRICT DOMAIN LOCK ---
    if (!safeEmail.endsWith('@fcimg.com')) {
      setAuthError("Access Denied: Registration is strictly restricted to @fcimg.com accounts.");
      return;
    }
    
    if (!registerDepartment) {
      setAuthError("Please select a Corporate Department.");
      return;
    }

    setIsRegistering(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const checkRes = await fetch('/api/users?t=' + Date.now(), { cache: 'no-store' });
      if (!checkRes.ok) throw new Error("Database fetch failed");
      
      const existingUsers = await checkRes.json();
      
      // THE FIX: Optional chaining (?.) to safely skip over malformed user documents in Cosmos DB
      const emailExists = existingUsers.some(u => u?.email?.trim().toLowerCase() === safeEmail);
      
      if (emailExists) {
          setAuthError("Registration Error: An account with this email address already exists.");
          setIsRegistering(false);
          return;
      }

      const newUser = {
        id: `USR-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        name: (registerName || "").trim(),
        email: safeEmail, 
        password: authPassword,
        role: registerRole || "Operator",
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
      console.error("Registration Error:", err);
      setAuthError("Network error during registration. Please try again.");
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