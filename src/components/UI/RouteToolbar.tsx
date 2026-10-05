import React from 'react';
import type { LocationResult, LayerVisibility, GeoAreaResponse } from '../../types/geo';
import { CitySelectBar } from './CitySelectBar';
import { LayerControls } from './LayerControls';
import { MapImportControl } from './MapImportControl';
import type { DemoPlanType } from '../../data/planScenarios';

export interface RouteToolbarProps {
  locationName?: string;
  onSelectLocation: (loc: LocationResult) => void;
  onSelectDemoPlan?: (plan: DemoPlanType) => void;
  isSearching: boolean;
  onMapLoaded?: (data: GeoAreaResponse) => void;
  isAnalyzing: boolean;
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  hasAnalysis: boolean;
  isAnalysisActive: boolean;
  onAnalyze?: () => void;
  onToggleAnalysisMode?: () => void;
  onToggleFindings?: () => void;
  isFindingsOpen?: boolean;
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
  dataQualityScore?: number;
}

export const RouteToolbar: React.FC<RouteToolbarProps> = ({
  locationName,
  onSelectLocation,
  onSelectDemoPlan,
  isSearching,
  onMapLoaded,
  isAnalyzing,
  layers,
  onLayersChange,
  hasAnalysis,
  isAnalysisActive,
  onAnalyze,
  onToggleAnalysisMode,
  onToggleFindings,
  isFindingsOpen = false,
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
  dataQualityScore,
}) => {
  const shortLoc = locationName ? locationName.split(',')[0].toUpperCase() : 'SELECTED LOCATION';

  return (
    <div className="route-viewport-toolbar">
      {/* Left: Location selection, Map import & Layers */}
      <div className="route-toolbar__left">
        <CitySelectBar
          locationName={locationName}
          onSelectLocation={onSelectLocation}
          onSelectDemoPlan={onSelectDemoPlan}
          isLoading={isSearching}
        />
        {onMapLoaded && (
          <MapImportControl onMapLoaded={onMapLoaded} disabled={isSearching || isAnalyzing} />
        )}
        <LayerControls layers={layers} onChange={onLayersChange} />
      </div>

      {/* Right: Analysis & Optimization Engine Controls */}
      <div className="route-toolbar__right">
        {hasAnalysis && shortLoc && (
          <div className="header-status-chip">
            <span className="header-status-chip__dot" />
            <span className="header-status-chip__text">
              {shortLoc} {dataQualityScore ? `· ${dataQualityScore}%` : ''}
            </span>
          </div>
        )}

        {!hasAnalysis ? (
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
              onClick={() => { if (isAnalysisActive && onToggleAnalysisMode) onToggleAnalysisMode(); }}
              title="Normal geographic environment"
            >
              <span className="btn-label">NORMAL</span>
            </button>
            <button
              className={`neumorphic-btn neumorphic-btn--sm ${isAnalysisActive ? 'neumorphic-btn--accent neumorphic-btn--active' : ''}`}
              onClick={() => { if (!isAnalysisActive && onToggleAnalysisMode) onToggleAnalysisMode(); }}
              title="Infrastructure issues and bottleneck highlights"
            >
              <span className="btn-label">ANALYSIS</span>
            </button>
          </div>
        )}

        {hasAnalysis && onToggleFindings && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isFindingsOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleFindings}
            title="Toggle Infrastructure Findings Drawer"
          >
            <span className="btn-label">FINDINGS</span>
          </button>
        )}

        {hasAnalysis && onToggleZones && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isZonesOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleZones}
            title="Inspect Spatial Development Zones (Phase 8)"
            style={isZonesOpen ? { borderColor: '#38bdf8', color: '#0284c7', background: 'rgba(56, 189, 248, 0.15)' } : {}}
          >
            <span className="btn-label">ZONES{zonesCount ? ` (${zonesCount})` : ''}</span>
          </button>
        )}

        {hasAnalysis && onTogglePlanning && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isPlanningOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onTogglePlanning}
            title="Generate & Compare Infrastructure Interventions (Phase 4)"
            style={isPlanningOpen ? { borderColor: '#f59e0b', color: '#b45309', background: 'rgba(245, 158, 11, 0.15)' } : {}}
          >
            <span className="btn-label">PLANNING</span>
          </button>
        )}

        {hasAnalysis && onToggleForecast && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isForecastOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleForecast}
            title="Forecast Future Demand, Scenarios & Plan Resilience (Phase 5)"
            style={isForecastOpen ? { borderColor: '#8b5cf6', color: '#6d28d9', background: 'rgba(139, 92, 246, 0.15)' } : {}}
          >
            <span className="btn-label">FORECAST</span>
          </button>
        )}

        {hasAnalysis && onToggleOptimization && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isOptimizationOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleOptimization}
            title="Multi-Objective Infrastructure Strategy Optimization (Phase 6)"
            style={isOptimizationOpen ? { borderColor: '#eab308', color: '#854d0e', background: 'rgba(234, 179, 8, 0.15)' } : {}}
          >
            <span className="btn-label">OPTIMIZE</span>
          </button>
        )}

        {onToggleTransformation && (hasSelectedPlanOrStrategy || isTransformationOpen) && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isTransformationOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleTransformation}
            title="Construction & Transformation Digital Twin Engine (Phase 7)"
            style={isTransformationOpen ? { borderColor: '#10b981', color: '#047857', background: 'rgba(16, 185, 129, 0.18)' } : { borderColor: 'rgba(16, 185, 129, 0.4)', color: '#065f46' }}
          >
            <span className="btn-label">TRANSFORM</span>
          </button>
        )}

        {onToggleEvidence && hasAnalysis && (
          <button
            className={`neumorphic-btn neumorphic-btn--sm ${isEvidenceOpen ? 'neumorphic-btn--active' : ''}`}
            onClick={onToggleEvidence}
            title="Phase 9: Evidence-Driven Intelligence & Feasibility Audit"
            style={isEvidenceOpen ? { borderColor: '#f59e0b', color: '#b45309', background: 'rgba(245, 158, 11, 0.18)' } : { borderColor: 'rgba(245, 158, 11, 0.4)', color: '#78350f' }}
          >
            <span className="btn-label">EVIDENCE</span>
          </button>
        )}
      </div>
    </div>
  );
};
