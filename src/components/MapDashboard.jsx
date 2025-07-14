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
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false);
  const [selectedCountyForCoordinator, setSelectedCountyForCoordinator] = useState(null);
  const [countyName, setCountyName] = useState(null);
  const [coordinatorLoading, setCoordinatorLoading] = useState(false);
  const [currentHoverCounty, setCurrentHoverCounty] = useState(null);

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
    
    // Add event listener for closing hover panel
    const handleCloseHoverPanel = () => {
      setHoverInfo(null);
      setCoordinator(null);
      setCountyName(null);
    };
    
    // Add event listener for navigating to data management
    const handleNavigateToDataManagement = () => {
      // Dispatch custom event to be handled by parent App component
      window.dispatchEvent(new CustomEvent('navigateToPage', { detail: 'database' }));
    };
    
    window.addEventListener('openCoordinatorModal', handleCoordinatorModal);
    window.addEventListener('closeHoverPanel', handleCloseHoverPanel);
    window.addEventListener('navigateToDataManagement', handleNavigateToDataManagement);

    return () => {
      window.removeEventListener('dataChanged', handleDataChange);
      window.removeEventListener('openCoordinatorModal', handleCoordinatorModal);
      window.removeEventListener('closeHoverPanel', handleCloseHoverPanel);
      window.removeEventListener('navigateToDataManagement', handleNavigateToDataManagement);
    };
  }, []);

  const fetchData = async () => {
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [discipleRes, tractRes, allTractRes] = await Promise.all([
        axios.get(`${API_URL}/api/disciple-makers`, { headers }),
        axios.get(`${API_URL}/api/tract-data`, { headers }),
        axios.get(`${API_URL}/api/tract-data/all`, { headers })
      ]);
      
      setDiscipleMakers(discipleRes.data);
      setTractData(tractRes.data);
      
      // Calculate tract populations by county using ALL tract data
      const populations = {};
      // Calculate county-level disciple-making metrics as sums of all tracts
      const countyMetrics = {};
      
      // County FIPS to name mapping (matching backend)
      const COUNTY_FIPS_TO_NAME = {
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
      
      // Use allTractRes.data for county calculations (includes all tracts with population data)
      Object.keys(allTractRes.data).forEach(tractId => {
        const tract = allTractRes.data[tractId];
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
      
      // Set tract disciple makers (use the manually updated tract data for individual tract display)
      const tractDiscipleData = {};
      Object.keys(tractRes.data).forEach(tractId => {
        tractDiscipleData[tractId] = tractRes.data[tractId].discipleMakers || 0;
      });
      setTractDiscipleMakers(tractDiscipleData);
      
      // Update discipleMakers state with county-level sums using county names
      const countyDiscipleMakers = {};
      Object.keys(countyMetrics).forEach(countyfp => {
        const countyName = COUNTY_FIPS_TO_NAME[countyfp];
        if (countyName) {
          countyDiscipleMakers[countyName] = countyMetrics[countyfp].discipleMakers;
        }
      });
      setDiscipleMakers(countyDiscipleMakers);
      
      // Store county metrics for hover info (keep FIPS codes for hover lookup)
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
      
      // Fetch coordinator data
      setCoordinatorLoading(true);
      setCurrentHoverCounty(info.countyfp);
      
      const token = localStorage.getItem("token");
      if (token) {
        const API_URL = getApiUrl();
        axios.get(`${API_URL}/api/coordinator/county/${info.countyfp}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => {
            // Check if we're still hovering over the same county
            if (currentHoverCounty === info.countyfp) {
              const coordinatorName = res.data.coordinator || null;
              setCoordinator(coordinatorName);
              setCoordinatorLoading(false);
            }
          })
          .catch(() => {
            // Check if we're still hovering over the same county
            if (currentHoverCounty === info.countyfp) {
              setCoordinator(null);
              setCoordinatorLoading(false);
            }
          });
      } else {
        setCoordinatorLoading(false);
      }
    } else {
      setHoverInfo(null);
      setCoordinator(null);
      setCountyName(null);
      setCurrentHoverCounty(null);
      setCoordinatorLoading(false);
    }
  };

  const handleCountyClick = (info) => {
    setSelectedCounty(info);
  };

  const handleTractHover = (info) => {
    if (info) {
      setHoverInfo(info);
      setCountyName(selectedCounty?.name);
      
      // Fetch coordinator data
      setCoordinatorLoading(true);
      setCurrentHoverCounty(info.tractId);
      
      const token = localStorage.getItem("token");
      if (token) {
        const API_URL = getApiUrl();
        axios.get(`${API_URL}/api/coordinator/tract/${info.tractId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => {
            // Check if we're still hovering over the same tract
            if (currentHoverCounty === info.tractId) {
              const coordinatorName = res.data.coordinator || null;
              setCoordinator(coordinatorName);
              setCoordinatorLoading(false);
            }
          })
          .catch(() => {
            // Check if we're still hovering over the same tract
            if (currentHoverCounty === info.tractId) {
              setCoordinator(null);
              setCoordinatorLoading(false);
            }
          });
      } else {
        setCoordinatorLoading(false);
      }
    } else {
      setHoverInfo(null);
      setCoordinator(null);
      setCurrentHoverCounty(null);
      setCoordinatorLoading(false);
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
        
        {hoverInfo && (
          <div className="map-info-panel">
            <HoverInfoBox
              info={hoverInfo}
              setDiscipleMakers={handleDiscipleMakersChange}
              tractPopulationsByCounty={tractPopulationsByCounty}
              countyMetrics={countyMetrics}
              coordinator={coordinator}
              countyName={countyName}
              onDataUpdate={handleDataUpdate}
              coordinatorLoading={coordinatorLoading}
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
          isOpen={showCoordinatorModal}
          onClose={() => {
            setShowCoordinatorModal(false);
            setSelectedCountyForCoordinator(null);
            // Refresh coordinator data
            if (hoverInfo && hoverInfo.countyfp) {
              const API_URL = getApiUrl();
              const token = localStorage.getItem("token");
              if (token) {
                setCoordinatorLoading(true);
                axios.get(`${API_URL}/api/coordinator/county/${hoverInfo.countyfp}`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                  .then(res => {
                    const coordinatorName = res.data.coordinator || null;
                    setCoordinator(coordinatorName);
                    setCoordinatorLoading(false);
                  })
                  .catch(() => {
                    setCoordinator(null);
                    setCoordinatorLoading(false);
                  });
              }
            }
          }}
          onCoordinatorAssigned={(coordinatorEmail) => {
            setCoordinator(coordinatorEmail);
          }}
          onNavigateToDataManagement={() => {
            window.dispatchEvent(new CustomEvent('navigateToPage', { detail: 'database' }));
          }}
        />
      )}
    </div>
  );
}

export default MapDashboard; 