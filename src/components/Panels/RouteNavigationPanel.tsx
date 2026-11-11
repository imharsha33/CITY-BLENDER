import React, { useState } from 'react';
import type { RealPlace } from '../../data/cityPlaces';
import type { RouteCalculationResult, RouteStep } from '../../engine/RealRouteEngine';
import './RouteNavigationPanel.css';

interface RouteNavigationPanelProps {
  cityName: string;
  places: RealPlace[];
  fromPlaceId: string;
  toPlaceId: string;
  onSelectFromPlace: (placeId: string) => void;
  onSelectToPlace: (placeId: string) => void;
  onSwapPlaces: () => void;
  routeResult: RouteCalculationResult | null;
  onFocusRoute: () => void;
  isLoadingRoute?: boolean;
}

export const RouteNavigationPanel: React.FC<RouteNavigationPanelProps> = ({
  cityName,
  places,
  fromPlaceId,
  toPlaceId,
  onSelectFromPlace,
  onSelectToPlace,
  onSwapPlaces,
  routeResult,
  onFocusRoute,
  isLoadingRoute = false,
}) => {
  const [transitMode, setTransitMode] = useState<'drive' | 'bike' | 'walk'>('drive');
  const [showDirections, setShowDirections] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fromPlace = places.find((p) => p.id === fromPlaceId);
  const toPlace = places.find((p) => p.id === toPlaceId);

  // Filter major traffic circles for quick-access chips
  const majorCircles = places.filter((p) => p.isMajorCircle || p.category === 'circle');

  const handleQuickChipClick = (place: RealPlace) => {
    if (fromPlaceId === place.id) return;
    if (!fromPlaceId) {
      onSelectFromPlace(place.id);
    } else if (toPlaceId === place.id) {
      onSwapPlaces();
    } else {
      onSelectToPlace(place.id);
    }
  };

  const currentDuration =
    transitMode === 'drive'
      ? routeResult?.travelTimeDriveMins
      : transitMode === 'bike'
      ? routeResult?.travelTimeBikeMins
      : routeResult?.travelTimeWalkMins;

  return (
    <aside
      className={`route-nav-panel-container ${isCollapsed ? 'route-nav-panel-container--collapsed' : ''}`}
      aria-label="Route Navigation Panel"
    >
      {/* Header Bar */}
      <div className="route-nav-header">
        <div className="route-nav-header__title-row">
          <div className="route-nav-header__icon-glow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          </div>
          <div className="route-nav-header__titles">
            <span className="route-nav-header__label">REAL ROUTE NAVIGATION</span>
            <span className="route-nav-header__city-tag">{cityName.toUpperCase()} DIGITAL TWIN</span>
          </div>
        </div>
        <button
          className="route-nav-header__collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Route Navigation' : 'Collapse Panel'}
        >
          {isCollapsed ? '◀' : '▼'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="route-nav-body">
          {/* Quick Major Circles & Landmarks Bar */}
          <div className="route-quick-circles-section">
            <span className="route-section-subtitle">MAJOR CIRCLES & LANDMARKS:</span>
            <div className="route-quick-chips-grid">
              {majorCircles.map((circle) => {
                const isFrom = circle.id === fromPlaceId;
                const isTo = circle.id === toPlaceId;
                return (
                  <button
                    key={circle.id}
                    className={`route-circle-chip ${
                      isFrom ? 'route-circle-chip--from' : isTo ? 'route-circle-chip--to' : ''
                    }`}
                    onClick={() => handleQuickChipClick(circle)}
                    title={`Select ${circle.name} (${circle.description})`}
                  >
                    <span className="route-circle-chip__dot" />
                    <span className="route-circle-chip__name">{circle.name}</span>
                    {isFrom && <span className="route-circle-chip__tag">FROM</span>}
                    {isTo && <span className="route-circle-chip__tag">TO</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* From / To Selectors */}
          <div className="route-selectors-box">
            {/* Origin Row */}
            <div className="route-selector-row">
              <div className="route-selector-badge route-selector-badge--origin">A</div>
              <div className="route-selector-field-wrap">
                <label className="route-selector-label" htmlFor="from-place-select">ORIGIN (FROM)</label>
                <select
                  id="from-place-select"
                  className="route-selector-dropdown"
                  value={fromPlaceId}
                  onChange={(e) => onSelectFromPlace(e.target.value)}
                >
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isMajorCircle ? '• (Major Circle)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="route-swap-row">
              <div className="route-swap-line" />
              <button
                className="route-swap-btn"
                onClick={onSwapPlaces}
                title="Swap Origin and Destination"
              >
                ⇅
              </button>
              <div className="route-swap-line" />
            </div>

            {/* Destination Row */}
            <div className="route-selector-row">
              <div className="route-selector-badge route-selector-badge--dest">B</div>
              <div className="route-selector-field-wrap">
                <label className="route-selector-label" htmlFor="to-place-select">DESTINATION (TO)</label>
                <select
                  id="to-place-select"
                  className="route-selector-dropdown"
                  value={toPlaceId}
                  onChange={(e) => onSelectToPlace(e.target.value)}
                >
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isMajorCircle ? '• (Major Circle)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Glowing Route Status Card */}
          {routeResult && (
            <div className="route-metrics-card">
              <div className="route-glow-status-banner">
                <span className="route-glow-dot" />
                <span className="route-glow-text">GLOWING BLUE ROUTE LINE ACTIVE</span>
              </div>

              {/* Transit Mode Selector */}
              <div className="route-mode-pills">
                <button
                  className={`route-mode-pill ${transitMode === 'drive' ? 'route-mode-pill--active' : ''}`}
                  onClick={() => setTransitMode('drive')}
                >
                  🚗 Drive (~{routeResult.travelTimeDriveMins}m)
                </button>
                <button
                  className={`route-mode-pill ${transitMode === 'bike' ? 'route-mode-pill--active' : ''}`}
                  onClick={() => setTransitMode('bike')}
                >
                  🛵 Bike (~{routeResult.travelTimeBikeMins}m)
                </button>
                <button
                  className={`route-mode-pill ${transitMode === 'walk' ? 'route-mode-pill--active' : ''}`}
                  onClick={() => setTransitMode('walk')}
                >
                  🚶 Walk (~{routeResult.travelTimeWalkMins}m)
                </button>
              </div>

              {/* Primary Stats Grid */}
              <div className="route-stats-grid">
                <div className="route-stat-box">
                  <span className="route-stat-value">
                    {routeResult.distanceMeters >= 1000
                      ? `${routeResult.distanceKm} km`
                      : `${routeResult.distanceMeters} m`}
                  </span>
                  <span className="route-stat-label">TOTAL DISTANCE</span>
                </div>
                <div className="route-stat-box">
                  <span className="route-stat-value">{currentDuration} MIN</span>
                  <span className="route-stat-label">EST. TRAVEL TIME</span>
                </div>
              </div>

              {/* Traversed Arterials */}
              {(routeResult.traversedRoadNames ?? []).length > 0 && (
                <div className="route-arterials-row">
                  <span className="route-arterials-title">VIA:</span>
                  <div className="route-arterials-tags">
                    {(routeResult.traversedRoadNames ?? []).map((road: string, idx: number) => (
                      <span key={idx} className="route-arterial-badge">
                        {road}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Route Camera Button */}
              <div className="route-actions-row">
                <button
                  className="route-focus-cam-btn"
                  onClick={onFocusRoute}
                  title="Focus 3D camera to encompass the entire active route"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>FOCUS 3D ROUTE</span>
                </button>

                <button
                  className="route-directions-toggle-btn"
                  onClick={() => setShowDirections(!showDirections)}
                >
                  {showDirections ? 'HIDE TURNS' : `STEPS (${routeResult.steps?.length ?? 0})`}
                </button>
              </div>

              {/* Collapsible Turn Instructions */}
              {showDirections && (
                <div className="route-turn-instructions-list">
                  {(routeResult.steps ?? []).map((turn: RouteStep, i: number) => (
                    <div key={i} className="route-turn-item">
                      <div className="route-turn-num">{i + 1}</div>
                      <div className="route-turn-info">
                        <span className="route-turn-desc">{turn.instruction}</span>
                        <span className="route-turn-dist">{turn.distanceMeters} meters</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isLoadingRoute && (
            <div className="route-calculating-spinner">
              <span className="route-spinner-icon" />
              <span>Calculating shortest real GIS path...</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

