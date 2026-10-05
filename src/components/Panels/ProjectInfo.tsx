import React from 'react';
import { demoScenario } from '../../data/demoScenario';

interface ProjectInfoProps {
  progress: number;
}

export const ProjectInfo: React.FC<ProjectInfoProps> = ({ progress }) => {
  const { currentState, proposedState, upgrade, timeline } = demoScenario;

  return (
    <div className="panel panel--project">
      <div className="panel__header">
        <span className="panel__label">Project Details</span>
        <span className="panel__badge panel__badge--demo">DEMO</span>
      </div>

      <div className="info-grid">
        <div className="info-row">
          <span className="info-row__key">Project</span>
          <span className="info-row__val">Road Infrastructure Upgrade</span>
        </div>
        <div className="info-row">
          <span className="info-row__key">Current</span>
          <span className="info-row__val info-row__val--current">
            {currentState.geometry.lanes}-Lane Road
          </span>
        </div>
        <div className="info-row">
          <span className="info-row__key">Proposed</span>
          <span className="info-row__val info-row__val--proposed">
            {proposedState.geometry.lanes}-Lane Divided Road
          </span>
        </div>
        <div className="info-row">
          <span className="info-row__key">Intervention</span>
          <span className="info-row__val">Road Widening</span>
        </div>
        <div className="info-row">
          <span className="info-row__key">Status</span>
          <span className="info-row__val">
            {progress >= 1.0
              ? <span className="status-badge status-badge--complete">Complete</span>
              : progress > 0.08
              ? <span className="status-badge status-badge--active">In Progress</span>
              : <span className="status-badge status-badge--plan">Simulation</span>
            }
          </span>
        </div>
        <div className="info-row">
          <span className="info-row__key">Timeline</span>
          <span className="info-row__val">
            {timeline.startYear} → {timeline.endYear}
          </span>
        </div>
        <div className="info-row">
          <span className="info-row__key">Priority</span>
          <span className="info-row__val">
            <span className="tag tag--high">{upgrade.priority?.toUpperCase()}</span>
          </span>
        </div>
      </div>

      <p className="panel__note">
        Phase 1 is a visualization prototype. Real infrastructure
        recommendations will be introduced after integration with geographic,
        traffic, and planning data in Phase 2+.
      </p>
    </div>
  );
};
