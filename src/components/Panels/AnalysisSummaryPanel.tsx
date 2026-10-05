import React from 'react';
import type { AnalysisResultResponse } from '../../types/analysis';

interface AnalysisSummaryPanelProps {
  data: AnalysisResultResponse;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onClose: () => void;
}

export const AnalysisSummaryPanel: React.FC<AnalysisSummaryPanelProps> = ({
  data,
  isDrawerOpen,
  onToggleDrawer,
  onClose,
}) => {
  const { summary } = data;

  const criticalCount = data.issues.filter(i => i.severity === 'CRITICAL').length;
  const capacityCount = summary.capacityDeficiencies;
  const junctionCount = summary.highRiskJunctions;
  const connectivityCount = summary.connectivityIssues + summary.networkCriticalSegments;

  return (
    <div className="compact-analysis-panel">
      <div className="compact-analysis-panel__header">
        <div>
          <span className="panel-badge">DIGITAL TWIN ANALYSIS</span>
          <h3 className="compact-analysis-title">INFRASTRUCTURE ANALYSIS</h3>
          <span className="compact-analysis-sub">
            {summary.roadsAnalyzed} ROAD SEGMENTS · {summary.junctionsAnalyzed} JUNCTIONS
          </span>
        </div>
        <button className="panel-close-btn" onClick={onClose} title="Dismiss panel">
          ✕
        </button>
      </div>

      {/* Issues Found Breakdown */}
      <div className="compact-issues-section">
        <span className="compact-section-label">ISSUES FOUND</span>
        <div className="compact-issue-chips">
          <span className="issue-chip issue-chip--critical">
            <strong>{criticalCount.toString().padStart(2, '0')}</strong> Critical
          </span>
          <span className="issue-chip issue-chip--capacity">
            <strong>{capacityCount.toString().padStart(2, '0')}</strong> Capacity
          </span>
          <span className="issue-chip issue-chip--junction">
            <strong>{junctionCount.toString().padStart(2, '0')}</strong> Junction
          </span>
          <span className="issue-chip issue-chip--connectivity">
            <strong>{connectivityCount.toString().padStart(2, '0')}</strong> Connectivity
          </span>
        </div>
      </div>

      {/* Data Quality & Action */}
      <div className="compact-quality-row">
        <div className="compact-dq-badge">
          <span className="dq-label">DATA QUALITY</span>
          <span className="dq-val">{summary.dataQualityScore}%</span>
        </div>
        <button
          className={`neumorphic-btn neumorphic-btn--sm ${isDrawerOpen ? 'neumorphic-btn--active' : 'neumorphic-btn--accent'}`}
          onClick={onToggleDrawer}
        >
          <span>{isDrawerOpen ? 'HIDE FINDINGS' : 'VIEW FINDINGS'}</span>
        </button>
      </div>

      <div className="compact-panel-disclaimer">
        <span>PLANNING-LEVEL SCREENING</span>
        <p>Identifies structural bottlenecks. Engineering interventions formulated in Phase 4.</p>
      </div>
    </div>
  );
};
