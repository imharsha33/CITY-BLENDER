import React, { useState } from 'react';
import type { DemoPlanType } from '../../data/planScenarios';
import { PLAN_METAS } from '../../data/planScenarios';

interface PlanSelectionBarProps {
  currentPlan: DemoPlanType;
  onSelectPlan: (plan: DemoPlanType) => void;
  onOpenSpecs: () => void;
  isDemoMode?: boolean;
}

const PLANS: DemoPlanType[] = ['four_lane', 'flyover', 'ring_road'];

export const PlanSelectionBar: React.FC<PlanSelectionBarProps> = ({
  currentPlan,
  onSelectPlan,
  onOpenSpecs,
  isDemoMode = true,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const currentMeta = PLAN_METAS[currentPlan];

  if (isMinimized) {
    return (
      <div className="plan-selection-bar-minimized-wrap">
        <button
          className="realism-btn realism-btn--sm plan-selection-bar-restore-btn"
          onClick={() => setIsMinimized(false)}
          title="Expand Civil Plan Visualization Bar"
        >
          <span style={{ fontSize: 13 }}>🛣️</span>
          <span>CIVIL PLANS: <strong>{currentMeta.shortTitle}</strong></span>
          <span className="expand-indicator">▼ EXPAND</span>
        </button>
      </div>
    );
  }

  return (
    <div className="plan-selection-bar">
      <div className="plan-selection-bar__pills">
        <span className="plan-selector-label">CIVIL PLANS:</span>
        {PLANS.map(planKey => {
          const meta = PLAN_METAS[planKey];
          const isActive = currentPlan === planKey;
          return (
            <button
              key={planKey}
              className={`plan-pill-btn ${isActive ? 'plan-pill-btn--active' : ''}`}
              onClick={() => onSelectPlan(planKey)}
              title={meta.description}
            >
              <span className="plan-pill-btn__icon">{meta.icon}</span>
              <span className="plan-pill-btn__label">{meta.shortTitle}</span>
            </button>
          );
        })}

        <button
          className="plan-specs-trigger-btn"
          onClick={onOpenSpecs}
          title="Inspect engineering specifications, geometric cross-sections, and IRC standards"
        >
          <span>📐 SPECS</span>
        </button>

        <button
          className="realism-btn realism-btn--icon"
          style={{ width: 26, height: 26, marginLeft: 4, fontSize: 11 }}
          onClick={() => setIsMinimized(true)}
          title="Minimize Civil Plans Bar"
        >
          —
        </button>
      </div>
    </div>
  );
};
