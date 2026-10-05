import React from 'react';
import type { InfrastructureIssue, RoadAnalysisItem, JunctionAnalysisItem } from '../../types/analysis';
import type { RoadSegmentGeo } from '../../types/geo';

interface IssueInspectionCardProps {
  issue?: InfrastructureIssue | null;
  road?: RoadAnalysisItem | RoadSegmentGeo | null;
  junction?: JunctionAnalysisItem | null;
  onFocus?: () => void;
  onClose: () => void;
}

export const IssueInspectionCard: React.FC<IssueInspectionCardProps> = ({
  issue,
  road,
  junction,
  onFocus,
  onClose,
}) => {
  if (!issue && !road && !junction) return null;

  // 1. JUNCTION INSPECTION
  if (junction) {
    return (
      <div className="issue-inspection-card">
        <div className="issue-inspection-card__header">
          <div className="issue-inspection-card__badge-row">
            <span
              className={`severity-pill severity-pill--${
                junction.junctionScore >= 70
                  ? 'critical'
                  : junction.junctionScore >= 50
                  ? 'high'
                  : 'medium'
              }`}
            >
              JUNCTION · {junction.armCount}-WAY
            </span>
            <span className="issue-score">CONFLICT SCORE: {junction.junctionScore} / 100</span>
          </div>
          <button className="issue-inspection-card__close" onClick={onClose} title="Dismiss">
            ✕
          </button>
        </div>

        <h3 className="issue-inspection-card__title">
          {junction.armCount}-Leg Intersection ({junction.congestionClass} Congestion Class)
        </h3>
        <p className="issue-inspection-card__desc">
          Analyzed multi-arm node connecting {junction.connectedRoadIds.length} corridor segments.
          Major approaches: {junction.majorApproaches}, minor approaches: {junction.minorApproaches}.
        </p>

        <div className="issue-metrics-grid">
          <div className="issue-metric">
            <span className="issue-metric__label">APPROACHES</span>
            <span className="issue-metric__val">{junction.armCount}</span>
          </div>
          <div className="issue-metric">
            <span className="issue-metric__label">CONGESTION</span>
            <span className="issue-metric__val">{junction.congestionClass}</span>
          </div>
          <div className="issue-metric">
            <span className="issue-metric__label">SCORE</span>
            <span className="issue-metric__val">{junction.junctionScore} <small>/100</small></span>
          </div>
          <div className="issue-metric">
            <span className="issue-metric__label">CONFIDENCE</span>
            <span className="issue-metric__val">{junction.confidence}%</span>
          </div>
        </div>

        {junction.reasons && junction.reasons.length > 0 && (
          <div className="issue-reasons-block">
            <span className="issue-reasons-title">DIAGNOSTIC EVIDENCE:</span>
            <ul className="issue-reasons-list">
              {junction.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="issue-card-actions">
          {onFocus && (
            <button className="neumorphic-btn neumorphic-btn--sm" onClick={onFocus}>
              ⌖ FOCUS CAMERA
            </button>
          )}
        </div>

        <div className="issue-card-footer">
          <span className="source-tag">SOURCE: OpenStreetMap + Topological Analysis</span>
          <span className="phase-note">Planning-Level Screening</span>
        </div>
      </div>
    );
  }

  // 2. ROAD INSPECTION (when clicking road directly)
  if (road && !issue) {
    const isAnalyzed = 'vcRatio' in road;
    const roadItem = isAnalyzed ? (road as RoadAnalysisItem) : null;
    const baseRoad = !isAnalyzed ? (road as RoadSegmentGeo) : null;

    const lanes = roadItem?.lanes || baseRoad?.lanes || 2;
    const highwayType = roadItem?.highwayType || baseRoad?.highwayType || 'primary';
    const name = roadItem?.name || baseRoad?.name || 'Corridor Link';
    const lengthM = roadItem?.lengthMeters || (baseRoad?.geometry.length ? baseRoad.geometry.length * 40 : 500);

    return (
      <div className="issue-inspection-card">
        <div className="issue-inspection-card__header">
          <div className="issue-inspection-card__badge-row">
            <span
              className={`severity-pill severity-pill--${
                roadItem && roadItem.vcRatio >= 1.0
                  ? 'critical'
                  : roadItem && roadItem.vcRatio >= 0.85
                  ? 'high'
                  : 'low'
              }`}
            >
              ROAD · {highwayType.toUpperCase()}
            </span>
            {roadItem && (
              <span className="issue-score">
                STATUS: {roadItem.utilizationStatus.replace('_', ' ')}
              </span>
            )}
          </div>
          <button className="issue-inspection-card__close" onClick={onClose} title="Dismiss">
            ✕
          </button>
        </div>

        <h3 className="issue-inspection-card__title">{name}</h3>
        <p className="issue-inspection-card__desc">
          Classification: {highwayType.toUpperCase()} · {lanes} {lanes === 1 ? 'Lane' : 'Lanes'} ·{' '}
          {(lengthM / 1000).toFixed(2)} km segment length.
        </p>

        {roadItem ? (
          <div className="issue-metrics-grid">
            <div className="issue-metric">
              <span className="issue-metric__label">V/C RATIO</span>
              <span
                className={`issue-metric__val ${
                  roadItem.vcRatio >= 1.0 ? 'issue-metric__val--danger' : ''
                }`}
              >
                {roadItem.vcRatio.toFixed(2)}
              </span>
            </div>
            <div className="issue-metric">
              <span className="issue-metric__label">EST. DEMAND</span>
              <span className="issue-metric__val">
                {intFormatter(roadItem.estimatedDemand)} <small>veh/hr</small>
              </span>
            </div>
            <div className="issue-metric">
              <span className="issue-metric__label">EST. CAPACITY</span>
              <span className="issue-metric__val">
                {intFormatter(roadItem.estimatedCapacity)} <small>veh/hr</small>
              </span>
            </div>
            <div className="issue-metric">
              <span className="issue-metric__label">CENTRALITY</span>
              <span className="issue-metric__val">{roadItem.networkImportance.toFixed(0)} <small>/100</small></span>
            </div>
          </div>
        ) : (
          <div className="issue-metrics-grid">
            <div className="issue-metric">
              <span className="issue-metric__label">LANES</span>
              <span className="issue-metric__val">{lanes}</span>
            </div>
            <div className="issue-metric">
              <span className="issue-metric__label">WIDTH</span>
              <span className="issue-metric__val">
                {baseRoad?.estimatedWidth || 6.5} <small>m</small>
              </span>
            </div>
            <div className="issue-metric">
              <span className="issue-metric__label">ONEWAY</span>
              <span className="issue-metric__val">{baseRoad?.oneWay ? 'YES' : 'NO'}</span>
            </div>
            <div className="issue-metric">
              <span className="issue-metric__label">STATUS</span>
              <span className="issue-metric__val">RAW OSM</span>
            </div>
          </div>
        )}

        <div className="issue-card-actions">
          {onFocus && (
            <button className="neumorphic-btn neumorphic-btn--sm" onClick={onFocus}>
              ⌖ FOCUS CAMERA
            </button>
          )}
        </div>

        <div className="issue-card-footer">
          <span className="source-tag">SOURCE: OpenStreetMap</span>
          <span className="phase-note">Existing Infrastructure</span>
        </div>
      </div>
    );
  }

  // 3. INFRASTRUCTURE ISSUE INSPECTION
  if (!issue) return null;

  return (
    <div className="issue-inspection-card">
      <div className="issue-inspection-card__header">
        <div className="issue-inspection-card__badge-row">
          <span className={`severity-pill severity-pill--${issue.severity.toLowerCase()}`}>
            {issue.type.replace(/_/g, ' ')}
          </span>
          <span className="issue-score">SEVERITY: {issue.severity}</span>
        </div>
        <button className="issue-inspection-card__close" onClick={onClose} title="Dismiss">
          ✕
        </button>
      </div>

      <h3 className="issue-inspection-card__title">{issue.title}</h3>
      <p className="issue-inspection-card__desc">{issue.description}</p>

      {/* Metrics Row */}
      <div className="issue-metrics-grid">
        <div className="issue-metric">
          <span className="issue-metric__label">V/C RATIO</span>
          <span
            className={`issue-metric__val ${
              (issue.metrics.vcRatio || 0) >= 1.0 ? 'issue-metric__val--danger' : ''
            }`}
          >
            {issue.metrics.vcRatio !== undefined ? issue.metrics.vcRatio.toFixed(2) : '—'}
          </span>
        </div>

        <div className="issue-metric">
          <span className="issue-metric__label">EST. DEMAND</span>
          <span className="issue-metric__val">
            {issue.metrics.estimatedDemand ? intFormatter(issue.metrics.estimatedDemand) : '—'}{' '}
            <small>veh/hr</small>
          </span>
        </div>

        <div className="issue-metric">
          <span className="issue-metric__label">EST. CAPACITY</span>
          <span className="issue-metric__val">
            {issue.metrics.estimatedCapacity ? intFormatter(issue.metrics.estimatedCapacity) : '—'}{' '}
            <small>veh/hr</small>
          </span>
        </div>

        <div className="issue-metric">
          <span className="issue-metric__label">CONFIDENCE</span>
          <span className="issue-metric__val">{issue.confidence}%</span>
        </div>
      </div>

      {/* Explainable Reasons */}
      {issue.reasons && issue.reasons.length > 0 && (
        <div className="issue-reasons-block">
          <span className="issue-reasons-title">WHY FLAGGED (DIAGNOSTIC EVIDENCE):</span>
          <ul className="issue-reasons-list">
            {issue.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="issue-card-actions">
        {onFocus && (
          <button className="neumorphic-btn neumorphic-btn--sm" onClick={onFocus}>
            ⌖ FOCUS CAMERA
          </button>
        )}
      </div>

      {/* Source Attribution */}
      <div className="issue-card-footer">
        <span className="source-tag">SOURCE: {issue.source || 'OpenStreetMap + Planning-Level Model'}</span>
        <span className="phase-note">Phase 3 Problem Identification</span>
      </div>
    </div>
  );
};

function intFormatter(num: number | unknown): string {
  const val = typeof num === 'number' ? Math.round(num) : 0;
  return val.toLocaleString();
}
