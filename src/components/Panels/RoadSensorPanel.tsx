import React, { useState, useEffect } from 'react';
import type { SignalJunctionTelemetry } from '../Scene/SmartSignalJunction';

interface RoadSensorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: SignalJunctionTelemetry;
  onTriggerPress: (approach?: 'north' | 'east' | 'south' | 'west') => void;
  onFocusCamera: (preset: 'overview' | 'sensor_cutaway' | 'control_unit' | 'north_queue') => void;
  onToggleAdaptive: (enabled: boolean) => void;
}

export const RoadSensorPanel: React.FC<RoadSensorPanelProps> = ({
  isOpen,
  onClose,
  telemetry,
  onTriggerPress,
  onFocusCamera,
  onToggleAdaptive,
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'classification' | 'cutaway'>('telemetry');
  const [pressedEffect, setPressedEffect] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Reset minimized state when panel is opened fresh
  useEffect(() => {
    if (isOpen) setIsMinimized(false);
  }, [isOpen]);

  const handleTestPress = () => {
    onTriggerPress('north');
    setPressedEffect(true);
    setTimeout(() => setPressedEffect(false), 800);
  };

  const reading = telemetry.latestSensorReading;

  // Not open at all → hide everything
  if (!isOpen) return null;

  // Minimized pill
  if (isMinimized) {
    return (
      <div className="road-sensor-floating-minimized">
        <button
          className="realism-btn realism-btn--active road-sensor-restore-btn"
          onClick={() => setIsMinimized(false)}
          title="Click to Expand Smart Signal Junction & Telemetry Panel"
        >
          <span style={{ fontSize: 15 }}>🚥</span>
          <span className="road-sensor-min-title">TCU TELEMETRY</span>
          <span className="road-sensor-min-phase">
            PHASE: <strong>{telemetry.currentPhase}</strong> ({telemetry.phaseTimeRemaining}s)
          </span>
          <span className="road-sensor-min-expand">▲ EXPAND</span>
        </button>
      </div>
    );
  }

  // Calculate live vehicle counts across approaches
  const northVehicles = Math.round(telemetry.approaches.north.densityVehPerHour * 0.52);
  const eastVehicles = Math.round(telemetry.approaches.east.densityVehPerHour * 0.55);
  const southVehicles = Math.round(telemetry.approaches.south.densityVehPerHour * 0.62);
  const westVehicles = Math.round(telemetry.approaches.west.densityVehPerHour * 0.60);
  const totalInQueue = northVehicles + eastVehicles + southVehicles + westVehicles;

  return (
    <div className="road-sensor-panel-root">
      {/* Panel Header */}
      <div className="road-sensor-header">
        <div className="road-sensor-title-wrap">
          <div className="road-sensor-badge">
            <span className="road-sensor-pulse-dot" />
            <span>TCU · SENSORS</span>
          </div>
          <h2 className="road-sensor-title">Smart Junction Telemetry</h2>
        </div>
        <div className="road-sensor-header-actions">
          <button
            className={`realism-btn realism-btn--sm road-sensor-test-btn ${pressedEffect ? 'realism-btn--active' : ''}`}
            onClick={handleTestPress}
            title="Simulate vehicle passing over the piezoresistive sensor"
          >
            <span>⚡ Test Axle</span>
          </button>
          <button
            className="realism-btn realism-btn--icon road-sensor-min-btn"
            onClick={() => setIsMinimized(true)}
            title="Minimize Panel"
          >
            —
          </button>
          <button
            className="realism-btn realism-btn--icon road-sensor-close-btn"
            onClick={onClose}
            title="Close Panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Primary KPI & Signal Classification Banner */}
      <div className="tcu-status-strip">
        <div className="tcu-status-pill">
          <span className="tcu-status-label">PHASE</span>
          <span className={`tcu-status-value ${telemetry.currentPhase === 'NORTH_SOUTH' ? 'phase-ns' : 'phase-ew'}`}>
            {telemetry.currentPhase === 'NORTH_SOUTH' ? '🟢 N-S (GREEN)' : '🔴 E-W'}
          </span>
        </div>
        <div className="tcu-status-pill">
          <span className="tcu-status-label">REMAINING</span>
          <span className="tcu-status-value highlight-timer">{telemetry.phaseTimeRemaining}s</span>
        </div>
        <div className="tcu-status-pill">
          <span className="tcu-status-label">MODE</span>
          <span className="tcu-status-value">{telemetry.adaptiveMode ? 'Adaptive' : 'Fixed'}</span>
        </div>
        <div className="tcu-status-pill">
          <span className="tcu-status-label">QUEUE</span>
          <span className="tcu-status-value" style={{ color: '#10b981' }}>{totalInQueue} Veh</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="road-sensor-tabs">
        <button
          className={`road-sensor-tab ${activeTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('telemetry');
            onFocusCamera('overview');
          }}
        >
          <span>Approaches</span>
        </button>
        <button
          className={`road-sensor-tab ${activeTab === 'classification' ? 'active' : ''}`}
          onClick={() => setActiveTab('classification')}
        >
          <span>Vehicles</span>
        </button>
        <button
          className={`road-sensor-tab ${activeTab === 'cutaway' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('cutaway');
            onFocusCamera('sensor_cutaway');
          }}
        >
          <span>Sensor Strata</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="road-sensor-body">
        {/* Tab 1: 4 Approaches Density & Live Queue Metrics */}
        {activeTab === 'telemetry' && (
          <div className="approaches-grid">
            {/* North Approach */}
            <div className={`approach-card approach-card--north ${telemetry.approaches.north.currentSignal.toLowerCase()}`}>
              <div className="approach-card-top">
                <div className="approach-identity">
                  <span className="approach-code">APPROACH N-01</span>
                  <h4 className="approach-name">North Corridor (Primary Arterial)</h4>
                </div>
                <span className={`approach-signal-indicator ${telemetry.approaches.north.currentSignal.toLowerCase()}`}>
                  {telemetry.approaches.north.currentSignal}
                </span>
              </div>

              <div className="approach-density-pill">
                <span className="density-tag-name">Queue Density:</span>
                <span className="density-val density-val--high">
                  HIGH · {northVehicles} Vehicles in Queue
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Signal Allocation:</span>
                <span className="app-metric-val green-highlight">
                  {telemetry.approaches.north.assignedGreenSeconds}s Green (Max Priority)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Axle Stress / Resistance:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.north.activeSensorPressureMpa} MPa (ΔR: {telemetry.approaches.north.resistanceChangePercent}%)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Approach Flow:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.north.densityVehPerHour} PCU/hr (88% Saturation)
                </span>
              </div>

              <button
                className="realism-btn realism-btn--sm approach-trigger-btn"
                onClick={() => onTriggerPress('north')}
                title="Trigger vehicle passing over North piezoresistive array"
              >
                ⚡ Trigger Sensor #North
              </button>
            </div>

            {/* East Approach */}
            <div className={`approach-card approach-card--east ${telemetry.approaches.east.currentSignal.toLowerCase()}`}>
              <div className="approach-card-top">
                <div className="approach-identity">
                  <span className="approach-code">APPROACH E-02</span>
                  <h4 className="approach-name">East Avenue (Collector Crossroad)</h4>
                </div>
                <span className={`approach-signal-indicator ${telemetry.approaches.east.currentSignal.toLowerCase()}`}>
                  {telemetry.approaches.east.currentSignal}
                </span>
              </div>

              <div className="approach-density-pill">
                <span className="density-tag-name">Queue Density:</span>
                <span className="density-val density-val--moderate">
                  MODERATE · {eastVehicles} Vehicles in Queue
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Signal Allocation:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.east.assignedGreenSeconds}s Green (Next Phase)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Axle Stress / Resistance:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.east.activeSensorPressureMpa} MPa (ΔR: {telemetry.approaches.east.resistanceChangePercent}%)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Approach Flow:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.east.densityVehPerHour} PCU/hr (42% Saturation)
                </span>
              </div>

              <button
                className="realism-btn realism-btn--sm approach-trigger-btn"
                onClick={() => onTriggerPress('east')}
                title="Trigger vehicle passing over East piezoresistive array"
              >
                ⚡ Trigger Sensor #East
              </button>
            </div>

            {/* South Approach */}
            <div className={`approach-card approach-card--south ${telemetry.approaches.south.currentSignal.toLowerCase()}`}>
              <div className="approach-card-top">
                <div className="approach-identity">
                  <span className="approach-code">APPROACH S-03</span>
                  <h4 className="approach-name">South Arterial (Outbound Connector)</h4>
                </div>
                <span className={`approach-signal-indicator ${telemetry.approaches.south.currentSignal.toLowerCase()}`}>
                  {telemetry.approaches.south.currentSignal}
                </span>
              </div>

              <div className="approach-density-pill">
                <span className="density-tag-name">Queue Density:</span>
                <span className="density-val density-val--low">
                  LIGHT · {southVehicles} Vehicles in Queue
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Signal Allocation:</span>
                <span className="app-metric-val green-highlight">
                  {telemetry.approaches.south.assignedGreenSeconds}s Green (Shorter Window)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Axle Stress / Resistance:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.south.activeSensorPressureMpa} MPa (ΔR: {telemetry.approaches.south.resistanceChangePercent}%)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Approach Flow:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.south.densityVehPerHour} PCU/hr (18% Saturation)
                </span>
              </div>

              <button
                className="realism-btn realism-btn--sm approach-trigger-btn"
                onClick={() => onTriggerPress('south')}
                title="Trigger vehicle passing over South piezoresistive array"
              >
                ⚡ Trigger Sensor #South
              </button>
            </div>

            {/* West Approach */}
            <div className={`approach-card approach-card--west ${telemetry.approaches.west.currentSignal.toLowerCase()}`}>
              <div className="approach-card-top">
                <div className="approach-identity">
                  <span className="approach-code">APPROACH W-04</span>
                  <h4 className="approach-name">West Expressway Feeder</h4>
                </div>
                <span className={`approach-signal-indicator ${telemetry.approaches.west.currentSignal.toLowerCase()}`}>
                  {telemetry.approaches.west.currentSignal}
                </span>
              </div>

              <div className="approach-density-pill">
                <span className="density-tag-name">Queue Density:</span>
                <span className="density-val density-val--mod-high">
                  MOD-HIGH · {westVehicles} Vehicles in Queue
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Signal Allocation:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.west.assignedGreenSeconds}s Green (Next Phase)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Axle Stress / Resistance:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.west.activeSensorPressureMpa} MPa (ΔR: {telemetry.approaches.west.resistanceChangePercent}%)
                </span>
              </div>

              <div className="approach-metric-row">
                <span className="app-metric-label">Approach Flow:</span>
                <span className="app-metric-val">
                  {telemetry.approaches.west.densityVehPerHour} PCU/hr (55% Saturation)
                </span>
              </div>

              <button
                className="realism-btn realism-btn--sm approach-trigger-btn"
                onClick={() => onTriggerPress('west')}
                title="Trigger vehicle passing over West piezoresistive array"
              >
                ⚡ Trigger Sensor #West
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Vehicle Classification & Axle Weight Matrix */}
        {activeTab === 'classification' && (
          <div className="vehicle-classification-section">
            <div className="classification-table-card">
              <div className="classification-header-row">
                <span className="table-title">LIVE VEHICLE CLASSIFICATION MATRIX</span>
                <span className="table-meta">PIEZORESISTIVE AXLE PRESSURE CALIBRATION · IEEE 1451.4</span>
              </div>

              <table className="vehicle-class-table">
                <thead>
                  <tr>
                    <th>Vehicle Classification</th>
                    <th>Axle Weight Range</th>
                    <th>Dynamic Stress</th>
                    <th>Resistance Shift (ΔR/R)</th>
                    <th>Queue Count</th>
                    <th>Modal Share</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="class-icon">🚗</span>
                      <strong>Class I: Passenger Cars &amp; Sedans</strong>
                    </td>
                    <td>1.0 — 1.8 Tons</td>
                    <td>0.45 — 0.70 MPa</td>
                    <td>-6.5% to -9.8%</td>
                    <td><strong style={{ color: '#1a73e8' }}>38 Veh</strong></td>
                    <td>63.3%</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="class-icon">🚙</span>
                      <strong>Class II: SUVs, Pickups &amp; Minivans</strong>
                    </td>
                    <td>1.8 — 3.2 Tons</td>
                    <td>0.70 — 1.05 MPa</td>
                    <td>-10.2% to -14.5%</td>
                    <td><strong style={{ color: '#0284c7' }}>11 Veh</strong></td>
                    <td>18.3%</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="class-icon">🚌</span>
                      <strong>Class III: Heavy Transit Buses &amp; Trucks</strong>
                    </td>
                    <td>3.5 — 9.5 Tons</td>
                    <td>1.10 — 2.20 MPa</td>
                    <td>-15.0% to -24.0%</td>
                    <td><strong style={{ color: '#ea580c' }}>6 Veh</strong></td>
                    <td>10.0%</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="class-icon">🛵</span>
                      <strong>Class IV: Two-Wheelers &amp; Autos</strong>
                    </td>
                    <td>0.2 — 0.8 Tons</td>
                    <td>0.15 — 0.35 MPa</td>
                    <td>-2.5% to -5.0%</td>
                    <td><strong style={{ color: '#10b981' }}>5 Veh</strong></td>
                    <td>8.4%</td>
                  </tr>
                </tbody>
              </table>

              <div className="classification-footer-row">
                <span>Total Classified Axle Events: <strong>{telemetry.totalVehiclesDetected}</strong></span>
                <span>Algorithm: <strong>T_green = T_base + k · ∑(PCU_i × N_i)</strong></span>
                <span>Accuracy: <strong>99.4% Solid-State Actuation</strong></span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="cutaway-metrics-sidebar">
              <div className="metric-box">
                <span className="metric-label">LATEST ACTIVE SENSOR READING</span>
                <span className="metric-value">{reading.pressureMpa} <small>MPa</small></span>
                <span className="metric-sub">{reading.approach}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">ELECTRICAL RESISTANCE SHIFT</span>
                <span className="metric-value" style={{ color: '#00e5ff' }}>{reading.deltaROverR}%</span>
                <span className="metric-sub">Piezoresistive Strain (ΔR / R)</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">CALCULATED AXLE LOAD</span>
                <span className="metric-value">{reading.weightTons} <small>Tons</small></span>
                <span className="metric-sub">Real-time axle tare weight</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Sub-surface Cutaway Trench Diagram */}
        {activeTab === 'cutaway' && (
          <div className="cutaway-section">
            <div className="cutaway-diagram-card">
              <div className="cutaway-header-row">
                <span className="cutaway-badge">SUB-SURFACE ROAD CUTAWAY</span>
                <button className="cutaway-camera-btn" onClick={() => onFocusCamera('sensor_cutaway')}>
                  🔍 Zoom In 3D Trench
                </button>
              </div>

              {/* Road Strata Layer Visualizer */}
              <div className="strata-container">
                <div className="strata-wheel-assembly">
                  <div className="strata-tire">
                    <span className="tire-hub" />
                  </div>
                  <div className="pressure-arrows-group">
                    <span className="arrow-down">▼</span>
                    <span className="arrow-down">▼</span>
                    <span className="arrow-down">▼</span>
                    <span className="pressure-label">Vehicle Axle Pressure ({reading.weightTons} Tons)</span>
                  </div>
                </div>

                <div className="strata-layer strata-asphalt">
                  <span className="layer-tag">Asphalt Layer (Wearing Course · 0.15m)</span>
                </div>

                <div className="strata-sensor-slot">
                  <div className={`strata-piezo-sensor ${pressedEffect ? 'active-pulse' : ''}`}>
                    <span className="sensor-core-icon">⚡</span>
                    <span className="sensor-name">Embedded Piezoresistive Transducer Array</span>
                    <span className="sensor-reading-pill">
                      ΔR/R: {reading.deltaROverR}% · {reading.pressureMpa} MPa
                    </span>
                  </div>
                </div>

                <div className="strata-layer strata-base">
                  <span className="layer-tag">Base Layer (Crushed Aggregate · 0.30m)</span>
                </div>

                <div className="strata-layer strata-foundation">
                  <span className="layer-tag">Road Foundation (Compacted Subgrade · 0.50m)</span>
                </div>
              </div>

              <div className="cutaway-caption">
                <strong>Physical Principle:</strong> Axle downward pressure physically compresses the piezoresistive transducer beneath asphalt, shifting electrical resistivity proportionally to classify vehicles and actuate traffic signals dynamically.
              </div>
            </div>

            {/* Live Telemetry Card */}
            <div className="cutaway-metrics-sidebar">
              <div className="metric-box">
                <span className="metric-label">ACTIVE SENSOR PRESSURE</span>
                <span className="metric-value">{reading.pressureMpa} <small>MPa</small></span>
                <span className="metric-sub">Dynamic surface contact stress</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">RESISTANCE VARIATION</span>
                <span className="metric-value" style={{ color: '#00e5ff' }}>{reading.deltaROverR}%</span>
                <span className="metric-sub">Piezoresistive ΔR / R</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">AXLE WEIGHT</span>
                <span className="metric-value">{reading.weightTons} <small>Tons</small></span>
                <span className="metric-sub">Calibrated classification</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">TOTAL DETECTIONS</span>
                <span className="metric-value" style={{ color: '#10b981' }}>{telemetry.totalVehiclesDetected}</span>
                <span className="metric-sub">Across 4 approach arrays</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel Footer Controls */}
      <div className="road-sensor-footer">
        <div className="adaptive-toggle-wrap">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={telemetry.adaptiveMode}
              onChange={(e) => onToggleAdaptive(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
          <span className="toggle-label">
            Adaptive TCU: <strong>{telemetry.adaptiveMode ? 'ON' : 'OFF'}</strong>
          </span>
        </div>

        <div className="camera-shortcuts">
          <button className="realism-btn realism-btn--sm" onClick={handleTestPress}>
            <span>⚡ Simulate Axle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
