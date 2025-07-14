import React, { useState, useEffect } from "react";
import "./MapDashboard.css";
import CountyMap from "./CountyMap";
import TractMap from "./TractMap";
import HoverInfoBox from "./HoverInfoBox";
import axios from "axios";
import { useAuth } from "../App";
import { getApiUrl } from "../utils/api";
import CountyEditModal from "./CountyEditModal";

function MapDashboard() {
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [discipleMakers, setDiscipleMakers] = useState({});
  const [tractDiscipleMakers, setTractDiscipleMakers] = useState({});
  const [tractData, setTractData] = useState({});
  const [tractPopulationsByCounty, setTractPopulationsByCounty] = useState({});
  const [countyMetrics, setCountyMetrics] = useState({});
  const [coordinator, setCoordinator] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false);
  const [selectedCountyForCoordinator, setSelectedCountyForCoordinator] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverStartPosition, setHoverStartPosition] = useState({ x: 0, y: 0 });
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
    
    // Add event listener for coordinator modal
    const handleCoordinatorModal = (event) => {
      setSelectedCountyForCoordinator(event.detail);
      setShowCoordinatorModal(true);
    };
    
    window.addEventListener('openCoordinatorModal', handleCoordinatorModal);

    return () => {
      window.removeEventListener('dataChanged', handleDataChange);
      window.removeEventListener('openCoordinatorModal', handleCoordinatorModal);
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
      // Calculate county-level disciple-making metrics as sums of all tracts
      const countyMetrics = {};
      
      Object.keys(tractRes.data).forEach(tractId => {
        const tract = tractRes.data[tractId];
        if (tract.countyfp) {
          if (!populations[tract.countyfp]) {
            populations[tract.countyfp] = 0;
          }
          if (!countyMetrics[tract.countyfp]) {
            countyMetrics[tract.countyfp] = {
              discipleMakers: 0,
              simpleChurches: 0,
              legacyChurches: 0
            };
          }
          
          if (tract.population) {
            populations[tract.countyfp] += tract.population;
          }
          if (tract.discipleMakers) {
            countyMetrics[tract.countyfp].discipleMakers += tract.discipleMakers;
          }
          if (tract.simpleChurches) {
            countyMetrics[tract.countyfp].simpleChurches += tract.simpleChurches;
          }
          if (tract.legacyChurches) {
            countyMetrics[tract.countyfp].legacyChurches += tract.legacyChurches;
          }
        }
      });
      setTractPopulationsByCounty(populations);
      
      // Set tract disciple makers
      const tractDiscipleData = {};
      Object.keys(tractRes.data).forEach(tractId => {
        tractDiscipleData[tractId] = tractRes.data[tractId].discipleMakers || 0;
      });
      setTractDiscipleMakers(tractDiscipleData);
      
      // Update discipleMakers state with county-level sums
      const countyDiscipleMakers = {};
      Object.keys(countyMetrics).forEach(countyfp => {
        countyDiscipleMakers[countyfp] = countyMetrics[countyfp].discipleMakers;
      });
      setDiscipleMakers(countyDiscipleMakers);
      
      // Store county metrics for hover info
      setCountyMetrics(countyMetrics);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const handleCountyHover = (info) => {
    if (info) {
      // Add county-level metrics to the hover info
      const countyData = countyMetrics[info.countyfp] || { discipleMakers: 0, simpleChurches: 0, legacyChurches: 0 };
      const enhancedInfo = {
        ...info,
        discipleMakers: countyData.discipleMakers,
        simpleChurches: countyData.simpleChurches,
        legacyChurches: countyData.legacyChurches
      };
      setHoverInfo(enhancedInfo);
      setCountyName(info.name);
      
      // Set hover position only when starting to hover over a new county
      if (!isHovering || hoverInfo?.countyfp !== info.countyfp) {
        setHoverStartPosition(mousePosition);
        setIsHovering(true);
      }
      
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
      setHoverInfo(null);
      setCoordinator(null);
      setCountyName(null);
      setIsHovering(false);
    }
  };

  const handleMouseMove = (event) => {
    // Only update mouse position when not hovering over a county
    // This allows the panel to stay fixed when hovering
    if (!isHovering) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handlePanelMouseLeave = () => {
    // When mouse leaves the panel, allow it to move again after a small delay
    setTimeout(() => {
      setIsHovering(false);
    }, 100);
  };

  const handlePanelMouseEnter = () => {
    // When mouse enters the panel, keep it fixed
    setIsHovering(true);
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
    <div className="map-dashboard-container" onMouseMove={handleMouseMove}>
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
        
        {hoverInfo && (
          <div 
            className="map-info-panel"
            style={{
              position: 'fixed',
              top: Math.min(hoverStartPosition.y + 10, window.innerHeight - 400),
              left: Math.min(hoverStartPosition.x + 10, window.innerWidth - 320),
              zIndex: 1000
            }}
            onMouseLeave={handlePanelMouseLeave}
            onMouseEnter={handlePanelMouseEnter}
          >
            <HoverInfoBox
              info={hoverInfo}
              setDiscipleMakers={handleDiscipleMakersChange}
              tractPopulationsByCounty={tractPopulationsByCounty}
              countyMetrics={countyMetrics}
              coordinator={coordinator}
              countyName={countyName}
              onDataUpdate={handleDataUpdate}
            />
          </div>
        )}
        
        {selectedCounty && (
          <button
            onClick={() => setSelectedCounty(null)}
            className="back-to-counties-button"
          >
            ← Back to Counties
          </button>
        )}
      </div>
      
      {showCoordinatorModal && selectedCountyForCoordinator && (
        <CountyEditModal
          county={selectedCountyForCoordinator}
          onClose={() => {
            setShowCoordinatorModal(false);
            setSelectedCountyForCoordinator(null);
            // Refresh coordinator data
            if (hoverInfo && hoverInfo.countyfp) {
              const API_URL = getApiUrl();
              axios.get(`${API_URL}/api/coordinator/county/${hoverInfo.countyfp}`, {
                headers: { Authorization: `Bearer ${user.token}` }
              })
                .then(res => setCoordinator(res.data.coordinator?.name || null))
                .catch(() => setCoordinator(null));
            }
          }}
        />
      )}
    </div>
  );
}

export default MapDashboard; 