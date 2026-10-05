import React from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface TimelineControlsProps {
  isPlaying: boolean;
  onPlay:    () => void;
  onPause:   () => void;
  onReset:   () => void;
  onFast?:   () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onReset,
  onFast,
}) => {
  return (
    <div className="timeline-controls">
      <button
        id="btn-reset"
        className="tl-btn tl-btn--secondary"
        onClick={onReset}
        title="Reset to start"
      >
        <RotateCcw size={16} />
        <span>Reset</span>
      </button>

      <button
        id="btn-play-pause"
        className={`tl-btn tl-btn--primary ${isPlaying ? 'tl-btn--playing' : ''}`}
        onClick={isPlaying ? onPause : onPlay}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </button>

      {onFast && (
        <button
          id="btn-fast"
          className="tl-btn tl-btn--secondary"
          onClick={onFast}
          title="Fast forward"
        >
          <FastForward size={16} />
          <span>Fast</span>
        </button>
      )}
    </div>
  );
};
