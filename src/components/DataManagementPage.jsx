import React, { useState, useEffect } from "react";
import "./DataManagementPage.css";
import { useAuth } from "../App";
import axios from "axios";
import { getApiUrl } from "../utils/api";

function DataManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [coordinators, setCoordinators] = useState([]);
  const [tractData, setTractData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    setError(""); // Clear error on tab switch
    if (activeTab === 'coordinators') {
      fetchCoordinators();
    } else if (activeTab === 'tracts') {
      fetchTractData();
    }
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
              <h2>Coordinator Management</h2>
              <p>
                Manage county and tract coordinators for your assigned area.
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
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coordinators.map((coordinator, index) => (
                          <tr key={index}>
                            <td>{coordinator.name}</td>
                            <td>{coordinator.email}</td>
                            <td>{coordinator.role}</td>
                            <td>{coordinator.countyfp || coordinator.tractid || 'N/A'}</td>
                            <td>
                              <button className="edit-button">Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tracts' && (
            <div>
              <h2>Tract Data Management</h2>
              <p>
                View and update disciple-making data for census tracts in your area.
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
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tractData.slice(0, 20).map((tract, index) => (
                          <tr key={index}>
                            <td>{tract.tractId}</td>
                            <td>{tract.population?.toLocaleString() || 'N/A'}</td>
                            <td>{tract.discipleMakers || 0}</td>
                            <td>{tract.simpleChurches || 0}</td>
                            <td>{tract.legacyChurches || 0}</td>
                            <td>
                              <button className="edit-button">Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataManagementPage; 