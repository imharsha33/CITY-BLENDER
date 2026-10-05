import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from '../../engine/sceneManager';
import { CityNavigationControls, type MapViewType } from '../UI/CityNavigationControls';
import type { CameraMode } from '../../types/infrastructure';
import type { LightingMode } from '../../engine/lighting';
import type { GeoAreaResponse, LayerVisibility, SceneMode } from '../../types/geo';
import type {
  AnalysisResultResponse,
  AnalysisFilterType,
  InfrastructureIssue,
  RoadAnalysisItem,
  JunctionAnalysisItem,
} from '../../types/analysis';
import type { RoadSegmentGeo } from '../../types/geo';
import type { CandidatePlan, PlanningViewState } from '../../types/planning';
import type { InfrastructureStrategy } from '../../types/optimization';

import type { TransformationState, ComparisonMode, ConstructionPhaseDefinition } from '../../types/transformation';
import type { ForecastResponse } from '../../types/forecasting';

export interface FocusTarget {
  lat: number;
  lon: number;
  viewType?: 'road' | 'junction' | 'bottleneck' | 'spine' | 'zone';
  timestamp?: number;
}

interface RoadSceneProps {
  progress: number;
  isPlaying: boolean;
  onProgressChange: (p: number) => void;
  cameraMode?: CameraMode;
  lightingMode?: LightingMode;
  autoCam?: boolean;
  mode?: SceneMode;
  realLocationData?: GeoAreaResponse | null;
  layers?: LayerVisibility;
  analysisData?: AnalysisResultResponse | null;
  analysisFilter?: AnalysisFilterType;
  candidatePlan?: CandidatePlan | null;
  strategy?: InfrastructureStrategy | null;
  planningViewState?: PlanningViewState;
  focusTarget?: FocusTarget | null;
  selectedRoad?: RoadAnalysisItem | RoadSegmentGeo | null;
  selectedIssue?: InfrastructureIssue | null;
  onSelectIssue?: (issue: InfrastructureIssue) => void;
  onSelectRoad?: (road: RoadAnalysisItem | RoadSegmentGeo) => void;
  onSelectJunction?: (junction: JunctionAnalysisItem) => void;
  // Phase 7 transformation props
  transformationState?: TransformationState;
  transformationProgress?: number;
  transformationSpeed?: number;
  transformationComparison?: ComparisonMode;
  transformationHorizon?: number;
  forecastData?: ForecastResponse | null;
  isTransformationPlaying?: boolean;
  onTransformationPhaseChange?: (progress: number, phase: ConstructionPhaseDefinition) => void;
  onTransformationComplete?: () => void;
  onTransformationStateChange?: (state: TransformationState) => void;
  transformCameraPreset?: { preset: 'whole_city' | 'corridor' | 'intervention' | 'street' | 'cinematic'; timestamp: number } | null;
}

export const RoadScene: React.FC<RoadSceneProps> = ({
  progress,
  cameraMode,
  lightingMode,
  autoCam = true,
  mode = 'demo',
  realLocationData,
  layers,
  analysisData,
  analysisFilter = 'ALL',
  candidatePlan,
  strategy,
  planningViewState = 'PROPOSED',
  focusTarget,
  selectedRoad,
  selectedIssue,
  onSelectIssue,
  onSelectRoad,
  onSelectJunction,
  transformationState,
  transformationProgress,
  transformationSpeed,
  transformationComparison,
  transformationHorizon,
  forecastData,
  isTransformationPlaying,
  onTransformationPhaseChange,
  onTransformationComplete,
  onTransformationStateChange,
  transformCameraPreset,
}) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [currentView, setCurrentView] = useState<MapViewType>('whole_area');

  // Detect WebGL support
  const hasWebGL = useCallback(() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch { return false; }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !hasWebGL()) return;

    const mgr = new SceneManager(canvasRef.current);
    managerRef.current = mgr;
    mgr.startLoop();

    return () => { mgr.dispose(); };
  }, [hasWebGL]);

  // Sync progress from parent → scene
  useEffect(() => {
    managerRef.current?.setProgress(progress);
  }, [progress]);

  // Sync camera mode
  useEffect(() => {
    if (!managerRef.current) return;
    if (cameraMode) {
      managerRef.current.setCameraMode(cameraMode);
    } else {
      managerRef.current.setAutoCam(autoCam);
    }
  }, [cameraMode, autoCam]);

  // Sync lighting mode
  useEffect(() => {
    if (!managerRef.current || !lightingMode) return;
    managerRef.current.setLightingMode(lightingMode);
  }, [lightingMode]);

  // Sync mode (demo vs real_location)
  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.setMode(mode);
  }, [mode]);

  // Sync real location data
  useEffect(() => {
    if (!managerRef.current || !realLocationData) return;
    managerRef.current.loadRealLocation(realLocationData);
  }, [realLocationData]);

  // Sync layer visibility
  useEffect(() => {
    if (!managerRef.current || !layers) return;
    managerRef.current.setRealLayers(layers);
  }, [layers]);

  // Sync Phase 3 analysis data
  useEffect(() => {
    if (!managerRef.current || !analysisData) return;
    managerRef.current.setAnalysisData(analysisData);
  }, [analysisData]);

  // Sync analysis filter
  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.setAnalysisFilter(analysisFilter);
  }, [analysisFilter]);

  // Sync Phase 4 candidate plan & Phase 6 strategy
  useEffect(() => {
    if (!managerRef.current) return;
    if (strategy) {
      managerRef.current.setStrategy(strategy);
    } else if (candidatePlan) {
      managerRef.current.setCandidatePlan(candidatePlan);
    } else {
      managerRef.current.setCandidatePlan(null);
    }
  }, [strategy, candidatePlan]);

  // Sync planning view state (EXISTING, PROPOSED, COMPARE, STRATEGY)
  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.setPlanningViewState(planningViewState || 'PROPOSED');
  }, [planningViewState]);

  // Sync camera focus on target element
  useEffect(() => {
    if (!managerRef.current || !focusTarget) return;
    managerRef.current.focusOnCoordinates(
      focusTarget.lat,
      focusTarget.lon,
      focusTarget.viewType || 'road'
    );
  }, [focusTarget]);

  // Phase 7: Wire transformation engine callbacks
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr) return;
    mgr.transformMgr.onProgressChange = onTransformationPhaseChange || undefined;
    mgr.transformMgr.onComplete = onTransformationComplete || undefined;
    mgr.transformMgr.onStateChange = onTransformationStateChange || undefined;
  }, [onTransformationPhaseChange, onTransformationComplete, onTransformationStateChange]);

  // Phase 7: Sync transformation context (strategy + plan + analysis + forecast)
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr) return;
    // Only set context when there's something meaningful to show
    if (strategy || candidatePlan) {
      mgr.setTransformationContext(strategy || null, candidatePlan || null, analysisData || null, forecastData || null);
    }
  }, [strategy, candidatePlan, analysisData, forecastData]);

  // Phase 7: Sync camera preset
  useEffect(() => {
    if (!managerRef.current || !transformCameraPreset) return;
    managerRef.current.focusTransformationCamera(transformCameraPreset.preset);
  }, [transformCameraPreset]);

  // Phase 7: Sync transformation state
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !transformationState) return;
    mgr.setTransformationState(transformationState);
  }, [transformationState]);

  // Phase 7: Sync construction progress (scrub)
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || transformationProgress === undefined) return;
    if (transformationState === 'CONSTRUCTION' && !isTransformationPlaying) {
      mgr.setTransformationProgress(transformationProgress);
    }
  }, [transformationProgress, transformationState, isTransformationPlaying]);

  // Phase 7: Sync comparison mode
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !transformationComparison) return;
    mgr.setTransformationComparison(transformationComparison);
  }, [transformationComparison]);

  // Phase 7: Sync future horizon
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !transformationHorizon) return;
    mgr.setTransformationHorizon(transformationHorizon);
  }, [transformationHorizon]);

  // Phase 7: Sync play speed
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || transformationSpeed === undefined) return;
    mgr.setTransformationSpeed(transformationSpeed);
  }, [transformationSpeed]);

  // Phase 7: Sync play/pause
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr) return;
    if (isTransformationPlaying) {
      mgr.playTransformation();
    } else {
      mgr.pauseTransformation();
    }
  }, [isTransformationPlaying]);

  // Click interaction for issues, roads & junctions
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!managerRef.current) return;
    const hit = managerRef.current.handleCanvasClick(e.clientX, e.clientY);
    if (hit) {
      if (hit.issue && onSelectIssue) onSelectIssue(hit.issue);
      else if (hit.road && onSelectRoad) onSelectRoad(hit.road);
      else if (hit.junction && onSelectJunction) onSelectJunction(hit.junction);
    }
  };

  if (!hasWebGL()) {
    return (
      <div className="webgl-fallback">
        <div className="webgl-fallback__inner">
          <h2>WebGL Not Available</h2>
          <p>
            Your browser or device does not support WebGL rendering. Please use
            a modern desktop browser (Chrome, Edge, Firefox) with hardware
            acceleration enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        className="road-scene-canvas"
        style={{ width: '100%', height: '100%', display: 'block', cursor: analysisData ? 'pointer' : 'default' }}
        onClick={handleCanvasClick}
      />

      {mode === 'real_location' && (
        <CityNavigationControls
          currentView={currentView}
          hasSelectedRoad={!!selectedRoad}
          hasSelectedIssue={!!selectedIssue}
          hasSelectedStrategy={!!strategy}
          onFitWholeArea={() => {
            setCurrentView('whole_area');
            managerRef.current?.fitWholeArea();
          }}
          onSetTopDown={() => {
            setCurrentView('top_down');
            managerRef.current?.setTopDownView();
          }}
          onSet3D={() => {
            setCurrentView('view_3d');
            managerRef.current?.set3DView();
          }}
          onSetCinematic={() => {
            setCurrentView('cinematic');
            managerRef.current?.setCinematicView();
          }}
          onFocusRoad={() => {
            if (selectedRoad?.geometry && selectedRoad.geometry.length > 0) {
              const mid = selectedRoad.geometry[Math.floor(selectedRoad.geometry.length / 2)];
              managerRef.current?.focusOnCoordinates(mid[0], mid[1], 'road');
            }
          }}
          onFocusIssue={() => {
            if (selectedIssue) {
              managerRef.current?.focusOnCoordinates(
                selectedIssue.location[0],
                selectedIssue.location[1],
                'bottleneck'
              );
            }
          }}
          onFocusStrategy={() => {
            if (strategy) {
              managerRef.current?.setStrategy(strategy);
            }
          }}
          onZoomIn={() => managerRef.current?.zoom('in')}
          onZoomOut={() => managerRef.current?.zoom('out')}
          onResetNorth={() => managerRef.current?.resetNorth()}
        />
      )}
    </div>
  );
};
