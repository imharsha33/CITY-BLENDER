import React, { useState } from 'react';
import { demoScenario, PHASE_LABELS } from '../../data/demoScenario';
import { getPhaseForProgress } from '../../engine/constructionEngine';

import type { InfrastructureScenario } from '../../types/infrastructure';

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
  const { startYear, endYear } = scenario.timeline;
  const phases = scenario.constructionPhases;
  
  // Resolve current active phase dynamically
  let activePhaseObj = phases[0];
  for (const ph of phases) {
    if (progress >= ph.timelineStart) {
      activePhaseObj = ph;
    }
  }
  const phaseLabel = activePhaseObj?.name ?? 'Construction';
  const pct = Math.round(progress * 100);

  if (isMinimized) {
    return (
      <div className="timeline-minimized-floating">
        <div className="realism-btn timeline-minimized-pill" onClick={() => setIsMinimized(false)}>
          <span style={{ fontSize: 14 }}>⏱️</span>
          <span><strong>{startYear}</strong> · {pct}%</span>
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
          <span className="expand-indicator" style={{ fontSize: 10, color: '#94a3b8' }}>▲ EXPAND</span>
        </div>
      </div>
    );
  }

  return (
    <div className="floating-timeline">
      {/* Upper row: Scrubber with 2026 and 2030 */}
      <div className="timeline-scrubber">
        <span className="timeline-scrubber__year">{startYear}</span>

        <div className="timeline-track-container">
          <input
            type="range"
            className="neumorphic-slider"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={e => onProgressChange(parseInt(e.target.value, 10) / 1000)}
            aria-label="Timeline progress"
          />

          {/* Subtle milestone tick dots */}
          <div className="timeline-milestones">
            {phases.map(ph => (
              <button
                key={ph.id}
                className={`timeline-milestone-dot ${activePhaseObj?.id === ph.id ? 'timeline-milestone-dot--active' : ''}`}
                style={{ left: `${ph.timelineStart * 100}%` }}
                title={`${ph.name} (${Math.round(ph.timelineStart * 100)}%)`}
                onClick={() => onProgressChange(ph.timelineStart + 0.001)}
              />
            ))}
          </div>
        </div>

        <span className="timeline-scrubber__year">{endYear}</span>

        {/* Current phase & percentage badge */}
        <div className="timeline-stage-tag">
          <span className="timeline-stage-tag__name">{phaseLabel}</span>
          <span className="timeline-stage-tag__pct">{pct}%</span>
        </div>

        {/* Minimize Button */}
        <button
          className="realism-btn realism-btn--icon"
          style={{ width: 24, height: 24, fontSize: 11, marginLeft: 6 }}
          onClick={() => setIsMinimized(true)}
          title="Minimize Timeline Player"
        >
          —
        </button>
      </div>

      {/* Lower row: Realism Neo-Tactile Control Buttons */}
      <div className="timeline-controls-row">
        <button
          className="realism-btn realism-btn--sm"
          onClick={onRewind}
          title="Rewind 10%"
        >
          <span className="btn-icon">◀</span>
          <span>REWIND</span>
        </button>

        <button
          className={`realism-btn realism-btn--sm ${isPlaying ? 'realism-btn--active' : ''}`}
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
        >
          <span className="btn-icon">{isPlaying ? '❚❚' : '▶'}</span>
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          className="realism-btn realism-btn--sm"
          onClick={onReset}
          title="Reset Simulation to Beginning"
        >
          <span className="btn-icon">↻</span>
          <span>RESET</span>
        </button>

        <button
          className={`realism-btn realism-btn--sm ${isFast ? 'realism-btn--active' : ''}`}
          onClick={onToggleFast}
          title="Toggle 2x Speed"
        >
          <span>{isFast ? '2x SPEED' : '1x SPEED'}</span>
        </button>
      </div>
    </div>
  );
};
