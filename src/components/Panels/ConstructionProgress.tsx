import React from 'react';
import { demoScenario } from '../../data/demoScenario';
import { getPhaseForProgress } from '../../engine/constructionEngine';
import type { ConstructionPhaseId } from '../../types/infrastructure';

interface ConstructionProgressProps {
  progress: number;
}

const PHASE_DESCRIPTIONS: Record<ConstructionPhaseId, string> = {
  existing:     'Existing 1-lane road in service',
  survey:       'Geotechnical survey & boundary marking',
  preparation:  'Traffic diversion & site clearing',
  modification: 'Existing pavement being removed',
  earthwork:    'Excavation & grading in progress',
  drainage:     'Drainage channels being constructed',
  road_base:    'Sub-base & aggregate layers placed',
  pavement:     'Bituminous surfacing in progress',
  median:       'Central median being constructed',
  markings:     'Thermoplastic road markings applied',
  streetlights: 'Street lighting installation',
  landscaping:  'Planting, sidewalks & site finishing',
  completed:    'Infrastructure fully operational',
};

export const ConstructionProgress: React.FC<ConstructionProgressProps> = ({ progress }) => {
  const currentPhase = getPhaseForProgress(progress);
  const phases = demoScenario.constructionPhases.filter(p => p.id !== 'completed');
  const currentIndex = phases.findIndex(p => p.id === currentPhase);
  const pct = Math.round(progress * 100);

  const nextPhase = phases[currentIndex + 1];

  return (
    <div className="panel panel--progress">
      <div className="panel__header">
        <span className="panel__label">Construction Progress</span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-wrap">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%` }}
        />
        <span className="progress-bar-pct">{pct}%</span>
      </div>

      {/* Current phase */}
      <div className="phase-info">
        <div className="phase-info__row">
          <span className="phase-info__label">Current Stage</span>
          <span className="phase-info__value phase-info__value--active">
            {phases.find(p => p.id === currentPhase)?.name ?? 'Complete'}
          </span>
        </div>
        <p className="phase-info__desc">
          {PHASE_DESCRIPTIONS[currentPhase]}
        </p>
        {nextPhase && (
          <div className="phase-info__row phase-info__row--next">
            <span className="phase-info__label">Next</span>
            <span className="phase-info__value">{nextPhase.name}</span>
          </div>
        )}
      </div>

      {/* Mini phase list */}
      <div className="phase-list">
        {phases.map(ph => {
          const done    = progress >= ph.timelineEnd;
          const active  = ph.id === currentPhase;
          return (
            <div
              key={ph.id}
              className={[
                'phase-list__item',
                done   ? 'phase-list__item--done'   : '',
                active ? 'phase-list__item--active' : '',
              ].join(' ')}
            >
              <div className="phase-list__dot" />
              <span className="phase-list__name">{ph.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
