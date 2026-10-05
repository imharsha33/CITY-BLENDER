import React from 'react';
import type { InfrastructureIssue, AnalysisFilterType } from '../../types/analysis';

interface FindingsDrawerProps {
  issues: InfrastructureIssue[];
  activeFilter: AnalysisFilterType;
  onFilterChange: (f: AnalysisFilterType) => void;
  onInspectIssue: (issue: InfrastructureIssue) => void;
  selectedIssueId?: string | null;
  onClose: () => void;
}

export const FindingsDrawer: React.FC<FindingsDrawerProps> = ({
  issues,
  activeFilter,
  onFilterChange,
  onInspectIssue,
  selectedIssueId,
  onClose,
}) => {
  const filtered = issues.filter((issue) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'BOTTLENECK') return issue.type === 'BOTTLENECK';
    if (activeFilter === 'CAPACITY') return issue.type === 'CAPACITY_DEFICIENCY';
    if (activeFilter === 'JUNCTION') return issue.type === 'JUNCTION_RISK';
    if (activeFilter === 'CONNECTIVITY') {
      return (
        issue.type === 'NETWORK_CRITICAL_SEGMENT' || issue.type === 'CONNECTIVITY_WEAKNESS'
      );
    }
    return true;
  });

  return (
    <div className="findings-drawer">
      <div className="findings-drawer__header">
        <div>
          <span className="panel-badge">ENGINEERING DIAGNOSTICS</span>
          <h3 className="findings-drawer__title">INFRASTRUCTURE FINDINGS</h3>
          <span className="findings-drawer__sub">
            {filtered.length} {filtered.length === 1 ? 'Problem Identified' : 'Problems Identified'}
          </span>
        </div>
        <button className="panel-close-btn" onClick={onClose} title="Close Findings Drawer">
          ✕
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-pill-row">
        {(['ALL', 'BOTTLENECK', 'CAPACITY', 'JUNCTION', 'CONNECTIVITY'] as AnalysisFilterType[]).map(
          (f) => (
            <button
              key={f}
              className={`filter-pill ${activeFilter === f ? 'filter-pill--active' : ''}`}
              onClick={() => onFilterChange(f)}
            >
              {f}
            </button>
          )
        )}
      </div>

      {/* Findings List */}
      <div className="findings-list">
        {filtered.length === 0 ? (
          <div className="findings-empty">No issues found matching filter.</div>
        ) : (
          filtered.map((issue, idx) => {
            const isSelected = selectedIssueId === issue.id;
            return (
              <div
                key={issue.id}
                className={`finding-item ${isSelected ? 'finding-item--selected' : ''}`}
                onClick={() => onInspectIssue(issue)}
              >
                <div className="finding-item__top">
                  <span className="finding-item__idx">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <span
                    className={`severity-pill severity-pill--${issue.severity.toLowerCase()}`}
                  >
                    {issue.type.replace(/_/g, ' ')}
                  </span>
                  <span className="finding-item__score">
                    SCORE: {issue.score} <small>/100</small>
                  </span>
                </div>

                <h4 className="finding-item__title">{issue.title}</h4>
                <p className="finding-item__desc">{issue.description}</p>

                {/* Key Metrics Row */}
                <div className="finding-item__metrics">
                  {issue.metrics.vcRatio !== undefined && (
                    <span className="metric-tag">
                      V/C: <strong>{issue.metrics.vcRatio.toFixed(2)}</strong>
                    </span>
                  )}
                  {issue.metrics.estimatedDemand !== undefined && (
                    <span className="metric-tag">
                      DEMAND: <strong>{Math.round(issue.metrics.estimatedDemand).toLocaleString()}</strong>
                    </span>
                  )}
                  {issue.metrics.estimatedCapacity !== undefined && (
                    <span className="metric-tag">
                      CAP: <strong>{Math.round(issue.metrics.estimatedCapacity).toLocaleString()}</strong>
                    </span>
                  )}
                  <span className="metric-tag">
                    CONF: <strong>{issue.confidence}%</strong>
                  </span>
                </div>

                <div className="finding-item__footer">
                  <span className="finding-source">{issue.source}</span>
                  <button
                    className="inspect-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectIssue(issue);
                    }}
                  >
                    ⌖ INSPECT
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="findings-drawer__disclaimer">
        <span>STRICT PHASE 3 BOUNDARY</span>
        <p>Problem identification & diagnostic evidence only. Interventions evaluated in Phase 4.</p>
      </div>
    </div>
  );
};
