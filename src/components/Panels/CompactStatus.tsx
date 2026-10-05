import React from 'react';
import { demoScenario, PHASE_LABELS } from '../../data/demoScenario';
import { getPhaseForProgress } from '../../engine/constructionEngine';

interface CompactStatusProps {
  progress: number;
}

export const CompactStatus: React.FC<CompactStatusProps> = ({ progress }) => {
  const currentPhase = getPhaseForProgress(progress);
  const phaseName = PHASE_LABELS[currentPhase] ?? 'In Progress';
  const pct = Math.round(progress * 100);

  const startYear = demoScenario.timeline.startYear;
  const endYear = demoScenario.timeline.endYear;
  const currentYear = startYear + Math.round(progress * (endYear - startYear));

  return (
    <div className="compact-status">
      <div className="compact-status__row">
        <div className="compact-status__item">
          <span className="compact-status__label">ROAD UPGRADE</span>
          <span className="compact-status__val compact-status__val--accent">
            1 → 4 LANES
          </span>
        </div>
        <div className="compact-status__divider" />
        <div className="compact-status__item">
          <span className="compact-status__label">STAGE</span>
          <span className="compact-status__val">{phaseName.toUpperCase()}</span>
        </div>
        <div className="compact-status__divider" />
        <div className="compact-status__item">
          <span className="compact-status__label">PROGRESS</span>
          <span className="compact-status__val">{pct}%</span>
        </div>
        <div className="compact-status__divider" />
        <div className="compact-status__item">
          <span className="compact-status__label">SOURCE</span>
          <span className="compact-status__val compact-status__val--dim">
            DEMO DATA
          </span>
          <span className="compact-status__sub">Phase 1 Corridor</span>
        </div>
      </div>
      {/* Thin recessed progress bar */}
      <div className="compact-status__bar-track">
        <div
          className="compact-status__bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
