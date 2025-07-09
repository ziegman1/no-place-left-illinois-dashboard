import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import axios from "axios";

function TractDetailModal({ tract, isOpen, onClose, onDataUpdate }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    discipleMakers: 0,
    simpleChurches: 0,
    legacyChurches: 0,
    coordinatorEnabled: false,
    coordinatorName: "",
    coordinatorEmail: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load current tract data when modal opens
  useEffect(() => {
    if (tract && isOpen) {
      setFormData({
        discipleMakers: tract.discipleMakers || 0,
        simpleChurches: tract.simpleChurches || 0,
        legacyChurches: tract.legacyChurches || 0,
        coordinatorEnabled: false,
        coordinatorName: "",
        coordinatorEmail: ""
      });
      setError("");
      setSuccess("");
    }
  }, [tract, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const updateData = {
        tractId: tract.tractId,
        discipleMakers: formData.discipleMakers,
        simpleChurches: formData.simpleChurches,
        legacyChurches: formData.legacyChurches
      };

      // If coordinator is being assigned, include coordinator data
      if (formData.coordinatorEnabled && formData.coordinatorName && formData.coordinatorEmail) {
        updateData.coordinator = {
          name: formData.coordinatorName,
          email: formData.coordinatorEmail
        };
      }

      const API_URL = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${API_URL}/api/tract/update`, updateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      setSuccess("Tract data updated successfully!");
      
      // Call the callback to update parent components
      if (onDataUpdate) {
        onDataUpdate(tract.tractId, {
          discipleMakers: formData.discipleMakers,
          simpleChurches: formData.simpleChurches,
          legacyChurches: formData.legacyChurches
        });
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.error || "Failed to update tract data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen || !tract) return null;

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
          <h2>Tract Details</h2>
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
          <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>Tract ID: {tract.tractId}</h3>
          <p style={{ margin: 0, color: "#666" }}>Population: {tract.population?.toLocaleString() || "N/A"}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Disciple Makers */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              Disciple Makers:
            </label>
            <input
              type="number"
              min={0}
              value={formData.discipleMakers}
              onChange={(e) => handleInputChange("discipleMakers", parseInt(e.target.value) || 0)}
              style={{ 
                width: "100%", 
                padding: 8, 
                border: "1px solid #ddd", 
                borderRadius: 4,
                color: "#333",
                backgroundColor: "#fff"
              }}
              placeholder="Enter number of disciple makers"
              required
            />
          </div>

          {/* Simple Churches */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              Simple Churches:
            </label>
            <input
              type="number"
              min={0}
              value={formData.simpleChurches}
              onChange={(e) => handleInputChange("simpleChurches", parseInt(e.target.value) || 0)}
              style={{ 
                width: "100%", 
                padding: 8, 
                border: "1px solid #ddd", 
                borderRadius: 4,
                color: "#333",
                backgroundColor: "#fff"
              }}
              placeholder="Enter number of simple churches"
              required
            />
          </div>

          {/* Legacy Churches */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              Legacy Churches:
            </label>
            <input
              type="number"
              min={0}
              value={formData.legacyChurches}
              onChange={(e) => handleInputChange("legacyChurches", parseInt(e.target.value) || 0)}
              style={{ 
                width: "100%", 
                padding: 8, 
                border: "1px solid #ddd", 
                borderRadius: 4,
                color: "#333",
                backgroundColor: "#fff"
              }}
              placeholder="Enter number of legacy churches"
              required
            />
          </div>

          {/* Coordinator Assignment */}
          <div style={{ 
            marginBottom: 24, 
            padding: 16, 
            border: "1px solid #ddd", 
            borderRadius: 4,
            background: "#f9f9f9"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <input
                type="checkbox"
                id="coordinatorToggle"
                checked={formData.coordinatorEnabled}
                onChange={(e) => handleInputChange("coordinatorEnabled", e.target.checked)}
                style={{ marginRight: 8 }}
              />
              <label htmlFor="coordinatorToggle" style={{ fontWeight: "bold", cursor: "pointer" }}>
                Assign Tract Coordinator
              </label>
            </div>

            {formData.coordinatorEnabled && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
                    Coordinator Name:
                  </label>
                  <input
                    type="text"
                    value={formData.coordinatorName}
                    onChange={(e) => handleInputChange("coordinatorName", e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: 8, 
                      border: "1px solid #ddd", 
                      borderRadius: 4,
                      color: "#333",
                      backgroundColor: "#fff"
                    }}
                    placeholder="Enter coordinator name"
                    required={formData.coordinatorEnabled}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
                    Coordinator Email:
                  </label>
                  <input
                    type="email"
                    value={formData.coordinatorEmail}
                    onChange={(e) => handleInputChange("coordinatorEmail", e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: 8, 
                      border: "1px solid #ddd", 
                      borderRadius: 4,
                      color: "#333",
                      backgroundColor: "#fff"
                    }}
                    placeholder="Enter coordinator email"
                    required={formData.coordinatorEnabled}
                  />
                </div>
                <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
                  A welcome email will be sent to the new coordinator with login credentials.
                </p>
              </div>
            )}
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
              {loading ? "Updating..." : "Submit Changes"}
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

export default TractDetailModal; 