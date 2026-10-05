import { useState, useEffect, useRef, useCallback } from 'react';
import { Header, type MainNavigationMode } from './components/UI/Header';
import { RouteToolbar } from './components/UI/RouteToolbar';
import { FrontPage } from './components/UI/FrontPage';
import { RoadScene, type FocusTarget } from './components/Scene/RoadScene';
import { Timeline } from './components/Timeline/Timeline';
import { CompactStatus } from './components/Panels/CompactStatus';
import { RealLocationStatus } from './components/Panels/RealLocationStatus';
import { DetailsModal } from './components/Panels/DetailsModal';
import { IssueInspectionCard } from './components/Panels/IssueInspectionCard';
import { AnalysisSummaryPanel } from './components/Panels/AnalysisSummaryPanel';
import { FindingsDrawer } from './components/Panels/FindingsDrawer';
import { PlanningPanel } from './components/Panels/PlanningPanel';
import { ForecastingPanel } from './components/Panels/ForecastingPanel';
import { OptimizationPanel } from './components/Panels/OptimizationPanel';
import { DevelopmentZonesPanel } from './components/Panels/DevelopmentZonesPanel';
import { EngineeringEvidenceModal } from './components/Panels/EngineeringEvidenceModal';
import { LoadingIndicator, type LoadingStep } from './components/UI/LoadingIndicator';
import type { CameraMode } from './types/infrastructure';
import type { LightingMode } from './engine/lighting';
import type { GeoAreaResponse, LayerVisibility, LocationResult, SceneMode, RoadSegmentGeo, DevelopmentZone } from './types/geo';
import type {
  AnalysisResultResponse,
  AnalysisFilterType,
  InfrastructureIssue,
  RoadAnalysisItem,
  JunctionAnalysisItem,
} from './types/analysis';
import type {
  PlanningResponse,
  CandidatePlan,
  PlanningPriority,
  PlanningViewState,
} from './types/planning';
import type { ForecastResponse, FutureBottleneck } from './types/forecasting';
import type {
  OptimizationResponse,
  InfrastructureStrategy,
  OptimizationMode,
} from './types/optimization';
import { TransformationPanel } from './components/Panels/TransformationPanel';
import type { TransformationState, ComparisonMode, ConstructionPhaseDefinition } from './types/transformation';
import { CONSTRUCTION_PHASES } from './types/transformation';
import { PlanSelectionBar } from './components/Panels/PlanSelectionBar';
import { PlanSpecsModal } from './components/Panels/PlanSpecsModal';
import { RoadSensorPanel } from './components/Panels/RoadSensorPanel';
import type { SignalJunctionTelemetry } from './components/Scene/SmartSignalJunction';
import type { DemoPlanType } from './data/planScenarios';
import { SCENARIOS } from './data/planScenarios';
import { ProjectInfoSection } from './components/UI/ProjectInfoSection';
import './styles/global.css';

const NORMAL_SPEED = 0.00035; // ~48s full run
const FAST_SPEED   = 0.0012;  // ~14s full run

export default function App() {
  // Main Navigation Mode: HOME (Front Page) | FLOW | BUILD | ROUTE
  const [mainNavMode, setMainNavMode]   = useState<MainNavigationMode>('home');

  // Phase 1 visualization states
  const [progress, setProgress]         = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isFast, setIsFast]             = useState(false);
  const [cameraMode, setCameraMode]     = useState<CameraMode>('overview');
  const [lightingMode, setLightingMode] = useState<LightingMode>('day');
  const [showDetails, setShowDetails]   = useState(false);
  const [showHero, setShowHero]         = useState(false);
  const [demoPlan, setDemoPlan]         = useState<DemoPlanType>('road_sensor');
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const handleScrollToDocs = useCallback(() => {
    const el = document.getElementById('project-overview');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleAboutClick = useCallback(() => {
    if (mainNavMode !== 'home') {
      setMainNavMode('home');
      setIsRoadSensorOpen(false);
      setTimeout(() => {
        handleScrollToDocs();
      }, 100);
    } else {
      handleScrollToDocs();
    }
  }, [mainNavMode, handleScrollToDocs]);

  const handleScrollToTop = useCallback(() => {
    const rootEl = document.querySelector('.app-viewport-root');
    if (rootEl) {
      rootEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectNavMode = useCallback((selectedMode: MainNavigationMode) => {
    setMainNavMode(selectedMode);
    if (selectedMode === 'home') {
      setIsRoadSensorOpen(false);
    } else if (selectedMode === 'flow') {
      setMode('demo');
      setDemoPlan('road_sensor');
      setIsRoadSensorOpen(true);
      setRoadSensorPreset({ preset: 'overview', timestamp: Date.now() });
    } else if (selectedMode === 'build') {
      setMode('demo');
      setDemoPlan(prev => (prev === 'road_sensor' ? 'four_lane' : prev));
      setIsRoadSensorOpen(false);
    } else if (selectedMode === 'route') {
      setMode('real_location');
      setIsRoadSensorOpen(false);
    }
  }, []);

  // Road Sensor & Smart Signal Junction states
  const [isRoadSensorOpen, setIsRoadSensorOpen] = useState(true);
  const [roadSensorTelemetry, setRoadSensorTelemetry] = useState<SignalJunctionTelemetry>({
    currentPhase: 'NORTH_SOUTH',
    phaseTimeRemaining: 45,
    totalCycleSeconds: 70,
    adaptiveMode: true,
    totalVehiclesDetected: 42,
    approaches: {
      north: { id: 'north', name: 'North Approach', densityLevel: 'High', densityVehPerHour: 48, assignedGreenSeconds: 45, currentSignal: 'GREEN', activeSensorPressureMpa: 0.88, resistanceChangePercent: -15.4, sensorTriggered: true },
      east: { id: 'east', name: 'East Approach', densityLevel: 'Moderate', densityVehPerHour: 22, assignedGreenSeconds: 25, currentSignal: 'RED', activeSensorPressureMpa: 0.42, resistanceChangePercent: -7.2, sensorTriggered: false },
      south: { id: 'south', name: 'South Approach', densityLevel: 'Light', densityVehPerHour: 8, assignedGreenSeconds: 15, currentSignal: 'GREEN', activeSensorPressureMpa: 0.25, resistanceChangePercent: -4.1, sensorTriggered: false },
      west: { id: 'west', name: 'West Approach', densityLevel: 'Low', densityVehPerHour: 5, assignedGreenSeconds: 12, currentSignal: 'RED', activeSensorPressureMpa: 0.18, resistanceChangePercent: -3.0, sensorTriggered: false },
    },
    latestSensorReading: {
      approach: 'North Approach (Lane 1)',
      pressureMpa: 0.88,
      weightTons: 1.85,
      deltaROverR: -15.4,
      timestamp: Date.now(),
    },
  });
  const [roadSensorPreset, setRoadSensorPreset] = useState<{ preset: 'overview' | 'sensor_cutaway' | 'control_unit' | 'north_queue'; timestamp: number } | null>(null);
  const [roadSensorTrigger, setRoadSensorTrigger] = useState<{ approach?: 'north' | 'east' | 'south' | 'west'; timestamp: number } | null>(null);
  const [roadSensorAdaptiveMode, setRoadSensorAdaptiveMode] = useState(true);

  // Phase 2 real location states (Real Location is active in ROUTE mode)
  const [mode, setMode]                         = useState<SceneMode>('demo');
  const [realLocationData, setRealLocationData] = useState<GeoAreaResponse | null>(null);
  const [loadingStep, setLoadingStep]           = useState<LoadingStep>('idle');
  const [isSearching, setIsSearching]           = useState(false);
  const [layers, setLayers]                     = useState<LayerVisibility>({
    roads: true,
    buildings: true,
    water: true,
    pois: true,
  });

  // Phase 3 analysis states
  const [analysisData, setAnalysisData]           = useState<AnalysisResultResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing]             = useState(false);
  const [isAnalysisActive, setIsAnalysisActive]   = useState(true);
  const [analysisFilter, setAnalysisFilter]       = useState<AnalysisFilterType>('ALL');
  const [selectedIssue, setSelectedIssue]         = useState<InfrastructureIssue | null>(null);
  const [selectedRoad, setSelectedRoad]           = useState<RoadAnalysisItem | RoadSegmentGeo | null>(null);
  const [selectedJunction, setSelectedJunction]   = useState<JunctionAnalysisItem | null>(null);
  const [showSummaryPanel, setShowSummaryPanel]   = useState(false);
  const [isFindingsOpen, setIsFindingsOpen]       = useState(false);
  const [focusTarget, setFocusTarget]             = useState<FocusTarget | null>(null);

  // Phase 4 Planning states
  const [planningData, setPlanningData]           = useState<PlanningResponse | null>(null);
  const [selectedPlan, setSelectedPlan]           = useState<CandidatePlan | null>(null);
  const [planningPriority, setPlanningPriority]   = useState<PlanningPriority>('balanced');
  const [planningViewState, setPlanningViewState] = useState<PlanningViewState>('PROPOSED');
  const [isPlanningOpen, setIsPlanningOpen]       = useState(false);
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);

  // Phase 5 Forecasting states
  const [forecastData, setForecastData]           = useState<ForecastResponse | null>(null);
  const [forecastYear, setForecastYear]           = useState<number>(2035);
  const [forecastScenario, setForecastScenario]   = useState<string>('moderate_growth');
  const [isForecastOpen, setIsForecastOpen]       = useState(false);
  const [isForecasting, setIsForecasting]         = useState(false);

  // Phase 6 Multi-Objective Optimization states
  const [optimizationData, setOptimizationData]       = useState<OptimizationResponse | null>(null);
  const [selectedStrategy, setSelectedStrategy]       = useState<InfrastructureStrategy | null>(null);
  const [optimizationMode, setOptimizationMode]       = useState<OptimizationMode>('balanced');
  const [isOptimizationOpen, setIsOptimizationOpen]   = useState(false);
  const [isZonesOpen, setIsZonesOpen]                 = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen]           = useState(false);
  const [isOptimizing, setIsOptimizing]               = useState(false);

  // Phase 7 Transformation Engine states
  const [isTransformationOpen, setIsTransformationOpen]       = useState(false);
  const [transformationState, setTransformationState]         = useState<TransformationState>('EXISTING');
  const [transformationProgress, setTransformationProgress]   = useState(0.0);
  const [isTransformationPlaying, setIsTransformationPlaying] = useState(false);
  const [transformationSpeed, setTransformationSpeed]         = useState(1.0);
  const [transformationPhase, setTransformationPhase]         = useState<ConstructionPhaseDefinition>(CONSTRUCTION_PHASES[0]);
  const [transformationComparison, setTransformationComparison] = useState<ComparisonMode>('PROPOSED');
  const [transformationHorizon, setTransformationHorizon]     = useState(2035);
  const [transformCameraPreset, setTransformCameraPreset]     = useState<{
    preset: 'whole_city' | 'corridor' | 'intervention' | 'street' | 'cinematic';
    timestamp: number;
  } | null>(null);

  const rafRef       = useRef<number>(0);
  const progressRef  = useRef(0);
  const playingRef   = useRef(false);
  const speedRef     = useRef(NORMAL_SPEED);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { playingRef.current  = isPlaying; }, [isPlaying]);

  // Completion hero check (demo mode only)
  useEffect(() => {
    if (mode === 'demo' && progress >= 0.995) {
      const t = setTimeout(() => setShowHero(true), 400);
      return () => clearTimeout(t);
    } else {
      setShowHero(false);
    }
  }, [progress, mode]);

  // Playback loop (demo mode only)
  const tick = useCallback(() => {
    if (!playingRef.current || mode !== 'demo') return;
    const next = Math.min(1, progressRef.current + speedRef.current);
    progressRef.current = next;
    setProgress(next);
    if (next >= 1) {
      setIsPlaying(false);
      playingRef.current = false;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [mode]);

  const handlePlay = useCallback(() => {
    if (progressRef.current >= 1) {
      progressRef.current = 0;
      setProgress(0);
      setShowHero(false);
    }
    setIsPlaying(true);
    playingRef.current = true;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  const handleReset = useCallback(() => {
    handlePause();
    progressRef.current = 0;
    setProgress(0);
    setShowHero(false);
  }, [handlePause]);

  const handleRewind = useCallback(() => {
    handlePause();
    const prev = Math.max(0, progressRef.current - 0.1);
    progressRef.current = prev;
    setProgress(prev);
  }, [handlePause]);

  const handleToggleFast = useCallback(() => {
    setIsFast(prev => {
      const next = !prev;
      speedRef.current = next ? FAST_SPEED : NORMAL_SPEED;
      return next;
    });
  }, []);

  const handleSlider = useCallback((p: number) => {
    handlePause();
    progressRef.current = p;
    setProgress(p);
  }, [handlePause]);

  const handleToggleRoadSensor = useCallback(() => {
    setIsRoadSensorOpen(prev => {
      const next = !prev;
      if (next) {
        setMode('demo');
        setDemoPlan('road_sensor');
        setRoadSensorPreset({ preset: 'overview', timestamp: Date.now() });
      } else {
        setDemoPlan('four_lane');
      }
      return next;
    });
  }, []);

  const handleSelectDemoPlan = useCallback((plan: DemoPlanType) => {
    setMode('demo');
    setDemoPlan(plan);
    if (plan === 'road_sensor') {
      setMainNavMode('flow');
      setIsRoadSensorOpen(true);
      setRoadSensorPreset({ preset: 'overview', timestamp: Date.now() });
    } else {
      setMainNavMode('build');
      setIsRoadSensorOpen(false);
    }
  }, []);

  // Phase 2: Location Selection & Loading Pipeline
  const handleSelectLocation = useCallback(async (loc: LocationResult, activateNavMode = true) => {
    handlePause();
    if (activateNavMode) {
      setMainNavMode('route');
    }
    setMode('real_location');
    setIsSearching(true);
    setIsRoadSensorOpen(false);
    const cityName = (loc.name || loc.displayName.split(',')[0]).trim().toUpperCase();
    const isMadurai = cityName.includes('MADURAI');
    setLoadingStep(isMadurai ? 'LOADING MADURAI DIGITAL TWIN...' : `LOADING ${cityName} DIGITAL TWIN...`);
    setAnalysisData(null);
    setSelectedIssue(null);
    setSelectedRoad(null);
    setSelectedJunction(null);
    setShowSummaryPanel(false);
    setIsFindingsOpen(false);
    setPlanningData(null);
    setSelectedPlan(null);
    setIsPlanningOpen(false);
    setForecastData(null);
    setIsForecastOpen(false);
    setOptimizationData(null);
    setSelectedStrategy(null);
    setIsOptimizationOpen(false);
    setIsZonesOpen(false);
    setIsEvidenceOpen(false);
    setIsTransformationOpen(false);
    setTransformationState('EXISTING');
    setTransformationProgress(0.0);
    setIsTransformationPlaying(false);

    try {
      await new Promise(r => setTimeout(r, 200));
      setLoadingStep('LOADING ROAD NETWORK');

      const url = `/api/geo-area?lat=${loc.latitude}&lon=${loc.longitude}&radius=2.0&name=${encodeURIComponent(loc.displayName)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'REAL DATA UNAVAILABLE: OpenStreetMap servers returned an error.');
      }

      setLoadingStep('LOADING ENVIRONMENT');
      const data: GeoAreaResponse = await res.json();
      await new Promise(r => setTimeout(r, 150));

      setRealLocationData(data);
      setMode('real_location');
      setLoadingStep('READY');
      setTimeout(() => setLoadingStep('idle'), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Location load error:', msg);
      setLoadingStep('idle');
      alert(`REAL DATA UNAVAILABLE\n\n${msg}\n\nPlease check your internet connection or use [IMPORT MAP] to upload a local GeoJSON, KML, or Shapefile.`);
    } finally {
      setIsSearching(false);
    }
  }, [handlePause]);

  // Method B: Authoritative User-Imported Map
  const handleMapImported = useCallback((mapData: GeoAreaResponse) => {
    handlePause();
    setAnalysisData(null);
    setSelectedIssue(null);
    setSelectedRoad(null);
    setSelectedJunction(null);
    setShowSummaryPanel(false);
    setIsFindingsOpen(false);
    setPlanningData(null);
    setSelectedPlan(null);
    setIsPlanningOpen(false);
    setForecastData(null);
    setIsForecastOpen(false);
    setOptimizationData(null);
    setSelectedStrategy(null);
    setIsOptimizationOpen(false);
    setIsZonesOpen(false);
    setIsEvidenceOpen(false);
    setIsTransformationOpen(false);

    setRealLocationData(mapData);
    setMode('real_location');
    setLoadingStep('READY');
    setTimeout(() => setLoadingStep('idle'), 800);
  }, [handlePause]);

  // On App Launch: Preload primary demonstration city (Madurai, Tamil Nadu) in background without leaving home front page
  useEffect(() => {
    handleSelectLocation({
      id: 'madurai-city-tamilnadu',
      displayName: 'Madurai, Tamil Nadu, India',
      name: 'Madurai',
      latitude: 9.9261,
      longitude: 78.1141,
    }, false); // false ensures mainNavMode remains 'home' on initial page load / refresh
  }, [handleSelectLocation]);


  // Phase 3: Run Intelligent Infrastructure Problem Analysis
  // Directly sends current authoritative realLocationData (OSM or User Import) for 100% parity
  const handleRunAnalysis = async () => {
    if (!realLocationData) return;

    setIsAnalyzing(true);
    setSelectedIssue(null);
    setSelectedRoad(null);
    setSelectedJunction(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(realLocationData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to run infrastructure analysis on current map');
      }

      const data: AnalysisResultResponse = await res.json();
      setAnalysisData(data);
      setIsAnalysisActive(true);
      setShowSummaryPanel(true);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFocusZone = (zone: DevelopmentZone) => {
    setFocusTarget({
      lat: zone.center[0],
      lon: zone.center[1],
      viewType: 'zone',
      timestamp: Date.now(),
    });
  };

  // Phase 4: Generate Civil Planning Alternatives & Interventions
  const handleGeneratePlans = async (priorityOverride?: PlanningPriority) => {
    if (!realLocationData || !analysisData) return;
    const targetPriority = priorityOverride || planningPriority;
    setIsGeneratingPlans(true);

    try {
      const res = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geo_area: realLocationData,
          analysis: analysisData,
          priority: targetPriority,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to generate infrastructure plans');
      }

      const planResult: PlanningResponse = await res.json();
      setPlanningData(planResult);
      const rec =
        planResult.recommendedPlan ||
        planResult.candidates.find((c) => c.id === planResult.recommendedPlanId) ||
        planResult.candidates[0] ||
        null;
      setSelectedPlan(rec);
      setIsPlanningOpen(true);
    } catch (err) {
      console.error('Plan generation error:', err);
      alert('Plan Generation Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingPlans(false);
    }
  };

  const handleChangePriority = (p: PlanningPriority) => {
    setPlanningPriority(p);
    handleGeneratePlans(p);
  };

  // Coordinate workstation panels so only one right dock panel is active at a time
  const openSinglePanel = (panelName: 'findings' | 'zones' | 'planning' | 'forecast' | 'optimization' | 'transformation' | 'evidence' | 'none') => {
    setIsFindingsOpen(panelName === 'findings');
    setIsZonesOpen(panelName === 'zones');
    setIsPlanningOpen(panelName === 'planning');
    setIsForecastOpen(panelName === 'forecast');
    setIsOptimizationOpen(panelName === 'optimization');
    setIsTransformationOpen(panelName === 'transformation');
    setIsEvidenceOpen(panelName === 'evidence');
  };

  const handleTogglePlanning = () => {
    if (isPlanningOpen) {
      openSinglePanel('none');
    } else {
      openSinglePanel('planning');
      if (!planningData && analysisData) {
        handleGeneratePlans(planningPriority);
      }
    }
  };

  // Phase 5: Future Demand Forecasting & Scenario Engine
  const handleGenerateForecast = async (yearOverride?: number, scenarioOverride?: string) => {
    if (!realLocationData || !analysisData) return;
    const y = yearOverride || forecastYear;
    const s = scenarioOverride || forecastScenario;
    setIsForecasting(true);

    try {
      const res = await fetch('/api/forecast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geo_area: realLocationData,
          analysis: analysisData,
          plans: planningData?.candidates || [],
          baseline_year: 2026,
          forecast_years: [2030, 2035, 2040],
          active_scenario: s,
          active_year: y,
          model: 'auto'
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to generate future demand forecast');
      }

      const fData: ForecastResponse = await res.json();
      setForecastData(fData);
      setIsForecastOpen(true);
    } catch (err) {
      console.error('Forecast generation error:', err);
      alert('Forecast Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsForecasting(false);
    }
  };

  const handleToggleForecast = () => {
    if (isForecastOpen) {
      openSinglePanel('none');
    } else {
      openSinglePanel('forecast');
      if (!forecastData && analysisData) {
        handleGenerateForecast(forecastYear, forecastScenario);
      }
    }
  };

  const handleChangeForecastYear = (y: number) => {
    setForecastYear(y);
    handleGenerateForecast(y, forecastScenario);
  };

  const handleChangeForecastScenario = (s: string) => {
    setForecastScenario(s);
    handleGenerateForecast(forecastYear, s);
  };

  const handleSelectFutureBottleneck = (bn: FutureBottleneck) => {
    setFocusTarget({
      lat: bn.location[0],
      lon: bn.location[1],
      viewType: 'bottleneck',
      timestamp: Date.now(),
    });
  };

  // Phase 6: Multi-Objective Strategy Optimization Engine
  const handleGenerateOptimization = async (modeOverride?: OptimizationMode) => {
    if (!realLocationData || !analysisData) return;
    const m = modeOverride || optimizationMode;
    setIsOptimizing(true);

    try {
      // Ensure candidate plans exist
      let candidatePlans = planningData?.candidates || [];
      if (candidatePlans.length === 0) {
        try {
          const planRes = await fetch('/api/plans/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              geo_area: realLocationData,
              analysis: analysisData,
              priority: 'balanced',
            }),
          });
          if (planRes.ok) {
            const pData = await planRes.json();
            setPlanningData(pData);
            candidatePlans = pData.candidates || [];
          }
        } catch (e) {
          console.warn('Could not auto-generate plans for optimization:', e);
        }
      }

      // Ensure forecasts exist
      let forecastPayload = forecastData;
      if (!forecastPayload) {
        try {
          const fRes = await fetch('/api/forecast/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              geo_area: realLocationData,
              analysis: analysisData,
              plans: candidatePlans,
              baseline_year: 2026,
              forecast_years: [2030, 2035, 2040],
              active_scenario: forecastScenario,
              active_year: forecastYear,
              model: 'auto'
            }),
          });
          if (fRes.ok) {
            forecastPayload = await fRes.json();
            setForecastData(forecastPayload);
          }
        } catch (e) {
          console.warn('Could not auto-generate forecast for optimization:', e);
        }
      }

      const res = await fetch('/api/optimization/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geo_area: realLocationData,
          analysis: analysisData,
          plans: candidatePlans,
          forecasts: forecastPayload,
          optimization_mode: m,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to generate strategy optimization');
      }

      const optData: OptimizationResponse = await res.json();
      setOptimizationData(optData);
      setSelectedStrategy(optData.recommended_strategy || optData.pareto_strategies[0] || optData.all_strategies[0] || null);
      setSelectedPlan(null); // Strategy active
      setPlanningViewState('STRATEGY');
      setIsOptimizationOpen(true);
    } catch (err) {
      console.error('Optimization error:', err);
      alert('Optimization Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleToggleOptimization = () => {
    if (isOptimizationOpen) {
      openSinglePanel('none');
    } else {
      openSinglePanel('optimization');
      if (!optimizationData && analysisData) {
        handleGenerateOptimization(optimizationMode);
      }
    }
  };

  const handleChangeOptimizationMode = (m: OptimizationMode) => {
    setOptimizationMode(m);
    handleGenerateOptimization(m);
  };

  const handleSelectStrategy = (strat: InfrastructureStrategy) => {
    setSelectedStrategy(strat);
    setSelectedPlan(null);
    setPlanningViewState('STRATEGY');
  };

  // Phase 7 Transformation handlers
  const handleTransformationStateChange = (state: TransformationState) => {
    setTransformationState(state);
    if (state === 'EXISTING' || state === 'ANALYSIS') setIsTransformationPlaying(false);
  };
  const handleTransformationPlay = () => setIsTransformationPlaying(true);
  const handleTransformationPause = () => setIsTransformationPlaying(false);
  const handleTransformationReset = () => { setIsTransformationPlaying(false); setTransformationProgress(0.0); setTransformationState('EXISTING'); };
  const handleTransformationStepForward = () => { const next = Math.min(1.0, transformationProgress + 1/13); setTransformationProgress(next); if (next >= 1.0) setTransformationState('COMPLETED'); };
  const handleTransformationStepBackward = () => setTransformationProgress(Math.max(0.0, transformationProgress - 1/13));
  const handleTransformationPhaseChange = (_p: number, phase: ConstructionPhaseDefinition) => { setTransformationPhase(phase); setTransformationProgress(_p); };
  const handleTransformationComplete = () => { setIsTransformationPlaying(false); setTransformationState('COMPLETED'); };
  const handleToggleTransformation = () => setIsTransformationOpen(v => !v);

  // Inspect specific issue & focus camera
  const handleInspectIssue = (issue: InfrastructureIssue) => {
    setSelectedIssue(issue);
    setSelectedRoad(null);
    setSelectedJunction(null);

    const viewType =
      issue.type === 'JUNCTION_RISK'
        ? 'junction'
        : issue.type === 'BOTTLENECK'
        ? 'bottleneck'
        : issue.type === 'NETWORK_CRITICAL_SEGMENT'
        ? 'spine'
        : 'road';

    setFocusTarget({
      lat: issue.location[0],
      lon: issue.location[1],
      viewType,
      timestamp: Date.now(),
    });
  };

  // Inspect road clicked on canvas
  const handleInspectRoad = (road: RoadAnalysisItem | RoadSegmentGeo) => {
    setSelectedRoad(road);
    setSelectedIssue(null);
    setSelectedJunction(null);

    if (road.geometry && road.geometry.length > 0) {
      const mid = road.geometry[Math.floor(road.geometry.length / 2)];
      setFocusTarget({
        lat: mid[0],
        lon: mid[1],
        viewType: 'road',
        timestamp: Date.now(),
      });
    }
  };

  // Inspect junction clicked on canvas
  const handleInspectJunction = (junction: JunctionAnalysisItem) => {
    setSelectedJunction(junction);
    setSelectedIssue(null);
    setSelectedRoad(null);

    setFocusTarget({
      lat: junction.coordinate[0],
      lon: junction.coordinate[1],
      viewType: 'junction',
      timestamp: Date.now(),
    });
  };

  const handleModeToggle = async () => {
    if (mode === 'real_location') {
      setMode('demo');
      setShowSummaryPanel(false);
      setIsFindingsOpen(false);
      setPlanningData(null);
      setSelectedPlan(null);
      setIsPlanningOpen(false);
      setForecastData(null);
      setIsForecastOpen(false);
      setOptimizationData(null);
      setSelectedStrategy(null);
      setIsOptimizationOpen(false);
    setIsZonesOpen(false);
      setSelectedIssue(null);
      setSelectedRoad(null);
      setSelectedJunction(null);
    } else {
      setIsRoadSensorOpen(false);
      if (realLocationData) {
        setMode('real_location');
      } else {
        await handleSelectLocation({
          id: 'varkala-preset',
          displayName: 'Varkala, Thiruvananthapuram, Kerala, India',
          latitude: 8.7379,
          longitude: 76.7163,
        });
      }
    }
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="app-viewport-root">
      {/* ── Top Fixed/Sticky Application Header (FLOW | BUILD | ROUTE) ── */}
      <header className="app-top-nav-bar">
        <Header
          activeMode={mainNavMode}
          onSelectMode={handleSelectNavMode}
          onAboutClick={handleAboutClick}
        />
      </header>

      {/* ── Front Page (Neat, Aesthetic, Classy Layout) ── */}
      {mainNavMode === 'home' && (
        <FrontPage
          onSelectMode={handleSelectNavMode}
          onScrollToDocs={handleScrollToDocs}
        />
      )}

      {/* ── 3D Map Workstation Box Layout Container (Active for Flow, Build, Route) ── */}
      {mainNavMode !== 'home' && (
        <main className="map-box-wrapper">
          <div className={`map-box-frame ${isMapExpanded ? 'map-box-frame--expanded' : ''}`}>
            {/* 3D Viewport Header Bar with Back Button */}
            <div className="map-box-viewport-header">
              <div className="map-box-header__left">
                <button
                  className="map-box-back-btn"
                  onClick={() => handleSelectNavMode('home')}
                  title="Return to Front Page"
                >
                  ← Back
                </button>
                <span className="map-status-dot" />
                <span className="map-status-title">
                  {mainNavMode.toUpperCase()}
                </span>
                <span className="map-header-pipe">|</span>
                <span className="map-active-plan-pill">
                  {mainNavMode === 'flow'
                    ? `${roadSensorTelemetry.currentPhase === 'NORTH_SOUTH' ? 'N-S' : 'E-W'} • ${roadSensorTelemetry.phaseTimeRemaining}s`
                    : mainNavMode === 'build'
                    ? (SCENARIOS[demoPlan]?.name.toUpperCase() || 'CIVIL PLAN')
                    : (realLocationData?.locationName
                        ? realLocationData.locationName.split(',')[0].toUpperCase()
                        : 'METROPOLITAN TWIN')}
                </span>
              </div>

            <div className="map-box-header__center">
              {mainNavMode === 'flow' ? (
                <div className="map-quick-cam-pills">
                  <button
                    className="map-cam-btn"
                    onClick={() => setRoadSensorPreset({ preset: 'overview', timestamp: Date.now() })}
                    title="Camera Overview of Junction"
                  >
                    Overview
                  </button>
                  <button
                    className="map-cam-btn"
                    onClick={() => setRoadSensorPreset({ preset: 'sensor_cutaway', timestamp: Date.now() })}
                    title="Sub-Surface Strata Sensor Cutaway"
                  >
                    Strata
                  </button>
                  <button
                    className="map-cam-btn"
                    onClick={() => setRoadSensorPreset({ preset: 'control_unit', timestamp: Date.now() })}
                    title="Traffic Control Unit (TCU)"
                  >
                    TCU
                  </button>
                  <button
                    className="map-cam-btn"
                    onClick={() => setRoadSensorPreset({ preset: 'north_queue', timestamp: Date.now() })}
                    title="North Approach Queue"
                  >
                    Queue
                  </button>
                </div>
              ) : (
                <div className="map-quick-cam-pills">
                  <button
                    className={`map-cam-btn ${cameraMode === 'overview' ? 'active' : ''}`}
                    onClick={() => setCameraMode('overview')}
                    title="Drone Overview Perspective"
                  >
                    Drone
                  </button>
                  <button
                    className={`map-cam-btn ${cameraMode === 'road_level' ? 'active' : ''}`}
                    onClick={() => setCameraMode('road_level')}
                    title="Driver POV Ground Perspective"
                  >
                    POV
                  </button>
                  <button
                    className={`map-cam-btn ${cameraMode === 'top' ? 'active' : ''}`}
                    onClick={() => setCameraMode('top')}
                    title="Top-Down Orthographic View"
                  >
                    Top
                  </button>
                  {mainNavMode === 'build' && (
                    <button
                      className={`map-cam-btn ${cameraMode === 'flyover' ? 'active' : ''}`}
                      onClick={() => setCameraMode('flyover')}
                      title="Flyover Focus View"
                    >
                      Flyover
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="map-box-header__right">
              {mainNavMode === 'flow' && (
                <button
                  className="map-box-tool-btn"
                  onClick={() => setIsRoadSensorOpen(v => !v)}
                  title="Toggle Telemetry Overlay"
                >
                  {isRoadSensorOpen ? 'Hide Overlay' : 'Show Overlay'}
                </button>
              )}
              <button
                className="map-box-tool-btn"
                onClick={() => setIsMapExpanded(v => !v)}
                title={isMapExpanded ? "Return to Box View" : "Maximize Viewport"}
              >
                {isMapExpanded ? "❐ Box" : "⛶ Maximize"}
              </button>
            </div>
          </div>

          {/* Dedicated Route Toolbar in ROUTE mode */}
          {mainNavMode === 'route' && (
            <RouteToolbar
              locationName={realLocationData?.locationName}
              onSelectLocation={handleSelectLocation}
              onSelectDemoPlan={handleSelectDemoPlan}
              isSearching={isSearching}
              onMapLoaded={handleMapImported}
              isAnalyzing={isAnalyzing}
              layers={layers}
              onLayersChange={setLayers}
              hasAnalysis={!!analysisData}
              isAnalysisActive={isAnalysisActive}
              onAnalyze={handleRunAnalysis}
              onToggleAnalysisMode={() => setIsAnalysisActive(v => !v)}
              onToggleFindings={() => {
                if (isFindingsOpen) openSinglePanel('none');
                else openSinglePanel('findings');
              }}
              isFindingsOpen={isFindingsOpen}
              onToggleZones={() => {
                if (isZonesOpen) openSinglePanel('none');
                else openSinglePanel('zones');
              }}
              isZonesOpen={isZonesOpen}
              zonesCount={analysisData?.developmentZones?.length || 0}
              onTogglePlanning={handleTogglePlanning}
              isPlanningOpen={isPlanningOpen}
              onToggleForecast={handleToggleForecast}
              isForecastOpen={isForecastOpen}
              onToggleOptimization={handleToggleOptimization}
              isOptimizationOpen={isOptimizationOpen}
              onToggleTransformation={() => {
                if (isTransformationOpen) openSinglePanel('none');
                else openSinglePanel('transformation');
              }}
              isTransformationOpen={isTransformationOpen}
              hasSelectedPlanOrStrategy={!!(selectedStrategy || selectedPlan)}
              onToggleEvidence={() => {
                if (isEvidenceOpen) openSinglePanel('none');
                else openSinglePanel('evidence');
              }}
              isEvidenceOpen={isEvidenceOpen}
              dataQualityScore={analysisData?.summary.dataQualityScore}
            />
          )}

          {/* Canvas & Overlays within the Box */}
          <div className="map-box-canvas-viewport">
            <div className="app-canvas-container">
              <RoadScene
                progress={progress}
                isPlaying={isPlaying}
                onProgressChange={handleSlider}
                cameraMode={cameraMode}
                lightingMode={lightingMode}
                mode={mode}
                demoPlan={demoPlan}
                realLocationData={realLocationData}
                layers={layers}
                analysisData={isAnalysisActive ? analysisData : null}
                analysisFilter={analysisFilter}
                candidatePlan={selectedPlan}
                strategy={selectedStrategy}
                planningViewState={planningViewState}
                focusTarget={focusTarget}
                selectedRoad={selectedRoad}
                selectedIssue={selectedIssue}
                onSelectIssue={handleInspectIssue}
                onSelectRoad={handleInspectRoad}
                onSelectJunction={handleInspectJunction}
                transformationState={transformationState}
                transformationProgress={transformationProgress}
                transformationSpeed={transformationSpeed}
                transformationComparison={transformationComparison}
                transformationHorizon={transformationHorizon}
                forecastData={forecastData}
                isTransformationPlaying={isTransformationPlaying}
                onTransformationPhaseChange={handleTransformationPhaseChange}
                onTransformationComplete={handleTransformationComplete}
                onTransformationStateChange={handleTransformationStateChange}
                transformCameraPreset={transformCameraPreset}
                roadSensorPreset={roadSensorPreset}
                roadSensorTrigger={roadSensorTrigger}
                roadSensorAdaptiveMode={roadSensorAdaptiveMode}
                onRoadSensorTelemetry={setRoadSensorTelemetry}
              />
            </div>

            {/* Floating Minimal UI Overlays (Framed inside 3D Box) */}
            <div className="app-overlay-layer">

        {/* Minimal Loading Step Indicator */}
        <LoadingIndicator step={loadingStep} />

        {/* Civil Plan Visualization Switcher: 4-Lane Highway, Flyover, Ring Road (BUILD mode only) */}
        {mainNavMode === 'build' && (
          <PlanSelectionBar
            currentPlan={demoPlan}
            onSelectPlan={(plan) => {
              handleSelectDemoPlan(plan);
              handleReset();
            }}
            onOpenSpecs={() => setShowSpecsModal(true)}
            isDemoMode={true}
          />
        )}

        {/* Top-Left Status Panel: Real Location only (ROUTE mode only) */}
        {mainNavMode === 'route' && realLocationData && (
          <div className="floating-status-anchor">
            <RealLocationStatus
              data={realLocationData}
              onReturnToDemo={() => handleSelectNavMode('build')}
            />
          </div>
        )}

        {/* Bottom Timeline Scrubber (Active STRICTLY in BUILD Civil Plans) */}
        {mainNavMode === 'build' && (
          <div className="floating-timeline-anchor">
            <Timeline
              progress={progress}
              isPlaying={isPlaying}
              isFast={isFast}
              onProgressChange={handleSlider}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              onRewind={handleRewind}
              onToggleFast={handleToggleFast}
              scenario={SCENARIOS[demoPlan]}
            />
          </div>
        )}

        {/* Compact Analysis Summary Panel (Top-Right) */}
        {mode === 'real_location' && showSummaryPanel && analysisData && (
          <AnalysisSummaryPanel
            data={analysisData}
            isDrawerOpen={isFindingsOpen}
            onToggleDrawer={() => setIsFindingsOpen(v => !v)}
            onClose={() => setShowSummaryPanel(false)}
          />
        )}

        {/* Minimal Findings Drawer (Floating List of Problems) */}
        {mode === 'real_location' && isFindingsOpen && analysisData && (
          <FindingsDrawer
            issues={analysisData.issues}
            activeFilter={analysisFilter}
            onFilterChange={setAnalysisFilter}
            onInspectIssue={handleInspectIssue}
            selectedIssueId={selectedIssue?.id}
            onClose={() => setIsFindingsOpen(false)}
          />
        )}

        {/* Interactive Issue / Road / Junction Inspection Card */}
        {mode === 'real_location' && (selectedIssue || selectedRoad || selectedJunction) && (
          <IssueInspectionCard
            issue={selectedIssue}
            road={selectedRoad}
            junction={selectedJunction}
            onFocus={() => {
              if (selectedIssue) handleInspectIssue(selectedIssue);
              else if (selectedRoad) handleInspectRoad(selectedRoad);
              else if (selectedJunction) handleInspectJunction(selectedJunction);
            }}
            onClose={() => {
              setSelectedIssue(null);
              setSelectedRoad(null);
              setSelectedJunction(null);
            }}
          />
        )}

        {/* Phase 4 Infrastructure Planning Panel */}
        {mode === 'real_location' && isPlanningOpen && (
          <PlanningPanel
            planningData={planningData}
            selectedPlan={selectedPlan}
            planningPriority={planningPriority}
            planningViewState={planningViewState}
            isLoading={isGeneratingPlans}
            onSelectPlan={(plan) => setSelectedPlan(plan)}
            onChangePriority={handleChangePriority}
            onChangeViewState={setPlanningViewState}
            onRefreshPlans={() => handleGeneratePlans(planningPriority)}
            onClose={() => setIsPlanningOpen(false)}
          />
        )}

        {/* Phase 5 Future Demand Forecasting Panel */}
        {mode === 'real_location' && isForecastOpen && (
          <ForecastingPanel
            forecastData={forecastData}
            isLoading={isForecasting}
            activeYear={forecastYear}
            activeScenario={forecastScenario}
            onChangeYear={handleChangeForecastYear}
            onChangeScenario={handleChangeForecastScenario}
            onRefreshForecast={() => handleGenerateForecast(forecastYear, forecastScenario)}
            onClose={() => setIsForecastOpen(false)}
            onSelectBottleneck={handleSelectFutureBottleneck}
          />
        )}

        {/* Phase 6 Multi-Objective Strategy Optimization Panel */}
                {/* Phase 8 Development Zones Panel */}
        {mode === 'real_location' && isZonesOpen && analysisData?.developmentZones && (
          <DevelopmentZonesPanel
            zones={analysisData.developmentZones}
            placeName={realLocationData?.locationName || 'Selected Location'}
            wholePlacePlan={optimizationData?.whole_place_plan as any}
            selectedStrategy={selectedStrategy}
            onFocusZone={handleFocusZone}
            onClose={() => setIsZonesOpen(false)}
            onOpenEvidence={() => setIsEvidenceOpen(true)}
          />
        )}

        {mode === 'real_location' && isOptimizationOpen && (
          <OptimizationPanel
            optimizationData={optimizationData}
            isLoading={isOptimizing}
            activeMode={optimizationMode}
            selectedStrategy={selectedStrategy}
            onChangeMode={handleChangeOptimizationMode}
            onSelectStrategy={handleSelectStrategy}
            onRefreshOptimization={() => handleGenerateOptimization(optimizationMode)}
            onClose={() => setIsOptimizationOpen(false)}
            onOpenEvidence={() => setIsEvidenceOpen(true)}
          />
        )}

        {/* Phase 9 Engineering Evidence & Audit Panel */}
        {mode === 'real_location' && isEvidenceOpen && (
          <EngineeringEvidenceModal
            isOpen={isEvidenceOpen}
            onClose={() => setIsEvidenceOpen(false)}
            geoArea={realLocationData}
            analysisData={analysisData}
            candidatePlans={planningData?.candidates || []}
            selectedCandidateId={selectedPlan?.id || (selectedStrategy?.intervention_ids && selectedStrategy.intervention_ids[0])}
            optimizationData={optimizationData}
          />
        )}
        {/* Phase 7 Digital Twin Transformation Engine Panel */}
        {mode === 'real_location' && isTransformationOpen && (selectedStrategy || selectedPlan) && (
          <TransformationPanel
            currentState={transformationState}
            onStateChange={handleTransformationStateChange}
            strategy={selectedStrategy}
            plan={selectedPlan}
            forecast={forecastData}
            progress={transformationProgress}
            isPlaying={isTransformationPlaying}
            playSpeed={transformationSpeed}
            currentPhase={transformationPhase}
            futureHorizon={transformationHorizon}
            comparisonMode={transformationComparison}
            onPlay={handleTransformationPlay}
            onPause={handleTransformationPause}
            onReset={handleTransformationReset}
            onStepForward={handleTransformationStepForward}
            onStepBackward={handleTransformationStepBackward}
            onProgressScrub={setTransformationProgress}
            onSpeedChange={setTransformationSpeed}
            onHorizonChange={setTransformationHorizon}
            onComparisonChange={setTransformationComparison}
            onCameraPreset={(preset) => setTransformCameraPreset({ preset, timestamp: Date.now() })}
            onClose={() => setIsTransformationOpen(false)}
          />
        )}


        {/* Optional Compact Details Modal */}
        {showDetails && (
          <DetailsModal
            progress={progress}
            mode={mode}
            realLocationData={realLocationData}
            onClose={() => setShowDetails(false)}
          />
        )}

        {/* Civil Plan Engineering Specifications Modal */}
        {showSpecsModal && (
          <PlanSpecsModal
            currentPlan={demoPlan}
            onSelectPlan={(plan) => {
              handleSelectDemoPlan(plan);
              handleReset();
            }}
            onClose={() => setShowSpecsModal(false)}
          />
        )}

        {/* Smart Signal Junction & Piezoresistive Road Sensor Panel (FLOW mode only) */}
        {mainNavMode === 'flow' && isRoadSensorOpen && (
          <RoadSensorPanel
            isOpen={isRoadSensorOpen}
            onClose={() => {
              setIsRoadSensorOpen(false);
            }}
            telemetry={roadSensorTelemetry}
            onTriggerPress={(approach) => setRoadSensorTrigger({ approach, timestamp: Date.now() })}
            onFocusCamera={(preset) => setRoadSensorPreset({ preset, timestamp: Date.now() })}
            onToggleAdaptive={(enabled) => {
              setRoadSensorAdaptiveMode(enabled);
              setRoadSensorTelemetry(prev => ({ ...prev, adaptiveMode: enabled }));
            }}
          />
        )}

        {/* Minimal Hero Completion Badge (Demo Mode Only) */}
        {showHero && mode === 'demo' && (
          <div className="hero-completion-card">
            <span className="hero-completion-card__badge">INFRASTRUCTURE UPGRADE COMPLETE</span>
            <h2 className="hero-completion-card__title">
              {demoPlan === 'flyover'
                ? 'Elevated Flyover Viaduct Operational'
                : demoPlan === 'ring_road'
                ? 'Orbital Ring Road Bypass Operational'
                : '4-Lane Divided Carriageway Complete'}
            </h2>
            <p className="hero-completion-card__subtitle">
              {demoPlan === 'flyover'
                ? 'Dual-Level Grade Separation Complete (2026 — 2030)'
                : demoPlan === 'ring_road'
                ? 'Peripheral Bypass Logistics Beltway Active (2026 — 2030)'
                : 'Corridor Modernization Fulfilled (2026 — 2030)'}
            </p>
            <button

              className="neumorphic-btn neumorphic-btn--primary hero-completion-card__btn"
              onClick={handleReset}
            >
              <span>REPLAY SIMULATION</span>
            </button>
          </div>
        )}
            </div>
          </div>
        </div>
      </main>
      )}

      {/* ── Scroll-Down Project Information Website: Flow, Build, Route ── */}
      <ProjectInfoSection onScrollToTop={handleScrollToTop} />
    </div>
  );
}


