import React from "react";
import { useAuth } from "../App";

function HoverInfoBox({ info, setDiscipleMakers, tractPopulationsByCounty, coordinator, countyName }) {
  const { user } = useAuth();
  if (!info) {
    return (
      <div style={{ color: "#444" }}>
        <h2>Region Info</h2>
        <p>Hover over a county or tract to see details here.</p>
      </div>
    );
  }

  // Support both county and tract info
  const isTract = !!info.tractId;
  const id = info.id || (isTract ? info.tractId : info.name);
  let population = info.population;
  let tractSum = null;

  // If county and tractPopulationsByCounty is provided, use sum of tracts
  if (!isTract && tractPopulationsByCounty && tractPopulationsByCounty[id]) {
    tractSum = tractPopulationsByCounty[id];
  }

  const { name, percentFarFromGod, simpleChurches, legacyChurches, discipleMakers = 0 } = info;
  const goal = Math.round(0.1 * ((tractSum !== null ? tractSum : population) || 0));
  const progress = goal ? Math.min(1, discipleMakers / goal) : 0;
  const canEdit = user && user.role === "coordinator";

  return (
    <div style={{ color: "#222" }}>
      <h2>{!isTract ? name : (countyName ? `${countyName} County` : "Tract Details")}</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {!isTract && (
          <>
            <li><b>Population:</b> {tractSum !== null ? tractSum.toLocaleString() : (population !== undefined && population !== null ? population.toLocaleString() : "N/A")}</li>
          </>
        )}
        {isTract && population !== undefined && (
          <li><b>Tract Population:</b> {population.toLocaleString()}</li>
        )}
        {percentFarFromGod !== undefined && (
          <li><b>% Far from God:</b> {percentFarFromGod.toFixed(1)}%</li>
        )}
        <li>
          <b>Coordinator:</b> {coordinator || "Needed"}
        </li>
        <li>
          <b>Disciple-Makers:</b>
          {canEdit ? (
            <input
              type="number"
              min={0}
              value={discipleMakers}
              style={{ width: 80, marginLeft: 8 }}
              onChange={e => setDiscipleMakers(id, Number(e.target.value))}
            />
          ) : (
            <span style={{ marginLeft: 8 }}>{discipleMakers}</span>
          )}
          <span style={{ marginLeft: 8 }}>
            (Goal: {goal.toLocaleString()})
          </span>
        </li>
        <li>
          <b>Progress to Goal:</b> {(progress * 100).toFixed(1)}%
        </li>
        {simpleChurches !== undefined && (
          <li><b>Simple Churches:</b> {simpleChurches}</li>
        )}
        {legacyChurches !== undefined && (
          <li><b>Legacy Churches:</b> {legacyChurches}</li>
        )}
      </ul>
    </div>
  );
}

export default HoverInfoBox; 