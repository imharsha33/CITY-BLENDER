import React, { useState } from 'react';
import type { GeoAreaResponse } from '../../types/geo';

interface RealLocationStatusProps {
  data: GeoAreaResponse;
  onReturnToDemo: () => void;
}

export const RealLocationStatus: React.FC<RealLocationStatusProps> = ({ data, onReturnToDemo }) => {
  const [minimized, setMinimized] = useState(false);
  const [centerLat, centerLon] = data.center;
  const parts = data.locationName.split(',');
  const primaryName = parts[0]?.trim() || 'Digital Twin';
  const regionName = parts.slice(1).join(',').trim() || 'Surveyed Geographic Area';

  if (minimized) {
    return (
      <button
        className="google-place-card-minimized"
        onClick={() => setMinimized(false)}
        title="Show Place Details"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#ea4335">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span className="google-place-name-min">{primaryName}</span>
      </button>
    );
  }

  return (
    <div className="google-place-card">
      <div className="google-place-card__top">
        <div className="google-place-card__badge-row">
          <span className="google-place-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#1a73e8" style={{ marginRight: 4, verticalAlign: -1 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            DIGITAL TWIN
          </span>
          <span className="google-place-crs">{data.coordinateReferenceSystem || 'WGS84'}</span>
          <button
            className="google-place-close-btn"
            onClick={() => setMinimized(true)}
            title="Minimize"
          >
            ✕
          </button>
        </div>

        <h2 className="google-place-title">{primaryName}</h2>
        <p className="google-place-subtitle">{regionName}</p>
        <div className="google-place-coords">
          {centerLat.toFixed(4)}° N, {centerLon.toFixed(4)}° E · 2.0 km Radius
        </div>
      </div>

      <div className="google-place-stats-row">
        <div className="google-stat-pill">
          <span className="google-stat-val">{data.roads.length}</span>
          <span className="google-stat-label">Roads</span>
        </div>
        <div className="google-stat-pill">
          <span className="google-stat-val">{data.buildings.length}</span>
          <span className="google-stat-label">Buildings</span>
        </div>
        <div className="google-stat-pill">
          <span className="google-stat-val">{data.water.length}</span>
          <span className="google-stat-label">Waterways</span>
        </div>
        <div className="google-stat-pill">
          <span className="google-stat-val">{data.pois.length}</span>
          <span className="google-stat-label">POIs</span>
        </div>
      </div>

      <div className="google-place-footer">
        <span className="google-source-label">Source: OpenStreetMap Verified</span>
        <button
          className="google-demo-switch-btn"
          onClick={onReturnToDemo}
          title="Switch to 3D Highway Construction Demo"
        >
          <span>DEMO MODE ↺</span>
        </button>
      </div>
    </div>
  );
};
