import React from 'react';
import './ProjectInfoSection.css';

interface ProjectInfoSectionProps {
  onScrollToTop?: () => void;
}

export const ProjectInfoSection: React.FC<ProjectInfoSectionProps> = ({ onScrollToTop }) => {
  return (
    <section className="project-info-section" id="project-overview">
      <div className="project-info-container">
        {/* Navigation & Header Anchor */}
        <div className="project-info-topbar">
          <div className="project-info-badge">
            <span className="badge-pulse-indicator" />
            <span>SMART MOBILITY SPECIFICATION · CIVIL ARCHITECTURE</span>
          </div>
          {onScrollToTop && (
            <button className="project-back-to-sim-btn" onClick={onScrollToTop} title="Scroll back to 3D digital twin">
              <span>▲ RETURN TO 3D SIMULATION</span>
            </button>
          )}
        </div>

        {/* Hero Title */}
        <div className="project-info-hero">
          <h1 className="project-info-hero__title">
            <span className="hero-gradient-text">Flow, Build, Route</span>
          </h1>
          <p className="project-info-hero__subtitle">
            Smart Traffic Management, Embedded Piezoresistive Sensing &amp; Dynamic Route Optimization System
          </p>
        </div>

        {/* 1. Executive Concept & Summary Grid */}
        <div className="concept-exec-grid">
          <div className="project-card concept-card">
            <div className="card-badge">
              <span style={{ fontSize: 14 }}>🚦</span>
              <span>PROJECT CONCEPT</span>
            </div>
            <h2 className="card-title">Flow, Build, Route</h2>
            <p className="card-lead">
              <strong>Flow, Build, Route</strong> is a smart-city traffic system that uses piezoresistive sensors embedded beneath roads at traffic junctions to detect vehicles and estimate traffic density. The collected traffic telemetry is used to dynamically control traffic signals and synthesize an optimized dynamic road network for selecting efficient routes.
            </p>
          </div>

          <div className="project-card one-sentence-card">
            <div className="card-badge">
              <span style={{ fontSize: 14 }}>🧠</span>
              <span>EXECUTIVE DEFINITION</span>
            </div>
            <h2 className="card-title">In One Sentence</h2>
            <blockquote className="one-sentence-quote">
              “Flow, Build, Route is a smart traffic-management system that senses vehicle flow using piezoresistive road sensors, builds a dynamic representation of the road network using traffic density, and determines optimized routes and traffic-signal timings based on real-time congestion.”
            </blockquote>
          </div>
        </div>

        {/* 2. Overall Flow Pipeline */}
        <div className="project-card pipeline-card">
          <div className="card-badge">
            <span style={{ fontSize: 14 }}>🔄</span>
            <span>SYSTEM PIPELINE</span>
          </div>
          <h2 className="card-title">Overall System Flow</h2>
          
          <div className="flow-steps-pipeline">
            <div className="pipeline-node">
              <span className="node-icon">🚗</span>
              <span className="node-label">Vehicle</span>
            </div>
            <span className="pipeline-arrow">→</span>
            <div className="pipeline-node">
              <span className="node-icon">⚡</span>
              <span className="node-label">Piezoresistive Sensor</span>
            </div>
            <span className="pipeline-arrow">→</span>
            <div className="pipeline-node">
              <span className="node-icon">📊</span>
              <span className="node-label">Traffic Density</span>
            </div>
            <span className="pipeline-arrow">→</span>
            <div className="pipeline-node">
              <span className="node-icon">🎛️</span>
              <span className="node-label">Junction Controller</span>
            </div>
            <span className="pipeline-arrow">→</span>
            <div className="pipeline-node">
              <span className="node-icon">🚥</span>
              <span className="node-label">Signal Optimization</span>
            </div>
            <span className="pipeline-arrow">→</span>
            <div className="pipeline-node">
              <span className="node-icon">🗺️</span>
              <span className="node-label">Road Network</span>
            </div>
            <span className="pipeline-arrow">→</span>
            <div className="pipeline-node highlight">
              <span className="node-icon">🏁</span>
              <span className="node-label">Best Route</span>
            </div>
          </div>
        </div>

        {/* Three Core Pillars Grid */}
        <div className="pillars-grid">
          {/* Pillar 1: FLOW */}
          <div className="pillar-card pillar-flow">
            <div className="pillar-header">
              <div className="pillar-number">1</div>
              <div>
                <span className="pillar-tag">SENSING LAYER</span>
                <h3 className="pillar-title">FLOW — Detect Traffic</h3>
              </div>
            </div>

            <p className="pillar-desc">
              Piezoresistive sensors are placed underneath each incoming road near a junction.
            </p>

            <div className="pillar-callout">
              <span className="callout-title">When a vehicle passes over the sensor:</span>
              <ul className="callout-list">
                <li><strong>Pressure is applied</strong> to the sensor roadbed.</li>
                <li>Its <strong>electrical resistance changes</strong> proportionally (ΔR/R).</li>
                <li>The system <strong>detects the presence</strong> and axle weight of the vehicle.</li>
                <li>Multiple detections are aggregated to <strong>estimate real-time traffic queue density</strong>.</li>
              </ul>
            </div>

            <div className="approach-density-example-box">
              <span className="example-box-title">Real-Time Approach Queue Density Example:</span>
              <div className="approach-density-bars">
                <div className="density-bar-row">
                  <span className="density-road-name">North Road</span>
                  <div className="density-bar-track">
                    <div className="density-bar-fill fill-high" style={{ width: '85%' }} />
                  </div>
                  <span className="density-road-val high">25 vehicles (Highest Traffic)</span>
                </div>
                <div className="density-bar-row">
                  <span className="density-road-name">West Road</span>
                  <div className="density-bar-track">
                    <div className="density-bar-fill fill-med-high" style={{ width: '60%' }} />
                  </div>
                  <span className="density-road-val">18 vehicles</span>
                </div>
                <div className="density-bar-row">
                  <span className="density-road-name">East Road</span>
                  <div className="density-bar-track">
                    <div className="density-bar-fill fill-med" style={{ width: '40%' }} />
                  </div>
                  <span className="density-road-val">12 vehicles</span>
                </div>
                <div className="density-bar-row">
                  <span className="density-road-name">South Road</span>
                  <div className="density-bar-track">
                    <div className="density-bar-fill fill-low" style={{ width: '20%' }} />
                  </div>
                  <span className="density-road-val low">5 vehicles (Lowest Traffic)</span>
                </div>
              </div>
              <p className="example-footer-note">
                The Traffic Control Unit immediately knows which direction has the highest traffic demand.
              </p>
            </div>
          </div>

          {/* Pillar 2: BUILD */}
          <div className="pillar-card pillar-build">
            <div className="pillar-header">
              <div className="pillar-number">2</div>
              <div>
                <span className="pillar-tag">GRAPH MODELING</span>
                <h3 className="pillar-title">BUILD — Build the Traffic Network</h3>
              </div>
            </div>

            <p className="pillar-desc">
              The city is mathematically structured as a dynamic, weighted topological graph:
            </p>

            <div className="graph-definitions">
              <div className="graph-def-item">
                <span className="def-badge">Nodes</span>
                <span className="def-label">Junctions = Intersection Vertices</span>
              </div>
              <div className="graph-def-item">
                <span className="def-badge">Edges</span>
                <span className="def-label">Roads = Corridors Connecting Nodes</span>
              </div>
              <div className="graph-def-item">
                <span className="def-badge">Weights</span>
                <span className="def-label">Traffic Density = Dynamic Edge Weight</span>
              </div>
            </div>

            {/* Visual Graph Diagram */}
            <div className="graph-diagram-box">
              <span className="graph-diagram-title">Dynamic Weighted City Graph Topology:</span>
              <div className="graph-svg-container">
                <svg viewBox="0 0 340 180" className="graph-svg">
                  {/* Edges */}
                  <line x1="60" y1="130" x2="170" y2="40" stroke="#cbd5e1" strokeWidth="3" />
                  <line x1="170" y1="40" x2="280" y2="130" stroke="#cbd5e1" strokeWidth="3" />
                  <line x1="60" y1="130" x2="280" y2="130" stroke="#10b981" strokeWidth="4" />

                  {/* Weight Pills */}
                  <rect x="90" y="65" width="46" height="22" rx="4" fill="#ef4444" />
                  <text x="113" y="80" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">20 High</text>

                  <rect x="205" y="65" width="46" height="22" rx="4" fill="#f59e0b" />
                  <text x="228" y="80" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">10 Med</text>

                  <rect x="145" y="138" width="50" height="22" rx="4" fill="#10b981" />
                  <text x="170" y="153" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">5 Low</text>

                  {/* Nodes */}
                  <circle cx="60" cy="130" r="22" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                  <text x="60" y="135" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">J1</text>

                  <circle cx="170" cy="40" r="22" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                  <text x="170" y="45" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">J2</text>

                  <circle cx="280" cy="130" r="22" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                  <text x="280" y="135" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">J3</text>
                </svg>
              </div>
              <p className="graph-note">
                If traffic increases on a road, its edge weight increases in real time. The digital twin continuously reflects actual ground conditions.
              </p>
            </div>
          </div>

          {/* Pillar 3: ROUTE */}
          <div className="pillar-card pillar-route">
            <div className="pillar-header">
              <div className="pillar-number">3</div>
              <div>
                <span className="pillar-tag">ALGORITHMIC OPTIMIZATION</span>
                <h3 className="pillar-title">ROUTE — Find the Best Route</h3>
              </div>
            </div>

            <p className="pillar-desc">
              When a vehicle requests routing from <strong>J1 → J5</strong>, the engine evaluates available corridors based on real-time traffic conditions rather than static distance alone.
            </p>

            <div className="route-comparison-cards">
              <div className="route-card route-card--congested">
                <span className="route-card__status">SHORTEST PHYSICAL ROUTE</span>
                <h4 className="route-card__path">J1 → J2 → J5</h4>
                <div className="route-card__meta">
                  <span>Distance: <strong>4 km</strong></span>
                  <span className="traffic-pill high">Traffic: HIGH (Heavy Delay)</span>
                </div>
                <span className="route-card__verdict reject">✕ Rejected due to queue bottleneck</span>
              </div>

              <div className="route-card route-card--recommended">
                <span className="route-card__status recommend">RECOMMENDED BEST ROUTE</span>
                <h4 className="route-card__path">J1 → J3 → J4 → J5</h4>
                <div className="route-card__meta">
                  <span>Distance: <strong>5 km</strong></span>
                  <span className="traffic-pill low">Traffic: LOW (Smooth Flow)</span>
                </div>
                <span className="route-card__verdict accept">✓ Selected: Faster travel time &amp; zero idle emissions</span>
              </div>
            </div>

            <div className="route-algorithm-box">
              <span className="algo-icon">⚙️</span>
              <p>
                <strong>Routing Algorithms:</strong> Graph search algorithms such as <strong>Dijkstra's Algorithm</strong> and <strong>A* (A-Star)</strong> evaluate cost function: <br />
                <code>Cost = α · Distance + β · Dynamic_Traffic_Density(Piezoresistive)</code>
              </p>
            </div>
          </div>
        </div>

        {/* 4. Dynamic Traffic Signal Control Deep Dive */}
        <div className="project-card signal-control-card">
          <div className="card-badge">
            <span style={{ fontSize: 14 }}>🚥</span>
            <span>ACTUATION ALGORITHM</span>
          </div>
          <h2 className="card-title">Dynamic Traffic Signal Control</h2>
          <p className="card-lead">
            The same sub-surface piezoresistive sensor telemetry directly actuates localized intersection signal timing:
          </p>

          <div className="signal-flowchart-grid">
            <div className="flowchart-visual">
              <div className="flow-box flow-box--trigger">HIGH TRAFFIC DETECTED</div>
              <div className="flow-down-arrow">↓</div>
              <div className="flow-box flow-box--calc">
                <strong>Traffic Density Calculation</strong>
                <span>Axle pressure count &amp; approach occupancy</span>
              </div>
              <div className="flow-down-arrow">↓</div>
              <div className="flow-box flow-box--opt">
                <strong>Signal Timing Optimization</strong>
                <span>Adaptive phase allocation: T_green = T_base + k · Density</span>
              </div>
              <div className="flow-down-arrow">↓</div>
              <div className="flow-box flow-box--result">
                <strong>Longer GREEN Signal (e.g. 45s vs 15s)</strong>
                <span>Clears congestion queue without spillback</span>
              </div>
            </div>

            <div className="signal-principles-list">
              <div className="principle-item">
                <span className="principle-icon">⚡</span>
                <div>
                  <strong>Adaptive Green Phase Allocation:</strong>
                  <p>If one approach has significantly more vehicles (e.g. North Road with 25 vehicles), the Traffic Control Unit allocates longer green duration (45s) to flush the queue.</p>
                </div>
              </div>
              <div className="principle-item">
                <span className="principle-icon">🛑</span>
                <div>
                  <strong>Zero-Wait Low-Traffic Approaches:</strong>
                  <p>Approaches with low traffic (e.g. South Road with 5 vehicles) receive shorter green duration (15s), preventing cross-traffic from waiting unnecessarily at empty intersections.</p>
                </div>
              </div>
              <div className="principle-item">
                <span className="principle-icon">🌐</span>
                <div>
                  <strong>Network Topology Synchronization:</strong>
                  <p>Adjacent junctions communicate telemetry to establish dynamic green-wave corridors along heavily utilized arterial axes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* 6. Complete Component Meaning & Function Table */}
        <div className="project-card table-card">
          <div className="card-badge">
            <span style={{ fontSize: 14 }}>⭐</span>
            <span>SYSTEM ARCHITECTURE</span>
          </div>
          <h2 className="card-title">The Three Words Represent the Complete Idea</h2>

          <div className="table-wrapper">
            <table className="architecture-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Component</th>
                  <th style={{ width: '28%' }}>Meaning</th>
                  <th style={{ width: '54%' }}>Function</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="comp-badge comp-flow">FLOW</span>
                  </td>
                  <td><strong>Vehicle Flow</strong></td>
                  <td>Detect vehicles &amp; calculate real-time approach traffic density using sub-surface piezoresistive sensor arrays.</td>
                </tr>
                <tr>
                  <td>
                    <span className="comp-badge comp-build">BUILD</span>
                  </td>
                  <td><strong>Network Building</strong></td>
                  <td>Convert physical roads and intersections into a continuous, weighted dynamic graph digital twin.</td>
                </tr>
                <tr>
                  <td>
                    <span className="comp-badge comp-route">ROUTE</span>
                  </td>
                  <td><strong>Route Optimization</strong></td>
                  <td>Find the least-congested, most efficient route using heuristic graph algorithms (Dijkstra / A*) and actuate dynamic signal timing.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="table-bottom-conclusion">
            <span className="conclusion-tag">INTEGRATED ENGINEERING ADVANTAGE</span>
            <p>
              This architecture makes the project more than just an IoT traffic-light system — it seamlessly unifies <strong>embedded piezoresistive sensing</strong> + <strong>dynamic graph modeling</strong> + <strong>AI/algorithmic traffic optimization</strong> + <strong>real-time route planning</strong>.
            </p>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="project-info-footer">
          <div className="footer-brand">
            <strong>CITY BLENDER</strong> · Civil Infrastructure &amp; Smart Mobility Digital Twin
          </div>
          {onScrollToTop && (
            <button className="project-back-to-sim-btn" onClick={onScrollToTop}>
              ▲ Return to 3D Simulation
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
