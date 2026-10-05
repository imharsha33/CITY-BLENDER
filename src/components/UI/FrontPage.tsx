import React, { useState } from 'react';
import type { MainNavigationMode } from './Header';
import './FrontPage.css';

interface FrontPageProps {
  onSelectMode: (mode: MainNavigationMode) => void;
  onScrollToDocs: () => void;
}

export const FrontPage: React.FC<FrontPageProps> = ({ onSelectMode, onScrollToDocs }) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'build' | 'route'>('flow');

  return (
    <div className="front-page-container">
      {/* ── Main Front Page Design (Hero matching the user-provided resource) ── */}
      <section className="front-main-hero">
        <div className="hero-banner-frame">
          <img
            src="/images/city-hero.png"
            alt="City Blender — Civil Infrastructure & Smart Mobility Platform"
            className="hero-banner-img"
          />
          <div className="hero-overlay-bar">
            <div className="hero-tagline-wrap">
              <span className="hero-subbadge">CIVIL INFRASTRUCTURE &amp; SMART MOBILITY PLATFORM</span>
              <p className="hero-desc">
                Flow, Build, Route — An integrated civil intelligence workstation combining embedded piezoresistive sensing, generative road corridor planning, and real-world 3D geospatial digital twins.
              </p>
            </div>
            <div className="front-hero-actions">
              <button
                id="hero-launch-flow"
                className="front-hero-btn front-hero-btn--primary"
                onClick={() => onSelectMode('flow')}
              >
                <span>Launch Flow</span>
                <span className="btn-arrow">→</span>
              </button>
              <button
                id="hero-launch-build"
                className="front-hero-btn front-hero-btn--secondary"
                onClick={() => onSelectMode('build')}
              >
                <span>Explore Build</span>
                <span className="btn-arrow">→</span>
              </button>
              <button
                id="hero-launch-route"
                className="front-hero-btn front-hero-btn--secondary"
                onClick={() => onSelectMode('route')}
              >
                <span>Open Route Twin</span>
                <span className="btn-arrow">→</span>
              </button>
              <button
                className="front-hero-btn front-hero-btn--ghost"
                onClick={onScrollToDocs}
              >
                <span>System Specs ↓</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Spotlight Tabs & Infographic Viewer ── */}
      <section className="front-spotlight-section">
        <div className="spotlight-tab-bar">
          <button
            className={`spotlight-tab ${activeTab === 'flow' ? 'spotlight-tab--active' : ''}`}
            onClick={() => setActiveTab('flow')}
          >
            <span className="tab-idx">01</span>
            <span className="tab-name">FLOW — SENSING &amp; TRAFFIC</span>
          </button>
          <button
            className={`spotlight-tab ${activeTab === 'build' ? 'spotlight-tab--active' : ''}`}
            onClick={() => setActiveTab('build')}
          >
            <span className="tab-idx">02</span>
            <span className="tab-name">BUILD — CIVIL CORRIDORS</span>
          </button>
          <button
            className={`spotlight-tab ${activeTab === 'route' ? 'spotlight-tab--active' : ''}`}
            onClick={() => setActiveTab('route')}
          >
            <span className="tab-idx">03</span>
            <span className="tab-name">ROUTE — DIGITAL TWIN</span>
          </button>
        </div>

        {/* Tab 1: FLOW Spotlight */}
        {activeTab === 'flow' && (
          <div className="spotlight-display-card">
            <div className="spotlight-image-container">
              <img
                src="/images/flow-infographic.png"
                alt="Smart Traffic Flow Infographic"
                className="spotlight-image"
                loading="eager"
              />
              <div className="spotlight-overlay-action">
                <button
                  className="spotlight-launch-btn"
                  onClick={() => onSelectMode('flow')}
                >
                  <span>Enter 3D Flow Simulation</span>
                  <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
            <div className="spotlight-meta-bar">
              <div className="meta-info">
                <span className="meta-tag">PIEZORESISTIVE SENSORS</span>
                <span className="meta-desc">Sub-surface axle pressure transducers measure resistance shift (ΔR/R) to adaptively balance green signals.</span>
              </div>
              <button
                className="meta-action-btn"
                onClick={() => onSelectMode('flow')}
              >
                Launch Flow Mode →
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: BUILD Spotlight */}
        {activeTab === 'build' && (
          <div className="spotlight-display-card">
            <div className="spotlight-image-container">
              <img
                src="/images/build-stage.png"
                alt="Smart City Traffic Build Stage"
                className="spotlight-image"
                loading="eager"
              />
              <div className="spotlight-overlay-action">
                <button
                  className="spotlight-launch-btn"
                  onClick={() => onSelectMode('build')}
                >
                  <span>Enter 3D Build Simulation</span>
                  <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
            <div className="spotlight-meta-bar">
              <div className="meta-info">
                <span className="meta-tag">CIVIL CORRIDOR PLANNING</span>
                <span className="meta-desc">4-Lane Carriageway, Elevated Flyover Viaduct, and Orbital Ring Road multi-phase construction progression.</span>
              </div>
              <button
                className="meta-action-btn"
                onClick={() => onSelectMode('build')}
              >
                Launch Build Mode →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: ROUTE Spotlight */}
        {activeTab === 'route' && (
          <div className="spotlight-display-card">
            <div className="spotlight-image-container">
              <img
                src="/images/route-dashboard.png"
                alt="Smart Traffic Route Optimization Dashboard"
                className="spotlight-image"
                loading="eager"
              />
              <div className="spotlight-overlay-action">
                <button
                  className="spotlight-launch-btn"
                  onClick={() => onSelectMode('route')}
                >
                  <span>Enter 3D Route Twin</span>
                  <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
            <div className="spotlight-meta-bar">
              <div className="meta-info">
                <span className="meta-tag">3D DIGITAL TWIN &amp; A* ROUTING</span>
                <span className="meta-desc">Real-world metropolitan digital twins with graph topology, bottleneck capacity audits, and dynamic route calculation.</span>
              </div>
              <button
                className="meta-action-btn"
                onClick={() => onSelectMode('route')}
              >
                Launch Route Mode →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Three Pillars Tri-Card Grid ── */}
      <section className="front-pillars-grid">
        {/* Pillar 1: FLOW */}
        <div
          id="card-flow"
          className="front-pillar-card front-pillar-card--flow"
          onClick={() => onSelectMode('flow')}
        >
          <div className="pillar-card-image-wrap">
            <img
              src="/images/flow-infographic.png"
              alt="Flow Infographic Preview"
              className="pillar-card-img"
              loading="lazy"
            />
            <span className="pillar-card-badge">01 FLOW</span>
          </div>
          <div className="pillar-content">
            <div className="pillar-tag-row">
              <span className="pillar-chevron">&gt;</span>
              <span className="pillar-tag">SENSING &amp; TRAFFIC</span>
            </div>
            <h2 className="pillar-title">FLOW</h2>
            <p className="pillar-description">
              Sub-surface piezoresistive sensor transducer arrays detect vehicle axle pressure to adaptively balance green signal phases.
            </p>
            <ul className="pillar-features">
              <li><span>✓</span> Sub-surface piezoresistive transducer arrays</li>
              <li><span>✓</span> TCU Adaptive real-time phase controller</li>
              <li><span>✓</span> 4-approach live queue &amp; axle stress (MPa)</li>
              <li><span>✓</span> Class I–IV vehicular weight classification</li>
            </ul>
            <div className="pillar-cta">
              <span className="pillar-cta-text">Launch Flow Mode</span>
              <span className="pillar-cta-arrow">→</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: BUILD */}
        <div
          id="card-build"
          className="front-pillar-card front-pillar-card--build"
          onClick={() => onSelectMode('build')}
        >
          <div className="pillar-card-image-wrap">
            <img
              src="/images/build-stage.png"
              alt="Build Stage Preview"
              className="pillar-card-img"
              loading="lazy"
            />
            <span className="pillar-card-badge">02 BUILD</span>
          </div>
          <div className="pillar-content">
            <div className="pillar-tag-row">
              <span className="pillar-chevron">&gt;</span>
              <span className="pillar-tag">CIVIL INFRASTRUCTURE</span>
            </div>
            <h2 className="pillar-title">BUILD</h2>
            <p className="pillar-description">
              Interactive 3D simulation of critical civil infrastructure: 4-Lane Highway, Elevated Flyover, and Ring Road with timeline scrubber.
            </p>
            <ul className="pillar-features">
              <li><span>✓</span> 4-Lane Divided Arterial Carriageway</li>
              <li><span>✓</span> Elevated Flyover Viaduct Grade Separation</li>
              <li><span>✓</span> Peripheral Orbital Ring Road Bypass</li>
              <li><span>✓</span> Interactive Construction Timeline Scrubber</li>
            </ul>
            <div className="pillar-cta">
              <span className="pillar-cta-text">Launch Build Mode</span>
              <span className="pillar-cta-arrow">→</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: ROUTE */}
        <div
          id="card-route"
          className="front-pillar-card front-pillar-card--route"
          onClick={() => onSelectMode('route')}
        >
          <div className="pillar-card-image-wrap">
            <img
              src="/images/route-dashboard.png"
              alt="Route Optimization Preview"
              className="pillar-card-img"
              loading="lazy"
            />
            <span className="pillar-card-badge">03 ROUTE</span>
          </div>
          <div className="pillar-content">
            <div className="pillar-tag-row">
              <span className="pillar-chevron">&gt;</span>
              <span className="pillar-tag">DIGITAL TWIN &amp; GIS</span>
            </div>
            <h2 className="pillar-title">ROUTE</h2>
            <p className="pillar-description">
              Real-location 3D metropolitan digital twins powered by live geospatial data with dynamic Dijkstra &amp; A* optimal routes.
            </p>
            <ul className="pillar-features">
              <li><span>✓</span> Madurai, Siddipet, Nellore &amp; Varkala twins</li>
              <li><span>✓</span> GeoJSON map import &amp; building extrusions</li>
              <li><span>✓</span> Capacity deficit &amp; junction safety audit</li>
              <li><span>✓</span> Multi-objective shortest vs. recommended routing</li>
            </ul>
            <div className="pillar-cta">
              <span className="pillar-cta-text">Launch Route Mode</span>
              <span className="pillar-cta-arrow">→</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Metrics Strip ── */}
      <section className="front-metrics-strip">
        <div className="metric-box">
          <span className="metric-num">04</span>
          <span className="metric-label">Incoming Approaches</span>
          <span className="metric-sub">North · East · South · West</span>
        </div>
        <div className="metric-divider" />
        <div className="metric-box">
          <span className="metric-num">03</span>
          <span className="metric-label">Civil Infrastructure Models</span>
          <span className="metric-sub">Highway · Flyover · Ring Road</span>
        </div>
        <div className="metric-divider" />
        <div className="metric-box">
          <span className="metric-num">A*</span>
          <span className="metric-label">Dynamic Routing Engine</span>
          <span className="metric-sub">Real-Time Sensor Edge Weights</span>
        </div>
        <div className="metric-divider" />
        <div className="metric-box">
          <span className="metric-num">60</span>
          <span className="metric-label">FPS WebGL Engine</span>
          <span className="metric-sub">Hardware Accelerated 3D Twin</span>
        </div>
      </section>
    </div>
  );
};
