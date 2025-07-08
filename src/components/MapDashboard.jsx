import React, { useState, useEffect } from "react";
import CountyMap from "./CountyMap";
import TractMap from "./TractMap";
import HoverInfoBox from "./HoverInfoBox";
import axios from "axios";

function MapDashboard() {
  // discipleMakers: { [countyName]: number }
  const [discipleMakers, setDiscipleMakers] = useState({});
  const [tractDiscipleMakers, setTractDiscipleMakers] = useState({});
  const [hoverInfo, setHoverInfo] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null); // { name, GEOID }
  const [tractPopulationsByCounty, setTractPopulationsByCounty] = useState({});
  const [coordinator, setCoordinator] = useState(null);
  

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
      const res = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`);
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
    setHoverInfo({
      ...info,
      discipleMakers: discipleMakers[info.name] || 0,
      id: info.countyfp || info.name, // use countyfp as id for population lookup
    });
    // Fetch coordinator for county
    await fetchCoordinator(false, info.countyfp || info.name);
  };

  // Update discipleMakers for a county
  const handleDiscipleMakersChange = (countyName, value) => {
    setDiscipleMakers((prev) => ({ ...prev, [countyName]: value }));
    setHoverInfo((prev) =>
      prev && prev.name === countyName ? { ...prev, discipleMakers: value } : prev
    );
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
    setHoverInfo({
      ...info,
      discipleMakers: tractDiscipleMakers[info.tractId] || 0,
      id: info.tractId,
    });
    // Fetch coordinator for tract
    await fetchCoordinator(true, info.tractId);
  };
  
  const handleTractDiscipleMakersChange = (tractId, value) => {
    setTractDiscipleMakers((prev) => ({ ...prev, [tractId]: value }));
    setHoverInfo((prev) =>
      prev && prev.tractId === tractId ? { ...prev, discipleMakers: value } : prev
    );
  };

  const handleTractClick = (info) => {};

  const handleBackToCounties = () => {
    setSelectedCounty(null);
    setHoverInfo(null);
    setCoordinator(null);
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* Map area (2/3 width) */}
      <div style={{ flex: 2, height: "100%" }}>
        {selectedCounty ? (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <button
              onClick={handleBackToCounties}
              style={{ position: "absolute", zIndex: 1000, top: 10, left: 10, padding: "0.5rem 1rem", background: "#fff", border: "1px solid #ccc", borderRadius: 4 }}
            >
              ← Back to Counties
            </button>
            <TractMap
              countyGEOID={selectedCounty.GEOID}
              onTractHover={handleTractHover}
              onTractClick={handleTractClick}
              tractDiscipleMakers={tractDiscipleMakers}
              setTractDiscipleMakers={handleTractDiscipleMakersChange}
            />
          </div>
        ) : (
          <CountyMap
            onCountyHover={handleCountyHover}
            onCountyClick={handleCountyClick}
            discipleMakers={discipleMakers}
            setDiscipleMakers={handleDiscipleMakersChange}
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