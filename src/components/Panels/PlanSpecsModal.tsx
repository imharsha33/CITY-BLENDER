import React from 'react';
import type { DemoPlanType } from '../../data/planScenarios';
import { PLAN_METAS, SCENARIOS } from '../../data/planScenarios';

interface PlanSpecsModalProps {
  currentPlan: DemoPlanType;
  onSelectPlan: (plan: DemoPlanType) => void;
  onClose: () => void;
}

export const PlanSpecsModal: React.FC<PlanSpecsModalProps> = ({
  currentPlan,
  onSelectPlan,
  onClose,
}) => {
  const meta = PLAN_METAS[currentPlan];
  const scenario = SCENARIOS[currentPlan];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card plan-specs-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 840 }}
      >
        {/* Header */}
        <div className="modal-card__header">
          <div className="modal-card__title-group">
            <div className="plan-specs-header-row">
              <span
                className="panel-badge"
                style={{
                  borderColor: meta.badgeColor,
                  color: meta.badgeColor,
                  backgroundColor: `${meta.badgeColor}22`,
                }}
              >
                {meta.badge}
              </span>
              <span className="provenance-tag">IRC / AASHTO CIVIL STANDARD</span>
            </div>
            <h2 className="modal-card__title">
              {meta.icon} {meta.title}
            </h2>
            <p className="modal-card__subtitle">{meta.description}</p>
          </div>
          <button className="modal-card__close-btn" onClick={onClose} title="Close specifications">
            ✕
          </button>
        </div>

        {/* Plan Switcher Pills inside Modal */}
        <div className="plan-specs-pills-row">
          {(['four_lane', 'flyover', 'ring_road'] as DemoPlanType[]).map(pKey => {
            const pMeta = PLAN_METAS[pKey];
            const isSel = currentPlan === pKey;
            return (
              <button
                key={pKey}
                className={`plan-specs-pill ${isSel ? 'plan-specs-pill--active' : ''}`}
                onClick={() => onSelectPlan(pKey)}
                style={isSel ? { borderColor: pMeta.badgeColor, color: pMeta.badgeColor } : {}}
              >
                <span>{pMeta.icon}</span>
                <span>{pMeta.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="modal-card__body">
          {/* Section 1: Engineering Parameters Grid */}
          <div className="specs-section">
            <h4 className="specs-section-title">GEOMETRIC DESIGN & CAPACITY METRICS</h4>
            <div className="specs-grid">
              <div className="specs-card">
                <span className="specs-card__label">DESIGN SPEED</span>
                <span className="specs-card__val specs-card__val--accent">{meta.designSpeed}</span>
                <span className="specs-card__sub">{meta.standards}</span>
              </div>
              <div className="specs-card">
                <span className="specs-card__label">THROUGHPUT CAPACITY GAIN</span>
                <span className="specs-card__val specs-card__val--gain">{meta.capacityGain.split('(')[0]}</span>
                <span className="specs-card__sub">Peak-hour corridor flow</span>
              </div>
              <div className="specs-card">
                <span className="specs-card__label">CORRIDOR SPAN</span>
                <span className="specs-card__val">{meta.corridorLength}</span>
                <span className="specs-card__sub">Geometrically modeled in 3D</span>
              </div>
              <div className="specs-card">
                <span className="specs-card__label">CARRIAGEWAY CONFIGURATION</span>
                <span className="specs-card__val">{meta.crossSection.lanes}</span>
                <span className="specs-card__sub">{meta.crossSection.laneWidth}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Cross-Section Breakdown */}
          <div className="specs-section">
            <h4 className="specs-section-title">CIVIL CROSS-SECTION BREAKDOWN</h4>
            <div className="specs-cross-section-table">
              <div className="specs-table-row">
                <span className="specs-table-label">Travelway Lanes:</span>
                <span className="specs-table-value">{meta.crossSection.lanes} ({meta.crossSection.laneWidth})</span>
              </div>
              <div className="specs-table-row">
                <span className="specs-table-label">Central Median:</span>
                <span className="specs-table-value">{meta.crossSection.median}</span>
              </div>
              <div className="specs-table-row">
                <span className="specs-table-label">Paved Shoulders / Shy-line:</span>
                <span className="specs-table-value">{meta.crossSection.shoulders}</span>
              </div>
              {meta.crossSection.verticalClearance && (
                <div className="specs-table-row">
                  <span className="specs-table-label">Vertical Clearance (Clear Headroom):</span>
                  <span className="specs-table-value specs-table-value--highlight">
                    {meta.crossSection.verticalClearance}
                  </span>
                </div>
              )}
              {meta.crossSection.orbitalRadius && (
                <div className="specs-table-row">
                  <span className="specs-table-label">Orbital Curve Radius:</span>
                  <span className="specs-table-value specs-table-value--highlight">
                    {meta.crossSection.orbitalRadius}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Problem Addressed & Key Engineering Benefits */}
          <div className="specs-section">
            <h4 className="specs-section-title">DEFICIENCY ADDRESSED & ENGINEERING ADVANTAGES</h4>
            <div className="specs-problem-box">
              <span className="specs-problem-icon">⚠️</span>
              <div className="specs-problem-text">
                <strong>Deficiency in Existing Network:</strong> {meta.problemResolved}
              </div>
            </div>

            <div className="specs-benefits-list">
              {meta.keyBenefits.map((benefit, idx) => (
                <div key={idx} className="specs-benefit-item">
                  <span className="specs-check-icon">✓</span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Construction Phasing Sequence */}
          <div className="specs-section">
            <h4 className="specs-section-title">
              CONSTRUCTION PHASING SEQUENCE ({scenario.constructionPhases.length} STAGES)
            </h4>
            <div className="specs-phases-timeline">
              {scenario.constructionPhases.map((phase, idx) => (
                <div key={phase.id} className="specs-phase-card">
                  <div className="specs-phase-num">{(idx + 1).toString().padStart(2, '0')}</div>
                  <div className="specs-phase-info">
                    <span className="specs-phase-name">{phase.name}</span>
                    <span className="specs-phase-desc">{phase.description}</span>
                  </div>
                  <div className="specs-phase-progress">
                    {Math.round(phase.timelineStart * 100)}% – {Math.round(phase.timelineEnd * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-card__footer">
          <span className="modal-footer-disclaimer">
            Outputs rendered according to IRC/MoRTH & AASHTO geometric design guidelines.
          </span>
          <button className="neumorphic-btn neumorphic-btn--accent" onClick={onClose}>
            <span className="btn-label">CLOSE SPECIFICATIONS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
