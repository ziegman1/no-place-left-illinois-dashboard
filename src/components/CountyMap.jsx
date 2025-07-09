import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import * as d3 from "d3";
import { useAuth } from "../App";
import CountyEditModal from "./CountyEditModal";

const ILLINOIS_CENTER = [40.0, -89.0];
const US_ZOOM = 5.5;

function CountyMap({ onCountyHover, onCountyClick, discipleMakers, setDiscipleMakers }) {
  const [countyData, setCountyData] = useState(null);
  const geoJsonLayerRef = useRef();
  const { user } = useAuth();
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get("/fixed_illinois_counties.geojson");
        setCountyData(res.data);
      } catch (err) {
        console.error("Failed to load counties GeoJSON", err);
      }
    }
    fetchData();
  }, []);

  function getCountyInfo(feature) {
    const name = feature.properties.NAME || feature.properties.name;
    let population;
    if (feature.properties.POP_2020 !== undefined && feature.properties.POP_2020 !== null) {
      population = feature.properties.POP_2020;
    } else if (feature.properties.population !== undefined && feature.properties.population !== null) {
      population = feature.properties.population;
    } else if (feature.properties.POPULATION !== undefined && feature.properties.POPULATION !== null) {
      population = feature.properties.POPULATION;
    } else {
      population = feature.properties.POP2010;
    }
    const countyfp = feature.properties.COUNTYFP || feature.properties.countyfp;
    const discipleCount = discipleMakers[name] || 0;
    
    // Calculate people far from God: (population * 0.85) - disciple makers
    let peopleFarFromGod = 0;
    let percentFarFromGod = 0;
    if (population && population > 0) {
      const initialPeopleFarFromGod = population * 0.85;
      peopleFarFromGod = Math.max(0, initialPeopleFarFromGod - discipleCount);
      percentFarFromGod = (peopleFarFromGod / population) * 100;
    }
    
    return {
      name,
      population,
      countyfp,
      percentFarFromGod,
      peopleFarFromGod: Math.round(peopleFarFromGod),
      simpleChurches: 0,
      legacyChurches: 0,
      discipleMakers: discipleCount,
    };
  }

  // Color scale: progress toward 10% goal
  function getCountyColor(population, discipleCount) {
    const goal = 0.1 * (population || 1);
    const progress = Math.max(0, Math.min(1, discipleCount / goal));
    return d3.interpolateRdYlGn(progress);
  }

  const handleCountyClick = (info) => {
    clickCountRef.current += 1;
    
    if (clickCountRef.current === 1) {
      // First click - wait for potential second click
      clickTimeoutRef.current = setTimeout(() => {
        // Single click - zoom to tracts
        onCountyClick(info);
        clickCountRef.current = 0;
      }, 300); // 300ms delay to detect double-click
    } else if (clickCountRef.current === 2) {
      // Double click detected
      clearTimeout(clickTimeoutRef.current);
      clickCountRef.current = 0;
      
      // Double click opens edit modal for state coordinators only
      if (user && user.role === "state") {
        setSelectedCounty(info);
        setShowEditModal(true);
      }
    }
  };

  function onEachFeature(feature, layer) {
    const info = getCountyInfo(feature);
    layer.on({
      mouseover: () => {
        onCountyHover(info);
      },
      mouseout: () => {
        onCountyHover(null);
      },
      click: (e) => {
        // Prevent default behavior
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        
        // Handle click with our custom logic
        handleCountyClick(info);
      },
    });
    layer.setStyle({
      color: "#333",
      weight: 1,
      fillOpacity: 0.7,
      fillColor: getCountyColor(info.population, info.discipleMakers),
    });
  }

  // Redraw colors if discipleMakers changes
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;
    geoJsonLayerRef.current.eachLayer((layer) => {
      if (layer.feature) {
        const info = getCountyInfo(layer.feature);
        layer.setStyle({
          fillColor: getCountyColor(info.population, info.discipleMakers),
        });
      }
    });
  }, [discipleMakers]);

  return (
    <>
      <MapContainer
        center={ILLINOIS_CENTER}
        zoom={US_ZOOM}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {countyData && (
          <GeoJSON data={countyData} onEachFeature={onEachFeature} ref={geoJsonLayerRef} />
        )}
      </MapContainer>
      <CountyEditModal
        county={selectedCounty}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onCoordinatorAssigned={() => {
          // Optionally update hover info or state here
        }}
      />
    </>
  );
}

export default CountyMap; 