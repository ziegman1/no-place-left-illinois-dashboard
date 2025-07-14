import React, { useState, useEffect, createContext, useContext } from "react";
import AboutPage from "./components/AboutPage";
import MapDashboard from "./components/MapDashboard";
import DataManagementPage from "./components/DataManagementPage";
import "./App.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { getApiUrl } from "./utils/api";

const COUNTY_NAMES = {
  '001': 'Adams', '003': 'Alexander', '005': 'Bond', '007': 'Boone', '009': 'Brown',
  '011': 'Bureau', '013': 'Calhoun', '015': 'Carroll', '017': 'Cass', '019': 'Champaign',
  '021': 'Christian', '023': 'Clark', '025': 'Clay', '027': 'Clinton', '029': 'Coles',
  '031': 'Cook', '033': 'Crawford', '035': 'Cumberland', '037': 'DeKalb', '039': 'De Witt',
  '041': 'Douglas', '043': 'DuPage', '045': 'Edgar', '047': 'Edwards', '049': 'Effingham',
  '051': 'Fayette', '053': 'Ford', '055': 'Franklin', '057': 'Fulton', '059': 'Gallatin',
  '061': 'Greene', '063': 'Grundy', '065': 'Hamilton', '067': 'Hancock', '069': 'Hardin',
  '071': 'Henderson', '073': 'Henry', '075': 'Iroquois', '077': 'Jackson', '079': 'Jasper',
  '081': 'Jefferson', '083': 'Jersey', '085': 'Jo Daviess', '087': 'Johnson', '089': 'Kane',
  '091': 'Kankakee', '093': 'Kendall', '095': 'Knox', '097': 'Lake', '099': 'LaSalle',
  '101': 'Lawrence', '103': 'Lee', '105': 'Livingston', '107': 'Logan', '109': 'McDonough',
  '111': 'McHenry', '113': 'McLean', '115': 'Macon', '117': 'Macoupin', '119': 'Madison',
  '121': 'Marion', '123': 'Marshall', '125': 'Mason', '127': 'Massac', '129': 'Menard',
  '131': 'Mercer', '133': 'Monroe', '135': 'Montgomery', '137': 'Morgan', '139': 'Moultrie',
  '141': 'Ogle', '143': 'Peoria', '145': 'Perry', '147': 'Piatt', '149': 'Pike',
  '151': 'Pope', '153': 'Pulaski', '155': 'Putnam', '157': 'Randolph', '159': 'Richland',
  '161': 'Rock Island', '163': 'St. Clair', '165': 'Saline', '167': 'Sangamon', '169': 'Schuyler',
  '171': 'Scott', '173': 'Shelby', '175': 'Stark', '177': 'Stephenson', '179': 'Tazewell',
  '181': 'Union', '183': 'Vermilion', '185': 'Wabash', '187': 'Warren', '189': 'Washington',
  '191': 'Wayne', '193': 'White', '195': 'Whiteside', '197': 'Will', '199': 'Williamson',
  '201': 'Winnebago', '203': 'Woodford'
};

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Reconstruct user object from stored token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        const user = {
          email: decoded.mail,
          role: decoded.role,
          roles: [
            { role: decoded.role, countyfp: decoded.countyfp, tractid: decoded.tractid }
          ]
        };
        setUser(user);
        setToken(storedToken);
      } catch (error) {
        console.error("Error decoding token:", error);
        // Token is invalid, remove it
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  // Mock login function that works without API
  const login = async (email, password) => {
    try {
      const API_URL = getApiUrl();
      const response = await axios.post(`${API_URL}/api/login`, {
        email,
        password
      });
      
      const { token, role, countyfp, tractid, email: userEmail, mustResetPassword } = response.data;
      
      const user = {
        email: userEmail,
        role: role,
        roles: [
          { role: role, countyfp: countyfp, tractid: tractid }
        ]
      };
      
      setUser(user);
      setToken(token);
      localStorage.setItem("token", token);
      setShowLogin(false);
      setMustResetPassword(mustResetPassword);
      setPendingEmail("");
      
      return { success: true, user, token, mustResetPassword };
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new Error("Invalid email or password");
      } else {
        throw new Error("Login failed. Please try again.");
      }
    }
  };

  const forcePasswordReset = async (email, newPassword) => {
    // Mock password reset
    setMustResetPassword(false);
    setPendingEmail("");
    setShowLogin(true);
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    return { success: true, message: "Password reset successfully" };
  };

  const requestPasswordReset = async (email) => {
    // Mock password reset request
    return { success: true, message: "Reset code sent to your email" };
  };

  const confirmPasswordReset = async (email, resetCode, newPassword) => {
    // Mock password reset confirmation
    return { success: true, message: "Password reset successfully" };
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
  const { requestPasswordReset, confirmPasswordReset, showForgotPassword, setShowForgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("request"); // "request" or "confirm"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!showForgotPassword) return null;

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await requestPasswordReset(email);
      setStep("confirm");
      setSuccess("Reset code sent to your email!");
    } catch (err) {
      setError("Failed to send reset code. Please try again.");
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      await confirmPasswordReset(email, resetCode, newPassword);
      setSuccess("Password reset successfully! You can now log in.");
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
      setError("Failed to reset password. Please check your reset code.");
    }
  };

  const handleBack = () => {
    setStep("request");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
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
        <h2>Reset Password</h2>
        {step === "request" ? (
          <form onSubmit={handleRequestReset}>
            <div style={{ marginBottom: 12 }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: 8 }} required />
            </div>
            {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
            <button type="submit" style={{ width: "100%", padding: 10, background: "#222", color: "#fff", border: "none", borderRadius: 4 }}>Send Reset Code</button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset}>
            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Reset Code" value={resetCode} onChange={e => setResetCode(e.target.value)} style={{ width: "100%", padding: 8 }} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: "100%", padding: 8 }} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: "100%", padding: 8 }} required />
            </div>
            {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ color: "green", marginBottom: 8 }}>{success}</div>}
            <button type="submit" style={{ width: "100%", padding: 10, background: "#222", color: "#fff", border: "none", borderRadius: 4 }}>Reset Password</button>
          </form>
        )}
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button onClick={handleBack} style={{ background: "none", border: "none", color: "#888", textDecoration: "underline", cursor: "pointer", marginRight: 8 }}>Back</button>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: "#888", textDecoration: "underline", cursor: "pointer" }}>Cancel</button>
        </div>
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
              // const API_URL = getApiUrl(); // This line was removed
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
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize from localStorage or default to 'about'
    return localStorage.getItem('currentPage') || 'about';
  });
  const { user } = useAuth();

  // Save current page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Add event listener for navigation from child components
  useEffect(() => {
    const handleNavigateToPage = (event) => {
      setCurrentPage(event.detail);
    };

    window.addEventListener('navigateToPage', handleNavigateToPage);

    return () => {
      window.removeEventListener('navigateToPage', handleNavigateToPage);
    };
  }, []);

  return (
    <div className="app-container" style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <header style={{ 
        padding: "0.5rem", 
        background: "#222", 
        color: "#fff", 
        fontSize: "2rem", 
        textAlign: "center", 
        display: "flex", 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        minHeight: "60px",
        flexShrink: 0
      }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          <AuthHeaderControls currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </div>
        <div style={{ fontSize: "2.4rem", fontWeight: "bold", lineHeight: "1", flex: 2, textAlign: "center" }}>
          #NoPlaceLeft Illinois
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <UserInfoAndLogout />
        </div>
      </header>
      <div style={{ 
        flex: 1, 
        display: "flex", 
        minHeight: 0,
        width: "100%"
      }}>
        {currentPage === 'about' ? (
          <AboutPage />
        ) : currentPage === 'map' ? (
          <MapDashboard />
        ) : currentPage === 'database' ? (
          <DataManagementPage />
        ) : (
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>Page Not Found</h2>
            <p>This page is not available.</p>
          </div>
        )}
      </div>
      <LoginModal />
      <ForgotPasswordModal />
      <ForcePasswordResetModal />
    </div>
  );
}

function AuthHeaderControls({ currentPage, setCurrentPage }) {
  const { user } = useAuth();
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button 
        onClick={() => setCurrentPage('about')} 
        style={{ 
          padding: '2px 8px', 
          background: currentPage === 'about' ? '#fff' : 'transparent', 
          color: currentPage === 'about' ? '#222' : '#fff', 
          border: '1px solid #fff', 
          borderRadius: 4, 
          cursor: 'pointer',
          fontSize: '0.75rem'
        }}
      >
        About
      </button>
      <button 
        onClick={() => setCurrentPage('map')} 
        style={{ 
          padding: '2px 8px', 
          background: currentPage === 'map' ? '#fff' : 'transparent', 
          color: currentPage === 'map' ? '#222' : '#fff', 
          border: '1px solid #fff', 
          borderRadius: 4, 
          cursor: 'pointer',
          fontSize: '0.75rem'
        }}
      >
        Map
      </button>
      {user && (
        <button 
          onClick={() => setCurrentPage('database')} 
          style={{ 
            padding: '2px 8px', 
            background: currentPage === 'database' ? '#fff' : 'transparent', 
            color: currentPage === 'database' ? '#222' : '#fff', 
            border: '1px solid #fff', 
            borderRadius: 4, 
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          Database Management
        </button>
      )}
    </div>
  );
}

function UserInfoAndLogout() {
  const { user, logout, setShowLogin } = useAuth();
  
  // Function to get role display name
  const getRoleDisplayName = (role, countyfp, tractid) => {
    switch (role) {
      case 'state':
        return 'Illinois State Coordinator';
      case 'county':
        return `${COUNTY_NAMES[countyfp] || 'Unknown'} County Coordinator`;
      case 'tract':
        return `Census Tract ${tractid} Coordinator`;
      default:
        return role;
    }
  };
  
  // Function to sort roles by hierarchy (state > county > tract)
  const sortRolesByHierarchy = (roles) => {
    const hierarchy = { 'state': 3, 'county': 2, 'tract': 1 };
    return roles.sort((a, b) => hierarchy[b.role] - hierarchy[a.role]);
  };
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {user && (
        <>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{user.email}</div>
            {user.roles && user.roles.length > 0 ? (
              <div style={{ fontSize: '0.65rem', color: '#ccc', marginTop: 1 }}>
                {sortRolesByHierarchy([...user.roles]).map((role, index) => (
                  <div key={index}>{getRoleDisplayName(role.role, role.countyfp, role.tractid)}</div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.65rem', color: '#ccc', marginTop: 1 }}>(No roles assigned)</div>
            )}
          </div>
          <button onClick={logout} style={{ height: 18, minWidth: 60, fontSize: '0.75rem', padding: '0 8px', borderRadius: 4, background: '#fff', color: '#222', border: '1px solid #ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Logout</button>
        </>
      )}
      {!user && (
        <button onClick={() => setShowLogin(true)} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>Login</button>
      )}
    </div>
  );
}

export default App;
