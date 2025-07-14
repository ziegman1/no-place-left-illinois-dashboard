import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import axios from "axios";
import { getApiUrl } from "../utils/api";

function HoverInfoBox({ info, setDiscipleMakers, tractPopulationsByCounty, countyMetrics, coordinator, countyName, onDataUpdate }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    discipleMakers: 0,
    simpleChurches: 0,
    legacyChurches: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Update edit data when info changes
  useEffect(() => {
    if (info) {
      setEditData({
        discipleMakers: info.discipleMakers || 0,
        simpleChurches: info.simpleChurches || 0,
        legacyChurches: info.legacyChurches || 0
      });
    }
  }, [info]);

  if (!info) {
    return (
      <div style={{ color: "#444" }}>
        <h2>Region Info</h2>
        <p>Hover over a county or tract to see details here.</p>
      </div>
    );
  }

  // Support both county and tract info
  const isTract = !!info.tractId;
  const id = info.id || (isTract ? info.tractId : info.name);
  let population = info.population;
  let tractSum = null;

  // If county and tractPopulationsByCounty is provided, use sum of tracts
  if (!isTract && tractPopulationsByCounty && tractPopulationsByCounty[id]) {
    tractSum = tractPopulationsByCounty[id];
  }

  // Get the correct disciple-making metrics
  let discipleMakers = info.discipleMakers || 0;
  let simpleChurches = info.simpleChurches || 0;
  let legacyChurches = info.legacyChurches || 0;

  // For counties, use the county metrics if available
  if (!isTract && countyMetrics && info.countyfp && countyMetrics[info.countyfp]) {
    const countyData = countyMetrics[info.countyfp];
    discipleMakers = countyData.discipleMakers || 0;
    simpleChurches = countyData.simpleChurches || 0;
    legacyChurches = countyData.legacyChurches || 0;
  }

  const { name, percentFarFromGod } = info;
  const goal = Math.round(0.1 * ((tractSum !== null ? tractSum : population) || 0));
  const progress = goal ? Math.min(1, discipleMakers / goal) : 0;
  
  // Determine edit permissions based on user role and scope
  // For counties, only allow editing if user is state admin (for coordinator assignment)
  // For tracts, allow editing based on user role and scope
  const canEdit = user && (
    (isTract && (
      user.role === "state" || 
      (user.role === "county" && !isTract) ||
      (user.role === "tract" && isTract && user.tractid === info.tractId)
    )) ||
    (!isTract && user.role === "state") // Only state users can assign coordinators to counties
  );

  // Only show edit button for tracts, not for counties (coordinator assignment is handled separately)
  const showEditButton = canEdit && isTract;

  const handleSave = async () => {
    if (!canEdit) return;
    
    setSaving(true);
    setError("");
    
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem("token");
      
      if (isTract) {
        // Update tract data
        await axios.post(`${API_URL}/api/tract-data/update`, {
          tractId: info.tractId,
          discipleMakers: editData.discipleMakers,
          simpleChurches: editData.simpleChurches,
          legacyChurches: editData.legacyChurches
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // For counties, we need to update all tracts in that county
        // This is a simplified approach - in a real implementation you might want
        // to handle county-level updates differently
        console.log("County-level updates would need to be implemented");
      }
      
      // Update local state
      if (onDataUpdate) {
        onDataUpdate(id, editData);
      }
      
      setIsEditing(false);
      
      // Notify other components that data has changed
      window.dispatchEvent(new Event('dataChanged'));
      
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      discipleMakers: info.discipleMakers || 0,
      simpleChurches: info.simpleChurches || 0,
      legacyChurches: info.legacyChurches || 0
    });
    setIsEditing(false);
    setError("");
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: Math.max(0, parseInt(value) || 0)
    }));
  };

  return (
    <div style={{ color: "#222" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>{!isTract ? name : (countyName ? `${countyName} County` : "Tract Details")}</h2>
        {showEditButton && (
          <div style={{ display: "flex", gap: "8px" }}>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: "12px"
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {user && user.roles && user.roles.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <b>Your Roles:</b> {user.roles.map(r => r.role).join(", ")}
        </div>
      )}

      {error && (
        <div style={{ 
          color: "#dc3545", 
          backgroundColor: "#f8d7da", 
          padding: "8px", 
          borderRadius: "4px", 
          marginBottom: "8px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {!isTract && (
          <>
            <li><b>Population:</b> {tractSum !== null ? tractSum.toLocaleString() : (population !== undefined && population !== null ? population.toLocaleString() : "N/A")}</li>
          </>
        )}
        {isTract && population !== undefined && (
          <li><b>Tract Population:</b> {population.toLocaleString()}</li>
        )}
        {percentFarFromGod !== undefined && (
          <li><b>% Far from God:</b> {percentFarFromGod.toFixed(1)}%</li>
        )}
        {info.peopleFarFromGod !== undefined && (
          <li><b>People Far from God:</b> {info.peopleFarFromGod.toLocaleString()}</li>
        )}
        <li>
          <b>Coordinator:</b> {coordinator || "Needed"}
          {!isTract && user && user.role === "state" && (
            <button
              onClick={() => {
                // Trigger coordinator assignment modal
                window.dispatchEvent(new CustomEvent('openCoordinatorModal', {
                  detail: { countyfp: info.countyfp, countyName: info.name }
                }));
              }}
              style={{
                marginLeft: 8,
                padding: "4px 8px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              {coordinator ? "Change" : "Assign"}
            </button>
          )}
        </li>
        <li>
          <b>Disciple-Makers:</b>
          {isEditing && canEdit && isTract ? (
            <input
              type="number"
              min={0}
              value={editData.discipleMakers}
              onChange={e => handleInputChange("discipleMakers", e.target.value)}
              style={{ 
                width: 80, 
                marginLeft: 8,
                padding: "4px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          ) : (
            <span style={{ marginLeft: 8 }}>{discipleMakers}</span>
          )}
          <span style={{ marginLeft: 8 }}>
            (Goal: {goal.toLocaleString()})
          </span>
          {!isTract && (
            <span style={{ marginLeft: 8, fontSize: "12px", color: "#666" }}>
              (sum of all tracts)
            </span>
          )}
        </li>
        <li>
          <b>Progress to Goal:</b> {(progress * 100).toFixed(1)}%
        </li>
        <li>
          <b>Simple Churches:</b>
          {isEditing && canEdit && isTract ? (
            <input
              type="number"
              min={0}
              value={editData.simpleChurches}
              onChange={e => handleInputChange("simpleChurches", e.target.value)}
              style={{ 
                width: 80, 
                marginLeft: 8,
                padding: "4px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          ) : (
            <span style={{ marginLeft: 8 }}>{simpleChurches || 0}</span>
          )}
          {!isTract && (
            <span style={{ marginLeft: 8, fontSize: "12px", color: "#666" }}>
              (sum of all tracts)
            </span>
          )}
        </li>
        <li>
          <b>Legacy Churches:</b>
          {isEditing && canEdit && isTract ? (
            <input
              type="number"
              min={0}
              value={editData.legacyChurches}
              onChange={e => handleInputChange("legacyChurches", e.target.value)}
              style={{ 
                width: 80, 
                marginLeft: 8,
                padding: "4px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          ) : (
            <span style={{ marginLeft: 8 }}>{legacyChurches || 0}</span>
          )}
          {!isTract && (
            <span style={{ marginLeft: 8, fontSize: "12px", color: "#666" }}>
              (sum of all tracts)
            </span>
          )}
        </li>
      </ul>
    </div>
  );
}

export default HoverInfoBox; 