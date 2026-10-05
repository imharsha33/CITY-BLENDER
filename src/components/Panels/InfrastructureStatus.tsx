import React from 'react';
import { demoScenario } from '../../data/demoScenario';

interface InfrastructureStatusProps {
  progress: number;
}

function progressToYear(p: number): number {
  const { startYear, endYear } = demoScenario.timeline;
  return startYear + Math.round(p * (endYear - startYear));
}

export const InfrastructureStatus: React.FC<InfrastructureStatusProps> = ({ progress }) => {
  const year  = progressToYear(progress);

  const showExisting = progress < 0.38;
  const showFuture   = progress >= 0.64;
  const inProgress   = !showExisting && !showFuture;

  return (
    <div className="infra-status">
      <div className={`infra-card ${showExisting ? 'infra-card--active' : 'infra-card--dim'}`}>
        <div className="infra-card__label">EXISTING</div>
        <div className="infra-card__value">1-Lane Road</div>
        <div className="infra-card__sub">Two-way traffic</div>
      </div>

      <div className="infra-arrow">
        {inProgress
          ? <div className="infra-arrow__anim">▶ UNDER CONSTRUCTION ▶</div>
          : <div className="infra-arrow__static">→</div>
        }
      </div>

      <div className={`infra-card ${showFuture ? 'infra-card--active infra-card--upgraded' : 'infra-card--dim'}`}>
        <div className="infra-card__label">PROPOSED</div>
        <div className="infra-card__value">4-Lane Road</div>
        <div className="infra-card__sub">Divided carriageway</div>
      </div>

      <div className="infra-year">
        <span className="infra-year__value">{year}</span>
      </div>
    </div>
  );
};
