import React, { useState, useRef, useEffect } from 'react';
import type { CameraMode } from '../../types/infrastructure';
import type { LightingMode } from '../../engine/lighting';
import type { LocationResult, LayerVisibility, SceneMode, GeoAreaResponse } from '../../types/geo';
import { LocationSearch } from './LocationSearch';
import { LayerControls } from './LayerControls';
import { MapImportControl } from './MapImportControl';

interface HeaderProps {
  cameraMode: CameraMode;
  onCameraChange: (mode: CameraMode) => void;
  lightingMode: LightingMode;
  onLightingChange: (mode: LightingMode) => void;
  onToggleDetails: () => void;
  mode: SceneMode;
  onModeToggle: () => void;
  onSelectLocation: (loc: LocationResult) => void;
  isSearching: boolean;
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  hasAnalysis?: boolean;
  isAnalysisActive?: boolean;
  onToggleAnalysisMode?: () => void;
  onToggleFindings?: () => void;
  isFindingsOpen?: boolean;
  locationName?: string;
  dataQualityScore?: number;
  onMapLoaded?: (data: GeoAreaResponse) => void;
  onToggleZones?: () => void;
  isZonesOpen?: boolean;
  zonesCount?: number;
  onTogglePlanning?: () => void;
  isPlanningOpen?: boolean;
  onToggleForecast?: () => void;
  isForecastOpen?: boolean;
  onToggleOptimization?: () => void;
  isOptimizationOpen?: boolean;
  onToggleTransformation?: () => void;
  isTransformationOpen?: boolean;
  hasSelectedPlanOrStrategy?: boolean;
  onToggleEvidence?: () => void;
  isEvidenceOpen?: boolean;
}


const CAMERA_OPTIONS: { id: CameraMode; label: string }[] = [
  { id: 'overview',   label: 'Drone Overview' },
  { id: 'road_level', label: 'Driver POV' },
  { id: 'top',        label: 'Top-Down' },
  { id: 'flyover',    label: 'Flyover Focus' },
  { id: 'hero',       label: 'Cinematic Orbit' },
];

const LIGHTING_OPTIONS: { id: LightingMode; label: string }[] = [
  { id: 'day',    label: 'Day' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'night',  label: 'Night' },
];

export const Header: React.FC<HeaderProps> = ({
  cameraMode,
  onCameraChange,
  lightingMode,
  onLightingChange,
  onToggleDetails,
  mode,
  onModeToggle,
  onSelectLocation,
  isSearching,
  layers,
  onLayersChange,
  onAnalyze,
  isAnalyzing = false,
  hasAnalysis = false,
  isAnalysisActive = true,
  onToggleAnalysisMode,
  onToggleFindings,
  isFindingsOpen = false,
  locationName,
  dataQualityScore,
  onMapLoaded,
  onToggleZones,
  isZonesOpen = false,
  zonesCount = 0,
  onTogglePlanning,
  isPlanningOpen = false,
  onToggleForecast,
  isForecastOpen = false,
  onToggleOptimization,
  isOptimizationOpen = false,
  onToggleTransformation,
  isTransformationOpen = false,
  hasSelectedPlanOrStrategy = false,
  onToggleEvidence,
  isEvidenceOpen = false,
}) => {

  const [camOpen, setCamOpen] = useState(false);
  const [lightOpen, setLightOpen] = useState(false);

  const camRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (camRef.current && !camRef.current.contains(e.target as Node)) {
        setCamOpen(false);
      }
      if (lightRef.current && !lightRef.current.contains(e.target as Node)) {
        setLightOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  const currentCamLabel = CAMERA_OPTIONS.find(c => c.id === cameraMode)?.label.split(' ')[0] ?? 'Drone';
  const currentLightLabel = LIGHTING_OPTIONS.find(l => l.id === lightingMode)?.label ?? 'Day';

  const shortLoc = locationName ? locationName.split(',')[0].toUpperCase() : '';

  return (
    <header className="floating-header">
      {/* Top Left: Minimal Brand & Location Search */}
      <div className="floating-header__left-group">
        <div className="floating-header__brand">
          <div className="brand-mark">
            <span className="brand-mark__dot" />
          </div>
          <div className="brand-text">
            <h1 className="brand-text__title">ROADVISION</h1>
            <span className="brand-text__subtitle">CIVIL INFRASTRUCTURE DIGITAL TWIN</span>
          </div>
        </div>

        {/* Method A: Location Search Bar */}
        <LocationSearch onSelectLocation={onSelectLocation} isLoading={isSearching} />

        <span className="header-input-separator">or</span>

        {/* Method B: Geospatial Map Import (GeoJSON, KML, KMZ, Shapefile ZIP) */}
        {onMapLoaded && (
          <MapImportControl onMapLoaded={onMapLoaded} disabled={isSearching || isAnalyzing} />
        )}
      </div>

      {/* Top Right: Analysis Action, Mode Switcher & Controls */}
      <div className="floating-header__controls">
        {/* Analysis Status Chip when analysis is complete */}
        {mode === 'real_location' && hasAnalysis && shortLoc && (
          <div className="header-status-chip">
            <span className="header-status-chip__dot" />
            <span className="header-status-chip__text">
              {shortLoc} · ANALYSIS COMPLETE {dataQualityScore ? `· ${dataQualityScore}% DQ` : ''}
            </span>
          </div>
        )}

        {/* Phase 3 Analyze Button / Analysis Mode Toggle */}
        {mode === 'real_location' && (
          !hasAnalysis ? (
            <button
              className={`neumorphic-btn neumorphic-btn--sm ${isAnalyzing ? 'neumorphic-btn--playing' : 'neumorphic-btn--accent'}`}
              onClick={onAnalyze}
              disabled={isAnalyzing}
              title="Inspect road network for bottlenecks, capacity deficits and junction risks"
            >
              <span className="btn-label">{isAnalyzing ? 'ANALYZING...' : '⚡ ANALYZE'}</span>
            </button>
          ) : (
            <div className="analysis-mode-switch">
              <button
                className={`neumorphic-btn neumorphic-btn--sm ${!isAnalysisActive ? 'neumorphic-btn--active' : ''}`}
                onClick={onToggleAnalysisMode}
                title="Normal geographic environment"
              >
                <span className="btn-label">NORMAL</span>
              </button>
              <button
                className={`neumorphic-btn neumorphic-btn--sm ${isAnalysisActive ? 'neumorphic-btn--accent neumorphic-btn--active' : ''}`}
                onClick={onToggleAnalysisMode}
                title="Infrastructure issues and bottleneck highlights"
              >
                <span className="btn-label">ANALYSIS</span>
              </button>
            </div>
          )
        )}

        {/* Toggle Analysis Findings Drawer */}
        {mode === 'real_location' && hasAnalysis && onToggleFindings && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isFindingsOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleFindings}
            title="Toggle Infrastructure Findings Drawer"
          >
            <span className="btn-label">FINDINGS</span>
          </button>
        )}

        {/* Phase 8 Development Zones Toggle */}
        {mode === 'real_location' && hasAnalysis && onToggleZones && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isZonesOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleZones}
            title="Inspect Place-Specific Spatial Development Zones (Phase 8)"
            style={isZonesOpen ? { borderColor: '#38bdf8', color: '#7dd3fc', background: 'rgba(56, 189, 248, 0.15)' } : {}}
          >
            <span className="btn-label">🗺️ ZONES{zonesCount ? ` (${zonesCount})` : ''}</span>
          </button>
        )}

        {/* Phase 4 Infrastructure Planning Toggle */}
        {mode === 'real_location' && hasAnalysis && onTogglePlanning && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isPlanningOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onTogglePlanning}
            title="Generate & Compare Infrastructure Interventions (Phase 4)"
            style={isPlanningOpen ? { borderColor: '#f59e0b', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)' } : {}}
          >
            <span className="btn-label">📐 PLANNING</span>
          </button>
        )}

        {/* Phase 5 Future Demand Forecasting Toggle */}
        {mode === 'real_location' && hasAnalysis && onToggleForecast && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isForecastOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleForecast}
            title="Forecast Future Demand, Scenarios & Plan Resilience (Phase 5)"
            style={isForecastOpen ? { borderColor: '#8b5cf6', color: '#c4b5fd', background: 'rgba(139, 92, 246, 0.15)' } : {}}
          >
            <span className="btn-label">🔮 FORECAST</span>
          </button>
        )}

        {/* Phase 6 Strategy Optimization Toggle */}
        {mode === 'real_location' && hasAnalysis && onToggleOptimization && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isOptimizationOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleOptimization}
            title="Multi-Objective Infrastructure Strategy Optimization (Phase 6)"
            style={isOptimizationOpen ? { borderColor: '#eab308', color: '#fde047', background: 'rgba(234, 179, 8, 0.15)' } : {}}
          >
            <span className="btn-label">⚡ OPTIMIZE</span>
          </button>
        )}

        {/* Phase 7 Digital Twin Transformation Engine Toggle */}
        {mode === 'real_location' && onToggleTransformation && (hasSelectedPlanOrStrategy || isTransformationOpen) && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isTransformationOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleTransformation}
            title="Construction & Transformation Digital Twin Engine (Phase 7)"
            style={isTransformationOpen ? { borderColor: '#10b981', color: '#6ee7b7', background: 'rgba(16, 185, 129, 0.18)' } : { borderColor: 'rgba(16, 185, 129, 0.4)', color: '#a7f3d0' }}
          >
            <span className="btn-label">🏗️ TRANSFORMATION</span>
          </button>
        )}

        {/* Phase 9 Engineering Evidence & Audit Panel Toggle */}
        {mode === 'real_location' && onToggleEvidence && hasAnalysis && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isEvidenceOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleEvidence}
            title="Phase 9: Evidence-Driven Intelligence & Real-World Feasibility Audit"
            style={isEvidenceOpen ? { borderColor: '#f59e0b', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.18)' } : { borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fde68a' }}
          >
            <span className="btn-label">🔬 EVIDENCE</span>
          </button>
        )}

        {/* Mode Switcher */}

        <button
          className={`neumorphic-btn neumorphic-btn--sm ${mode === 'real_location' ? 'neumorphic-btn--active' : ''}`}
          onClick={onModeToggle}
          title="Toggle between Real Location Digital Twin and Demo Simulation"
        >
          <span className="btn-label">MODE</span>
          <span className="btn-value">
            {mode === 'real_location' ? 'REAL LOCATION' : 'DEMO MODE'}
          </span>
        </button>

        {/* Layer Controls (only when viewing real location) */}
        {mode === 'real_location' && (
          <LayerControls layers={layers} onChange={onLayersChange} />
        )}

        {/* Camera Selector */}
        <div className="dropdown-wrap" ref={camRef}>
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${camOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={() => { setCamOpen(!camOpen); setLightOpen(false); }}
            title="Camera View"
          >
            <span className="btn-label">CAMERA</span>
            <span className="btn-value">{currentCamLabel} ▾</span>
          </button>
          {camOpen && (
            <div className="neumorphic-menu">
              {CAMERA_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`neumorphic-menu__item ${cameraMode === opt.id ? 'neumorphic-menu__item--active' : ''}`}
                  onClick={() => {
                    onCameraChange(opt.id);
                    setCamOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lighting Selector */}
        <div className="dropdown-wrap" ref={lightRef}>
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${lightOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={() => { setLightOpen(!lightOpen); setCamOpen(false); }}
            title="Lighting Environment"
          >
            <span className="btn-label">LIGHT</span>
            <span className="btn-value">{currentLightLabel} ▾</span>
          </button>
          {lightOpen && (
            <div className="neumorphic-menu">
              {LIGHTING_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`neumorphic-menu__item ${lightingMode === opt.id ? 'neumorphic-menu__item--active' : ''}`}
                  onClick={() => {
                    onLightingChange(opt.id);
                    setLightOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Button */}
        <button
          className="neumorphic-btn neumorphic-btn--sm"
          onClick={onToggleDetails}
          title="Project Specifications"
        >
          <span className="btn-label">INFO</span>
        </button>

        {/* Phase Indicator */}
        <div className="phase-indicator">
          <span className="phase-indicator__tag">
            {mode === 'real_location'
              ? (isOptimizationOpen ? 'PHASE 06' : isForecastOpen ? 'PHASE 05' : isPlanningOpen ? 'PHASE 04' : hasAnalysis ? 'PHASE 03' : 'PHASE 02')
              : 'PHASE 01'}
          </span>
          <span className="phase-indicator__status">
            <span className="status-dot" />
            {mode === 'real_location'
              ? (isOptimizationOpen ? 'OPTIMIZE' : isForecastOpen ? 'FORECAST' : isPlanningOpen ? 'PLANNING' : hasAnalysis ? 'ANALYZED' : 'REAL GEODATA')
              : 'SIMULATION'}
          </span>
        </div>
      </div>
    </header>
  );
};
