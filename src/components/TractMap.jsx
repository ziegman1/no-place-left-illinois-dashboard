import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import * as d3 from "d3";
import TractDetailModal from "./TractDetailModal";
import { useAuth } from "../App";

function TractMap({ countyGEOID, onTractHover, onTractClick, tractDiscipleMakers, setTractDiscipleMakers }) {
  const [tractData, setTractData] = useState(null);
  const [selectedTract, setSelectedTract] = useState(null);
  const [showTractModal, setShowTractModal] = useState(false);
  const geoJsonLayerRef = useRef();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get("/src/data/fixed_tracts.geojson");
        // Filter tracts by county GEOID (assume GEOID or COUNTYFP property)
        const filtered = {
          ...res.data,
          features: res.data.features.filter(f => {
            const countyFP = f.properties.COUNTYFP || f.properties.countyfp || f.properties.COUNTY_GEOID || f.properties.COUNTY || f.properties.COUNTY_ID;
            return countyFP === countyGEOID;
          })
        };
        setTractData(filtered);
      } catch (err) {
        console.error("Failed to load tracts GeoJSON", err);
      }
    }
    if (countyGEOID) fetchData();
  }, [countyGEOID]);

  // Load tract data from backend
  const loadTractData = async (tractId) => {
    try {
      const res = await axios.get(`http://localhost:4000/api/tract/${tractId}`);
      return res.data.tractData;
    } catch (err) {
      console.error("Failed to load tract data", err);
      return null;
    }
  };

  function getTractInfo(feature) {
    const tractId = feature.properties.GEOID || feature.properties.geoid || feature.properties.TRACTCE || feature.properties.tractce;
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
    const percentFarFromGod = 17.5;
    const discipleCount = tractDiscipleMakers[tractId] || 0;
    return {
      tractId,
      population,
      percentFarFromGod,
      simpleChurches: 0,
      legacyChurches: 0,
      discipleMakers: discipleCount,
    };
  }

  function getTractColor(population, discipleCount) {
    const goal = 0.1 * (population || 1);
    const progress = Math.max(0, Math.min(1, discipleCount / goal));
    return d3.interpolateRdYlGn(progress);
  }

  function onEachFeature(feature, layer) {
    const info = getTractInfo(feature);
    layer.on({
      mouseover: () => {
        onTractHover(info);
      },
      mouseout: () => {
        onTractHover(null);
      },
      click: () => {
        if (user) {
          // Only allow clicks if user is logged in
          handleTractClick(info);
        }
      },
    });
    layer.setStyle({
      color: "#333",
      weight: 1,
      fillOpacity: 0.7,
      fillColor: getTractColor(info.population, info.discipleMakers),
    });
  }

  const handleTractClick = async (info) => {
    // Load current tract data from backend
    const backendData = await loadTractData(info.tractId);
    
    const tractWithData = {
      ...info,
      discipleMakers: backendData?.disciple_makers || info.discipleMakers,
      simpleChurches: backendData?.simple_churches || info.simpleChurches,
      legacyChurches: backendData?.legacy_churches || info.legacyChurches
    };
    
    setSelectedTract(tractWithData);
    setShowTractModal(true);
  };

  const handleTractDataUpdate = (tractId, newData) => {
    // Update local state
    setTractDiscipleMakers(prev => ({
      ...prev,
      [tractId]: newData.discipleMakers
    }));

    // Update hover info if this tract is currently being hovered
    onTractHover(prev => {
      if (prev && prev.tractId === tractId) {
        return {
          ...prev,
          discipleMakers: newData.discipleMakers,
          simpleChurches: newData.simpleChurches,
          legacyChurches: newData.legacyChurches
        };
      }
      return prev;
    });
  };

  // Redraw colors if tractDiscipleMakers changes
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;
    geoJsonLayerRef.current.eachLayer((layer) => {
      if (layer.feature) {
        const info = getTractInfo(layer.feature);
        layer.setStyle({
          fillColor: getTractColor(info.population, info.discipleMakers),
        });
      }
    });
  }, [tractDiscipleMakers]);

  // Zoom to tracts bounds
  useEffect(() => {
    if (geoJsonLayerRef.current && tractData && tractData.features.length > 0) {
      const map = geoJsonLayerRef.current._map;
      if (map) {
        const bounds = geoJsonLayerRef.current.getBounds();
        map.fitBounds(bounds, { maxZoom: 12 });
      }
    }
  }, [tractData]);

  if (!countyGEOID) return null;

  return (
    <>
      <MapContainer
        style={{ width: "100%", height: "100%" }}
        zoom={10}
        center={[40, -89]}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {tractData && (
          <GeoJSON data={tractData} onEachFeature={onEachFeature} ref={geoJsonLayerRef} />
        )}
      </MapContainer>
      
      <TractDetailModal
        tract={selectedTract}
        isOpen={showTractModal}
        onClose={() => {
          setShowTractModal(false);
          setSelectedTract(null);
        }}
        onDataUpdate={handleTractDataUpdate}
      />
    </>
  );
}

export default TractMap; 