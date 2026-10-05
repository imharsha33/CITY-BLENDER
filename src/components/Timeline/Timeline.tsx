import React from 'react';
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
      </div>

      {/* Lower row: Minimal Neumorphic Control Buttons */}
      <div className="timeline-controls-row">
        <button
          className="neumorphic-btn neumorphic-btn--control"
          onClick={onRewind}
          title="Rewind 10%"
        >
          <span className="btn-icon">◀</span>
          <span>REWIND</span>
        </button>

        <button
          className={`neumorphic-btn neumorphic-btn--control ${isPlaying ? 'neumorphic-btn--playing' : 'neumorphic-btn--primary'}`}
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
        >
          <span className="btn-icon">{isPlaying ? '❚❚' : '▶'}</span>
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          className="neumorphic-btn neumorphic-btn--control"
          onClick={onReset}
          title="Reset Simulation to Beginning"
        >
          <span className="btn-icon">↻</span>
          <span>RESET</span>
        </button>

        <button
          className={`neumorphic-btn neumorphic-btn--control ${isFast ? 'neumorphic-btn--active' : ''}`}
          onClick={onToggleFast}
          title="Toggle 2x Speed"
        >
          <span>{isFast ? '2x' : '1x'}</span>
        </button>
      </div>
    </div>
  );
};
