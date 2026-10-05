import React, { useState } from 'react';
import type {
  OptimizationResponse,
  InfrastructureStrategy,
  OptimizationMode,
} from '../../types/optimization';

interface OptimizationPanelProps {
  optimizationData: OptimizationResponse | null;
  isLoading: boolean;
  activeMode: OptimizationMode;
  selectedStrategy: InfrastructureStrategy | null;
  onChangeMode: (mode: OptimizationMode) => void;
  onSelectStrategy: (strat: InfrastructureStrategy) => void;
  onRefreshOptimization: () => void;
  onClose: () => void;
  onOpenEvidence?: () => void;
}

const MODES: { id: OptimizationMode; label: string; desc: string }[] = [
  { id: 'balanced', label: 'Balanced Strategy', desc: 'Holistic multi-objective optimization across all 13 criteria' },
  { id: 'traffic_reduction', label: 'Max Traffic Relief', desc: 'Prioritizes maximum bottleneck reduction & capacity relief' },
  { id: 'min_cost', label: 'Min Capital Cost', desc: 'Strictly constrains capital expenditure & financial exposure' },
  { id: 'min_land_acquisition', label: 'Min Land Take', desc: 'Avoids private property acquisition & building demolition' },
  { id: 'max_resilience', label: 'Max Future Resilience', desc: 'Prioritizes long-term service life across high-growth horizons' },
  { id: 'min_disruption', label: 'Min Disruption', desc: 'Minimizes work-zone impact & detour congestion' },
  { id: 'max_safety', label: 'Max Safety', desc: 'Focuses on grade separation & hazardous conflict elimination' },
  { id: 'environmental_priority', label: 'Eco Priority', desc: 'Strict preservation of water bodies & ecological buffers' },
];

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  optimizationData,
  isLoading,
  activeMode,
  selectedStrategy,
  onChangeMode,
  onSelectStrategy,
  onRefreshOptimization,
  onClose,
  onOpenEvidence,
}) => {
  const [activeTab, setActiveTab] = useState<'strategies' | 'matrix' | 'rejections'>('strategies');

  if (!optimizationData) {
    return (
      <div className="optimization-panel optimization-panel--empty">
        <div className="optimization-panel__header">
          <div>
            <span className="panel-badge panel-badge--gold">PHASE 6 · STRATEGY OPTIMIZATION</span>
            <h3 className="optimization-title">MULTI-OBJECTIVE STRATEGY OPTIMIZER</h3>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close Optimizer">✕</button>
        </div>
        <div className="optimization-loading-state">
          {isLoading ? (
            <>
              <div className="optimization-spinner" />
              <p>Optimizing multi-project intervention packages across scenarios...</p>
            </>
          ) : (
            <>
              <p>No optimized strategy packages evaluated yet for this area.</p>
              <button className="optimization-btn-primary" onClick={onRefreshOptimization}>
                Synthesize & Optimize Strategies
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const {
    all_strategies,
    pareto_strategies,
    recommended_strategy,
    why_recommended,
    why_not_alternatives,
    mode_description,
    total_strategies_evaluated,
    disclaimer,
  } = optimizationData;

  const activeStrat = selectedStrategy || recommended_strategy || all_strategies[0];

  return (
    <div className="optimization-panel">
      {/* Header */}
      <div className="optimization-panel__header">
        <div>
          <div className="optimization-header-meta">
            <span className="panel-badge panel-badge--gold">CIVIL STRATEGY OPTIMIZER</span>
            <span className="optimizer-provenance-tag">PARETO-OPTIMAL COMBINATIONS</span>
          </div>
          <h3 className="optimization-title">MULTI-OBJECTIVE INFRASTRUCTURE STRATEGY</h3>
          <span className="optimization-sub">
            MODE: {activeMode.toUpperCase().replace(/_/g, ' ')} · {total_strategies_evaluated} COMBINATIONS EVALUATED · {pareto_strategies.length} PARETO-OPTIMAL
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onOpenEvidence && (
            <button
              className="neumorphic-btn neumorphic-btn--sm"
              style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', fontSize: '11px', padding: '4px 10px' }}
              onClick={onOpenEvidence}
              title="Open Engineering Evidence & Feasibility Workstation"
            >
              🔬 VIEW EVIDENCE
            </button>
          )}
          <button className="panel-close-btn" onClick={onClose} title="Close Optimizer">✕</button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="optimization-mode-bar">
        <span className="optimization-bar-label">OPTIMIZATION OBJECTIVE:</span>
        <div className="optimization-mode-pills">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`opt-mode-pill ${activeMode === m.id ? 'opt-mode-pill--active' : ''}`}
              onClick={() => onChangeMode(m.id)}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Description Banner */}
      <div className="optimization-banner">
        <span className="banner-icon">⚡</span>
        <span className="banner-text">{mode_description}</span>
      </div>

      {/* Tabs */}
      <div className="optimization-tabs-bar">
        <button
          className={`opt-tab-btn ${activeTab === 'strategies' ? 'opt-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('strategies')}
        >
          STRATEGY PACKAGES ({all_strategies.length})
        </button>
        <button
          className={`opt-tab-btn ${activeTab === 'matrix' ? 'opt-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          SCENARIO ROBUSTNESS MATRIX
        </button>
        <button
          className={`opt-tab-btn ${activeTab === 'rejections' ? 'opt-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('rejections')}
        >
          TRADE-OFFS & WHY NOT OTHERS
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="optimization-content-layout">
        {/* Tab 1: Strategies List & Deep Inspection */}
        {activeTab === 'strategies' && (
          <div className="strategies-split-view">
            {/* List */}
            <div className="strategies-list-pane">
              <span className="pane-section-label">RANKED STRATEGY PACKAGES</span>
              <div className="strategies-scroll">
                {all_strategies.map((strat) => {
                  const isSelected = activeStrat?.id === strat.id;
                  const isRecommended = recommended_strategy?.id === strat.id;

                  return (
                    <div
                      key={strat.id}
                      className={`strategy-card ${isSelected ? 'strategy-card--selected' : ''} ${
                        isRecommended ? 'strategy-card--recommended' : ''
                      }`}
                      onClick={() => onSelectStrategy(strat)}
                    >
                      <div className="strategy-card__top">
                        <div className="strategy-badges">
                          {isRecommended && <span className="badge-best-package">★ BEST STRATEGY</span>}
                          {strat.is_pareto_optimal && <span className="badge-pareto">◈ PARETO FRONT</span>}
                          <span className={`badge-feasibility badge-feasibility--${strat.feasibility.toLowerCase()}`}>
                            {strat.feasibility}
                          </span>
                        </div>
                        <div className="strategy-card__score">
                          <span className="score-val">{Math.round(strat.overall_score)}</span>
                          <span className="score-sub">/ 100</span>
                        </div>
                      </div>

                      <div className="strategy-card__name">{strat.name}</div>

                      <div className="strategy-card__interventions">
                        {strat.intervention_names.map((name, i) => (
                          <span key={i} className="intervention-chip">
                            {name.split('(')[0].trim()}
                          </span>
                        ))}
                      </div>

                      <div className="strategy-card__footer">
                        <span>Horizon: ~{strat.effective_planning_horizon}</span>
                        <span>Robustness: {strat.robustness_score}%</span>
                        <span>Cost: {strat.cost_category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inspection */}
            {activeStrat && (
              <div className="strategy-detail-pane">
                <div className="detail-strategy-header">
                  <div className="detail-header-tags">
                    {activeStrat.id === recommended_strategy?.id && (
                      <span className="badge-best-package">★ RECOMMENDED OVERALL STRATEGY</span>
                    )}
                    {activeStrat.is_pareto_optimal && (
                      <span className="badge-pareto">◈ NON-DOMINATED PARETO OPTIMAL</span>
                    )}
                    <span className="meta-pill">EFFECTIVE HORIZON: ~{activeStrat.effective_planning_horizon}</span>
                    <span className="meta-pill">ROBUSTNESS: {activeStrat.robustness_score}/100</span>
                  </div>
                  <h3 className="detail-strat-title">{activeStrat.name}</h3>
                  <p className="detail-compat-reason">{activeStrat.compatibility_reason}</p>
                </div>

                {/* Why Recommended Reasons */}
                {activeStrat.id === recommended_strategy?.id && why_recommended.length > 0 && (
                  <div className="detail-section">
                    <span className="detail-section-title">CIVIL ENGINEERING JUSTIFICATION</span>
                    <div className="detail-text-box detail-text-box--gold">
                      <ul>
                        {why_recommended.map((reason, i) => (
                          <li key={i}>✓ {reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 13 Objectives Vector Grid */}
                <div className="detail-section">
                  <span className="detail-section-title">13-OBJECTIVE PERFORMANCE VECTOR (0–100 NORMALIZED)</span>
                  <div className="objectives-grid">
                    <div className="obj-cell">
                      <span className="obj-lbl">Traffic Relief</span>
                      <span className="obj-val">{activeStrat.objective_scores.traffic_improvement}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Future Capacity</span>
                      <span className="obj-val">{activeStrat.objective_scores.future_capacity}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Resilience</span>
                      <span className="obj-val">{activeStrat.objective_scores.future_resilience}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Connectivity</span>
                      <span className="obj-val">{activeStrat.objective_scores.connectivity}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Safety Gain</span>
                      <span className="obj-val">{activeStrat.objective_scores.safety}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Land Preserved</span>
                      <span className="obj-val">{activeStrat.objective_scores.land_impact}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Building Preserved</span>
                      <span className="obj-val">{activeStrat.objective_scores.building_impact}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Eco Compatibility</span>
                      <span className="obj-val">{activeStrat.objective_scores.environmental_impact}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Disruption Avoided</span>
                      <span className="obj-val">{activeStrat.objective_scores.disruption}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Cost Economy</span>
                      <span className="obj-val">{activeStrat.objective_scores.cost_score}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Emergency Access</span>
                      <span className="obj-val">{activeStrat.objective_scores.emergency_access}</span>
                    </div>
                    <div className="obj-cell">
                      <span className="obj-lbl">Data Confidence</span>
                      <span className="obj-val">{activeStrat.objective_scores.confidence}</span>
                    </div>
                  </div>
                </div>

                {/* Key Tradeoffs */}
                <div className="detail-section">
                  <span className="detail-section-title">KEY STRATEGIC TRADEOFFS</span>
                  <div className="detail-tradeoffs-box">
                    <ul>
                      {activeStrat.key_tradeoffs.map((t, i) => (
                        <li key={i}>⚠ {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scenario Matrix */}
        {activeTab === 'matrix' && (
          <div className="matrix-view">
            <div className="matrix-intro">
              <p>
                Multi-scenario performance matrix comparing all candidate strategies across Low, Moderate, High, and
                Rapid Development growth assumptions:
              </p>
            </div>
            <div className="matrix-table-wrap">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>STRATEGY PACKAGE</th>
                    <th>LOW GROWTH</th>
                    <th>MODERATE GROWTH</th>
                    <th>HIGH GROWTH</th>
                    <th>RAPID DEVELOPMENT</th>
                    <th>ROBUSTNESS</th>
                    <th>EFFECTIVE HORIZON</th>
                  </tr>
                </thead>
                <tbody>
                  {all_strategies.map((strat) => {
                    const isRec = strat.id === recommended_strategy?.id;
                    const low = strat.scenario_matrix.find((s) => s.scenario_id === 'low_growth')?.score ?? 0;
                    const mod = strat.scenario_matrix.find((s) => s.scenario_id === 'moderate_growth')?.score ?? 0;
                    const high = strat.scenario_matrix.find((s) => s.scenario_id === 'high_growth')?.score ?? 0;
                    const rapid = strat.scenario_matrix.find((s) => s.scenario_id === 'rapid_development')?.score ?? 0;

                    return (
                      <tr
                        key={strat.id}
                        className={isRec ? 'row-recommended' : ''}
                        onClick={() => onSelectStrategy(strat)}
                      >
                        <td className="strategy-name-cell">
                          {isRec && <span className="rec-star">★ </span>}
                          {strat.name}
                        </td>
                        <td className="cell-score">{low}</td>
                        <td className="cell-score">{mod}</td>
                        <td className="cell-score">{high}</td>
                        <td className="cell-score">{rapid}</td>
                        <td className="cell-robustness">{strat.robustness_score}%</td>
                        <td className="cell-horizon">~{strat.effective_planning_horizon}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Rejections & Tradeoffs */}
        {activeTab === 'rejections' && (
          <div className="rejections-view">
            <div className="rejections-intro">
              <p>
                Transparent justification of why alternative strategy packages were rejected in favor of the recommended
                strategy:
              </p>
            </div>
            <div className="rejections-grid">
              {all_strategies
                .filter((s) => s.id !== recommended_strategy?.id)
                .map((strat) => {
                  const reasons = why_not_alternatives[strat.id] || strat.rejection_reasons || [];
                  return (
                    <div key={strat.id} className="rejection-card">
                      <div className="rejection-card__header">
                        <span className="rejection-card__title">WHY NOT {strat.name.toUpperCase()}?</span>
                        <span className="rejection-score">Score: {strat.overall_score}</span>
                      </div>
                      <ul className="rejection-reasons-list">
                        {reasons.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="optimization-disclaimer-bar">
        <span className="disclaimer-badge">STATUTORY DISCLAIMER</span>
        <p className="disclaimer-text">{disclaimer}</p>
      </div>
    </div>
  );
};
