import React from 'react';
import { demoScenario, PHASE_LABELS } from '../../data/demoScenario';
import { getPhaseForProgress } from '../../engine/constructionEngine';
import type { GeoAreaResponse, SceneMode } from '../../types/geo';

interface DetailsModalProps {
  progress: number;
  mode?: SceneMode;
  realLocationData?: GeoAreaResponse | null;
  onClose: () => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({
  progress,
  mode = 'demo',
  realLocationData,
  onClose,
}) => {
  const currentPhase = getPhaseForProgress(progress);
  const phaseInfo = demoScenario.constructionPhases.find((p) => p.id === currentPhase);
  const pct = Math.round(progress * 100);

  const isReal = mode === 'real_location' && realLocationData;

  return (
    <div className="details-overlay" onClick={onClose}>
      <div className="details-panel" onClick={(e) => e.stopPropagation()}>
        <div className="details-panel__header">
          <div className="details-panel__title-group">
            <span className="details-panel__title">
              {isReal ? 'GEOSPATIAL INFRASTRUCTURE DATA' : 'CORRIDOR SPECIFICATION'}
            </span>
            <span className="details-panel__badge">
              {isReal ? 'SOURCE: OPENSTREETMAP' : 'SIMULATED DATA'}
            </span>
          </div>
          <button className="details-panel__close" onClick={onClose} title="Close details">
            ✕
          </button>
        </div>

        {isReal ? (
          <div className="details-grid">
            <div className="details-card">
              <span className="details-card__label">LOCATION</span>
              <span className="details-card__val">
                {realLocationData.locationName.split(',')[0]}
              </span>
              <span className="details-card__sub">{realLocationData.locationName}</span>
            </div>

            <div className="details-card">
              <span className="details-card__label">COORDINATES</span>
              <span className="details-card__val details-card__val--accent">
                {realLocationData.center[0].toFixed(4)}°N, {realLocationData.center[1].toFixed(4)}°E
              </span>
              <span className="details-card__sub">
                {realLocationData.radiusKm} km Spatial Planning Buffer
              </span>
            </div>

            <div className="details-card">
              <span className="details-card__label">ROAD NETWORK</span>
              <span className="details-card__val">{realLocationData.roads.length} Segments</span>
              <span className="details-card__sub">
                Motorway, Trunk, Primary, Secondary & Residential
              </span>
            </div>

            <div className="details-card">
              <span className="details-card__label">ENVIRONMENT & POIs</span>
              <span className="details-card__val">
                {realLocationData.buildings.length} Bldgs · {realLocationData.water.length} Water
              </span>
              <span className="details-card__sub">
                {realLocationData.pois.length} Critical Public Facilities
              </span>
            </div>
          </div>
        ) : (
          <div className="details-grid">
            <div className="details-card">
              <span className="details-card__label">CURRENT ROAD</span>
              <span className="details-card__val">1 Lane</span>
              <span className="details-card__sub">Collector / Two-Way (3.5m)</span>
            </div>

            <div className="details-card">
              <span className="details-card__label">PROPOSED</span>
              <span className="details-card__val details-card__val--accent">4 Lanes Divided</span>
              <span className="details-card__sub">Dual-Carriageway with Median (22.5m)</span>
            </div>

            <div className="details-card">
              <span className="details-card__label">ACTIVE STAGE</span>
              <span className="details-card__val">{PHASE_LABELS[currentPhase] ?? 'In Progress'}</span>
              <span className="details-card__sub">{phaseInfo?.description ?? 'Active construction phase'}</span>
            </div>

            <div className="details-card">
              <span className="details-card__label">TIMELINE PROGRESS</span>
              <span className="details-card__val">{pct}% Completed</span>
              <span className="details-card__sub">2026 Target → 2030 Delivery</span>
            </div>
          </div>
        )}

        <div className="details-note">
          <span className="details-note__tag">
            {isReal ? 'PHASE 2 DATA DISCLOSURE' : 'PHASE 1 NOTICE'}
          </span>
          <p className="details-note__text">
            {isReal
              ? 'Road network, building footprints, waterways, and facility markers are extracted from OpenStreetMap. Road widths and building heights without explicit survey tags are rendered with standard visualization defaults.'
              : 'This visualization engine demonstrates dynamic corridor widening. Real-world traffic models, OpenStreetMap layers, and automated civil engineering estimates integrate in Phase 2+.'}
          </p>
        </div>
      </div>
    </div>
  );
};
