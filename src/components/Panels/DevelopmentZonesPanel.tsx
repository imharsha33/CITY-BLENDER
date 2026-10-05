import React, { useState } from 'react';
import type { DevelopmentZone, WholePlaceDevelopmentPlan } from '../../types/geo';
import type { InfrastructureStrategy } from '../../types/optimization';

interface DevelopmentZonesPanelProps {
  zones: DevelopmentZone[];
  placeName: string;
  wholePlacePlan?: WholePlaceDevelopmentPlan | null;
  selectedStrategy?: InfrastructureStrategy | null;
  onFocusZone: (zone: DevelopmentZone) => void;
  onClose: () => void;
  onOpenEvidence?: () => void;
}

export const DevelopmentZonesPanel: React.FC<DevelopmentZonesPanelProps> = ({
  zones,
  placeName,
  wholePlacePlan,
  selectedStrategy,
  onFocusZone,
  onClose,
  onOpenEvidence,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.zoneId || '');

  const activeZone = zones.find((z) => z.zoneId === selectedZoneId) || zones[0];
  const problemZones = zones.filter((z) => z.zoneType !== 'STABLE_EQUILIBRIUM');
  const monitoringZones = zones.filter((z) => z.zoneType === 'STABLE_EQUILIBRIUM');

  return (
    <div className="optimization-panel development-zones-panel">
      {/* Header */}
      <div className="optimization-panel__header">
        <div>
          <span className="panel-badge" style={{ background: '#0284c7', color: '#e0f2fe' }}>
            PHASE 8 · WHOLE-PLACE SPATIAL STRATEGY
          </span>
          <h3 className="optimization-title">DEVELOPMENT ZONES</h3>
          <p className="optimization-subtitle" style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
            {placeName} · {zones.length} Discrete Zones ({problemZones.length} Intervention Candidates, {monitoringZones.length} Stable Monitoring)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onOpenEvidence && (
            <button
              className="neumorphic-btn neumorphic-btn--sm"
              style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', fontSize: '11px', padding: '4px 10px' }}
              onClick={onOpenEvidence}
              title="Open Engineering Evidence & Audit Modal"
            >
              🔬 VIEW EVIDENCE
            </button>
          )}
          <button className="panel-close-btn" onClick={onClose} title="Close Development Zones">✕</button>
        </div>
      </div>

      {/* Whole-Place Strategy Banner if active */}
      {wholePlacePlan && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '6px',
          padding: '10px 12px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#38bdf8' }}>
              WHOLE-PLACE MASTER STRATEGY: {selectedStrategy?.name || wholePlacePlan.name}
            </span>
            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
              SCORE {wholePlacePlan.overallScore.toFixed(1)} / 100
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Spans {wholePlacePlan.totalAffectedRoadsCount} corridors across {zones.length} spatial zones.
            {wholePlacePlan.unchangedMonitoringZones.length > 0 && (
              <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                ({wholePlacePlan.unchangedMonitoringZones.length} baseline equilibrium zone preserved with zero capital expenditure).
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Left Zone Selector, Right Zone Details */}
      <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0 }}>
        {/* Left: Zone List */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '4px' }}>
          {zones.map((z) => {
            const isSelected = z.zoneId === activeZone?.zoneId;
            const isMonitoring = z.zoneType === 'STABLE_EQUILIBRIUM';
            const badgeColor =
              z.severity === 'CRITICAL' ? '#ef4444' :
              z.severity === 'HIGH' ? '#f59e0b' :
              isMonitoring ? '#10b981' : '#38bdf8';

            return (
              <button
                key={z.zoneId}
                onClick={() => {
                  setSelectedZoneId(z.zoneId);
                  onFocusZone(z);
                }}
                style={{
                  textAlign: 'left',
                  background: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.6)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(51, 65, 85, 0.6)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#e2e8f0' }}>{z.name.split('—')[0].trim()}</span>
                  <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '3px', background: `${badgeColor}22`, color: badgeColor, fontWeight: 700 }}>
                    {z.severity}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {z.name.split('—')[1]?.trim() || z.zoneType}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                  {z.affectedRoadIds.length} roads · {z.issueIds.length} issues
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Zone Inspection Detail Card */}
        {activeZone && (
          <div style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            borderRadius: '6px',
            padding: '12px 14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', color: '#f8fafc', fontWeight: 700 }}>{activeZone.name}</h4>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                  ZONE ID: {activeZone.zoneId} · TYPE: {activeZone.zoneType} · CONFIDENCE: {activeZone.confidence}%
                </div>
              </div>
              <button
                className="neumorphic-btn neumorphic-btn--sm"
                onClick={() => onFocusZone(activeZone)}
                title="Focus 3D Digital Twin Camera on this Zone"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                📍 FOCUS MAP
              </button>
            </div>

            {/* Current vs Future Condition */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px 10px', borderRadius: '4px', borderLeft: '3px solid #f59e0b' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#f59e0b', display: 'block', marginBottom: '2px' }}>
                  CURRENT OPERATING CONDITION
                </span>
                <span style={{ color: '#cbd5e1' }}>{activeZone.currentCondition}</span>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px 10px', borderRadius: '4px', borderLeft: '3px solid #8b5cf6' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#c4b5fd', display: 'block', marginBottom: '2px' }}>
                  FUTURE DEMAND FORECAST
                </span>
                <span style={{ color: '#cbd5e1' }}>{activeZone.futureCondition}</span>
              </div>
            </div>

            {/* Constraints */}
            <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '8px 10px', borderRadius: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                REAL LOCAL CONSTRAINTS EVALUATED
              </span>
              <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#e2e8f0' }}>
                <div>Structures in 50m: <strong style={{ color: activeZone.constraints.buildingCount > 20 ? '#f87171' : '#38bdf8' }}>{activeZone.constraints.buildingCount || 0}</strong></div>
                <div>Water Proximity: <strong style={{ color: '#38bdf8' }}>{activeZone.constraints.waterProximityMeters ? `${activeZone.constraints.waterProximityMeters}m` : 'Buffer safe'}</strong></div>
                <div>Avg Width: <strong style={{ color: '#38bdf8' }}>{activeZone.constraints.averageWidthMeters ? `${activeZone.constraints.averageWidthMeters}m` : 'Standard'}</strong></div>
                <div>Widening Feasible: <strong style={{ color: activeZone.constraints.wideningConstrained ? '#f87171' : '#4ade80' }}>{activeZone.constraints.wideningConstrained ? 'CONSTRAINED (DEMOLITION RISK)' : 'FEASIBLE'}</strong></div>
              </div>
            </div>

            {/* Recommended Interventions for this Zone */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                FEASIBLE INTERVENTION CANDIDATES FOR THIS ZONE
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeZone.recommendedCandidates.map((c) => (
                  <span
                    key={c}
                    style={{
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      fontWeight: 600,
                    }}
                  >
                    {c.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Diagnostic Evidence Points */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                DIAGNOSTIC EVIDENCE FROM REAL OSM NETWORK
              </span>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                {activeZone.evidence.map((ev, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>{ev}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
