import React, { useState, useEffect } from "react";
import axios from "axios";

function CountyEditModal({ county, isOpen, onClose, onCoordinatorAssigned }) {
  const [currentCoordinator, setCurrentCoordinator] = useState(null);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (county && isOpen) {
      setCoordinatorName("");
      setCoordinatorEmail("");
      setError("");
      setSuccess("");
      // Fetch current coordinator
      axios.get(`${API_URL}/api/coordinator/county/${county.countyfp}`)
        .then(res => setCurrentCoordinator(res.data.coordinator))
        .catch(() => setCurrentCoordinator(null));
    }
  }, [county, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.post(`${API_URL}/api/county/assign-coordinator`, {
        countyfp: county.countyfp,
        name: coordinatorName,
        email: coordinatorEmail
      });
      setSuccess("Coordinator assigned and welcome email sent!");
      setCurrentCoordinator(coordinatorEmail);
      if (onCoordinatorAssigned) onCoordinatorAssigned(coordinatorEmail);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign coordinator");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !county) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 4000
    }}>
      <div style={{
        background: "#fff",
        padding: 32,
        borderRadius: 8,
        minWidth: 400,
        maxWidth: 500,
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2>Assign County Coordinator</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#666"
            }}
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>{county.name} County</h3>
          <p style={{ margin: 0, color: "#666" }}>
            Current Coordinator: {currentCoordinator ? <b>{currentCoordinator}</b> : <span style={{ color: "#b00" }}>Needed</span>}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              Coordinator Name:
            </label>
            <input
              type="text"
              value={coordinatorName}
              onChange={e => setCoordinatorName(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              placeholder="Enter coordinator name"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              Coordinator Email:
            </label>
            <input
              type="email"
              value={coordinatorEmail}
              onChange={e => setCoordinatorEmail(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              placeholder="Enter coordinator email"
              required
            />
          </div>
          {error && (
            <div style={{ color: "red", marginBottom: 16, padding: 8, background: "#ffe6e6", borderRadius: 4 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: "green", marginBottom: 16, padding: 8, background: "#e6ffe6", borderRadius: 4 }}>
              {success}
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: 12,
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Assigning..." : "Assign Coordinator"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 12,
                background: "#f0f0f0",
                color: "#333",
                border: "1px solid #ddd",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CountyEditModal; 