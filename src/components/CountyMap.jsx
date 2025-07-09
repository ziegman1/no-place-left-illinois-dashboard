import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import * as d3 from "d3";
import { useAuth } from "../App";
import CountyEditModal from "./CountyEditModal";

const ILLINOIS_CENTER = [40.0, -89.0];
const US_ZOOM = 5.5;

function CountyMap({ onCountyHover, onCountyClick, discipleMakers, setDiscipleMakers, stateConfig }) {
  if (!stateConfig) {
    return <div>Loading map configuration...</div>;
  }
  const [countyData, setCountyData] = useState(null);
  const geoJsonLayerRef = useRef();
  const { user } = useAuth();
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [lastTappedCounty, setLastTappedCounty] = useState(null);
  const [selectedCountyFP, setSelectedCountyFP] = useState(null);

  // Mobile device detection
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Fetching counties from:", stateConfig.countiesFile);
        setCountyData(null);
        const res = await axios.get(stateConfig.countiesFile);
        console.log("County data loaded:", res.data);
        setCountyData(res.data);
      } catch (err) {
        console.error("Failed to load counties GeoJSON", err);
      }
    }
    fetchData();
  }, [stateConfig.countiesFile]);

  function getCountyInfo(feature) {
    const name = feature.properties.NAME || feature.properties.name;
    let population;
    if (feature.properties.acs5_county_clean_fixed_total_population !== undefined && feature.properties.acs5_county_clean_fixed_total_population !== null) {
      population = parseInt(feature.properties.acs5_county_clean_fixed_total_population);
    } else if (feature.properties.POP_2020 !== undefined && feature.properties.POP_2020 !== null) {
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

  function rgbToHex(rgb) {
    // rgb: 'rgb(r, g, b)'
    const result = rgb.match(/\d+/g);
    if (!result) return rgb;
    return (
      '#' +
      result
        .map(x => parseInt(x).toString(16).padStart(2, '0'))
        .join('')
    );
  }

  function blendWithWhite(hex, ratio) {
    // hex: '#rrggbb', ratio: 0-1 (0=original, 1=white)
    const r = parseInt(hex.substr(1,2),16);
    const g = parseInt(hex.substr(3,2),16);
    const b = parseInt(hex.substr(5,2),16);
    const newR = Math.round(r + (255 - r) * ratio);
    const newG = Math.round(g + (255 - g) * ratio);
    const newB = Math.round(b + (255 - b) * ratio);
    return `#${newR.toString(16).padStart(2,'0')}${newG.toString(16).padStart(2,'0')}${newB.toString(16).padStart(2,'0')}`;
  }

  function getCountyColor(population, discipleCount, isSelected) {
    const goal = 0.1 * (population || 1);
    const progress = Math.max(0, Math.min(1, discipleCount / goal));
    const baseColor = d3.interpolateRdYlGn(progress);
    const baseHex = rgbToHex(baseColor);
    if (isSelected) {
      return blendWithWhite(baseHex, 0.4); // 40% white
    }
    return baseHex;
  }

  // Highlight logic: set selected county on hover/tap/click
  const setHighlightCounty = (countyfp) => {
    setSelectedCountyFP(countyfp);
  };

  // Remove highlight
  const clearHighlightCounty = () => {
    setSelectedCountyFP(null);
  };

  const handleCountyClick = (info) => {
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        onCountyClick(info);
        clickCountRef.current = 0;
      }, 300);
    } else if (clickCountRef.current === 2) {
      clearTimeout(clickTimeoutRef.current);
      clickCountRef.current = 0;
      if (user && user.role === "state") {
        setSelectedCounty(info);
        setShowEditModal(true);
      }
    }
  };

  function onEachFeature(feature, layer) {
    const info = getCountyInfo(feature);
    const countyfp = info.countyfp;
    layer.on({
      mouseover: () => {
        if (!isTouchDevice) {
          onCountyHover(info);
          setHighlightCounty(countyfp);
        }
      },
      mouseout: () => {
        if (!isTouchDevice) {
          onCountyHover(null);
          clearHighlightCounty();
        }
      },
      click: (e) => {
        if (isTouchDevice) {
          if (lastTappedCounty === countyfp) {
            onCountyClick(info); // Zoom in to tracts
            setLastTappedCounty(null);
            onCountyHover(null);
            clearHighlightCounty();
          } else {
            onCountyHover(info); // Show info
            setLastTappedCounty(countyfp);
            setHighlightCounty(countyfp);
          }
        } else {
          setHighlightCounty(countyfp);
          handleCountyClick(info); // Desktop logic
        }
      },
    });
    // Set style: highlight if selected
    const isSelected = selectedCountyFP === countyfp;
    layer.setStyle({
      color: isSelected ? "#222" : "#333",
      weight: isSelected ? 4 : 1,
      fillOpacity: 0.7,
      fillColor: getCountyColor(info.population, info.discipleMakers, isSelected),
    });
  }

  // Redraw colors and highlight if discipleMakers or selectedCountyFP changes
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;
    geoJsonLayerRef.current.eachLayer((layer) => {
      if (layer.feature) {
        const info = getCountyInfo(layer.feature);
        const countyfp = info.countyfp;
        const isSelected = selectedCountyFP === countyfp;
        layer.setStyle({
          fillColor: getCountyColor(info.population, info.discipleMakers, isSelected),
          color: isSelected ? "#222" : "#333",
          weight: isSelected ? 4 : 1,
        });
      }
    });
  }, [discipleMakers, selectedCountyFP]);

  return (
    <>
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <MapContainer
          key={`${stateConfig.center[0]}-${stateConfig.center[1]}-${stateConfig.zoom}`}
          center={stateConfig.center}
          zoom={stateConfig.zoom}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={true}
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {countyData && (
            <GeoJSON 
              data={countyData} 
              onEachFeature={onEachFeature} 
              ref={geoJsonLayerRef}
              onAdd={() => console.log("GeoJSON layer added with data:", countyData)}
              key={JSON.stringify(countyData)}
            />
          )}
        </MapContainer>
      </div>
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