import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import * as d3 from "d3";
import { useAuth } from "../App";
import TractDetailModal from "./TractDetailModal";

function TractMap({ countyGEOID, onTractHover, onTractClick, tractDiscipleMakers, tractData: fullTractData, setTractDiscipleMakers, onDataRefresh }) {
  const [tractData, setTractData] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.0, -89.0]);
  const geoJsonLayerRef = useRef();
  const { user } = useAuth();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTract, setSelectedTract] = useState(null);
  const [lastTappedTract, setLastTappedTract] = useState(null);
  const [selectedTractId, setSelectedTractId] = useState(null);
  const [lockedTractId, setLockedTractId] = useState(null);

  // Mobile device detection
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    async function fetchData() {
      try {
        setTractData(null);
        const res = await axios.get("/fixed_tracts.geojson");
        // Filter tracts for the selected county
        const filtered = {
          ...res.data,
          features: res.data.features.filter(f => {
            const countyfp = f.properties.COUNTYFP || f.properties.countyfp || f.properties.COUNTY_GEOID || f.properties.COUNTY || f.properties.COUNTY_ID;
            return countyfp === countyGEOID;
          })
        };
        setTractData(filtered);
        
        // Calculate center of the tracts
        if (filtered.features.length > 0) {
          let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
          
          filtered.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
              // Handle both Polygon and MultiPolygon
              const coordinates = feature.geometry.type === 'Polygon' 
                ? feature.geometry.coordinates 
                : feature.geometry.coordinates.flat();
              
              coordinates.forEach(ring => {
                ring.forEach(coord => {
                  const [lng, lat] = coord;
                  minLat = Math.min(minLat, lat);
                  maxLat = Math.max(maxLat, lat);
                  minLng = Math.min(minLng, lng);
                  maxLng = Math.max(maxLng, lng);
                });
              });
            }
          });
          
          if (minLat !== Infinity && maxLat !== -Infinity) {
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            setMapCenter([centerLat, centerLng]);
          }
        }
      } catch (err) {
        console.error("Failed to load tracts GeoJSON", err);
      }
    }
    if (countyGEOID) fetchData();
  }, [countyGEOID]);

  // Force refresh when component mounts (for page switching)
  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Force refreshing tracts for county:", countyGEOID);
        const res = await axios.get("/fixed_tracts.geojson");
        // Filter tracts for the selected county
        const filtered = {
          ...res.data,
          features: res.data.features.filter(f => {
            const countyfp = f.properties.COUNTYFP || f.properties.countyfp || f.properties.COUNTY_GEOID || f.properties.COUNTY || f.properties.COUNTY_ID;
            return countyfp === countyGEOID;
          })
        };
        setTractData(filtered);
        
        // Calculate center of the tracts
        if (filtered.features.length > 0) {
          let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
          
          filtered.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
              // Handle both Polygon and MultiPolygon
              const coordinates = feature.geometry.type === 'Polygon' 
                ? feature.geometry.coordinates 
                : feature.geometry.coordinates.flat();
              
              coordinates.forEach(ring => {
                ring.forEach(coord => {
                  const [lng, lat] = coord;
                  minLat = Math.min(minLat, lat);
                  maxLat = Math.max(maxLat, lat);
                  minLng = Math.min(minLng, lng);
                  maxLng = Math.max(maxLng, lng);
                });
              });
            }
          });
          
          if (minLat !== Infinity && maxLat !== -Infinity) {
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            setMapCenter([centerLat, centerLng]);
          }
        }
      } catch (err) {
        console.error("Failed to refresh tracts GeoJSON", err);
      }
    }
    if (countyGEOID) fetchData();
  }, []); // Empty dependency array means this runs once when component mounts

  // Reset state when county changes
  useEffect(() => {
    setSelectedTractId(null);
    setLastTappedTract(null);
    setLockedTractId(null);
  }, [countyGEOID]);

  function getTractInfo(feature) {
    const tractCe = feature.properties.TRACTCE || feature.properties.tractce;
    const countyFp = feature.properties.COUNTYFP || feature.properties.countyfp;
    const stateFp = feature.properties.STATEFP || feature.properties.statefp || "17"; // Illinois
    const tractId = tractCe; // Use the tract code as is for the map
    const population = feature.properties.POP_2020 || feature.properties.population || feature.properties.POPULATION || feature.properties.POP2010 || 0;
    const discipleCount = tractDiscipleMakers[tractId] || 0;
    
    // Get full tract data including simpleChurches and legacyChurches
    const tractInfo = fullTractData[tractId] || {};
    const simpleChurches = tractInfo.simpleChurches || 0;
    const legacyChurches = tractInfo.legacyChurches || 0;
    
    let peopleFarFromGod = 0;
    let percentFarFromGod = 0;
    if (population && population > 0) {
      const initialPeopleFarFromGod = population * 0.85;
      peopleFarFromGod = Math.max(0, initialPeopleFarFromGod - discipleCount);
      percentFarFromGod = (peopleFarFromGod / population) * 100;
    }
    return {
      tractId,
      population,
      percentFarFromGod,
      peopleFarFromGod: Math.round(peopleFarFromGod),
      simpleChurches,
      legacyChurches,
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

  function getTractColor(population, discipleCount, isSelected) {
    const goal = 0.1 * (population || 1);
    const progress = Math.max(0, Math.min(1, discipleCount / goal));
    const baseColor = d3.interpolateRdYlGn(progress);
    const baseHex = rgbToHex(baseColor);
    if (isSelected) {
      return blendWithWhite(baseHex, 0.4); // 40% white
    }
    return baseHex;
  }

  // Highlight logic: set selected tract on hover/tap/click
  const setHighlightTract = (tractId) => {
    setSelectedTractId(tractId);
  };
  const clearHighlightTract = () => {
    setSelectedTractId(null);
  };

  function onEachFeature(feature, layer) {
    const info = getTractInfo(feature);
    const tractId = info.tractId;
    layer.on({
      mouseover: () => {
        if (!isTouchDevice && !lockedTractId) {
          onTractHover(info);
          setHighlightTract(tractId);
        }
      },
      mouseout: () => {
        if (!isTouchDevice && !lockedTractId) {
          onTractHover(null);
          clearHighlightTract();
        }
      },
      click: (e) => {
        if (isTouchDevice) {
          if (lastTappedTract === tractId) {
            // Double tap on mobile - open edit modal if logged in
            if (user && user.role === "state") {
              setSelectedTract(info);
              setShowDetailModal(true);
            } else {
              onTractClick(info);
            }
            setLastTappedTract(null);
            onTractHover(null);
            clearHighlightTract();
          } else {
            onTractHover(info);
            setLastTappedTract(tractId);
            setHighlightTract(tractId);
          }
        } else {
          // Desktop click - handle lock/unlock or edit modal
          if (lockedTractId === tractId) {
            // Unlock the tract
            setLockedTractId(null);
            onTractHover(null);
            clearHighlightTract();
          } else if (lockedTractId) {
            // Another tract is locked, unlock it and lock this one
            setLockedTractId(tractId);
            onTractHover(info);
            setHighlightTract(tractId);
          } else {
            // No tract is locked, lock this one
            setLockedTractId(tractId);
            onTractHover(info);
            setHighlightTract(tractId);
          }
        }
      },
    });
    // Set style: highlight if selected or locked
    const isSelected = selectedTractId === tractId;
    const isLocked = lockedTractId === tractId;
    layer.setStyle({
      color: isSelected || isLocked ? "#222" : "#333",
      weight: isSelected || isLocked ? 4 : 1,
      fillOpacity: isSelected || isLocked ? 0.85 : 0.7,
      fillColor: getTractColor(info.population, info.discipleMakers, isSelected || isLocked),
    });
  }

  // Redraw colors and highlight if discipleMakers, tractData, selectedTractId, or lockedTractId changes
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;
    geoJsonLayerRef.current.eachLayer((layer) => {
      if (layer.feature) {
        const info = getTractInfo(layer.feature);
        const tractId = info.tractId;
        const isSelected = selectedTractId === tractId;
        const isLocked = lockedTractId === tractId;
        layer.setStyle({
          fillColor: getTractColor(info.population, info.discipleMakers, isSelected || isLocked),
          color: isSelected || isLocked ? "#222" : "#333",
          weight: isSelected || isLocked ? 4 : 1,
          fillOpacity: isSelected || isLocked ? 0.85 : 0.7,
        });
      }
    });
  }, [tractDiscipleMakers, fullTractData, selectedTractId, lockedTractId]);

  return (
    <>
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
          center={mapCenter}
          zoom={10}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
          doubleClickZoom={false}
          key={`${mapCenter[0]}-${mapCenter[1]}-${countyGEOID}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {tractData && (
            <GeoJSON
              data={tractData}
              onEachFeature={onEachFeature}
              ref={geoJsonLayerRef}
              key={`tract-data-${tractData ? tractData.features.length : 0}-${countyGEOID}-${Date.now()}`}
            />
        )}
      </MapContainer>
      </div>
      <TractDetailModal
        tract={selectedTract}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onDataUpdate={(tractId, updatedData) => {
          // Update the tract disciple makers when data is changed
          setTractDiscipleMakers(prev => ({
            ...prev,
            [tractId]: updatedData.discipleMakers
          }));
          // Refresh data from backend to update all components
          if (onDataRefresh) {
            onDataRefresh();
          }
          // Dispatch event to notify other components
          window.dispatchEvent(new Event('dataChanged'));
          // Close the modal
          setShowDetailModal(false);
          setSelectedTract(null);
        }}
      />
      
      {/* Add a small indicator when a tract is locked */}
      {lockedTractId && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🔒 Tract Locked</span>
          <button
            onClick={() => {
              setLockedTractId(null);
              onTractHover(null);
              clearHighlightTract();
            }}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid white',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            Unlock
          </button>
        </div>
      )}
    </>
  );
}

export default TractMap; 