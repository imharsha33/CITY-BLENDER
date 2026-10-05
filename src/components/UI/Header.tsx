import React from 'react';

export type MainNavigationMode = 'home' | 'flow' | 'build' | 'route';

interface HeaderProps {
  activeMode: MainNavigationMode;
  onSelectMode: (mode: MainNavigationMode) => void;
  onAboutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onSelectMode,
  onAboutClick,
}) => {
  return (
    <div className="floating-header">
      {/* Left: Brand, What City Blender Does & Back Button */}
      <div className="floating-header__left-group">
        <div
          className="floating-header__brand"
          onClick={() => onSelectMode('home')}
          style={{ cursor: 'pointer' }}
          title="Return to Front Page"
        >
          <img
            src="/images/city-blender-icon.png"
            alt="City Blender"
            className="brand-logo-img"
          />
          <div className="brand-text">
            <h1 className="brand-text__title">CITY BLENDER</h1>
            <span className="brand-text__tagline">Smart Traffic &amp; Civil Infrastructure Platform</span>
          </div>
        </div>

        {/* Back Button for the three subpages */}
        {activeMode !== 'home' && (
          <button
            className="nav-back-btn"
            onClick={() => onSelectMode('home')}
            title="Return to Front Page"
            id="header-back-btn"
          >
            <span className="back-arrow">←</span>
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Center: Main Mode Navigation strictly in the middle of nav bar */}
      <nav className="top-nav-pillars" aria-label="Main Application Modes">
        <button
          id="btn-nav-flow"
          className={`nav-single-btn ${activeMode === 'flow' ? 'nav-single-btn--active' : ''}`}
          onClick={() => onSelectMode('flow')}
          title="Flow"
        >
          Flow
        </button>

        <button
          id="btn-nav-build"
          className={`nav-single-btn ${activeMode === 'build' ? 'nav-single-btn--active' : ''}`}
          onClick={() => onSelectMode('build')}
          title="Build"
        >
          Build
        </button>

        <button
          id="btn-nav-route"
          className={`nav-single-btn ${activeMode === 'route' ? 'nav-single-btn--active' : ''}`}
          onClick={() => onSelectMode('route')}
          title="Route"
        >
          Route
        </button>
      </nav>

      {/* Right: About Button at nav bar at right side top */}
      <div className="floating-header__right-group">
        <button
          id="nav-btn-about"
          className="nav-about-btn"
          onClick={onAboutClick}
          title="About City Blender &amp; System Architecture"
        >
          About
        </button>
      </div>
    </div>
  );
};
