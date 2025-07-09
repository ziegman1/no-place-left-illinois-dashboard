import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import * as d3 from "d3";
import { useAuth } from "../App";
import TractDetailModal from "./TractDetailModal";

function TractMap({ countyGEOID, onTractHover, onTractClick, tractDiscipleMakers, setTractDiscipleMakers }) {
  const [tractData, setTractData] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.0, -89.0]);
  const geoJsonLayerRef = useRef();
  const { user } = useAuth();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTract, setSelectedTract] = useState(null);
  const [lastTappedTract, setLastTappedTract] = useState(null);
  const [selectedTractId, setSelectedTractId] = useState(null);

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

  function getTractInfo(feature) {
    const tractId = feature.properties.GEOID || feature.properties.geoid || feature.properties.TRACTCE || feature.properties.tractce;
    const population = feature.properties.POP_2020 || feature.properties.population || feature.properties.POPULATION || feature.properties.POP2010 || 0;
    const discipleCount = tractDiscipleMakers[tractId] || 0;
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
        if (!isTouchDevice) {
          onTractHover(info);
          setHighlightTract(tractId);
        }
      },
      mouseout: () => {
        if (!isTouchDevice) {
          onTractHover(null);
          clearHighlightTract();
        }
      },
      click: (e) => {
        if (isTouchDevice) {
          if (lastTappedTract === tractId) {
            onTractClick(info);
            setLastTappedTract(null);
            onTractHover(null);
            clearHighlightTract();
          } else {
            onTractHover(info);
            setLastTappedTract(tractId);
            setHighlightTract(tractId);
          }
        } else {
          setHighlightTract(tractId);
          onTractClick(info);
        }
      },
    });
    // Set style: highlight if selected
    const isSelected = selectedTractId === tractId;
    layer.setStyle({
      color: isSelected ? "#222" : "#333",
      weight: isSelected ? 4 : 1,
      fillOpacity: isSelected ? 0.85 : 0.7,
      fillColor: getTractColor(info.population, info.discipleMakers, isSelected),
    });
  }

  // Redraw colors and highlight if discipleMakers or selectedTractId changes
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;
    geoJsonLayerRef.current.eachLayer((layer) => {
      if (layer.feature) {
        const info = getTractInfo(layer.feature);
        const tractId = info.tractId;
        const isSelected = selectedTractId === tractId;
        layer.setStyle({
          fillColor: getTractColor(info.population, info.discipleMakers, isSelected),
          color: isSelected ? "#222" : "#333",
          weight: isSelected ? 4 : 1,
          fillOpacity: isSelected ? 0.85 : 0.7,
        });
      }
    });
  }, [tractDiscipleMakers, selectedTractId]);

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
              key={JSON.stringify(tractData)}
            />
          )}
        </MapContainer>
      </div>
      <TractDetailModal
        tract={selectedTract}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onCoordinatorAssigned={() => {
          // Optionally update hover info or state here
        }}
      />
    </>
  );
}

export default TractMap; 