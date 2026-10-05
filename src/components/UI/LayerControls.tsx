import React, { useState, useRef, useEffect } from 'react';
import type { LayerVisibility } from '../../types/geo';

interface LayerControlsProps {
  layers: LayerVisibility;
  onChange: (layers: LayerVisibility) => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({ layers, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggle = (key: keyof LayerVisibility) => {
    onChange({
      ...layers,
      [key]: !layers[key],
    });
  };

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="dropdown-wrap" ref={containerRef}>
      <button
        className={`neumorphic-btn neumorphic-btn--sm ${isOpen ? 'neumorphic-btn--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Geographic Layers"
      >
        <span className="btn-label">LAYERS</span>
        <span className="btn-value">{activeCount}/4 ▾</span>
      </button>

      {isOpen && (
        <div className="neumorphic-menu layer-menu">
          <button
            className={`layer-menu__item ${layers.roads ? 'layer-menu__item--active' : ''}`}
            onClick={() => toggle('roads')}
          >
            <span>Roads</span>
            <span>{layers.roads ? '✓' : '—'}</span>
          </button>
          <button
            className={`layer-menu__item ${layers.buildings ? 'layer-menu__item--active' : ''}`}
            onClick={() => toggle('buildings')}
          >
            <span>Buildings</span>
            <span>{layers.buildings ? '✓' : '—'}</span>
          </button>
          <button
            className={`layer-menu__item ${layers.water ? 'layer-menu__item--active' : ''}`}
            onClick={() => toggle('water')}
          >
            <span>Water Bodies</span>
            <span>{layers.water ? '✓' : '—'}</span>
          </button>
          <button
            className={`layer-menu__item ${layers.pois ? 'layer-menu__item--active' : ''}`}
            onClick={() => toggle('pois')}
          >
            <span>POIs & Facilities</span>
            <span>{layers.pois ? '✓' : '—'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
