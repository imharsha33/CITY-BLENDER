import React, { useState } from 'react';
import type {
  ForecastResponse,
  FutureBottleneck,
  PlanScenarioPerformance,
  DevelopmentPressureArea,
} from '../../types/forecasting';

interface ForecastingPanelProps {
  forecastData: ForecastResponse | null;
  isLoading: boolean;
  activeYear: number;
  activeScenario: string;
  onChangeYear: (year: number) => void;
  onChangeScenario: (scenario: string) => void;
  onRefreshForecast: () => void;
  onClose: () => void;
  onSelectBottleneck?: (bn: FutureBottleneck) => void;
}

export const ForecastingPanel: React.FC<ForecastingPanelProps> = ({
  forecastData,
  isLoading,
  activeYear,
  activeScenario,
  onChangeYear,
  onChangeScenario,
  onRefreshForecast,
  onClose,
  onSelectBottleneck,
}) => {
  const [activeTab, setActiveTab] = useState<'bottlenecks' | 'plans' | 'pressure'>('bottlenecks');
  const [selectedBottleneckId, setSelectedBottleneckId] = useState<string | null>(null);

  if (!forecastData) {
    return (
      <div className="forecasting-panel forecasting-panel--empty">
        <div className="forecasting-panel__header">
          <div>
            <span className="panel-badge panel-badge--purple">PHASE 5 · FUTURE DEMAND FORECASTING</span>
            <h3 className="forecasting-title">SCENARIO-BASED DEMAND PREDICTION</h3>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close Forecasting">✕</button>
        </div>
        <div className="forecasting-loading-state">
          {isLoading ? (
            <>
              <div className="forecasting-spinner" />
              <p>Simulating future corridor demand and network bottlenecks...</p>
            </>
          ) : (
            <>
              <p>No forecast data loaded for active geographic area.</p>
              <button className="forecasting-btn-primary" onClick={onRefreshForecast}>
                Compute Future Scenarios
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const {
    baseline_year,
    forecast_years,
    available_scenarios,
    horizon_summaries,
    future_bottlenecks,
    development_pressure_areas,
    plan_performances,
    model_selected,
    model_selection_reason,
    data_provenance,
    disclaimer,
  } = forecastData;

  const currentSummary =
    horizon_summaries.find((s) => s.year === activeYear) ||
    horizon_summaries[0] || {
      total_demand: 0,
      demand_growth_pct: 0,
      network_avg_vc: 0,
      critical_bottlenecks_count: 0,
      watch_roads_count: 0,
    };

  const selectedBn = future_bottlenecks.find((b) => b.id === selectedBottleneckId) || future_bottlenecks[0];

  return (
    <div className="forecasting-panel">
      {/* Header */}
      <div className="forecasting-panel__header">
        <div>
          <div className="forecasting-header-meta">
            <span className="panel-badge panel-badge--purple">CIVIL SCENARIO FORECASTING</span>
            <span className="model-provenance-tag">MODEL: {model_selected}</span>
          </div>
          <h3 className="forecasting-title">FUTURE DEMAND & BOTTLENECK EVOLUTION</h3>
          <span className="forecasting-sub">
            HORIZON: {activeYear} (BASELINE {baseline_year}) · SCENARIO: {activeScenario.toUpperCase().replace(/_/g, ' ')}
          </span>
        </div>
        <button className="panel-close-btn" onClick={onClose} title="Close Forecasting">✕</button>
      </div>

      {/* Horizon (Year) Selector */}
      <div className="forecasting-horizon-bar">
        <span className="forecasting-bar-label">PLANNING HORIZON:</span>
        <div className="horizon-pills">
          {forecast_years.map((yr) => (
            <button
              key={yr}
              className={`horizon-pill ${activeYear === yr ? 'horizon-pill--active' : ''}`}
              onClick={() => onChangeYear(yr)}
            >
              HORIZON {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="forecasting-scenario-bar">
        <span className="forecasting-bar-label">GROWTH SCENARIO:</span>
        <div className="scenario-pills">
          {available_scenarios.map((sc) => (
            <button
              key={sc.id}
              className={`scenario-pill ${activeScenario === sc.id ? 'scenario-pill--active' : ''}`}
              onClick={() => onChangeScenario(sc.id)}
              title={sc.description}
            >
              {sc.name.split('(')[0].trim()} ({round(sc.annual_growth_rate * 100, 1)}%/yr)
            </button>
          ))}
        </div>
      </div>

      {/* Macro Network Impact KPI Strip */}
      <div className="forecasting-kpi-strip">
        <div className="kpi-cell">
          <span className="kpi-label">NETWORK DEMAND GROWTH</span>
          <span className="kpi-val kpi-val--amber">+{currentSummary.demand_growth_pct}%</span>
          <span className="kpi-sub">Total trips: {Math.round(currentSummary.total_demand).toLocaleString()}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">PROJECTED NETWORK AVG V/C</span>
          <span className={`kpi-val ${currentSummary.network_avg_vc >= 1.0 ? 'kpi-val--red' : 'kpi-val--blue'}`}>
            {currentSummary.network_avg_vc}
          </span>
          <span className="kpi-sub">Threshold: 1.00 saturated</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">FUTURE CAPACITY BREACHES</span>
          <span className="kpi-val kpi-val--red">{currentSummary.critical_bottlenecks_count} Corridors</span>
          <span className="kpi-sub">V/C ≥ 1.00 in {activeYear}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">RECOMMENDED INTERVENTION</span>
          <span className="kpi-val kpi-val--green">
            {currentSummary.recommended_plan_name ? currentSummary.recommended_plan_name.split('(')[0] : 'Relief Plan'}
          </span>
          <span className="kpi-sub">{currentSummary.recommended_plan_reason || 'Maintains network throughput'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="forecasting-tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'bottlenecks' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bottlenecks')}
        >
          FUTURE BOTTLENECKS ({future_bottlenecks.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'plans' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          PHASE 4 PLAN RESILIENCE ({plan_performances.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pressure' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('pressure')}
        >
          URBAN DEVELOPMENT PRESSURE ({development_pressure_areas.length})
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="forecasting-tab-content">
        {/* Tab 1: Future Bottlenecks */}
        {activeTab === 'bottlenecks' && (
          <div className="bottlenecks-split-view">
            <div className="bottlenecks-list-pane">
              <span className="pane-section-label">OVERLOADED CORRIDORS (SORTED BY V/C)</span>
              <div className="bottlenecks-scroll">
                {future_bottlenecks.length === 0 ? (
                  <div className="empty-notice">No severe bottlenecks projected under this horizon scenario.</div>
                ) : (
                  future_bottlenecks.map((bn) => {
                    const isSelected = selectedBn?.id === bn.id;
                    return (
                      <div
                        key={bn.id}
                        className={`future-bn-card ${isSelected ? 'future-bn-card--selected' : ''}`}
                        onClick={() => {
                          setSelectedBottleneckId(bn.id);
                          if (onSelectBottleneck) onSelectBottleneck(bn);
                        }}
                      >
                        <div className="future-bn-card__top">
                          <span className={`severity-tag severity-tag--${bn.severity.toLowerCase()}`}>
                            {bn.severity}
                          </span>
                          <span className="future-bn-vc">
                            Baseline: {bn.current_vc} → <strong>{bn.forecast_vc}</strong>
                          </span>
                        </div>
                        <div className="future-bn-card__name">{bn.road_name}</div>
                        <div className="future-bn-card__rec">
                          Recommended: {bn.recommended_intervention_type.replace(/_/g, ' ')}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Bottleneck Details */}
            {selectedBn && (
              <div className="bottleneck-detail-pane">
                <span className="pane-section-label">CORRIDOR PROJECTION & RISK RATIONALE</span>
                <h4 className="detail-bn-name">{selectedBn.road_name}</h4>
                <div className="detail-bn-meta-row">
                  <span className="meta-pill">HORIZON: {selectedBn.year}</span>
                  <span className="meta-pill">CURRENT V/C: {selectedBn.current_vc}</span>
                  <span className="meta-pill meta-pill--danger">FORECAST V/C: {selectedBn.forecast_vc}</span>
                  <span className="meta-pill">CONFIDENCE: {selectedBn.confidence}</span>
                </div>

                <div className="detail-section">
                  <span className="detail-section-title">ENGINEERING EVIDENCE</span>
                  <ul className="detail-explanation-list">
                    {selectedBn.evidence.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>

                <div className="detail-card detail-card--intervention">
                  <span className="detail-card-label">PHASE 4 RECOMMENDED INFRASTRUCTURE RESPONSE</span>
                  <p>
                    <strong>{selectedBn.recommended_intervention_type.replace(/_/g, ' ')}:</strong>{' '}
                    Prioritize Phase 4 candidate interventions addressing this corridor before year {selectedBn.year}{' '}
                    to avoid acute system gridlock.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Plan Resilience under Future Conditions */}
        {activeTab === 'plans' && (
          <div className="plans-future-view">
            <div className="plans-future-intro">
              <p>
                Simulated performance of Phase 4 proposed interventions against projected {activeYear} demand under{' '}
                <strong>{activeScenario.replace(/_/g, ' ')}</strong> conditions:
              </p>
            </div>
            <div className="plans-future-grid">
              {plan_performances.map((perf) => (
                <div key={perf.plan_id} className="plan-perf-card">
                  <div className="plan-perf-card__top">
                    <span className="plan-perf-type">{perf.intervention_type.replace(/_/g, ' ')}</span>
                    <span className={`plan-resilience-badge ${perf.is_effective ? 'badge-effective' : 'badge-strained'}`}>
                      {perf.is_effective ? 'RESILIENT' : 'STRAINED'}
                    </span>
                  </div>
                  <h4 className="plan-perf-name">{perf.plan_name}</h4>
                  <div className="plan-perf-kpis">
                    <div className="perf-kpi-box">
                      <span className="perf-kpi-lbl">V/C Reduction</span>
                      <span className="perf-kpi-val">-{perf.vc_reduction_pct}%</span>
                    </div>
                    <div className="perf-kpi-box">
                      <span className="perf-kpi-lbl">Network V/C in {activeYear}</span>
                      <span className="perf-kpi-val">{perf.post_intervention_avg_vc}</span>
                    </div>
                    <div className="perf-kpi-box">
                      <span className="perf-kpi-lbl">Bottlenecks Cleared</span>
                      <span className="perf-kpi-val">{perf.bottlenecks_resolved_count}</span>
                    </div>
                    <div className="perf-kpi-box">
                      <span className="perf-kpi-lbl">Effective Horizon</span>
                      <span className="perf-kpi-val">~{perf.effective_planning_horizon}</span>
                    </div>
                  </div>
                  <div className="plan-perf-status-desc">{perf.status_label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Urban Development Pressure */}
        {activeTab === 'pressure' && (
          <div className="pressure-view">
            <div className="pressure-grid">
              {development_pressure_areas.map((area) => (
                <div key={area.area_id} className="pressure-card">
                  <div className="pressure-card__top">
                    <span className={`pressure-tag pressure-tag--${area.pressure_level.toLowerCase()}`}>
                      {area.pressure_level} PRESSURE
                    </span>
                    <span className="density-tag">{area.building_density_sqkm} bldgs/km²</span>
                  </div>
                  <h4 className="pressure-area-name">{area.name}</h4>
                  <p className="pressure-expl">{area.explanation}</p>
                  <div className="pressure-indicators">
                    <span className="indicator-label">KEY INDICATORS:</span>
                    <ul>
                      {area.indicators.map((ind, i) => (
                        <li key={i}>• {ind}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model Selection Note & Statutory Disclaimer */}
      <div className="forecasting-disclaimer-bar">
        <div className="model-selection-note">
          <strong>MODEL REASONING:</strong> {model_selection_reason}
        </div>
        <p className="disclaimer-text">{disclaimer}</p>
      </div>
    </div>
  );
};

function round(val: number, decimals: number): number {
  return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
}
