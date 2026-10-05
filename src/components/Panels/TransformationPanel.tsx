import React from 'react';
import type {
  TransformationState,
  ComparisonMode,
  ConstructionPhaseDefinition,
} from '../../types/transformation';
import { CONSTRUCTION_PHASES } from '../../types/transformation';
import type { InfrastructureStrategy } from '../../types/optimization';
import type { CandidatePlan } from '../../types/planning';
import type { ForecastResponse } from '../../types/forecasting';
import './TransformationPanel.css';

interface TransformationPanelProps {
  currentState: TransformationState;
  onStateChange: (state: TransformationState) => void;
  strategy: InfrastructureStrategy | null;
  plan: CandidatePlan | null;
  forecast: ForecastResponse | null;
  progress: number;
  isPlaying: boolean;
  playSpeed: number;
  currentPhase: ConstructionPhaseDefinition;
  futureHorizon: number;
  comparisonMode: ComparisonMode;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onProgressScrub: (p: number) => void;
  onSpeedChange: (speed: number) => void;
  onHorizonChange: (year: number) => void;
  onComparisonChange: (mode: ComparisonMode) => void;
  onCameraPreset: (preset: 'whole_city' | 'corridor' | 'intervention' | 'street' | 'cinematic') => void;
  onClose: () => void;
}

export const TransformationPanel: React.FC<TransformationPanelProps> = ({
  currentState,
  onStateChange,
  strategy,
  plan,
  forecast,
  progress,
  isPlaying,
  playSpeed,
  currentPhase,
  futureHorizon,
  comparisonMode,
  onPlay,
  onPause,
  onReset,
  onStepForward,
  onStepBackward,
  onProgressScrub,
  onSpeedChange,
  onHorizonChange,
  onComparisonChange,
  onCameraPreset,
  onClose,
}) => {
  const strategyName =
    strategy?.name ||
    plan?.name ||
    'Standard Corridor Modernization';

  const whyRecommended =
    (strategy?.key_tradeoffs?.[0]
      ? `Strategy optimized across objectives. Key trade-off: ${strategy.key_tradeoffs[0]}`
      : null) ||
    (Array.isArray(plan?.explanation) ? plan.explanation[0] : plan?.explanation) ||
    'Upgrades corridor geometry and relieves critical network bottlenecks while maintaining network redundancy.';

  const isNoMajor =
    (strategy?.intervention_ids || []).includes('plan-no-major-intervention') ||
    plan?.id === 'plan-no-major-intervention';

  const progressPercent = Math.round(progress * 100);

  return (
    <div className="transform-panel-root">
      {/* Header */}
      <div className="transform-panel__header">
        <div className="transform-panel__title-box">
          <span className="transform-panel__badge">PHASE 7 INTEGRATION</span>
          <h2 className="transform-panel__title">DIGITAL TWIN TRANSFORMATION</h2>
          <span className="transform-panel__subtitle">Continuous Planning → Construction Engine</span>
        </div>
        <button
          className="transform-panel__close-btn"
          onClick={onClose}
          title="Minimize Transformation Engine"
        >
          ✕
        </button>
      </div>

      <div className="transform-panel__body">
        {/* 1. Transformation State Machine Selector */}
        <div className="transform-section">
          <label className="transform-label">TRANSFORMATION STATE PIPELINE</label>
          <div className="transform-state-buttons">
            {(['EXISTING', 'ANALYSIS', 'PROPOSED', 'CONSTRUCTION', 'COMPLETED', 'FUTURE'] as TransformationState[]).map(st => {
              const active = currentState === st;
              return (
                <button
                  key={st}
                  className={`transform-state-btn ${active ? 'transform-state-btn--active' : ''}`}
                  onClick={() => onStateChange(st)}
                >
                  <span className="transform-state-btn__indicator" />
                  <span className="transform-state-btn__text">{st}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Selected Strategy Information */}
        <div className="transform-section transform-strategy-card">
          <div className="transform-strategy-header">
            <span className="transform-strategy-tag">
              {isNoMajor ? 'MONITORING STRATEGY' : 'SELECTED OPTIMIZED STRATEGY'}
            </span>
            <span className="transform-strategy-horizon">Horizon ~{futureHorizon}</span>
          </div>
          <h3 className="transform-strategy-title">{strategyName}</h3>
          <p className="transform-strategy-why">{whyRecommended}</p>

          <div className="transform-metrics-grid">
            <div className="transform-metric-item">
              <span className="transform-metric-k">TRAFFIC RELIEF</span>
              <span className="transform-metric-v" style={{ color: '#10b981' }}>
                {isNoMajor ? 'Baseline' : 'High (~42% V/C drop)'}
              </span>
            </div>
            <div className="transform-metric-item">
              <span className="transform-metric-k">CONNECTIVITY</span>
              <span className="transform-metric-v" style={{ color: '#38bdf8' }}>
                {isNoMajor ? 'Preserved' : 'Enhanced Redundancy'}
              </span>
            </div>
            <div className="transform-metric-item">
              <span className="transform-metric-k">LAND IMPACT</span>
              <span className="transform-metric-v">
                {isNoMajor ? 'None' : 'Moderate Corridor ROW'}
              </span>
            </div>
            <div className="transform-metric-item">
              <span className="transform-metric-k">DATA CONFIDENCE</span>
              <span className="transform-metric-v" style={{ color: '#f59e0b' }}>Medium (GIS Model)</span>
            </div>
          </div>
        </div>

        {/* 3. Before / After Comparison Controls */}
        <div className="transform-section">
          <div className="transform-section-header-row">
            <label className="transform-label">INFRASTRUCTURE COMPARISON</label>
            <span className="transform-meta-tag">Real Location In-Situ</span>
          </div>
          <div className="transform-compare-group">
            <button
              className={`transform-compare-btn ${comparisonMode === 'EXISTING' ? 'transform-compare-btn--active' : ''}`}
              onClick={() => onComparisonChange('EXISTING')}
            >
              EXISTING NETWORK
            </button>
            <button
              className={`transform-compare-btn ${comparisonMode === 'PROPOSED' ? 'transform-compare-btn--active' : ''}`}
              onClick={() => onComparisonChange('PROPOSED')}
            >
              PROPOSED DESIGN
            </button>
            <button
              className={`transform-compare-btn ${comparisonMode === 'COMPARE' ? 'transform-compare-btn--active' : ''}`}
              onClick={() => onComparisonChange('COMPARE')}
            >
              SIDE-BY-SIDE COMPARE
            </button>
          </div>
        </div>

        {/* 4. 13-Stage Construction Visualization Engine */}
        <div className="transform-section transform-construction-box">
          <div className="transform-section-header-row">
            <label className="transform-label">CONSTRUCTION TRANSFORMATION ENGINE</label>
            <span className="transform-phase-step-badge">
              {isNoMajor ? 'MONITORING' : `STAGE ${currentPhase.step} / ${CONSTRUCTION_PHASES.length}`}
            </span>
          </div>

          <div className="transform-phase-detail">
            <div className="transform-phase-name-row">
              <span className="transform-phase-title">
                {isNoMajor ? 'SURFACE MONITORING & MAINTENANCE' : currentPhase.name}
              </span>
              <span className="transform-phase-pct">{progressPercent}%</span>
            </div>
            <p className="transform-phase-desc">
              {isNoMajor
                ? 'No heavy construction justified. Routine surface rehabilitation, sensor nodes, and adaptive flow monitoring active.'
                : currentPhase.action}
            </p>
            {!isNoMajor && currentPhase.equipment && (
              <div className="transform-equipment-list">
                <span className="transform-equipment-label">Active:</span>
                {currentPhase.equipment.map((eq, i) => (
                  <span key={i} className="transform-equipment-chip">{eq}</span>
                ))}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="transform-progress-bar-wrap">
            <div
              className="transform-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrubber slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={progress}
            onChange={e => onProgressScrub(parseFloat(e.target.value))}
            className="transform-scrubber"
          />

          {/* Playback Button Group */}
          <div className="transform-playback-controls">
            <button
              className="transform-ctrl-btn"
              onClick={onStepBackward}
              title="Step Backward (Previous Phase)"
            >
              ◀
            </button>
            <button
              className="transform-ctrl-btn transform-ctrl-btn--primary"
              onClick={isPlaying ? onPause : onPlay}
              title={isPlaying ? 'Pause Construction' : 'Play Construction Sequence'}
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY TRANSFORMATION'}
            </button>
            <button
              className="transform-ctrl-btn"
              onClick={onStepForward}
              title="Step Forward (Next Phase)"
            >
              ▶
            </button>
            <button
              className="transform-ctrl-btn"
              onClick={onReset}
              title="Reset to Survey Phase"
            >
              ↺
            </button>

            {/* Speeds */}
            <div className="transform-speed-selector">
              {[0.25, 0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  className={`transform-speed-btn ${playSpeed === s ? 'transform-speed-btn--active' : ''}`}
                  onClick={() => onSpeedChange(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Future Planning Horizon Selector */}
        <div className="transform-section">
          <div className="transform-section-header-row">
            <label className="transform-label">FUTURE PLANNING HORIZON</label>
            <span className="transform-meta-tag">Phase 5 Forecast Overlay</span>
          </div>
          <div className="transform-horizon-group">
            {[2030, 2035, 2040].map(yr => (
              <button
                key={yr}
                className={`transform-horizon-btn ${futureHorizon === yr ? 'transform-horizon-btn--active' : ''}`}
                onClick={() => onHorizonChange(yr)}
              >
                <span>{yr}</span>
                <span className="transform-horizon-sub">
                  {yr === 2030 ? '+4y Growth' : yr === 2035 ? '+9y Medium' : '+14y Long-term'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 6. Cinematic & GIS Camera Presets */}
        <div className="transform-section">
          <label className="transform-label">ENGINEERING CAMERA PRESETS</label>
          <div className="transform-cam-grid">
            <button
              className="transform-cam-btn"
              onClick={() => onCameraPreset('whole_city')}
              title="Whole City GIS Extent"
            >
              WHOLE CITY
            </button>
            <button
              className="transform-cam-btn"
              onClick={() => onCameraPreset('corridor')}
              title="Focus Affected Road Corridor"
            >
              CORRIDOR
            </button>
            <button
              className="transform-cam-btn"
              onClick={() => onCameraPreset('intervention')}
              title="Focus Specific Intervention Structure"
            >
              INTERVENTION
            </button>
            <button
              className="transform-cam-btn"
              onClick={() => onCameraPreset('street')}
              title="Road-level Driver Perspective"
            >
              DRIVER VIEW
            </button>
            <button
              className="transform-cam-btn"
              onClick={() => onCameraPreset('cinematic')}
              title="Cinematic Orbit Inspection"
            >
              CINEMATIC
            </button>
          </div>
        </div>

        {/* 7. Engineering Notice & Legal Disclaimer */}
        <div className="transform-disclaimer-box">
          <div className="transform-disclaimer-icon">⚠️</div>
          <p className="transform-disclaimer-text">
            <strong>PLANNING-LEVEL CONCEPTUAL VISUALIZATION:</strong> RoadVision outputs are
            indicative infrastructure concepts intended for GIS planning and alternative comparison.
            They are not construction-ready engineering blueprints. Detailed field topographic surveys,
            geotechnical investigation, utility clearance, and environmental impact assessments are required
            prior to physical execution.
          </p>
        </div>
      </div>
    </div>
  );
};
