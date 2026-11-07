import React, { useState } from 'react';
import type { InfrastructureScenario } from '../../types/infrastructure';
import { demoScenario } from '../../data/demoScenario';

interface TimelineProps {
  progress: number;
  isPlaying: boolean;
  isFast: boolean;
  onProgressChange: (p: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onRewind: () => void;
  onToggleFast: () => void;
  scenario?: InfrastructureScenario;
}

interface CivilPhaseMeta {
  num: number;
  tag: string;
  name: string;
  detail: string;
  start: number;
  end: number;
  jump: number;
}

function getPhasesForScenario(scenario: InfrastructureScenario): CivilPhaseMeta[] {
  const type = scenario.upgrade?.type;

  if (type === 'flyover') {
    return [
      { num: 1, tag: 'Phase 1', name: 'Survey & Utilities', detail: 'Corridor utility mapping & traffic diversion slipways', start: 0.00, end: 0.20, jump: 0.10 },
      { num: 2, tag: 'Phase 2', name: 'Pile Foundations', detail: 'Deep bored cast-in-situ pier pile caps & plinths', start: 0.20, end: 0.40, jump: 0.30 },
      { num: 3, tag: 'Phase 3', name: 'Piers & Crossheads', detail: 'Twin reinforced pier columns & cantilever hammerhead bents', start: 0.40, end: 0.65, jump: 0.50 },
      { num: 4, tag: 'Phase 4', name: 'Deck & Paving', detail: 'Precast post-tensioned box girder deck & approach ramps', start: 0.65, end: 0.85, jump: 0.75 },
      { num: 5, tag: 'Phase 5', name: 'Operational Viaduct', detail: 'Grade-separated dual-level corridor commissioned with full flow', start: 0.85, end: 1.00, jump: 1.00 },
    ];
  }

  if (type === 'ring_road') {
    return [
      { num: 1, tag: 'Phase 1', name: 'Corridor Alignment', detail: 'Satellite alignment demarcation & peripheral boundary survey', start: 0.00, end: 0.20, jump: 0.10 },
      { num: 2, tag: 'Phase 2', name: 'Subgrade Earthwork', detail: 'Heavy cutting, embankment stabilization & subgrade compaction', start: 0.20, end: 0.40, jump: 0.30 },
      { num: 3, tag: 'Phase 3', name: 'Roundabout Nodes', detail: 'Multi-lane circulating roundabouts & radial connector avenues', start: 0.40, end: 0.65, jump: 0.50 },
      { num: 4, tag: 'Phase 4', name: '4-Lane Carriageway', detail: 'Dual divided asphalt wearing courses & Jersey median barrier', start: 0.65, end: 0.85, jump: 0.75 },
      { num: 5, tag: 'Phase 5', name: 'Continuous Beltway', detail: 'High-speed orbital bypass operational routing freight around core', start: 0.85, end: 1.00, jump: 1.00 },
    ];
  }

  // Default: 4-Lane Expressway Expansion
  return [
    { num: 1, tag: 'Phase 1', name: 'Corridor Survey', detail: 'Laser boundary marking & construction work-zone cones', start: 0.00, end: 0.20, jump: 0.10 },
    { num: 2, tag: 'Phase 2', name: 'Site Clearing', detail: 'Excavation, old pavement removal & subgrade drainage channels', start: 0.20, end: 0.40, jump: 0.30 },
    { num: 3, tag: 'Phase 3', name: 'Base & Median', detail: 'Aggregate base course compaction, stone curbs & median planter', start: 0.40, end: 0.65, jump: 0.50 },
    { num: 4, tag: 'Phase 4', name: 'Asphalt Pavement', detail: 'Dense bituminous wearing course laid across dual 2x2 lanes', start: 0.65, end: 0.85, jump: 0.75 },
    { num: 5, tag: 'Phase 5', name: 'Expressway Flow', detail: 'Divided 4-lane arterial open with LED lighting & overhead gantries', start: 0.85, end: 1.00, jump: 1.00 },
  ];
}

export const Timeline: React.FC<TimelineProps> = ({
  progress,
  isPlaying,
  isFast,
  onProgressChange,
  onPlay,
  onPause,
  onReset,
  onRewind,
  onToggleFast,
  scenario = demoScenario,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const phases = getPhasesForScenario(scenario);

  // Active Phase calculation
  const activePhase =
    phases.find(p => progress >= p.start && progress < p.end) ||
    phases[phases.length - 1];

  const pct = Math.round(progress * 100);

  if (isMinimized) {
    return (
      <div className="timeline-minimized-floating">
        <div
          className="realism-btn timeline-minimized-pill"
          onClick={() => setIsMinimized(false)}
          title="Expand Civil Engineering Progression Player"
        >
          <span style={{ fontSize: 14 }}>⏱️</span>
          <span>
            <strong>{activePhase.tag}: {activePhase.name}</strong> · {pct}%
          </span>
          <button
            className="realism-btn realism-btn--icon timeline-min-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              isPlaying ? onPause() : onPlay();
            }}
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <span className="expand-indicator" style={{ fontSize: 10, color: '#64748b' }}>
            ▲ EXPAND
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="floating-timeline">
      {/* ── Top Row: Phase 1, 2, 3, 4, 5 Interactive Progression Pills ── */}
      <div className="timeline-phases-bar" role="tablist" aria-label="Civil Construction Phases">
        {phases.map((ph) => {
          const isActive = activePhase.num === ph.num;
          const isPassed = progress >= ph.end;

          return (
            <button
              key={ph.num}
              role="tab"
              aria-selected={isActive}
              className={`phase-step-pill ${isActive ? 'phase-step-pill--active' : ''} ${isPassed ? 'phase-step-pill--completed' : ''}`}
              onClick={() => onProgressChange(ph.jump)}
              title={`${ph.tag}: ${ph.name}\n${ph.detail}`}
            >
              <div className="phase-step-pill__badge">
                {isPassed && !isActive ? '✓' : `P${ph.num}`}
              </div>
              <div className="phase-step-pill__info">
                <span className="phase-step-pill__num">{ph.tag}</span>
                <span className="phase-step-pill__title">{ph.name}</span>
              </div>
            </button>
          );
        })}

        {/* Minimize Button */}
        <button
          className="realism-btn realism-btn--icon phase-minimize-btn"
          onClick={() => setIsMinimized(true)}
          title="Minimize Phase Player"
          aria-label="Minimize"
        >
          —
        </button>
      </div>

      {/* ── Middle Row: Range Scrubber Track (Phase 1 → Phase 5) ── */}
      <div className="timeline-scrubber-row">
        <span className="timeline-phase-label timeline-phase-label--left">Phase 1</span>

        <div className="timeline-track-container">
          <input
            type="range"
            className="neumorphic-slider"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(e) => onProgressChange(parseInt(e.target.value, 10) / 1000)}
            aria-label="Civil Phase progress"
          />

          {/* Tick markers for each phase boundary */}
          <div className="timeline-milestones">
            {phases.map((ph) => (
              <button
                key={ph.num}
                className={`timeline-milestone-dot ${activePhase.num === ph.num ? 'timeline-milestone-dot--active' : ''}`}
                style={{ left: `${ph.start * 100}%` }}
                title={`${ph.tag}: ${ph.name}`}
                onClick={() => onProgressChange(ph.jump)}
              />
            ))}
            <div
              className="timeline-milestone-dot"
              style={{ left: '100%' }}
              title="Phase 5 Completed"
              onClick={() => onProgressChange(1.0)}
            />
          </div>
        </div>

        <span className="timeline-phase-label timeline-phase-label--right">Phase 5</span>

        {/* Current Active Phase Readout Badge */}
        <div className="timeline-stage-tag" title={activePhase.detail}>
          <span className="timeline-stage-tag__phase">{activePhase.tag}</span>
          <span className="timeline-stage-tag__name">{activePhase.name}</span>
          <span className="timeline-stage-tag__pct">{pct}%</span>
        </div>
      </div>

      {/* ── Bottom Row: Tactile Playback & Phase Controls ── */}
      <div className="timeline-controls-row">
        <button
          className="realism-btn realism-btn--sm"
          onClick={onRewind}
          title="Rewind Progress (-10%)"
        >
          <span className="btn-icon">◀</span>
          <span>REWIND</span>
        </button>

        <button
          className={`realism-btn realism-btn--sm ${isPlaying ? 'realism-btn--active' : ''}`}
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? 'Pause Simulation' : 'Play Civil Build Progression'}
        >
          <span className="btn-icon">{isPlaying ? '❚❚' : '▶'}</span>
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          className="realism-btn realism-btn--sm"
          onClick={onReset}
          title="Reset to Phase 1 Beginning"
        >
          <span className="btn-icon">↻</span>
          <span>RESET</span>
        </button>

        <button
          className={`realism-btn realism-btn--sm ${isFast ? 'realism-btn--active' : ''}`}
          onClick={onToggleFast}
          title="Toggle Simulation Speed (1x / 2x)"
        >
          <span>{isFast ? '2x SPEED' : '1x SPEED'}</span>
        </button>

        {/* Quick jump to Completed Phase 5 */}
        <button
          className={`realism-btn realism-btn--sm ${progress >= 0.98 ? 'realism-btn--active' : ''}`}
          onClick={() => onProgressChange(1.0)}
          title="Jump directly to Completed Infrastructure View (Phase 5)"
          style={{ marginLeft: 'auto' }}
        >
          <span className="btn-icon">⚡</span>
          <span>PHASE 5 COMPLETE</span>
        </button>
      </div>
    </div>
  );
};
