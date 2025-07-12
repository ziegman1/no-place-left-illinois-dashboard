import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import axios from "axios";

function DataManagementPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTract, setEditingTract] = useState(null);
  const [editingCoordinator, setEditingCoordinator] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (user && token) {
      fetchData();
    }
  }, [user, token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`${API_URL}/api/coordinator/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleTractUpdate = async (tractId, updates) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      await axios.post(`${API_URL}/api/tract/bulk-update`, {
        updates: [{
          tractId,
          ...updates
        }]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess("Tract data updated successfully!");
      setEditingTract(null);
      
      // Refresh data
      await fetchData();
      
      // Notify other components that data has changed
      window.dispatchEvent(new Event('dataChanged'));
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update tract data");
    } finally {
      setSaving(false);
    }
  };

  const handleCoordinatorUpdate = async (coordinatorId, updates) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      await axios.put(`${API_URL}/api/coordinator/${coordinatorId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess("Coordinator updated successfully!");
      setEditingCoordinator(null);
      
      // Refresh data
      await fetchData();
      
      // Notify other components that data has changed
      window.dispatchEvent(new Event('dataChanged'));
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update coordinator");
    } finally {
      setSaving(false);
    }
  };

  const handleCoordinatorDelete = async (coordinatorId, coordinatorName) => {
    console.log('Attempting to delete coordinator:', { coordinatorId, coordinatorName });
    
    if (!window.confirm(`Are you sure you want to delete ${coordinatorName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      console.log('Sending delete request to:', `${API_URL}/api/coordinator/${coordinatorId}`);
      
      const response = await axios.delete(`${API_URL}/api/coordinator/${coordinatorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Delete response:', response.data);
      setSuccess("Coordinator deleted successfully!");
      
      // Refresh data
      await fetchData();
      
      // Notify other components that data has changed
      window.dispatchEvent(new Event('dataChanged'));
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to delete coordinator");
    } finally {
      setSaving(false);
    }
  };



  const getRoleDisplay = () => {
    switch (data?.userRole) {
      case 'state': return 'State Coordinator';
      case 'county': return 'County Coordinator';
      case 'tract': return 'Tract Coordinator';
      default: return 'Coordinator';
    }
  };

  const getScopeDescription = () => {
    switch (data?.userRole) {
      case 'state': return 'You can view and edit all county coordinators and all tract data across Illinois.';
      case 'county': return `You can view and edit tract coordinators and tract data for your county (${data?.userCounty}).`;
      case 'tract': return `You can view and edit data for your assigned tract (${data?.userTract}).`;
      default: return '';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Loading data...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Error</h2>
        <p style={{ color: "red" }}>{error}</p>
        <button 
          onClick={fetchData}
          style={{
            padding: "0.5rem 1rem",
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Data Management Dashboard</h1>
        <div style={{ 
          background: "#f5f5f5", 
          padding: "1rem", 
          borderRadius: 8, 
          marginBottom: "1rem" 
        }}>
          <h3 style={{ margin: "0 0 0.5rem 0" }}>{getRoleDisplay()}</h3>
          <p style={{ margin: 0, color: "#666" }}>{getScopeDescription()}</p>
        </div>
        {success && (
          <div style={{ 
            background: "#d4edda", 
            color: "#155724", 
            padding: "0.75rem", 
            borderRadius: 4, 
            marginBottom: "1rem" 
          }}>
            {success}
          </div>
        )}
      </div>

      {/* Coordinators Section */}
      {data?.coordinators && data.coordinators.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2>Coordinators</h2>
          <div style={{ 
            background: "#fff", 
            border: "1px solid #ddd", 
            borderRadius: 8,
            overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Title
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Name
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Email
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    County
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Tract
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.coordinators.map((coordinator) => (
                  <CoordinatorRow 
                    key={coordinator.id}
                    coordinator={coordinator}
                    isEditing={editingCoordinator === coordinator.id}
                    onEdit={() => setEditingCoordinator(coordinator.id)}
                    onCancel={() => setEditingCoordinator(null)}
                    onSave={handleCoordinatorUpdate}
                    onDelete={handleCoordinatorDelete}
                    saving={saving}
                    userRole={data.userRole}
                    userCounty={data.userCounty}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tract Data Section */}
      {data?.tractData && data.tractData.length > 0 && (
        <div>
          <h2>Tract Data</h2>
          <div style={{ 
            background: "#fff", 
            border: "1px solid #ddd", 
            borderRadius: 8,
            overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Tract ID
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Disciple Makers
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Simple Churches
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Legacy Churches
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Last Updated
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.tractData.map((tract) => (
                  <TractRow 
                    key={tract.tract_id}
                    tract={tract}
                    isEditing={editingTract === tract.tract_id}
                    onEdit={() => setEditingTract(tract.tract_id)}
                    onCancel={() => setEditingTract(null)}
                    onSave={handleTractUpdate}
                    saving={saving}
                    userRole={data.userRole}
                    userTract={data.userTract}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.tractData && data.tractData.length === 0 && (
        <div style={{ 
          background: "#f8f9fa", 
          padding: "2rem", 
          textAlign: "center", 
          borderRadius: 8,
          border: "1px solid #ddd"
        }}>
          <h3>No tract data available</h3>
          <p>There is no tract data to display for your current scope.</p>
        </div>
      )}
    </div>
  );
}

function TractRow({ tract, isEditing, onEdit, onCancel, onSave, saving, userRole, userTract }) {
  const [formData, setFormData] = useState({
    discipleMakers: tract.disciple_makers || 0,
    simpleChurches: tract.simple_churches || 0,
    legacyChurches: tract.legacy_churches || 0
  });

  const canEdit = userRole === 'state' || 
                  userRole === 'county' || 
                  (userRole === 'tract' && tract.tract_id === userTract);

  const handleSave = () => {
    onSave(tract.tract_id, formData);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString() + " " + new Date(dateString).toLocaleTimeString();
  };

  if (isEditing) {
    return (
      <tr style={{ background: "#fff3cd" }}>
        <td style={{ padding: "1rem" }}>{tract.tract_id}</td>
        <td style={{ padding: "1rem" }}>
          <input
            type="number"
            min="0"
            value={formData.discipleMakers}
            onChange={(e) => setFormData(prev => ({ ...prev, discipleMakers: parseInt(e.target.value) || 0 }))}
            style={{
              width: "80px",
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: 4
            }}
          />
        </td>
        <td style={{ padding: "1rem" }}>
          <input
            type="number"
            min="0"
            value={formData.simpleChurches}
            onChange={(e) => setFormData(prev => ({ ...prev, simpleChurches: parseInt(e.target.value) || 0 }))}
            style={{
              width: "80px",
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: 4
            }}
          />
        </td>
        <td style={{ padding: "1rem" }}>
          <input
            type="number"
            min="0"
            value={formData.legacyChurches}
            onChange={(e) => setFormData(prev => ({ ...prev, legacyChurches: parseInt(e.target.value) || 0 }))}
            style={{
              width: "80px",
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: 4
            }}
          />
        </td>
        <td style={{ padding: "1rem" }}>{formatDate(tract.updated_at)}</td>
        <td style={{ padding: "1rem" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "4px 8px",
              background: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              marginRight: "8px"
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "4px 8px",
              background: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer"
            }}
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid #eee" }}>
      <td style={{ padding: "1rem" }}>{tract.tract_id}</td>
      <td style={{ padding: "1rem" }}>{tract.disciple_makers || 0}</td>
      <td style={{ padding: "1rem" }}>{tract.simple_churches || 0}</td>
      <td style={{ padding: "1rem" }}>{tract.legacy_churches || 0}</td>
      <td style={{ padding: "1rem" }}>{formatDate(tract.updated_at)}</td>
      <td style={{ padding: "1rem" }}>
        {canEdit && (
          <button
            onClick={onEdit}
            style={{
              padding: "4px 8px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

function CoordinatorRow({ coordinator, isEditing, onEdit, onCancel, onSave, onDelete, saving, userRole, userCounty }) {
  const [formData, setFormData] = useState({
    first_name: coordinator.first_name || '',
    last_name: coordinator.last_name || '',
    email: coordinator.email || ''
  });

  const canEdit = userRole === 'state' || 
                  (userRole === 'county' && coordinator.role === 'tract' && coordinator.countyfp === userCounty);

  const handleSave = () => {
    onSave(coordinator.id, formData);
  };

  if (isEditing) {
    return (
      <tr style={{ background: "#fff3cd" }}>
        <td style={{ padding: "1rem" }}>{coordinator.role_display}</td>
        <td style={{ padding: "1rem" }}>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            style={{
              width: "120px",
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginRight: "8px"
            }}
            placeholder="First name"
          />
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            style={{
              width: "120px",
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: 4
            }}
            placeholder="Last name"
          />
        </td>
        <td style={{ padding: "1rem" }}>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            style={{
              width: "200px",
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: 4
            }}
            placeholder="Email"
          />
        </td>
        <td style={{ padding: "1rem" }}>{coordinator.county_name || 'N/A'}</td>
        <td style={{ padding: "1rem" }}>{coordinator.tractid || "N/A"}</td>
        <td style={{ padding: "1rem" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "4px 8px",
              background: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              marginRight: "8px"
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "4px 8px",
              background: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer"
            }}
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid #eee" }}>
      <td style={{ padding: "1rem" }}>{coordinator.role_display}</td>
      <td style={{ padding: "1rem" }}>{`${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim()}</td>
      <td style={{ padding: "1rem" }}>{coordinator.email}</td>
      <td style={{ padding: "1rem" }}>{coordinator.county_name || 'N/A'}</td>
      <td style={{ padding: "1rem" }}>{coordinator.tractid || "N/A"}</td>
      <td style={{ padding: "1rem" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {canEdit && (
            <button
              onClick={onEdit}
              style={{
                padding: "4px 8px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Edit
            </button>
          )}
          {userRole === 'state' && coordinator.role !== 'state' && (
            <button
              onClick={() => onDelete(coordinator.id, `${coordinator.first_name || ''} ${coordinator.last_name || ''}`.trim() || coordinator.email)}
              disabled={saving}
              style={{
                padding: "4px 8px",
                background: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1
              }}
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default DataManagementPage; 