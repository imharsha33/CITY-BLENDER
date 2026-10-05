import React from 'react';
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
  const currentMeta = PLAN_METAS[currentPlan];

  return (
    <div className="plan-selection-bar">
      <div className="plan-selection-bar__pills">
        <span className="plan-selector-label">CIVIL PLAN VISUALIZATION:</span>
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
              {isActive && <span className="plan-pill-btn__indicator" />}
            </button>
          );
        })}
      </div>

      <div className="plan-selection-bar__meta">
        <div className="plan-meta-summary">
          <span
            className="plan-badge-tag"
            style={{
              borderColor: currentMeta.badgeColor,
              color: currentMeta.badgeColor,
              backgroundColor: `${currentMeta.badgeColor}18`,
            }}
          >
            {currentMeta.badge}
          </span>
          <span className="plan-headline-text">{currentMeta.headline}</span>
          <span className="plan-capacity-chip">{currentMeta.capacityGain.split('(')[0]}</span>
        </div>

        <button
          className="plan-specs-trigger-btn"
          onClick={onOpenSpecs}
          title="Inspect geometric cross-sections, structural specs, and IRC engineering standards"
        >
          <span>📐 SPECS & DESIGN</span>
        </button>
      </div>
    </div>
  );
};
