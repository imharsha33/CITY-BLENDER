import React from 'react';

export type MapViewType = 'whole_area' | 'top_down' | 'view_3d' | 'cinematic';

interface CityNavigationControlsProps {
  currentView: MapViewType;
  hasSelectedRoad: boolean;
  hasSelectedIssue: boolean;
  hasSelectedStrategy: boolean;
  onFitWholeArea: () => void;
  onSetTopDown: () => void;
  onSet3D: () => void;
  onSetCinematic: () => void;
  onFocusRoad: () => void;
  onFocusIssue: () => void;
  onFocusStrategy: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetNorth: () => void;
}

export const CityNavigationControls: React.FC<CityNavigationControlsProps> = ({
  currentView,
  hasSelectedRoad,
  hasSelectedIssue,
  hasSelectedStrategy,
  onFitWholeArea,
  onSetTopDown,
  onSet3D,
  onSetCinematic,
  onFocusRoad,
  onFocusIssue,
  onFocusStrategy,
  onZoomIn,
  onZoomOut,
  onResetNorth,
}) => {
  return (
    <div className="city-navigation-widget">
      {/* View Presets Bar */}
      <div className="city-nav-presets">
        <button
          className={`city-nav-pill ${currentView === 'whole_area' ? 'city-nav-pill--active' : ''}`}
          onClick={onFitWholeArea}
          title="Fit camera to complete geographic extent of the city"
        >
          <span className="city-nav-icon">⌖</span>
          <span>WHOLE AREA</span>
        </button>

        <button
          className={`city-nav-pill ${currentView === 'top_down' ? 'city-nav-pill--active' : ''}`}
          onClick={onSetTopDown}
          title="Orthogonal 2D GIS network top-down view"
        >
          <span className="city-nav-icon">🗺</span>
          <span>TOP VIEW</span>
        </button>

        <button
          className={`city-nav-pill ${currentView === 'view_3d' ? 'city-nav-pill--active' : ''}`}
          onClick={onSet3D}
          title="3D perspective digital twin view"
        >
          <span className="city-nav-icon">🌐</span>
          <span>3D VIEW</span>
        </button>

        <button
          className={`city-nav-pill ${currentView === 'cinematic' ? 'city-nav-pill--active' : ''}`}
          onClick={onSetCinematic}
          title="Cinematic establishing orbit around city"
        >
          <span className="city-nav-icon">🎬</span>
          <span>CINEMATIC</span>
        </button>

        {/* Dynamic Context Focus Targets */}
        {hasSelectedRoad && (
          <button
            className="city-nav-pill city-nav-pill--highlight"
            onClick={onFocusRoad}
            title="Focus camera on selected corridor in network context"
          >
            <span>🛣 ROAD</span>
          </button>
        )}

        {hasSelectedIssue && (
          <button
            className="city-nav-pill city-nav-pill--warning"
            onClick={onFocusIssue}
            title="Focus camera on bottleneck / problem in network context"
          >
            <span>⚠ ISSUE</span>
          </button>
        )}

        {hasSelectedStrategy && (
          <button
            className="city-nav-pill city-nav-pill--gold"
            onClick={onFocusStrategy}
            title="Frame all interventions of the selected strategy"
          >
            <span>⚡ STRATEGY</span>
          </button>
        )}
      </div>

      {/* Floating Vertical Tool Button Bar */}
      <div className="city-nav-actions">
        <button
          className="city-action-btn"
          onClick={onZoomIn}
          title="Zoom In (+)"
        >
          ＋
        </button>

        <button
          className="city-action-btn city-action-btn--fit"
          onClick={onFitWholeArea}
          title="Fit Whole Area"
        >
          ⌖
        </button>

        <button
          className="city-action-btn"
          onClick={onZoomOut}
          title="Zoom Out (−)"
        >
          －
        </button>

        <button
          className="city-action-btn city-action-btn--compass"
          onClick={onResetNorth}
          title="Align Compass North (N)"
        >
          N
        </button>
      </div>
    </div>
  );
};
