import React from 'react';
import type { GeoAreaResponse } from '../../types/geo';

interface RealLocationStatusProps {
  data: GeoAreaResponse;
  onReturnToDemo: () => void;
}

export const RealLocationStatus: React.FC<RealLocationStatusProps> = ({ data, onReturnToDemo }) => {
  const [centerLat, centerLon] = data.center;
  const parts = data.locationName.split(',');
  const primaryName = parts[0]?.trim() || 'Selected Corridor';
  const regionName = parts.slice(1).join(',').trim() || 'Real Geographic Area';

  return (
    <div className="compact-status real-location-status">
      <div className="compact-status__row">
        <div className="compact-status__item">
          <span className="compact-status__label">LOCATION</span>
          <span className="compact-status__val compact-status__val--accent">
            {primaryName.toUpperCase()}
          </span>
          <span className="compact-status__sub">{regionName}</span>
        </div>

        <div className="compact-status__divider" />

        <div className="compact-status__item">
          <span className="compact-status__label">COORDINATES</span>
          <span className="compact-status__val">
            {centerLat.toFixed(4)}°N, {centerLon.toFixed(4)}°E
          </span>
          <span className="compact-status__sub">2 km Planning Radius</span>
        </div>

        <div className="compact-status__divider" />

        <div className="compact-status__item">
          <span className="compact-status__label">FEATURES EXTRACTED</span>
          <span className="compact-status__val">
            {data.roads.length} Roads · {data.buildings.length} Bldgs
          </span>
          <span className="compact-status__sub">
            {data.water.length} Water · {data.pois.length} POIs
          </span>
        </div>

        <div className="compact-status__divider" />

        <div className="compact-status__item">
          <span className="compact-status__label">DATA SOURCE & CRS</span>
          <span className={`compact-status__val ${data.dataSource === 'USER_IMPORT' ? 'compact-status__val--accent' : 'compact-status__val--dim'}`}>
            {data.dataSource === 'USER_IMPORT' ? 'SOURCE: USER IMPORT' : 'SOURCE: OPENSTREETMAP'}
          </span>
          <span className="compact-status__sub">
            CRS: {data.coordinateReferenceSystem || 'EPSG:4326'}
          </span>
        </div>

        <div className="compact-status__divider" />

        <button
          className="neumorphic-btn neumorphic-btn--sm"
          onClick={onReturnToDemo}
          title="Return to Phase 1 Construction Demo"
        >
          <span className="btn-label">SWITCH</span>
          <span className="btn-value">DEMO MODE ↺</span>
        </button>
      </div>
    </div>
  );
};
