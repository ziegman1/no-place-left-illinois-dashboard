import React, { useState, useEffect } from "react";
import "./MapDashboard.css";
import CountyMap from "./CountyMap";
import TractMap from "./TractMap";
import HoverInfoBox from "./HoverInfoBox";
import axios from "axios";
import { useAuth } from "../App";
import { getApiUrl } from "../utils/api";

function MapDashboard() {
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [discipleMakers, setDiscipleMakers] = useState({});
  const [tractDiscipleMakers, setTractDiscipleMakers] = useState({});
  const [tractData, setTractData] = useState({});
  const [tractPopulationsByCounty, setTractPopulationsByCounty] = useState({});
  const [coordinator, setCoordinator] = useState(null);
  const [countyName, setCountyName] = useState(null);
  const { user } = useAuth();

  const stateConfig = {
    center: [40.0, -89.0],
    zoom: 7,
    countiesFile: "/illinois_counties_with_population.geojson"
  };

  useEffect(() => {
    fetchData();
    
    // Listen for data changes from other components
    const handleDataChange = () => {
      fetchData();
    };
    
    window.addEventListener('dataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('dataChanged', handleDataChange);
    };
  }, []);

  const fetchData = async () => {
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [discipleRes, tractRes] = await Promise.all([
        axios.get(`${API_URL}/api/disciple-makers`, { headers }),
        axios.get(`${API_URL}/api/tract-data`, { headers })
      ]);
      
      setDiscipleMakers(discipleRes.data);
      setTractData(tractRes.data);
      
      // Calculate tract populations by county
      const populations = {};
      Object.keys(tractRes.data).forEach(tractId => {
        const tract = tractRes.data[tractId];
        if (tract.countyfp && tract.population) {
          if (!populations[tract.countyfp]) {
            populations[tract.countyfp] = 0;
          }
          populations[tract.countyfp] += tract.population;
        }
      });
      setTractPopulationsByCounty(populations);
      
      // Set tract disciple makers
      const tractDiscipleData = {};
      Object.keys(tractRes.data).forEach(tractId => {
        tractDiscipleData[tractId] = tractRes.data[tractId].discipleMakers || 0;
      });
      setTractDiscipleMakers(tractDiscipleData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const handleCountyHover = (info) => {
    setHoverInfo(info);
    if (info) {
      setCountyName(info.name);
      // Fetch coordinator for this county
      if (user && user.token) {
        const API_URL = getApiUrl();
        axios.get(`${API_URL}/api/coordinator/county/${info.countyfp}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })
          .then(res => setCoordinator(res.data.coordinator?.name || null))
          .catch(() => setCoordinator(null));
      }
    } else {
      setCoordinator(null);
      setCountyName(null);
    }
  };

  const handleCountyClick = (info) => {
    setSelectedCounty(info);
  };

  const handleTractHover = (info) => {
    setHoverInfo(info);
    if (info) {
      setCountyName(selectedCounty?.name);
      // Fetch coordinator for this tract
      if (user && user.token) {
        const API_URL = getApiUrl();
        axios.get(`${API_URL}/api/coordinator/tract/${info.tractId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })
          .then(res => setCoordinator(res.data.coordinator?.name || null))
          .catch(() => setCoordinator(null));
      }
    } else {
      setCoordinator(null);
    }
  };

  const handleTractClick = (info) => {
    // Handle tract click - could open detail modal
    console.log("Tract clicked:", info);
  };

  const handleDiscipleMakersChange = (id, value) => {
    if (selectedCounty) {
      setDiscipleMakers(prev => ({ ...prev, [id]: value }));
    } else {
      setTractDiscipleMakers(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleDataUpdate = (id, newData) => {
    // Update local state when data is changed from HoverInfoBox
    if (selectedCounty) {
      // County level update
      setDiscipleMakers(prev => ({ ...prev, [id]: newData.discipleMakers }));
    } else {
      // Tract level update
      setTractDiscipleMakers(prev => ({ ...prev, [id]: newData.discipleMakers }));
      setTractData(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          discipleMakers: newData.discipleMakers,
          simpleChurches: newData.simpleChurches,
          legacyChurches: newData.legacyChurches
        }
      }));
    }
  };

  const handleDataRefresh = () => {
    fetchData();
  };

  return (
    <div className="map-dashboard-container">
      <h1 className="map-dashboard-title">
        Illinois Map Dashboard
      </h1>
      
      <div className="map-content-card">
        {!selectedCounty ? (
          <CountyMap
            onCountyHover={handleCountyHover}
            onCountyClick={handleCountyClick}
            discipleMakers={discipleMakers}
            setDiscipleMakers={setDiscipleMakers}
            stateConfig={stateConfig}
            onDataRefresh={handleDataRefresh}
          />
        ) : (
          <TractMap
            countyGEOID={selectedCounty.countyfp}
            onTractHover={handleTractHover}
            onTractClick={handleTractClick}
            tractDiscipleMakers={tractDiscipleMakers}
            tractData={tractData}
            setTractDiscipleMakers={setTractDiscipleMakers}
            onDataRefresh={handleDataRefresh}
          />
        )}
        
        <div className="map-info-panel">
          <HoverInfoBox
            info={hoverInfo}
            setDiscipleMakers={handleDiscipleMakersChange}
            tractPopulationsByCounty={tractPopulationsByCounty}
            coordinator={coordinator}
            countyName={countyName}
            onDataUpdate={handleDataUpdate}
          />
          {selectedCounty && (
            <button
              onClick={() => setSelectedCounty(null)}
              className="back-to-counties-button"
            >
              ← Back to Counties
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapDashboard; 