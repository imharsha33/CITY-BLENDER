import React from 'react';
import type {
  PlanningResponse,
  CandidatePlan,
  PlanningPriority,
  PlanningViewState,
} from '../../types/planning';

interface PlanningPanelProps {
  planningData: PlanningResponse | null;
  selectedPlan: CandidatePlan | null;
  planningPriority: PlanningPriority;
  planningViewState: PlanningViewState;
  isLoading: boolean;
  onSelectPlan: (plan: CandidatePlan) => void;
  onChangePriority: (priority: PlanningPriority) => void;
  onChangeViewState: (state: PlanningViewState) => void;
  onRefreshPlans: () => void;
  onClose: () => void;
}

const PRIORITIES: { id: PlanningPriority; label: string; desc: string }[] = [
  { id: 'balanced', label: 'Balanced', desc: 'Holistic multi-criteria optimization' },
  { id: 'traffic_reduction', label: 'Max Traffic Relief', desc: 'Prioritizes bottleneck reduction and v/c improvement' },
  { id: 'min_land_acquisition', label: 'Min Land Take', desc: 'Avoids building and environmental acquisition' },
  { id: 'min_cost', label: 'Min Cost', desc: 'Prioritizes low capex & operational solutions' },
  { id: 'max_capacity', label: 'Max Future Capacity', desc: 'Maximizes corridor throughput & future resilience' },
  { id: 'min_disruption', label: 'Min Disruption', desc: 'Minimizes work-zone impact & detour delays' },
];

export const PlanningPanel: React.FC<PlanningPanelProps> = ({
  planningData,
  selectedPlan,
  planningPriority,
  planningViewState,
  isLoading,
  onSelectPlan,
  onChangePriority,
  onChangeViewState,
  onRefreshPlans,
  onClose,
}) => {
  if (!planningData) {
    return (
      <div className="planning-panel planning-panel--empty">
        <div className="planning-panel__header">
          <div>
            <span className="panel-badge">PHASE 4 · INFRASTRUCTURE PLANNING</span>
            <h3 className="planning-title">CIVIL INTERVENTION PLANS</h3>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close Planning">✕</button>
        </div>
        <div className="planning-loading-state">
          {isLoading ? (
            <>
              <div className="planning-spinner" />
              <p>Evaluating spatial feasibility & scoring alternatives...</p>
            </>
          ) : (
            <>
              <p>No planning data available for this area.</p>
              <button className="planning-btn-primary" onClick={onRefreshPlans}>
                Generate Planning Alternatives
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { candidates, problemSummary, disclaimer } = planningData;
  const recommendedPlan =
    planningData.recommendedPlan ||
    candidates.find((c) => c.id === planningData.recommendedPlanId) ||
    candidates[0];

  const dataSource =
    planningData.provenance?.source ||
    planningData.dataProvenance?.source ||
    'OpenStreetMap / Active Geospatial Network';

  const mainProblem =
    problemSummary.mainProblem ||
    problemSummary.primaryDeficiency ||
    'Critical infrastructure deficiency';

  // State checks for view mode buttons
  const isExistingActive = planningViewState.toUpperCase() === 'EXISTING';
  const isProposedActive = planningViewState.toUpperCase() === 'PROPOSED';
  const isCompareActive = planningViewState.toUpperCase() === 'COMPARE';

  return (
    <div className="planning-panel">
      {/* Header */}
      <div className="planning-panel__header">
        <div>
          <div className="planning-header-meta">
            <span className="panel-badge panel-badge--amber">CIVIL INFRASTRUCTURE PLANNING</span>
            <span className="provenance-tag">DATA: {dataSource}</span>
          </div>
          <h3 className="planning-title">INFRASTRUCTURE INTERVENTION PLANS</h3>
          <span className="planning-sub">
            {candidates.length} ALTERNATIVES GENERATED · PROBLEM: {mainProblem}
          </span>
        </div>
        <button className="panel-close-btn" onClick={onClose} title="Close Planning">✕</button>
      </div>

      {/* 3D Visualization Mode Switcher: EXISTING / PROPOSED / COMPARE */}
      <div className="planning-view-mode-bar">
        <span className="planning-view-mode-label">3D SCENE STATE:</span>
        <div className="planning-view-mode-buttons">
          <button
            className={`view-mode-btn ${isExistingActive ? 'view-mode-btn--active' : ''}`}
            onClick={() => onChangeViewState('EXISTING')}
            title="View current infrastructure without interventions"
          >
            EXISTING
          </button>
          <button
            className={`view-mode-btn ${isProposedActive ? 'view-mode-btn--active' : ''}`}
            onClick={() => onChangeViewState('PROPOSED')}
            title="View proposed infrastructure plan"
          >
            PROPOSED
          </button>
          <button
            className={`view-mode-btn ${isCompareActive ? 'view-mode-btn--active' : ''}`}
            onClick={() => onChangeViewState('COMPARE')}
            title="Compare existing corridors side-by-side with proposed intervention"
          >
            COMPARE
          </button>
        </div>
      </div>

      {/* Planning Priority Selector */}
      <div className="planning-priority-section">
        <span className="compact-section-label">PLANNING PRIORITY (WEIGHTING MATRIX)</span>
        <div className="planning-priority-pills">
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              className={`priority-pill ${planningPriority === p.id ? 'priority-pill--active' : ''}`}
              onClick={() => onChangePriority(p.id)}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Container with Candidates List & Detailed Inspection */}
      <div className="planning-content-layout">
        {/* Candidates List Column */}
        <div className="planning-candidates-list">
          <span className="compact-section-label">
            EVALUATED ALTERNATIVES ({candidates.length})
          </span>

          <div className="candidates-scroll">
            {candidates.map((candidate, idx) => {
              const isSelected = selectedPlan?.id === candidate.id;
              const isRecommended = recommendedPlan?.id === candidate.id;
              const letter = String.fromCharCode(65 + idx); // PLAN A, PLAN B, etc.
              const typeStr = (candidate.interventionType || candidate.type || '').replace(/_/g, ' ');
              const lenM = candidate.proposedLengthMeters ?? candidate.corridorLengthMeters ?? 0;
              const capGain = candidate.metrics.futureCapacityGain ?? candidate.metrics.capacityGain ?? 0;

              return (
                <div
                  key={candidate.id}
                  className={`candidate-card ${isSelected ? 'candidate-card--selected' : ''} ${
                    isRecommended ? 'candidate-card--recommended' : ''
                  }`}
                  onClick={() => onSelectPlan(candidate)}
                >
                  <div className="candidate-card__top">
                    <div className="candidate-badge-group">
                      <span className="candidate-letter">PLAN {letter}</span>
                      {isRecommended && (
                        <span className="badge-best-fit">★ RECOMMENDED</span>
                      )}
                      <span className={`badge-feasibility badge-feasibility--${candidate.status.toLowerCase()}`}>
                        {candidate.status}
                      </span>
                    </div>
                    <div className="candidate-score">
                      <span className="candidate-score__val">{Math.round(candidate.metrics.overallScore)}</span>
                      <span className="candidate-score__lbl">/ 100</span>
                    </div>
                  </div>

                  <div className="candidate-card__name">{candidate.name}</div>
                  <div className="candidate-card__type">{typeStr}</div>

                  {/* Micro metric bars */}
                  <div className="candidate-metrics-mini">
                    <div className="metric-mini-item">
                      <span className="metric-mini-label">Traffic Relief</span>
                      <span className="metric-mini-bar-wrap">
                        <span
                          className="metric-mini-bar"
                          style={{ width: `${candidate.metrics.trafficImprovement}%`, backgroundColor: '#38bdf8' }}
                        />
                      </span>
                      <span className="metric-mini-val">{candidate.metrics.trafficImprovement}</span>
                    </div>

                    <div className="metric-mini-item">
                      <span className="metric-mini-label">Capacity Gain</span>
                      <span className="metric-mini-bar-wrap">
                        <span
                          className="metric-mini-bar"
                          style={{ width: `${capGain}%`, backgroundColor: '#34d399' }}
                        />
                      </span>
                      <span className="metric-mini-val">{capGain}</span>
                    </div>

                    <div className="metric-mini-item">
                      <span className="metric-mini-label">Land Impact</span>
                      <span className="metric-mini-bar-wrap">
                        <span
                          className="metric-mini-bar"
                          style={{
                            width: `${100 - candidate.metrics.landImpact}%`,
                            backgroundColor: candidate.metrics.landImpact > 50 ? '#f87171' : '#fbbf24',
                          }}
                        />
                      </span>
                      <span className="metric-mini-val">{candidate.metrics.landImpact}</span>
                    </div>
                  </div>

                  <div className="candidate-card__footer">
                    <span className="candidate-cost-tag">Capex: {candidate.costCategory}</span>
                    <span className="candidate-length-tag">{lenM}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Plan Details Column */}
        {selectedPlan && (
          <div className="planning-detail-view">
            {(() => {
              const selTypeStr = (selectedPlan.interventionType || selectedPlan.type || '').replace(/_/g, ' ');
              const selLenM = selectedPlan.proposedLengthMeters ?? selectedPlan.corridorLengthMeters ?? 0;
              const selLanes = selectedPlan.proposedLanes ?? selectedPlan.proposedGeometry?.[0]?.lanes ?? 2;
              const selBenefits = selectedPlan.keyBenefits || selectedPlan.benefits || [];
              const selTradeoffs = selectedPlan.majorTradeoffs || selectedPlan.tradeoffs || [];
              const selConstraints = selectedPlan.constraintsAvoided || selectedPlan.constraints || [];
              const selCapGain = selectedPlan.metrics.futureCapacityGain ?? selectedPlan.metrics.capacityGain ?? 0;
              const selSafety = selectedPlan.metrics.safetyPotential ?? selectedPlan.metrics.safetyScore ?? 0;
              const selDisruption = selectedPlan.metrics.constructionDisruption ?? selectedPlan.metrics.disruption ?? 0;

              const explanationPoints: string[] = Array.isArray(selectedPlan.explanation)
                ? selectedPlan.explanation
                : typeof selectedPlan.explanation === 'string' && selectedPlan.explanation.length > 0
                ? [selectedPlan.explanation]
                : [];

              return (
                <>
                  <div className="planning-detail-header">
                    <span className="detail-type-tag">{selTypeStr}</span>
                    <h4 className="detail-plan-title">{selectedPlan.name}</h4>
                    <div className="detail-status-row">
                      <span className={`badge-feasibility badge-feasibility--${selectedPlan.status.toLowerCase()}`}>
                        STATUS: {selectedPlan.status}
                      </span>
                      <span className="detail-meta-item">
                        CONFIDENCE: {Math.round(selectedPlan.confidence * 100)}%
                      </span>
                      <span className="detail-meta-item">
                        LENGTH: {selLenM}m
                      </span>
                      <span className="detail-meta-item">
                        LANES: {selLanes}
                      </span>
                    </div>
                  </div>

                  {/* Why Recommended / Justification */}
                  <div className="detail-section">
                    <span className="detail-section-title">ENGINEERING JUSTIFICATION & WHY THIS LOCATION</span>
                    <div className="detail-text-box">
                      <p><strong>Primary Driver:</strong> {selectedPlan.problemAddressed}</p>
                      <p><strong>Location Rationale:</strong> {selectedPlan.whyThisLocation}</p>
                    </div>
                  </div>

                  {/* Explainability Points */}
                  {explanationPoints.length > 0 && (
                    <div className="detail-section">
                      <span className="detail-section-title">EVALUATION EVIDENCE & FACTORS</span>
                      <ul className="detail-explanation-list">
                        {explanationPoints.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Benefits & Tradeoffs Grid */}
                  <div className="detail-grid-2col">
                    <div className="detail-card detail-card--benefits">
                      <span className="detail-card-label">KEY BENEFITS</span>
                      <ul>
                        {selBenefits.map((b, i) => (
                          <li key={i}>✓ {b}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="detail-card detail-card--tradeoffs">
                      <span className="detail-card-label">MAJOR TRADEOFFS</span>
                      <ul>
                        {selTradeoffs.map((t, i) => (
                          <li key={i}>⚠ {t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Multi-Criteria Score Breakdown */}
                  <div className="detail-section">
                    <span className="detail-section-title">MULTI-CRITERIA PERFORMANCE SCORES (0–100)</span>
                    <div className="scores-grid">
                      <div className="score-cell">
                        <span className="score-cell-lbl">Traffic Relief</span>
                        <span className="score-cell-val">{selectedPlan.metrics.trafficImprovement}</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-lbl">Capacity Gain</span>
                        <span className="score-cell-val">{selCapGain}</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-lbl">Connectivity</span>
                        <span className="score-cell-val">{selectedPlan.metrics.connectivityGain}</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-lbl">Safety Gain</span>
                        <span className="score-cell-val">{selSafety}</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-lbl">Land Impact</span>
                        <span className="score-cell-val">{selectedPlan.metrics.landImpact}</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-lbl">Building Impact</span>
                        <span className="score-cell-val">{selectedPlan.metrics.buildingImpact}</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-lbl">Env Compatibility</span>
                        <span className="score-cell-val">{selectedPlan.metrics.environmentalImpact}</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-lbl">Work Disruption</span>
                        <span className="score-cell-val">{selDisruption}</span>
                      </div>
                    </div>
                  </div>

                  {/* Network Connections & Constraints Avoided */}
                  <div className="detail-section">
                    <span className="detail-section-title">SPATIAL CONSTRAINTS & ROAD LINKS</span>
                    <div className="detail-links-box">
                      <div>
                        <strong>Connected Road IDs:</strong>{' '}
                        {selectedPlan.sourceRoadIds && selectedPlan.sourceRoadIds.length > 0
                          ? selectedPlan.sourceRoadIds.join(', ')
                          : 'Corridor Relief'}
                      </div>
                      {selectedPlan.affectedJunctionIds && selectedPlan.affectedJunctionIds.length > 0 && (
                        <div>
                          <strong>Intersecting Junctions:</strong>{' '}
                          {selectedPlan.affectedJunctionIds.join(', ')}
                        </div>
                      )}
                      {selConstraints.length > 0 && (
                        <div>
                          <strong>Constraints Encountered:</strong>{' '}
                          {selConstraints.join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Engineering & Planning Disclaimer */}
      <div className="planning-disclaimer-bar">
        <span className="disclaimer-badge">STATUTORY DISCLAIMER</span>
        <p className="disclaimer-text">{disclaimer}</p>
      </div>
    </div>
  );
};
