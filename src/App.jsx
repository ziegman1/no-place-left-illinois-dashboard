import React, { useState, useEffect, createContext, useContext } from "react";
import MapDashboard from "./components/MapDashboard";
import "./App.css";
import axios from "axios";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await axios.get(`${API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      }
      setLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const API_URL = import.meta.env.VITE_API_URL;
    const res = await axios.post(`${API_URL}/api/login`, { email, password });
    if (res.data.mustResetPassword) {
      setMustResetPassword(true);
      setPendingEmail(email);
      setShowLogin(false);
      return { mustResetPassword: true };
    }
    setToken(res.data.token);
    localStorage.setItem("token", res.data.token);
    setUser({ email, role: res.data.role });
    setShowLogin(false);
    setMustResetPassword(false);
    setPendingEmail("");
    return res.data;
  };

  const forcePasswordReset = async (email, newPassword) => {
    const API_URL = import.meta.env.VITE_API_URL;
    const res = await axios.post(`${API_URL}/api/force-password-reset`, { email, newPassword });
    setMustResetPassword(false);
    setPendingEmail("");
    // After reset, prompt user to login again
    setShowLogin(true);
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    return res.data;
  };

  const requestPasswordReset = async (email) => {
    const API_URL = import.meta.env.VITE_API_URL;
    const res = await axios.post(`${API_URL}/api/request-password-reset`, { email });
    return res.data;
  };

  const confirmPasswordReset = async (email, resetCode, newPassword) => {
    const API_URL = import.meta.env.VITE_API_URL;
    const res = await axios.post(`${API_URL}/api/confirm-password-reset`, { email, resetCode, newPassword });
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      loading, 
      showLogin, 
      setShowLogin, 
      showForgotPassword,
      setShowForgotPassword,
      mustResetPassword, 
      setMustResetPassword, 
      forcePasswordReset, 
      requestPasswordReset,
      confirmPasswordReset,
      pendingEmail 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function LoginModal() {
  const { login, setShowLogin, showLogin, setShowForgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (!showLogin) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 8, minWidth: 320 }}>
        <h2>Coordinator Login</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              const result = await login(email, password);
              if (result && result.mustResetPassword) {
                // Password reset modal will show
                return;
              }
            } catch (err) {
              setError("Invalid credentials");
            }
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: 8 }} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: 8 }} required />
          </div>
          {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
          <button type="submit" style={{ width: "100%", padding: 10, background: "#222", color: "#fff", border: "none", borderRadius: 4 }}>Login</button>
        </form>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button 
            onClick={() => {
              setShowLogin(false);
              setShowForgotPassword(true);
            }} 
            style={{ background: "none", border: "none", color: "#888", textDecoration: "underline", cursor: "pointer" }}
          >
            Forgot Password?
          </button>
        </div>
        <button onClick={() => setShowLogin(false)} style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: "#888", textDecoration: "underline" }}>Cancel</button>
      </div>
    </div>
  );
}

function ForgotPasswordModal() {
  const { setShowForgotPassword, showForgotPassword, requestPasswordReset, confirmPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("request"); // "request" or "confirm"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!showForgotPassword) return null;

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      await requestPasswordReset(email);
      setStep("confirm");
      setSuccess("Reset code sent to your email. Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset code. Please check your email address.");
    }
    setLoading(false);
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      await confirmPasswordReset(email, resetCode, newPassword);
      setSuccess("Password reset successfully! You can now log in with your new password.");
      setTimeout(() => {
        setShowForgotPassword(false);
        setStep("request");
        setEmail("");
        setResetCode("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Invalid reset code or email. Please try again.");
    }
    setLoading(false);
  };

  const handleBack = () => {
    setStep("request");
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    setShowForgotPassword(false);
    setStep("request");
    setEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2500 }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 8, minWidth: 320 }}>
        <h2>{step === "request" ? "Forgot Password" : "Reset Password"}</h2>
        
        {step === "request" ? (
          <form onSubmit={handleRequestReset}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#666", fontSize: 14, marginBottom: 12 }}>
                Enter your email address and we'll send you a reset code.
              </p>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={{ width: "100%", padding: 8 }} 
                required 
              />
            </div>
            {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: 10, 
                background: "#222", 
                color: "#fff", 
                border: "none", 
                borderRadius: 4,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#666", fontSize: 14, marginBottom: 12 }}>
                Enter the reset code from your email and your new password.
              </p>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input 
                type="text" 
                placeholder="Reset Code" 
                value={resetCode} 
                onChange={e => setResetCode(e.target.value)} 
                style={{ width: "100%", padding: 8 }} 
                required 
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input 
                type="password" 
                placeholder="New Password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                style={{ width: "100%", padding: 8 }} 
                required 
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                style={{ width: "100%", padding: 8 }} 
                required 
              />
            </div>
            {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ color: "green", marginBottom: 8 }}>{success}</div>}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: 10, 
                background: "#222", 
                color: "#fff", 
                border: "none", 
                borderRadius: 4,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <button 
              type="button"
              onClick={handleBack}
              style={{ 
                marginTop: 8,
                width: "100%", 
                padding: 8, 
                background: "none", 
                color: "#666", 
                border: "1px solid #ddd", 
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Back
            </button>
          </form>
        )}
        
        <button 
          onClick={handleClose} 
          style={{ 
            marginTop: 12, 
            width: "100%", 
            background: "none", 
            border: "none", 
            color: "#888", 
            textDecoration: "underline",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ForcePasswordResetModal() {
  const { mustResetPassword, setMustResetPassword, forcePasswordReset, pendingEmail } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  if (!mustResetPassword) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 8, minWidth: 320 }}>
        <h2>Reset Your Password</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (newPassword.length < 8) {
              setError("Password must be at least 8 characters.");
              return;
            }
            if (newPassword !== confirmPassword) {
              setError("Passwords do not match.");
              return;
            }
            try {
              const API_URL = import.meta.env.VITE_API_URL;
              await forcePasswordReset(pendingEmail, newPassword);
              setSuccess(true);
            } catch (err) {
              setError("Failed to reset password. Try again.");
            }
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: "100%", padding: 8 }} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: "100%", padding: 8 }} required />
          </div>
          {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
          <button type="submit" style={{ width: "100%", padding: 10, background: "#222", color: "#fff", border: "none", borderRadius: 4 }}>Reset Password</button>
        </form>
        {success && <div style={{ color: "green", marginTop: 12 }}>Password reset! Please log in with your new password.</div>}
        <button onClick={() => setMustResetPassword(false)} style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: "#888", textDecoration: "underline" }}>Cancel</button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="app-container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "1rem", background: "#222", color: "#fff", fontSize: "2rem", textAlign: "center" }}>
          #NoPlaceLeft Illinois
          <AuthHeaderControls />
        </header>
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <MapDashboard />
        </div>
        <LoginModal />
        <ForgotPasswordModal />
        <ForcePasswordResetModal />
      </div>
    </AuthProvider>
  );
}

function AuthHeaderControls() {
  const { user, logout, setShowLogin } = useAuth();
  return (
    <span style={{ float: "right", fontSize: 16 }}>
      {user ? (
        <>
          <span style={{ marginRight: 16 }}>Logged in as {user.email}</span>
          <button onClick={logout} style={{ background: "#fff", color: "#222", border: "none", borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Logout</button>
        </>
      ) : (
        <button onClick={() => setShowLogin(true)} style={{ background: "#fff", color: "#222", border: "none", borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Coordinator Login</button>
      )}
    </span>
  );
}

export default App;
