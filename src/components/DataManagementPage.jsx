import React, { useState, useEffect } from "react";
import "./DataManagementPage.css";
import { useAuth } from "../App";
import axios from "axios";
import { getApiUrl } from "../utils/api";

// Coordinator Edit Modal Component
function CoordinatorEditModal({ coordinator, isOpen, onClose, onSave, isNew = false }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "tract",
    countyfp: "",
    tractid: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (isNew) {
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          role: "tract",
          countyfp: "",
          tractid: ""
        });
      } else if (coordinator) {
        const nameParts = coordinator.name.split(' ');
        setFormData({
          first_name: nameParts[0] || "",
          last_name: nameParts.slice(1).join(' ') || "",
          email: coordinator.email || "",
          role: coordinator.role || "tract",
          countyfp: coordinator.countyfp || "",
          tractid: coordinator.tractid || ""
        });
      }
      setError("");
    }
  }, [isOpen, coordinator, isNew]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isNew) {
        // Create new coordinator
        await onSave(formData, null);
      } else {
        // Update existing coordinator
        await onSave(formData, coordinator.id);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save coordinator");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isNew ? "Add New Coordinator" : "Edit Coordinator"}</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              required
            >
              <option value="county">County Coordinator</option>
              <option value="tract">Tract Coordinator</option>
            </select>
          </div>
          
          {formData.role === "county" && (
            <div className="form-group">
              <label>County FIPS Code *</label>
              <input
                type="text"
                value={formData.countyfp}
                onChange={(e) => setFormData({...formData, countyfp: e.target.value})}
                placeholder="e.g., 031 for Cook County"
                required
              />
            </div>
          )}
          
          {formData.role === "tract" && (
            <>
              <div className="form-group">
                <label>County FIPS Code *</label>
                <input
                  type="text"
                  value={formData.countyfp}
                  onChange={(e) => setFormData({...formData, countyfp: e.target.value})}
                  placeholder="e.g., 031 for Cook County"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tract ID *</label>
                <input
                  type="text"
                  value={formData.tractid}
                  onChange={(e) => setFormData({...formData, tractid: e.target.value})}
                  placeholder="e.g., 000502"
                  required
                />
              </div>
            </>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="modal-actions">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Saving..." : (isNew ? "Add Coordinator" : "Update Coordinator")}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DataManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [coordinators, setCoordinators] = useState([]);
  const [tractData, setTractData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingCoordinator, setEditingCoordinator] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewCoordinator, setIsNewCoordinator] = useState(false);
  const [coordinatorStats, setCoordinatorStats] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    setError(""); // Clear error on tab switch
    if (activeTab === 'coordinators') {
      fetchCoordinators();
      fetchCoordinatorStats();
    } else if (activeTab === 'tracts') {
      fetchTractData();
    }
  }, [activeTab]);

  // Listen for data changes from other components
  useEffect(() => {
    const handleDataChange = () => {
      if (activeTab === 'coordinators') {
        fetchCoordinators();
        fetchCoordinatorStats();
      } else if (activeTab === 'tracts') {
        fetchTractData();
      }
    };

    window.addEventListener('dataChanged', handleDataChange);
    return () => window.removeEventListener('dataChanged', handleDataChange);
  }, [activeTab]);

  const fetchCoordinators = async () => {
    setLoading(true);
    setError("");
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view coordinator data");
        setCoordinators([]);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/coordinators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure response.data is an array
      const coordinatorsData = Array.isArray(response.data) ? response.data : [];
      setCoordinators(coordinatorsData);
    } catch (err) {
      console.error('Error fetching coordinators:', err);
      if (err.response) {
        setError(`Failed to fetch coordinators: ${err.response.status} ${err.response.data?.error || err.response.statusText}`);
      } else {
        setError("Failed to fetch coordinators: Network error");
      }
      setCoordinators([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoordinatorStats = async () => {
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/api/coordinator/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Process the data to create stats for each coordinator
      const stats = {};
      
      if (response.data.coordinators) {
        response.data.coordinators.forEach(coordinator => {
          const key = `${coordinator.role}-${coordinator.countyfp || coordinator.tractid}`;
          stats[key] = {
            coordinator: coordinator,
            discipleMakers: 0,
            simpleChurches: 0,
            legacyChurches: 0,
            population: 0,
            progress: 0
          };
        });
      }
      
      // Add tract data to coordinator stats
      if (response.data.tractData) {
        Object.values(response.data.tractData).forEach(tract => {
          // Find coordinators for this tract
          Object.keys(stats).forEach(key => {
            const stat = stats[key];
            const coord = stat.coordinator;
            
            if (coord.role === 'tract' && coord.tractid === tract.tractId) {
              stat.discipleMakers = tract.discipleMakers || 0;
              stat.simpleChurches = tract.simpleChurches || 0;
              stat.legacyChurches = tract.legacyChurches || 0;
              stat.population = tract.population || 0;
              const goal = Math.round(0.1 * stat.population);
              stat.progress = goal > 0 ? Math.min(1, stat.discipleMakers / goal) : 0;
            } else if (coord.role === 'county' && coord.countyfp) {
              // For county coordinators, sum up all tracts in their county
              const tractCountyFips = tract.countyfp;
              if (tractCountyFips === coord.countyfp) {
                stat.discipleMakers += tract.discipleMakers || 0;
                stat.simpleChurches += tract.simpleChurches || 0;
                stat.legacyChurches += tract.legacyChurches || 0;
                stat.population += tract.population || 0;
              }
            }
          });
        });
        
        // Calculate progress for county coordinators
        Object.keys(stats).forEach(key => {
          const stat = stats[key];
          if (stat.coordinator.role === 'county') {
            const goal = Math.round(0.1 * stat.population);
            stat.progress = goal > 0 ? Math.min(1, stat.discipleMakers / goal) : 0;
          }
        });
      }
      
      setCoordinatorStats(stats);
    } catch (err) {
      console.error('Error fetching coordinator stats:', err);
    }
  };

  const fetchTractData = async () => {
    setLoading(true);
    setError("");
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view tract data");
        setTractData([]);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/tract-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure we have an array of tract data
      const tractDataArray = Array.isArray(response.data) ? response.data : Object.values(response.data || {});
      setTractData(tractDataArray);
    } catch (err) {
      console.error('Error fetching tract data:', err);
      if (err.response) {
        setError(`Failed to fetch tract data: ${err.response.status} ${err.response.data?.error || err.response.statusText}`);
      } else {
        setError("Failed to fetch tract data: Network error");
      }
      setTractData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoordinator = () => {
    setIsNewCoordinator(true);
    setEditingCoordinator(null);
    setIsEditModalOpen(true);
  };

  const handleEditCoordinator = (coordinator) => {
    setIsNewCoordinator(false);
    setEditingCoordinator(coordinator);
    setIsEditModalOpen(true);
  };

  const handleDeleteCoordinator = async (coordinatorId) => {
    if (!window.confirm("Are you sure you want to delete this coordinator? This action cannot be undone.")) {
      return;
    }

    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/coordinator/${coordinatorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the coordinators list
      await fetchCoordinators();
      await fetchCoordinatorStats();
      alert("Coordinator deleted successfully");
    } catch (err) {
      console.error('Error deleting coordinator:', err);
      alert(`Failed to delete coordinator: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleSaveCoordinator = async (formData, coordinatorId) => {
    const API_URL = getApiUrl();
    const token = localStorage.getItem("token");
    
    if (isNewCoordinator) {
      // Create new coordinator
      const coordinatorData = {
        countyfp: formData.countyfp,
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        email: formData.email
      };
      
      let endpoint = '';
      if (formData.role === 'county') {
        endpoint = `${API_URL}/api/county/assign-coordinator`;
      } else if (formData.role === 'tract') {
        endpoint = `${API_URL}/api/tract/assign-coordinator`;
        coordinatorData.tractid = formData.tractid;
      }
      
      const response = await axios.post(endpoint, coordinatorData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        await fetchCoordinators();
        await fetchCoordinatorStats();
        alert("Coordinator added successfully");
      }
    } else {
      // Update existing coordinator
      const response = await axios.put(`${API_URL}/api/coordinator/${coordinatorId}`, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        await fetchCoordinators();
        await fetchCoordinatorStats();
        alert("Coordinator updated successfully");
      }
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCoordinator(null);
    setIsNewCoordinator(false);
  };

  return (
    <div className="data-management-container">
      <h1 className="data-management-title">
        Data Management Dashboard
      </h1>
      
      <div className="data-management-card">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('coordinators')}
            className={`tab-button ${activeTab === 'coordinators' ? 'active' : ''}`}
          >
            Coordinators
          </button>
          <button
            onClick={() => setActiveTab('tracts')}
            className={`tab-button ${activeTab === 'tracts' ? 'active' : ''}`}
          >
            Tract Data
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
          >
            Admin
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div>
              <h2>Dashboard Overview</h2>
              <p>
                Welcome to the Data Management Dashboard. Here you can manage coordinators and view tract-level data for disciple-making efforts across Illinois.
              </p>
              
              <div className="overview-grid">
                <div className="overview-card coordinator">
                  <h3>Coordinator Management</h3>
                  <p>
                    Add, edit, and manage county and tract coordinators. Assign coordinators to specific areas and track their responsibilities.
                  </p>
                </div>
                
                <div className="overview-card tract">
                  <h3>Tract Data</h3>
                  <p>
                    View and update disciple-making data by census tract. Monitor progress towards goals and track simple churches and legacy churches.
                  </p>
                </div>
                
                <div className="overview-card reports">
                  <h3>Reports</h3>
                  <p>
                    Generate reports and analytics for your area. Get insights into disciple-making progress and identify areas needing attention.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'coordinators' && (
            <div>
              <div className="coordinators-header">
                <h2>Coordinator Management</h2>
                <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                  <button 
                    onClick={() => {
                      fetchCoordinators();
                      fetchCoordinatorStats();
                    }}
                    className="btn-secondary"
                  >
                    Refresh Data
                  </button>
                  <button 
                    onClick={handleAddCoordinator}
                    className="btn-primary"
                  >
                    Add New Coordinator
                  </button>
                </div>
              </div>
              <p>
                Manage county and tract coordinators for your assigned area. View disciple-making progress for each coordinator's assigned region.
              </p>
              {loading ? (
                <div className="loading-message">Loading coordinators...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <div className="coordinators-list">
                  {!Array.isArray(coordinators) || coordinators.length === 0 ? (
                    <p>No coordinators found.</p>
                  ) : (
                    <table className="coordinators-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Area</th>
                          <th>Population</th>
                          <th>Disciple Makers</th>
                          <th>Simple Churches</th>
                          <th>Legacy Churches</th>
                          <th>Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coordinators.map((coordinator, index) => {
                          const key = `${coordinator.role}-${coordinator.countyfp || coordinator.tractid}`;
                          const stats = coordinatorStats[key] || {};
                          const goal = Math.round(0.1 * (stats.population || 0));
                          
                          return (
                            <tr key={index}>
                              <td>{coordinator.name}</td>
                              <td>{coordinator.email}</td>
                              <td>{coordinator.role === 'county' ? 'County Coordinator' : 'Tract Coordinator'}</td>
                              <td>
                                {coordinator.role === 'county' 
                                  ? `${coordinator.countyfp} County` 
                                  : `Tract ${coordinator.tractid}`
                                }
                              </td>
                              <td>{stats.population?.toLocaleString() || 'N/A'}</td>
                              <td>
                                {stats.discipleMakers || 0}
                                {goal > 0 && (
                                  <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '4px' }}>
                                    (Goal: {goal.toLocaleString()})
                                  </span>
                                )}
                              </td>
                              <td>{stats.simpleChurches || 0}</td>
                              <td>{stats.legacyChurches || 0}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ 
                                    width: '60px', 
                                    height: '8px', 
                                    backgroundColor: '#eee', 
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${(stats.progress || 0) * 100}%`,
                                      height: '100%',
                                      backgroundColor: stats.progress >= 1 ? '#28a745' : 
                                                     stats.progress >= 0.5 ? '#ffc107' : '#dc3545',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                    {((stats.progress || 0) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button 
                                    onClick={() => handleEditCoordinator(coordinator)}
                                    className="edit-button"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCoordinator(coordinator.id)}
                                    className="delete-button"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tracts' && (
            <div>
              <div className="coordinators-header">
                <h2>Tract Data Management</h2>
                <button 
                  onClick={() => fetchTractData()}
                  className="btn-secondary"
                  style={{ marginLeft: 'auto' }}
                >
                  Refresh Data
                </button>
              </div>
              <p>
                View and update disciple-making data for census tracts in your area. Monitor progress towards goals and track simple churches and legacy churches.
              </p>
              {loading ? (
                <div className="loading-message">Loading tract data...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <div className="tract-data-list">
                  {!Array.isArray(tractData) || tractData.length === 0 ? (
                    <p>No tract data found.</p>
                  ) : (
                    <table className="tract-data-table">
                      <thead>
                        <tr>
                          <th>Tract ID</th>
                          <th>Population</th>
                          <th>Disciple Makers</th>
                          <th>Simple Churches</th>
                          <th>Legacy Churches</th>
                          <th>Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tractData.slice(0, 20).map((tract, index) => {
                          const goal = Math.round(0.1 * (tract.population || 0));
                          const progress = goal > 0 ? Math.min(1, (tract.discipleMakers || 0) / goal) : 0;
                          
                          return (
                            <tr key={index}>
                              <td>{tract.tractId}</td>
                              <td>{tract.population?.toLocaleString() || 'N/A'}</td>
                              <td>
                                {tract.discipleMakers || 0}
                                {goal > 0 && (
                                  <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '4px' }}>
                                    (Goal: {goal.toLocaleString()})
                                  </span>
                                )}
                              </td>
                              <td>{tract.simpleChurches || 0}</td>
                              <td>{tract.legacyChurches || 0}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ 
                                    width: '60px', 
                                    height: '8px', 
                                    backgroundColor: '#eee', 
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${progress * 100}%`,
                                      height: '100%',
                                      backgroundColor: progress >= 1 ? '#28a745' : 
                                                     progress >= 0.5 ? '#ffc107' : '#dc3545',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                    {(progress * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <button className="edit-button">Edit</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'admin' && (
            <div>
              <h2>Administrative Functions</h2>
              <p>
                Administrative functions for managing data. These actions cannot be undone.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all tract data? This action cannot be undone.')) {
                      try {
                        const API_URL = getApiUrl();
                        const token = localStorage.getItem("token");
                        await axios.delete(`${API_URL}/api/tract-data/clear`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        alert('All tract data cleared successfully');
                        fetchTractData(); // Refresh the data
                      } catch (err) {
                        alert('Failed to clear tract data: ' + (err.response?.data?.error || err.message));
                      }
                    }
                  }}
                  style={{
                    padding: '1rem 2rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Clear All Tract Data
                </button>
                
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all coordinators? This action cannot be undone.')) {
                      try {
                        const API_URL = getApiUrl();
                        const token = localStorage.getItem("token");
                        await axios.delete(`${API_URL}/api/coordinators/clear`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        alert('All coordinators cleared successfully');
                        fetchCoordinators(); // Refresh the data
                      } catch (err) {
                        alert('Failed to clear coordinators: ' + (err.response?.data?.error || err.message));
                      }
                    }
                  }}
                  style={{
                    padding: '1rem 2rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Clear All Coordinators
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coordinator Edit Modal */}
      <CoordinatorEditModal
        coordinator={editingCoordinator}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={handleSaveCoordinator}
        isNew={isNewCoordinator}
      />
    </div>
  );
}

export default DataManagementPage; 