import React, { useState, useEffect } from "react";
import CountyMap from "./CountyMap";
import TractMap from "./TractMap";
import HoverInfoBox from "./HoverInfoBox";
import axios from "axios";
import { useAuth } from "../App";

function MapDashboard() {
  const { user, token } = useAuth();
  // discipleMakers: { [countyName]: number }
  const [discipleMakers, setDiscipleMakers] = useState({});
  const [tractDiscipleMakers, setTractDiscipleMakers] = useState({});
  // Full data objects for counties and tracts
  const [countyData, setCountyData] = useState({});
  const [tractData, setTractData] = useState({});
  const [hoverInfo, setHoverInfo] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null); // { name, GEOID }
  const [tractPopulationsByCounty, setTractPopulationsByCounty] = useState({});
  const [coordinator, setCoordinator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL;

  // Default state config for Illinois
  const stateConfig = {
    center: [40.0, -89.0],
    zoom: 7,
    countiesFile: "/illinois_counties_with_population.geojson"
  };

  // Fetch disciple makers data from backend
  useEffect(() => {
    if (user && token) {
      fetchDiscipleMakersData();
    } else {
      // In view mode, fetch public data
      fetchPublicData();
    }
  }, [user, token, dataRefreshTrigger]);

  // Refresh data when changes are made
  const refreshData = () => {
    setDataRefreshTrigger(prev => prev + 1);
  };

  // Listen for data change events from other components
  useEffect(() => {
    const handleDataChange = () => {
      refreshData();
    };

    window.addEventListener('dataChanged', handleDataChange);
    return () => {
      window.removeEventListener('dataChanged', handleDataChange);
    };
  }, []);

  // Force refresh when component mounts (for page switching)
  useEffect(() => {
    if (user && token) {
      fetchDiscipleMakersData();
    } else {
      // In view mode, fetch public data
      fetchPublicData();
    }
  }, []); // Empty dependency array means this runs once when component mounts

  const fetchDiscipleMakersData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/coordinator/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Process county data
      const countyDataMap = {};
      const fullCountyData = {};
      if (response.data.counties) {
        response.data.counties.forEach(county => {
          if (county.discipleMakers !== undefined) {
            countyDataMap[county.name] = county.discipleMakers;
            fullCountyData[county.name] = {
              discipleMakers: county.discipleMakers,
              simpleChurches: county.simpleChurches || 0,
              legacyChurches: county.legacyChurches || 0
            };
          }
        });
      }
      
      setDiscipleMakers(countyDataMap);
      setCountyData(fullCountyData);
      
      // Process tract data
      const tractDataMap = {};
      const fullTractData = {};
      if (response.data.tracts) {
        response.data.tracts.forEach(tract => {
          if (tract.discipleMakers !== undefined) {
            tractDataMap[tract.tractId] = tract.discipleMakers;
            fullTractData[tract.tractId] = {
              discipleMakers: tract.discipleMakers,
              simpleChurches: tract.simpleChurches || 0,
              legacyChurches: tract.legacyChurches || 0
            };
          }
        });
      }
      setTractDiscipleMakers(tractDataMap);
      setTractData(fullTractData);
    } catch (err) {
      console.error("Failed to fetch disciple makers data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch public data for view mode (no authentication required)
  const fetchPublicData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/public/data`);
      
      // Process county data
      const countyDataMap = {};
      const fullCountyData = {};
      if (response.data.counties) {
        response.data.counties.forEach(county => {
          if (county.discipleMakers !== undefined) {
            countyDataMap[county.name] = county.discipleMakers;
            fullCountyData[county.name] = {
              discipleMakers: county.discipleMakers,
              simpleChurches: county.simpleChurches || 0,
              legacyChurches: county.legacyChurches || 0
            };
          }
        });
      }
      
      setDiscipleMakers(countyDataMap);
      setCountyData(fullCountyData);
      
      // Process tract data
      const tractDataMap = {};
      const fullTractData = {};
      if (response.data.tracts) {
        response.data.tracts.forEach(tract => {
          if (tract.discipleMakers !== undefined) {
            tractDataMap[tract.tractId] = tract.discipleMakers;
            fullTractData[tract.tractId] = {
              discipleMakers: tract.discipleMakers,
              simpleChurches: tract.simpleChurches || 0,
              legacyChurches: tract.legacyChurches || 0
            };
          }
        });
      }
      setTractDiscipleMakers(tractDataMap);
      setTractData(fullTractData);
    } catch (err) {
      console.error("Failed to fetch public data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load tracts and sum populations by county
  useEffect(() => {
    async function fetchTracts() {
      try {
        const res = await axios.get("/fixed_tracts.geojson");
        // Map: { [countyFP]: totalPopulation }
        const popByCounty = {};
        res.data.features.forEach(f => {
          const countyFP = f.properties.COUNTYFP || f.properties.countyfp || f.properties.COUNTY_GEOID || f.properties.COUNTY || f.properties.COUNTY_ID;
          const population = f.properties.POP_2020 || f.properties.population || f.properties.POPULATION || f.properties.POP2010 || 0;
          if (!popByCounty[countyFP]) popByCounty[countyFP] = 0;
          popByCounty[countyFP] += population;
        });
        setTractPopulationsByCounty(popByCounty);
      } catch (err) {
        console.error("Failed to load tracts for population sum", err);
      }
    }
    fetchTracts();
  }, []);

  // Fetch coordinator for county or tract
  const fetchCoordinator = async (isTract, id) => {
    try {
      const endpoint = isTract ? `/api/coordinator/tract/${id}` : `/api/coordinator/county/${id}`;
      const res = await axios.get(`${API_URL}${endpoint}`);
      setCoordinator(res.data.coordinator);
    } catch (err) {
      console.error("Failed to fetch coordinator", err);
      setCoordinator(null);
    }
  };

  // Update hover info to include current discipleMakers for the county
  const handleCountyHover = async (info) => {
    if (!info) {
      setHoverInfo(null);
      setCoordinator(null);
      return;
    }
    const countyInfo = countyData[info.name] || {};
    setHoverInfo({
      ...info,
      discipleMakers: discipleMakers[info.name] || 0,
      simpleChurches: countyInfo.simpleChurches || 0,
      legacyChurches: countyInfo.legacyChurches || 0,
      id: info.countyfp || info.name, // use countyfp as id for population lookup
    });
    // Fetch coordinator for county
    await fetchCoordinator(false, info.countyfp || info.name);
  };

  // Update discipleMakers for a county
  const handleDiscipleMakersChange = async (countyName, value) => {
    // Update local state immediately for responsive UI
    setDiscipleMakers((prev) => ({ ...prev, [countyName]: value }));
    setHoverInfo((prev) =>
      prev && prev.name === countyName ? { ...prev, discipleMakers: value } : prev
    );
    
    // Also update backend
    try {
      await axios.post(`${API_URL}/api/county/bulk-update`, {
        updates: [{
          countyName,
          discipleMakers: value
        }]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to update county disciple makers:", err);
    }
  };

  // When a county is clicked, zoom to tracts for that county
  const handleCountyClick = (info) => {
    setSelectedCounty({
      name: info.name,
      GEOID: info.geoid || info.GEOID || info.geoidfp || info.GEOIDFP || info.geoidfp10 || info.GEOIDFP10 || info.COUNTYFP || info.countyfp || info.name,
    });
    setHoverInfo(null);
    setCoordinator(null);
  };

  // Tract handlers
  const handleTractHover = async (info) => {
    if (!info) {
      setHoverInfo(null);
      setCoordinator(null);
      return;
    }
    const tractInfo = tractData[info.tractId] || {};
    setHoverInfo({
      ...info,
      discipleMakers: tractDiscipleMakers[info.tractId] || 0,
      simpleChurches: tractInfo.simpleChurches || 0,
      legacyChurches: tractInfo.legacyChurches || 0,
      id: info.tractId,
    });
    // Fetch coordinator for tract
    await fetchCoordinator(true, info.tractId);
  };
  
  const handleTractDiscipleMakersChange = async (tractId, value) => {
    // Update local state immediately for responsive UI
    setTractDiscipleMakers((prev) => ({ ...prev, [tractId]: value }));
    setHoverInfo((prev) =>
      prev && prev.tractId === tractId ? { ...prev, discipleMakers: value } : prev
    );
    
    // Also update backend
    try {
      await axios.post(`${API_URL}/api/tract/bulk-update`, {
        updates: [{
          tractId,
          discipleMakers: value
        }]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to update tract disciple makers:", err);
    }
  };

  const handleTractClick = (info) => {
    // This will be handled by the TractMap component itself
    // The TractMap will show the modal if user is logged in
  };

  const handleBackToCounties = () => {
    setSelectedCounty(null);
    setHoverInfo(null);
    setCoordinator(null);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div>Loading map data...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* Map area (2/3 width) */}
      <div style={{ flex: 2, height: "100%" }}>
        {selectedCounty ? (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <button
              onClick={handleBackToCounties}
              style={{
                position: "absolute",
                zIndex: 3000,
                top: 10,
                left: 10,
                padding: "0.5rem 1rem",
                background: "#fff",
                color: "#222",
                border: "1px solid #ccc",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                fontWeight: 600
              }}
            >
               Back to Counties
            </button>
            <TractMap
              countyGEOID={selectedCounty.GEOID}
              onTractHover={handleTractHover}
              onTractClick={handleTractClick}
              tractDiscipleMakers={tractDiscipleMakers}
              setTractDiscipleMakers={handleTractDiscipleMakersChange}
              onDataRefresh={refreshData}
            />
          </div>
        ) : (
          <CountyMap
            onCountyHover={handleCountyHover}
            onCountyClick={handleCountyClick}
            discipleMakers={discipleMakers}
            setDiscipleMakers={handleDiscipleMakersChange}
            stateConfig={stateConfig}
            onDataRefresh={refreshData}
          />
        )}
      </div>
      {/* Info panel (1/3 width) */}
      <div style={{ flex: 1, height: "100%", background: "#fafafa", borderLeft: "1px solid #ddd", padding: "1rem" }}>
        <HoverInfoBox
          info={hoverInfo}
          setDiscipleMakers={selectedCounty ? handleTractDiscipleMakersChange : handleDiscipleMakersChange}
          tractPopulationsByCounty={tractPopulationsByCounty}
          coordinator={coordinator}
          countyName={selectedCounty ? selectedCounty.name : null}
        />
      </div>
    </div>
  );
}

export default MapDashboard; 