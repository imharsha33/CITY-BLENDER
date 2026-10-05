import type {
  InfrastructureScenario,
  BuildingConfig,
  VehicleConfig,
  TreeConfig,
  StreetLightConfig,
  ConstructionEquipmentConfig,
} from '../types/infrastructure';

// ─── Buildings ────────────────────────────────────────────────────────────────
const buildings: BuildingConfig[] = [
  // LEFT SIDE
  { id: 'b1', position: [-22, 0, -70], width: 12, depth: 10, height: 14, color: '#c8bfae', roofType: 'flat', side: 'left' },
  { id: 'b2', position: [-26, 0, -45], width: 10, depth: 12, height: 9,  color: '#b5a898', roofType: 'sloped', side: 'left' },
  { id: 'b3', position: [-24, 0, -20], width: 14, depth: 9,  height: 18, color: '#ccc4b4', roofType: 'flat', side: 'left' },
  { id: 'b4', position: [-23, 0,   5], width: 11, depth: 11, height: 11, color: '#b8b0a0', roofType: 'hip',   side: 'left' },
  { id: 'b5', position: [-25, 0,  30], width: 13, depth: 10, height: 15, color: '#d2c8b8', roofType: 'flat', side: 'left' },
  { id: 'b6', position: [-22, 0,  55], width: 10, depth: 13, height: 8,  color: '#bdb5a5', roofType: 'sloped', side: 'left' },
  { id: 'b7', position: [-26, 0,  78], width: 12, depth: 9,  height: 20, color: '#c4bcac', roofType: 'flat', side: 'left' },
  { id: 'b8', position: [-24, 0, -92], width: 9,  depth: 10, height: 12, color: '#c0b8a8', roofType: 'hip',  side: 'left' },
  // RIGHT SIDE
  { id: 'b9',  position: [ 22, 0, -75], width: 11, depth: 11, height: 13, color: '#c4bbb0', roofType: 'sloped', side: 'right' },
  { id: 'b10', position: [ 25, 0, -50], width: 13, depth: 9,  height: 10, color: '#bab2a2', roofType: 'flat',   side: 'right' },
  { id: 'b11', position: [ 23, 0, -25], width: 10, depth: 12, height: 16, color: '#cec6b6', roofType: 'hip',    side: 'right' },
  { id: 'b12', position: [ 26, 0,   0], width: 12, depth: 10, height: 9,  color: '#bcb4a4', roofType: 'sloped', side: 'right' },
  { id: 'b13', position: [ 24, 0,  25], width: 10, depth: 11, height: 14, color: '#c8bfae', roofType: 'flat',   side: 'right' },
  { id: 'b14', position: [ 22, 0,  50], width: 14, depth: 10, height: 11, color: '#b4ac9c', roofType: 'hip',    side: 'right' },
  { id: 'b15', position: [ 25, 0,  72], width: 11, depth: 12, height: 17, color: '#cac2b2', roofType: 'flat',   side: 'right' },
  { id: 'b16', position: [ 23, 0,  95], width: 9,  depth: 9,  height: 8,  color: '#bfb7a7', roofType: 'sloped', side: 'right' },
];

// ─── Trees ────────────────────────────────────────────────────────────────────
const trees: TreeConfig[] = [
  // Left side
  { id: 't1',  position: [-12, 0, -80], scale: 1.2, type: 'round' },
  { id: 't2',  position: [-13, 0, -60], scale: 0.9, type: 'tall' },
  { id: 't3',  position: [-11, 0, -40], scale: 1.1, type: 'round' },
  { id: 't4',  position: [-12, 0, -15], scale: 0.8, type: 'bush' },
  { id: 't5',  position: [-13, 0,  10], scale: 1.3, type: 'round' },
  { id: 't6',  position: [-11, 0,  35], scale: 1.0, type: 'tall' },
  { id: 't7',  position: [-12, 0,  60], scale: 0.9, type: 'round' },
  { id: 't8',  position: [-13, 0,  85], scale: 1.1, type: 'bush' },
  // Right side
  { id: 't9',  position: [ 12, 0, -75], scale: 1.0, type: 'tall' },
  { id: 't10', position: [ 13, 0, -55], scale: 1.2, type: 'round' },
  { id: 't11', position: [ 11, 0, -30], scale: 0.8, type: 'bush' },
  { id: 't12', position: [ 12, 0,  -5], scale: 1.1, type: 'round' },
  { id: 't13', position: [ 13, 0,  20], scale: 0.9, type: 'tall' },
  { id: 't14', position: [ 11, 0,  45], scale: 1.3, type: 'round' },
  { id: 't15', position: [ 12, 0,  70], scale: 1.0, type: 'bush' },
  { id: 't16', position: [ 13, 0,  90], scale: 1.1, type: 'round' },
];

// ─── Vehicles ─────────────────────────────────────────────────────────────────
const vehicles: VehicleConfig[] = [
  // Southbound (+Z, Lane 0: outer slow lane in 4-lane, lane 0 in 1-lane)
  { id: 'v1', type: 'car',   color: '#c0392b', speed: 0.16, laneIndex: 0, direction:  1, initialOffset: -80 },
  { id: 'v2', type: 'car',   color: '#2980b9', speed: 0.15, laneIndex: 0, direction:  1, initialOffset: -20 },
  { id: 'v3', type: 'bus',   color: '#f39c12', speed: 0.11, laneIndex: 0, direction:  1, initialOffset:  45 },

  // Northbound (-Z, Lane 1: in 1-lane, Lane 3: outer slow lane in 4-lane)
  { id: 'v4', type: 'car',   color: '#27ae60', speed: 0.16, laneIndex: 1, direction: -1, initialOffset:  70 },
  { id: 'v5', type: 'truck', color: '#7f8c8d', speed: 0.10, laneIndex: 1, direction: -1, initialOffset:  10 },
  { id: 'v6', type: 'car',   color: '#8e44ad', speed: 0.15, laneIndex: 1, direction: -1, initialOffset: -50 },

  // Post-upgrade additional traffic:
  // Southbound Fast Lane (Lane 1, X = -2.6m)
  { id: 'v7',  type: 'car',  color: '#e74c3c', speed: 0.19, laneIndex: 1, direction:  1, initialOffset: -60 },
  { id: 'v8',  type: 'car',  color: '#3498db', speed: 0.18, laneIndex: 1, direction:  1, initialOffset:  15 },

  // Northbound Fast Lane (Lane 2, X = +2.6m)
  { id: 'v10', type: 'car',  color: '#1abc9c', speed: 0.19, laneIndex: 2, direction: -1, initialOffset: -40 },
  { id: 'v11', type: 'car',  color: '#9b59b6', speed: 0.17, laneIndex: 2, direction: -1, initialOffset:  35 },

  // Northbound Additional Heavy / Slow Traffic (Lane 3, X = +5.5m)
  { id: 'v9',  type: 'bus',  color: '#e67e22', speed: 0.11, laneIndex: 3, direction: -1, initialOffset:  90 },
  { id: 'v12', type: 'truck',color: '#95a5a6', speed: 0.10, laneIndex: 3, direction: -1, initialOffset: -20 },
];

// ─── Street Lights ────────────────────────────────────────────────────────────
const streetLights: StreetLightConfig[] = [
  // Existing road lights
  { id: 'sl1', position: [-6.5, 0, -70], side: 'left' },
  { id: 'sl2', position: [-6.5, 0, -35], side: 'left' },
  { id: 'sl3', position: [-6.5, 0,   0], side: 'left' },
  { id: 'sl4', position: [-6.5, 0,  35], side: 'left' },
  { id: 'sl5', position: [-6.5, 0,  70], side: 'left' },
  // Upgraded road median lights
  { id: 'sl6',  position: [0, 0, -80], side: 'median' },
  { id: 'sl7',  position: [0, 0, -55], side: 'median' },
  { id: 'sl8',  position: [0, 0, -30], side: 'median' },
  { id: 'sl9',  position: [0, 0,  -5], side: 'median' },
  { id: 'sl10', position: [0, 0,  20], side: 'median' },
  { id: 'sl11', position: [0, 0,  45], side: 'median' },
  { id: 'sl12', position: [0, 0,  70], side: 'median' },
  { id: 'sl13', position: [0, 0,  92], side: 'median' },
];

// ─── Construction Equipment ───────────────────────────────────────────────────
const constructionEquipment: ConstructionEquipmentConfig[] = [
  { id: 'ce1', type: 'excavator',       position: [-4, 0,  20], activePhases: ['earthwork', 'drainage'] },
  { id: 'ce2', type: 'dump_truck',      position: [ 2, 0,  -5], activePhases: ['earthwork', 'road_base'] },
  { id: 'ce3', type: 'roller',          position: [-2, 0, -30], activePhases: ['road_base', 'pavement'] },
  { id: 'ce4', type: 'concrete_mixer',  position: [ 5, 0,  45], activePhases: ['drainage', 'median'] },
  { id: 'ce5', type: 'dump_truck',      position: [-3, 0, -60], activePhases: ['earthwork'] },
  { id: 'ce6', type: 'roller',          position: [ 4, 0,  65], activePhases: ['pavement'] },
];

// ─── Main Scenario ─────────────────────────────────────────────────────────────
export const demoScenario: InfrastructureScenario = {
  id: 'demo-road-upgrade-2026',
  name: 'Road Infrastructure Upgrade',
  description:
    'Demonstration scenario: 1-lane two-way road upgraded to a 4-lane divided carriageway.',
  location: 'Demo Corridor — Phase 1 Simulation',

  currentState: {
    id: 'existing-road',
    name: 'Existing 1-Lane Road',
    roadType: 'collector',
    geometry: {
      lanes: 1,
      laneWidth: 3.5,
      length: 220,
      hasShoulder: false,
      hasMarkings: true,
      hasDrainage: false,
      hasSidewalk: false,
    },
    existingCondition: 'fair',
    yearBuilt: 1998,
  },

  proposedState: {
    id: 'upgraded-road',
    name: '4-Lane Divided Road',
    roadType: 'arterial',
    geometry: {
      lanes: 4,
      laneWidth: 3.5,
      length: 220,
      hasShoulder: true,
      shoulderWidth: 1.5,
      hasMedian: true,
      medianWidth: 2.5,
      hasMarkings: true,
      hasDrainage: true,
      hasSidewalk: true,
      sidewalkWidth: 2.0,
    },
  },

  upgrade: {
    type: '2_to_4_lane',
    existingLanes: 1,
    proposedLanes: 4,
    reason: ['capacity_upgrade', 'traffic_congestion', 'development_growth'],
    priority: 'high',
  },

  constructionPhases: [
    {
      id: 'existing',
      name: 'Current Infrastructure',
      description: 'Existing 1-lane two-way road in service.',
      timelineStart: 0.00,
      timelineEnd: 0.08,
      year: 2026,
    },
    {
      id: 'survey',
      name: 'Site Survey',
      description: 'Geotechnical survey and boundary marking.',
      timelineStart: 0.08,
      timelineEnd: 0.18,
      year: 2026,
    },
    {
      id: 'preparation',
      name: 'Site Preparation',
      description: 'Traffic diversion, barriers, and clearing.',
      timelineStart: 0.18,
      timelineEnd: 0.28,
      year: 2026,
    },
    {
      id: 'modification',
      name: 'Road Modification',
      description: 'Existing road surface being broken up.',
      timelineStart: 0.28,
      timelineEnd: 0.38,
      year: 2027,
    },
    {
      id: 'earthwork',
      name: 'Earthwork',
      description: 'Excavation and grading for the new cross-section.',
      timelineStart: 0.38,
      timelineEnd: 0.48,
      year: 2027,
    },
    {
      id: 'drainage',
      name: 'Drainage Systems',
      description: 'Roadside drainage channels and culverts.',
      timelineStart: 0.48,
      timelineEnd: 0.56,
      year: 2028,
    },
    {
      id: 'road_base',
      name: 'Road Base Layer',
      description: 'Sub-base and aggregate base course.',
      timelineStart: 0.56,
      timelineEnd: 0.64,
      year: 2028,
    },
    {
      id: 'pavement',
      name: 'Pavement',
      description: 'Bituminous macadam and wearing course.',
      timelineStart: 0.64,
      timelineEnd: 0.74,
      year: 2029,
    },
    {
      id: 'median',
      name: 'Central Median',
      description: 'Raised median construction and kerbing.',
      timelineStart: 0.74,
      timelineEnd: 0.82,
      year: 2029,
    },
    {
      id: 'markings',
      name: 'Lane Markings',
      description: 'Thermoplastic road markings applied.',
      timelineStart: 0.82,
      timelineEnd: 0.88,
      year: 2029,
    },
    {
      id: 'streetlights',
      name: 'Street Lighting',
      description: 'Median and roadside lighting installation.',
      timelineStart: 0.88,
      timelineEnd: 0.94,
      year: 2030,
    },
    {
      id: 'landscaping',
      name: 'Landscaping',
      description: 'Median planting, sidewalks, and site finishing.',
      timelineStart: 0.94,
      timelineEnd: 1.00,
      year: 2030,
    },
    {
      id: 'completed',
      name: 'Infrastructure Complete',
      description: '4-lane divided road operational.',
      timelineStart: 1.00,
      timelineEnd: 1.00,
      year: 2030,
    },
  ],

  buildings,
  trees,
  vehicles,
  streetLights,
  constructionEquipment,

  timeline: {
    startYear: 2026,
    endYear: 2030,
  },
};

// Phase labels for UI
export const PHASE_LABELS: Record<string, string> = {
  existing:     'Current Road',
  survey:       'Site Survey',
  preparation:  'Preparation',
  modification: 'Road Modification',
  earthwork:    'Earthwork',
  drainage:     'Drainage',
  road_base:    'Road Base',
  pavement:     'Pavement',
  median:       'Median',
  markings:     'Lane Markings',
  streetlights: 'Street Lighting',
  landscaping:  'Landscaping',
  completed:    'Complete',
};
