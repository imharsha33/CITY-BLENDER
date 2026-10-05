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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
          <span>WHOLE AREA</span>
        </button>

        <button
          className={`city-nav-pill ${currentView === 'top_down' ? 'city-nav-pill--active' : ''}`}
          onClick={onSetTopDown}
          title="Orthogonal 2D GIS network top-down view"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="m11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9.07l-9-7-9 7 1.63 1.27L12 16z" />
          </svg>
          <span>TOP VIEW</span>
        </button>

        <button
          className={`city-nav-pill ${currentView === 'view_3d' ? 'city-nav-pill--active' : ''}`}
          onClick={onSet3D}
          title="3D perspective digital twin view"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15 6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 8.9v6.7l6 3.38v-6.71L5 8.9zm14 6.7V8.9l-6 3.37v6.71l6-3.38z" />
          </svg>
          <span>3D VIEW</span>
        </button>

        <button
          className={`city-nav-pill ${currentView === 'cinematic' ? 'city-nav-pill--active' : ''}`}
          onClick={onSetCinematic}
          title="Cinematic establishing orbit around city"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="m18 4 2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
          <span>CINEMATIC</span>
        </button>

        {/* Dynamic Context Focus Targets */}
        {hasSelectedRoad && (
          <button
            className="city-nav-pill city-nav-pill--highlight"
            onClick={onFocusRoad}
            title="Focus camera on selected corridor in network context"
          >
            <span>ROAD</span>
          </button>
        )}

        {hasSelectedIssue && (
          <button
            className="city-nav-pill city-nav-pill--warning"
            onClick={onFocusIssue}
            title="Focus camera on bottleneck / problem in network context"
          >
            <span>ISSUE</span>
          </button>
        )}

        {hasSelectedStrategy && (
          <button
            className="city-nav-pill city-nav-pill--gold"
            onClick={onFocusStrategy}
            title="Frame all interventions of the selected strategy"
          >
            <span>STRATEGY</span>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>

        <button
          className="city-action-btn city-action-btn--fit"
          onClick={onFitWholeArea}
          title="Fit Whole Area"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
        </button>

        <button
          className="city-action-btn"
          onClick={onZoomOut}
          title="Zoom Out (−)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        </button>

        <button
          className="city-action-btn city-action-btn--compass"
          onClick={onResetNorth}
          title="Align Compass North (N)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
