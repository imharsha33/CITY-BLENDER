import type {
  InfrastructureScenario,
  BuildingConfig,
  VehicleConfig,
  TreeConfig,
  StreetLightConfig,
  ConstructionEquipmentConfig,
} from '../types/infrastructure';
import { demoScenario as fourLaneScenario } from './demoScenario';

export type DemoPlanType = 'four_lane' | 'flyover' | 'ring_road' | 'road_sensor' | 'combined';

export interface PlanMeta {
  id: DemoPlanType;
  title: string;
  shortTitle: string;
  badge: string;
  badgeColor: string;
  icon: string;
  headline: string;
  description: string;
  problemResolved: string;
  standards: string;
  designSpeed: string;
  capacityGain: string;
  corridorLength: string;
  crossSection: {
    lanes: string;
    laneWidth: string;
    median: string;
    shoulders: string;
    verticalClearance?: string;
    orbitalRadius?: string;
  };
  keyBenefits: string[];
  constructionPhasesCount: number;
}

export const PLAN_METAS: Record<DemoPlanType, PlanMeta> = {
  four_lane: {
    id: 'four_lane',
    title: '4-Lane Divided Highway Expansion',
    shortTitle: '4-Lane',
    badge: 'DIVIDED EXPRESSWAY',
    badgeColor: '#3b82f6',
    icon: '🛣️',
    headline: 'Multi-lane dual carriageway with central median barrier',
    description: 'Upgrades narrow 1-to-2 lane congested arterial into a 4-lane divided carriageway with 2.5m central landscaped median, paved shoulders, pedestrian footpaths, and modern LED lighting.',
    problemResolved: 'Eliminates peak-hour bottleneck gridlock and head-on collision risks by physically separating directional traffic flows.',
    standards: 'IRC:73-2023 / AASHTO Green Book Class II Arterial',
    designSpeed: '80 - 100 km/h',
    capacityGain: '+120% throughput capacity (from 1,400 to 3,200 PCU/hr)',
    corridorLength: '220 meters corridor simulation',
    crossSection: {
      lanes: '4 Lanes (2x2 Dual Carriageway)',
      laneWidth: '3.50 m per lane (14.0 m total travelway)',
      median: '2.50 m raised concrete median with landscaped planter',
      shoulders: '1.50 m hard paved emergency shoulders',
    },
    keyBenefits: [
      'Eliminates head-on vehicular conflict points with physical median',
      'Accommodates heavy commercial freight and express commuter traffic',
      'Dedicated stormwater drainage channels prevent road waterlogging',
      'Continuous pedestrian sidewalk with kerb safety buffer',
    ],
    constructionPhasesCount: 12,
  },

  flyover: {
    id: 'flyover',
    title: 'Grade-Separated Elevated Flyover Viaduct',
    shortTitle: 'Flyover',
    badge: 'GRADE SEPARATION',
    badgeColor: '#8b5cf6',
    icon: '🌉',
    headline: 'Multi-level grade separation over congested crossroad junction',
    description: 'Elevates through-corridor traffic on a 6.8m high reinforced concrete viaduct with approach ramps and heavy cylindrical pier columns, allowing seamless non-stop traffic above while local traffic navigates the surface roundabout below.',
    problemResolved: 'Completely eliminates intersection signal delays and queue spillback at major arterial crossroads by lifting through-movements into 3D airspace.',
    standards: 'IRC:SP:84-2019 / IRC:112 Structural Concrete Standards',
    designSpeed: '65 - 80 km/h (deck) / 40 km/h (surface slip roads)',
    capacityGain: '+185% junction throughput (zero stop-and-go delays for through traffic)',
    corridorLength: '220 m total (120 m elevated deck + 2x50 m approach ramps)',
    crossSection: {
      lanes: '4 Elevated Lanes (2x2) + 4 Ground Slip Lanes',
      laneWidth: '3.50 m elevated lanes / 3.25 m surface lanes',
      median: '1.20 m concrete crash barrier median',
      shoulders: '0.75 m crash barrier shy-line offsets',
      verticalClearance: '6.80 m minimum headroom for oversized freight',
    },
    keyBenefits: [
      'Through-traffic moves at uninterrupted continuous cruise speed',
      'Surface level retained for local commercial turning movements',
      'Zero land acquisition for elevated alignment (fits within existing right-of-way)',
      'High-impact seismic-damped reinforced concrete pier columns',
    ],
    constructionPhasesCount: 10,
  },

  ring_road: {
    id: 'ring_road',
    title: 'High-Capacity Orbital Ring Road Bypass',
    shortTitle: 'Ring Road',
    badge: 'PERIPHERAL BYPASS',
    badgeColor: '#10b981',
    icon: '🔄',
    headline: 'Continuous peripheral orbital bypass routing heavy traffic around core',
    description: 'Constructs a wide-radius sweeping orbital ring road encircling the urban district, connected via multi-lane circulating roundabouts and radial feeder avenues to siphon through-traffic and freight away from congested city streets.',
    problemResolved: 'Removes 40-55% of heavy trucks and regional through-traffic from choked historic downtown streets by providing a high-speed peripheral beltway.',
    standards: 'IRC:SP:87-2019 / High-Capacity Peripheral Bypass Manual',
    designSpeed: '90 - 110 km/h',
    capacityGain: '-48% city center congestion, +160% regional corridor connectivity',
    corridorLength: 'Sweeping orbital arc (R = 70 m radius)',
    crossSection: {
      lanes: '4 Divided Orbital Lanes (2 Clockwise + 2 Counter-Clockwise)',
      laneWidth: '3.75 m express lanes (15.0 m pavement width)',
      median: '2.00 m central barrier median with green noise buffer',
      shoulders: '2.00 m outer paved emergency breakdown lanes',
      orbitalRadius: '70.0 m curve radius with spiral transition clothoids',
    },
    keyBenefits: [
      'Diverts heavy freight, inter-city logistics and bypass traffic around urban core',
      'Modern multi-lane circulating roundabouts connect radial town entrances',
      'Extensive green buffer zones minimize noise and urban pollution',
      'Redundant network topology prevents single-point failure gridlock',
    ],
    constructionPhasesCount: 10,
  },
  road_sensor: {
    id: 'road_sensor',
    title: 'Smart Signal Junction & Sub-Surface Piezoresistive Sensors',
    shortTitle: 'Road Sensors',
    badge: 'IOT & SMART SIGNALS',
    badgeColor: '#10b981',
    icon: '🚥',
    headline: 'Real-time vehicle pressure detection with adaptive signal timing',
    description: 'Deploys piezoresistive sensor arrays embedded beneath road asphalt at 4-way signalized intersection. Directly calculates real-time approach queue densities to dynamically allocate green phase times via localized Traffic Control Unit.',
    problemResolved: 'Eliminates unnecessary waiting times at empty signals and prevents intersection spillback congestion.',
    standards: 'IEEE 1451.4 / NEMA TS-2 Intelligent Traffic Actuation',
    designSpeed: '50 - 60 km/h Urban Intersection',
    capacityGain: '+45% junction throughput; -35% average intersection delay',
    corridorLength: '4-Way Signalized Urban Crossroad',
    crossSection: {
      lanes: '4 Approaches (2x2 Inbound/Outbound)',
      laneWidth: '3.50 m per lane',
      median: 'Raised curb divider and pedestrian crosswalks',
      shoulders: 'Sidewalks with curb-ramp corners',
    },
    keyBenefits: [
      'Piezoresistive sub-surface pressure arrays embedded beneath road surface',
      'Dynamic green phase allocation (45s High vs 15s Low approach)',
      'Under-asphalt sub-surface cutaway visualization and live strain metrics',
      'Zero maintenance solid-state axle detection',
    ],
    constructionPhasesCount: 4,
  },
  combined: {
    id: 'combined',
    title: 'Integrated 3-Road Master Network (4-Lane + Flyover + Ring Road)',
    shortTitle: 'Combined (3-in-1)',
    badge: 'UNIFIED 3-ROAD MASTER PLAN',
    badgeColor: '#ec4899',
    icon: '🌐',
    headline: 'Unified 4-lane expressway, grade-separated flyover & orbital bypass network',
    description: 'Combines all three civil road architectures into one realistic continuous multi-tier city network: a central 4-lane divided expressway, an elevated flyover viaduct carrying through-traffic above the central intersection, and an outer orbital ring road connected via circulating roundabouts and slip roads.',
    problemResolved: 'Resolves all structural traffic bottlenecks simultaneously: eliminates signal delays with the flyover, doubles corridor capacity with the 4-lane expansion, and diverts 55% of heavy intercity transit with the orbital ring road.',
    standards: 'IRC:73-2023 / IRC:SP:84-2019 / IRC:SP:87-2019 Integrated Standards',
    designSpeed: '80-100 km/h (Expressway) / 70 km/h (Flyover) / 100 km/h (Ring Road)',
    capacityGain: '+240% overall network capacity, zero single-point failure bottleneck',
    corridorLength: 'Integrated Regional Master Network (300m x 300m civil area)',
    crossSection: {
      lanes: '4-Lane Ground + 4-Lane Flyover + 4-Lane Ring Road (12 Total Lanes)',
      laneWidth: '3.50m - 3.75m standard travelway lanes',
      median: 'Concrete safety median barriers & landscaped green planters',
      shoulders: 'Paved emergency breakdown shoulders across all alignments',
      verticalClearance: '6.80m grade clearance under flyover viaduct',
      orbitalRadius: '75.0m continuous orbital bypass radius',
    },
    keyBenefits: [
      'Seamless multi-tier traffic: through-corridor traffic flies above on elevated viaduct',
      'Ground 4-lane expressway handles local urban distribution and feeder arterials',
      'Outer orbital ring road routes freight and regional logistics around the city',
      'Connected diamond slip-ramps and multi-lane roundabouts link all three tiers',
      'Full collision-free vehicle simulation with intelligent headway & obstacle avoidance',
    ],
    constructionPhasesCount: 12,
  },
};

// ─── Flyover Scenario Definition ──────────────────────────────────────────────
export const flyoverScenario: InfrastructureScenario = {
  id: 'plan-flyover-grade-separation',
  name: 'Grade-Separated Elevated Flyover Viaduct',
  description: 'Elevated 4-lane viaduct spanning across a high-conflict 4-way ground level junction.',
  location: 'Corridor Junction — Vertical Grade Separation',

  currentState: {
    id: 'existing-ground-junction',
    name: 'Existing At-Grade Junction Bottleneck',
    roadType: 'arterial',
    geometry: {
      lanes: 2,
      laneWidth: 3.5,
      length: 220,
      hasShoulder: false,
      hasMarkings: true,
      hasDrainage: false,
      hasSidewalk: true,
    },
    existingCondition: 'poor',
    yearBuilt: 2002,
  },

  proposedState: {
    id: 'upgraded-flyover-superstructure',
    name: '4-Lane Elevated Flyover Viaduct',
    roadType: 'expressway',
    geometry: {
      lanes: 4,
      laneWidth: 3.5,
      length: 220,
      hasShoulder: true,
      shoulderWidth: 0.75,
      hasMedian: true,
      medianWidth: 1.2,
      hasMarkings: true,
      hasDrainage: true,
      hasSidewalk: false,
    },
  },

  upgrade: {
    type: 'flyover',
    existingLanes: 2,
    proposedLanes: 4,
    reason: ['traffic_congestion', 'junction_improvement', 'safety'],
    priority: 'critical',
  },

  constructionPhases: [
    {
      id: 'existing',
      name: 'Existing Junction Bottleneck',
      description: 'Surface level crossroad bottleneck with severe queue delays.',
      timelineStart: 0.00,
      timelineEnd: 0.10,
      year: 2026,
    },
    {
      id: 'survey',
      name: 'Geotechnical & Pier Piling Survey',
      description: 'Subsurface soil boring, utility line scanning and corridor demarcation.',
      timelineStart: 0.10,
      timelineEnd: 0.20,
      year: 2026,
    },
    {
      id: 'preparation',
      name: 'Traffic Diversion & Service Slips',
      description: 'Opening peripheral service slip roads and deploying crash safety barriers.',
      timelineStart: 0.20,
      timelineEnd: 0.30,
      year: 2026,
    },
    {
      id: 'earthwork',
      name: 'Bored Cast-in-Situ Pier Foundations',
      description: 'Deep bored pile foundations drilled to bedrock at junction quadrants.',
      timelineStart: 0.30,
      timelineEnd: 0.42,
      year: 2027,
    },
    {
      id: 'modification',
      name: 'Pier Column & Crosshead Cap Construction',
      description: 'Reinforced concrete pier columns erected with cantilever crosshead bents.',
      timelineStart: 0.42,
      timelineEnd: 0.55,
      year: 2027,
    },
    {
      id: 'road_base',
      name: 'Precast Segmental Girder Launching',
      description: 'Overhead launching gantry places post-tensioned concrete box girders.',
      timelineStart: 0.55,
      timelineEnd: 0.68,
      year: 2028,
    },
    {
      id: 'drainage',
      name: 'Approach Ramp RE Wall Embankment',
      description: 'Reinforced earth (RE) retaining walls built for north and south approach ramps.',
      timelineStart: 0.68,
      timelineEnd: 0.78,
      year: 2028,
    },
    {
      id: 'pavement',
      name: 'Deck Slab Waterproofing & Asphalt Paving',
      description: 'High-friction polymer-modified asphalt paved over viaduct deck and ramps.',
      timelineStart: 0.78,
      timelineEnd: 0.86,
      year: 2029,
    },
    {
      id: 'markings',
      name: 'Parapet Crash Barriers & Markings',
      description: 'Anti-crash reinforced parapet barriers and reflective lane markings installed.',
      timelineStart: 0.86,
      timelineEnd: 0.94,
      year: 2029,
    },
    {
      id: 'completed',
      name: 'Multi-Level Flyover Operational',
      description: 'Dual-level grade-separated corridor open: seamless through-traffic above, local traffic below.',
      timelineStart: 0.94,
      timelineEnd: 1.00,
      year: 2030,
    },
  ],

  buildings: [
    { id: 'fb1', position: [-26, 0, -80], width: 12, depth: 12, height: 16, color: '#c4bbb0', roofType: 'flat', side: 'left' },
    { id: 'fb2', position: [-28, 0, -45], width: 14, depth: 10, height: 12, color: '#bab2a2', roofType: 'sloped', side: 'left' },
    { id: 'fb3', position: [-32, 0,  45], width: 12, depth: 14, height: 18, color: '#d2c8b8', roofType: 'flat', side: 'left' },
    { id: 'fb4', position: [-28, 0,  80], width: 13, depth: 11, height: 14, color: '#bdb5a5', roofType: 'hip', side: 'left' },
    { id: 'fb5', position: [ 26, 0, -80], width: 13, depth: 11, height: 15, color: '#c8bfae', roofType: 'sloped', side: 'right' },
    { id: 'fb6', position: [ 28, 0, -45], width: 11, depth: 13, height: 20, color: '#cec6b6', roofType: 'flat', side: 'right' },
    { id: 'fb7', position: [ 32, 0,  45], width: 14, depth: 10, height: 13, color: '#b4ac9c', roofType: 'hip', side: 'right' },
    { id: 'fb8', position: [ 28, 0,  80], width: 12, depth: 12, height: 17, color: '#cac2b2', roofType: 'flat', side: 'right' },
  ],

  trees: [
    { id: 'ft1', position: [-16, 0, -85], scale: 1.1, type: 'tall' },
    { id: 'ft2', position: [-18, 0, -55], scale: 1.2, type: 'round' },
    { id: 'ft3', position: [-18, 0,  55], scale: 1.0, type: 'round' },
    { id: 'ft4', position: [-16, 0,  85], scale: 1.2, type: 'tall' },
    { id: 'ft5', position: [ 16, 0, -85], scale: 1.0, type: 'round' },
    { id: 'ft6', position: [ 18, 0, -55], scale: 1.3, type: 'tall' },
    { id: 'ft7', position: [ 18, 0,  55], scale: 1.1, type: 'round' },
    { id: 'ft8', position: [ 16, 0,  85], scale: 0.9, type: 'bush' },
  ],

  vehicles: [
    // Elevated Express Flyover Traffic (+Z direction, speed 0.22)
    { id: 'fv1', type: 'sedan', color: '#e74c3c', speed: 0.22, laneIndex: 0, direction: 1, initialOffset: -80 },
    { id: 'fv2', type: 'suv',   color: '#3498db', speed: 0.20, laneIndex: 1, direction: 1, initialOffset: -20 },
    { id: 'fv3', type: 'bus',   color: '#f39c12', speed: 0.16, laneIndex: 0, direction: 1, initialOffset:  30 },
    // Elevated Express Flyover Traffic (-Z direction, speed 0.22)
    { id: 'fv4', type: 'bike',  color: '#2ecc71', speed: 0.21, laneIndex: 2, direction: -1, initialOffset:  80 },
    { id: 'fv5', type: 'sedan', color: '#9b59b6', speed: 0.22, laneIndex: 3, direction: -1, initialOffset:  20 },
    { id: 'fv6', type: 'truck', color: '#95a5a6', speed: 0.15, laneIndex: 2, direction: -1, initialOffset: -40 },
    // Ground Surface Cross-Traffic (navigating under the flyover along X axis)
    { id: 'fv7', type: 'suv',   color: '#d35400', speed: 0.12, laneIndex: 4, direction: 1, initialOffset: -50 },
    { id: 'fv8', type: 'truck', color: '#7f8c8d', speed: 0.10, laneIndex: 5, direction: -1, initialOffset: 45 },
    // Dedicated Service Road Traffic (cruising at grade along flanking frontage roads)
    { id: 'fv9', type: 'sedan', color: '#10b981', speed: 0.18, laneIndex: 6, direction: 1, initialOffset: -60 },
    { id: 'fv10', type: 'suv',  color: '#eab308', speed: 0.16, laneIndex: 7, direction: -1, initialOffset: 70 },
  ],

  streetLights: [
    { id: 'fsl1', position: [-8, 0, -90], side: 'left' },
    { id: 'fsl2', position: [-8, 0, -60], side: 'left' },
    { id: 'fsl3', position: [-8, 0,  60], side: 'left' },
    { id: 'fsl4', position: [-8, 0,  90], side: 'left' },
    { id: 'fsl5', position: [ 8, 0, -90], side: 'right' },
    { id: 'fsl6', position: [ 8, 0, -60], side: 'right' },
    { id: 'fsl7', position: [ 8, 0,  60], side: 'right' },
    { id: 'fsl8', position: [ 8, 0,  90], side: 'right' },
  ],

  constructionEquipment: [
    { id: 'fce1', type: 'excavator', position: [-6, 0, -25], activePhases: ['earthwork', 'modification'] },
    { id: 'fce2', type: 'crane', position: [ 7, 0,   0], activePhases: ['modification', 'road_base'] },
    { id: 'fce3', type: 'concrete_mixer', position: [-7, 0,  20], activePhases: ['earthwork', 'modification', 'pavement'] },
    { id: 'fce4', type: 'roller', position: [ 0, 0, -65], activePhases: ['drainage', 'pavement'] },
    { id: 'fce5', type: 'dump_truck', position: [ 6, 0,  60], activePhases: ['drainage', 'pavement'] },
  ],

  timeline: {
    startYear: 2026,
    endYear: 2030,
  },
};

// ─── Ring Road Scenario Definition ────────────────────────────────────────────
export const ringRoadScenario: InfrastructureScenario = {
  id: 'plan-orbital-ring-road',
  name: 'High-Capacity Orbital Ring Road Bypass',
  description: 'Sweeping 4-lane peripheral bypass connecting radial corridors around town perimeter.',
  location: 'Outer Urban Perimeter — Peripheral Orbital Bypass',

  currentState: {
    id: 'existing-radial-choke',
    name: 'Existing Radial Town Core Streets',
    roadType: 'collector',
    geometry: {
      lanes: 2,
      laneWidth: 3.5,
      length: 220,
      hasShoulder: false,
      hasMarkings: true,
      hasDrainage: false,
      hasSidewalk: false,
    },
    existingCondition: 'fair',
    yearBuilt: 1995,
  },

  proposedState: {
    id: 'upgraded-orbital-ring',
    name: '4-Lane Divided Orbital Ring Road',
    roadType: 'highway',
    geometry: {
      lanes: 4,
      laneWidth: 3.75,
      length: 240,
      hasShoulder: true,
      shoulderWidth: 2.0,
      hasMedian: true,
      medianWidth: 2.0,
      hasMarkings: true,
      hasDrainage: true,
      hasSidewalk: false,
    },
  },

  upgrade: {
    type: 'ring_road',
    existingLanes: 2,
    proposedLanes: 4,
    reason: ['traffic_congestion', 'capacity_upgrade', 'connectivity'],
    priority: 'high',
  },

  constructionPhases: [
    {
      id: 'existing',
      name: 'Downtown Radial Congestion',
      description: 'Dense radial streets forcing all regional trucks into narrow commercial core.',
      timelineStart: 0.00,
      timelineEnd: 0.10,
      year: 2026,
    },
    {
      id: 'survey',
      name: 'Peripheral Alignment Survey',
      description: 'Satellite corridor alignment, boundary stone marking and right-of-way freezing.',
      timelineStart: 0.10,
      timelineEnd: 0.20,
      year: 2026,
    },
    {
      id: 'preparation',
      name: 'Greenfield Clearing & Demarcation',
      description: 'Vegetation clearing, topsoil stripping and construction staging areas established.',
      timelineStart: 0.20,
      timelineEnd: 0.30,
      year: 2026,
    },
    {
      id: 'earthwork',
      name: 'Subgrade Stabilization & Earth Cutting',
      description: 'Heavy earthwork cutting and embanking to achieve uniform 2% transverse crossfall.',
      timelineStart: 0.30,
      timelineEnd: 0.44,
      year: 2027,
    },
    {
      id: 'road_base',
      name: 'Granular Sub-Base & Wet Mix Macadam',
      description: 'Heavy compaction of 300mm granular sub-base along the sweeping orbital curve.',
      timelineStart: 0.44,
      timelineEnd: 0.58,
      year: 2027,
    },
    {
      id: 'drainage',
      name: 'Interchange Roundabouts & Culverts',
      description: 'Multi-lane circulating roundabouts constructed where radial spokes meet the ring road.',
      timelineStart: 0.58,
      timelineEnd: 0.70,
      year: 2028,
    },
    {
      id: 'pavement',
      name: 'Dense Bituminous Macadam (DBM) Laying',
      description: 'Twin paver fleet applies dual-carriageway asphalt courses continuously along the curve.',
      timelineStart: 0.70,
      timelineEnd: 0.82,
      year: 2028,
    },
    {
      id: 'median',
      name: 'Concrete Median & Outer Crash Barriers',
      description: 'Anti-glare median screen barriers and W-beam outer guardrails installed.',
      timelineStart: 0.82,
      timelineEnd: 0.90,
      year: 2029,
    },
    {
      id: 'streetlights',
      name: 'Highway Illumination & Overhead Gantries',
      description: 'High-mast LED solar-hybrid highway luminaires and electronic directional signage.',
      timelineStart: 0.90,
      timelineEnd: 0.95,
      year: 2029,
    },
    {
      id: 'completed',
      name: 'Orbital Ring Road Fully Operational',
      description: 'Continuous orbital bypass operational: 50% core traffic diverted, express freight moving freely.',
      timelineStart: 0.95,
      timelineEnd: 1.00,
      year: 2030,
    },
  ],

  buildings: [
    // City core buildings grouped inside the orbital ring
    { id: 'rb1', position: [ -15, 0,  15], width: 14, depth: 14, height: 22, color: '#c4bbb0', roofType: 'flat', side: 'left' },
    { id: 'rb2', position: [ -35, 0,  30], width: 16, depth: 12, height: 18, color: '#bab2a2', roofType: 'flat', side: 'left' },
    { id: 'rb3', position: [  10, 0,  25], width: 12, depth: 15, height: 26, color: '#cec6b6', roofType: 'hip', side: 'right' },
    { id: 'rb4', position: [ -10, 0, -20], width: 18, depth: 14, height: 16, color: '#d2c8b8', roofType: 'flat', side: 'left' },
    { id: 'rb5', position: [  25, 0,  -5], width: 15, depth: 15, height: 20, color: '#bdb5a5', roofType: 'sloped', side: 'right' },
    // Outer peripheral logistic warehouses outside the ring road
    { id: 'rb6', position: [ -85, 0, -45], width: 22, depth: 16, height: 10, color: '#b4ac9c', roofType: 'flat', side: 'left' },
    { id: 'rb7', position: [  85, 0, -45], width: 24, depth: 18, height: 11, color: '#c8bfae', roofType: 'flat', side: 'right' },
    { id: 'rb8', position: [   0, 0, -95], width: 28, depth: 16, height: 12, color: '#cac2b2', roofType: 'flat', side: 'left' },
  ],

  trees: [
    { id: 'rt1', position: [-45, 0, -10], scale: 1.2, type: 'round' },
    { id: 'rt2', position: [-25, 0, -35], scale: 1.0, type: 'tall' },
    { id: 'rt3', position: [ 35, 0, -30], scale: 1.3, type: 'round' },
    { id: 'rt4', position: [ 45, 0,  15], scale: 1.1, type: 'bush' },
    { id: 'rt5', position: [ -5, 0,  50], scale: 1.2, type: 'tall' },
    { id: 'rt6', position: [-60, 0,  45], scale: 1.4, type: 'round' },
  ],

  vehicles: [
    // Clockwise orbital ring traffic (car, truck, bus cruising the bypass)
    { id: 'rv1', type: 'truck', color: '#7f8c8d', speed: 0.18, laneIndex: 0, direction:  1, initialOffset: -80 },
    { id: 'rv2', type: 'sedan', color: '#2980b9', speed: 0.22, laneIndex: 1, direction:  1, initialOffset: -25 },
    { id: 'rv3', type: 'suv',   color: '#e74c3c', speed: 0.23, laneIndex: 1, direction:  1, initialOffset:  35 },
    { id: 'rv4', type: 'bus',   color: '#f39c12', speed: 0.16, laneIndex: 0, direction:  1, initialOffset:  80 },
    // Counter-clockwise orbital ring traffic
    { id: 'rv5', type: 'sedan', color: '#27ae60', speed: 0.22, laneIndex: 2, direction: -1, initialOffset:  70 },
    { id: 'rv6', type: 'truck', color: '#95a5a6', speed: 0.17, laneIndex: 3, direction: -1, initialOffset:  15 },
    { id: 'rv7', type: 'bike',  color: '#8e44ad', speed: 0.24, laneIndex: 2, direction: -1, initialOffset: -40 },
    // Feeder traffic joining via radial avenues
    { id: 'rv8', type: 'suv',   color: '#16a085', speed: 0.15, laneIndex: 4, direction:  1, initialOffset:   0 },
  ],

  streetLights: [
    { id: 'rsl1', position: [-70, 0, -25], side: 'left' },
    { id: 'rsl2', position: [-50, 0, -55], side: 'left' },
    { id: 'rsl3', position: [  0, 0, -72], side: 'left' },
    { id: 'rsl4', position: [ 50, 0, -55], side: 'left' },
    { id: 'rsl5', position: [ 70, 0, -25], side: 'left' },
  ],

  constructionEquipment: [
    { id: 'rce1', type: 'roller', position: [-40, 0, -50], activePhases: ['earthwork', 'road_base', 'pavement'] },
    { id: 'rce2', type: 'dump_truck', position: [ 0, 0, -65], activePhases: ['preparation', 'earthwork', 'road_base'] },
    { id: 'rce3', type: 'concrete_mixer', position: [ 40, 0, -45], activePhases: ['drainage', 'median'] },
    { id: 'rce4', type: 'excavator', position: [-60, 0, -15], activePhases: ['preparation', 'earthwork'] },
  ],

  timeline: {
    startYear: 2026,
    endYear: 2030,
  },
};

// ─── Combined 3-Road Integrated Master Scenario ──────────────────────────────
export const combinedScenario: InfrastructureScenario = {
  id: 'plan-combined-3-roads-master',
  name: 'Integrated 3-Road Master Network (4-Lane + Flyover + Ring Road)',
  description: 'Grand master civil corridor combining a 4-lane divided expressway, grade-separated elevated flyover, and outer orbital bypass into one unified smart city network.',
  location: 'Metropolitan Integrated Transport Corridor & Orbital Beltway',

  currentState: {
    id: 'existing-bottleneck-network',
    name: 'Existing Single-Tier Congested Corridor',
    roadType: 'arterial',
    geometry: {
      lanes: 2,
      laneWidth: 3.5,
      length: 260,
      hasShoulder: false,
      hasMarkings: true,
      hasDrainage: false,
      hasSidewalk: true,
    },
    existingCondition: 'poor',
    yearBuilt: 2004,
  },

  proposedState: {
    id: 'combined-multi-tier-system',
    name: 'Multi-Tier Unified Transportation Network',
    roadType: 'expressway',
    geometry: {
      lanes: 12,
      laneWidth: 3.5,
      length: 300,
      hasShoulder: true,
      shoulderWidth: 1.5,
      hasMedian: true,
      medianWidth: 2.0,
      hasMarkings: true,
      hasDrainage: true,
      hasSidewalk: true,
    },
  },

  upgrade: {
    type: 'combination',
    existingLanes: 2,
    proposedLanes: 12,
    reason: ['traffic_congestion', 'capacity_upgrade', 'connectivity', 'safety'],
    priority: 'critical',
  },

  constructionPhases: [
    {
      id: 'existing',
      name: 'Existing Baseline Network',
      description: 'Single-tier choked arterial with ground level gridlock and freight delays.',
      timelineStart: 0.00,
      timelineEnd: 0.12,
      year: 2026,
    },
    {
      id: 'survey',
      name: 'Corridor & Orbital Demarcation',
      description: 'High-precision LiDAR survey, utility re-routing and perimeter ring road alignment.',
      timelineStart: 0.12,
      timelineEnd: 0.25,
      year: 2026,
    },
    {
      id: 'earthwork',
      name: 'Pier Foundations & Orbital Earthwork',
      description: 'Bored piling for flyover pier bents alongside heavy cutting and embankment grading for the ring road.',
      timelineStart: 0.25,
      timelineEnd: 0.45,
      year: 2027,
    },
    {
      id: 'modification',
      name: 'Piers, Roundabouts & Ground 4-Lane Base',
      description: 'Erecting flyover crosshead bents, casting multi-lane roundabouts, and preparing aggregate sub-base for the 4-lane expressway.',
      timelineStart: 0.45,
      timelineEnd: 0.65,
      year: 2028,
    },
    {
      id: 'road_base',
      name: 'Box Girder Launch & Ramp Embankments',
      description: 'Launching segmental flyover deck box girders, casting smooth approach ramps, and paving orbital ring road asphalt.',
      timelineStart: 0.65,
      timelineEnd: 0.85,
      year: 2029,
    },
    {
      id: 'completed',
      name: 'Integrated 3-Road Network Operational',
      description: 'Commissioning complete 3-tier network: flyover express through-flow, 4-lane ground distributor, and orbital ring road bypass.',
      timelineStart: 0.85,
      timelineEnd: 1.00,
      year: 2030,
    },
  ],

  buildings: [
    { id: 'cb1', position: [-48, 0, -95], width: 16, depth: 14, height: 26, color: '#c4bbb0', roofType: 'flat', side: 'left' },
    { id: 'cb2', position: [-50, 0, -50], width: 15, depth: 13, height: 22, color: '#bab2a2', roofType: 'sloped', side: 'left' },
    { id: 'cb3', position: [-52, 0,  50], width: 14, depth: 15, height: 28, color: '#d2c8b8', roofType: 'flat', side: 'left' },
    { id: 'cb4', position: [-48, 0,  95], width: 16, depth: 12, height: 20, color: '#bdb5a5', roofType: 'hip', side: 'left' },
    { id: 'cb5', position: [ 48, 0, -95], width: 15, depth: 13, height: 24, color: '#c8bfae', roofType: 'sloped', side: 'right' },
    { id: 'cb6', position: [ 50, 0, -50], width: 13, depth: 15, height: 30, color: '#cec6b6', roofType: 'flat', side: 'right' },
    { id: 'cb7', position: [ 52, 0,  50], width: 16, depth: 12, height: 22, color: '#b4ac9c', roofType: 'hip', side: 'right' },
    { id: 'cb8', position: [ 48, 0,  95], width: 14, depth: 14, height: 25, color: '#cac2b2', roofType: 'flat', side: 'right' },
  ],

  trees: [
    { id: 'ct1', position: [-26, 0, -110], scale: 1.2, type: 'tall' },
    { id: 'ct2', position: [-28, 0,  -70], scale: 1.1, type: 'round' },
    { id: 'ct3', position: [-28, 0,   70], scale: 1.3, type: 'tall' },
    { id: 'ct4', position: [-26, 0,  110], scale: 1.0, type: 'round' },
    { id: 'ct5', position: [ 26, 0, -110], scale: 1.1, type: 'round' },
    { id: 'ct6', position: [ 28, 0,  -70], scale: 1.2, type: 'tall' },
    { id: 'ct7', position: [ 28, 0,   70], scale: 1.3, type: 'round' },
    { id: 'ct8', position: [ 26, 0,  110], scale: 1.0, type: 'bush' },
  ],

  vehicles: [
    // 1. Elevated Flyover Express Vehicles
    { id: 'cv_fly1', type: 'sedan', color: '#0284c7', speed: 0.24, laneIndex: 0, direction:  1, initialOffset: -85 },
    { id: 'cv_fly2', type: 'suv',   color: '#3b82f6', speed: 0.22, laneIndex: 1, direction:  1, initialOffset: -30 },
    { id: 'cv_fly3', type: 'bike',  color: '#ef4444', speed: 0.23, laneIndex: 2, direction: -1, initialOffset:  80 },
    { id: 'cv_fly4', type: 'sedan', color: '#8b5cf6', speed: 0.21, laneIndex: 3, direction: -1, initialOffset:  25 },

    // 2. Ground 4-Lane Divided Expressway Vehicles
    { id: 'cv_gnd1', type: 'bus',   color: '#10b981', speed: 0.17, laneIndex: 4, direction:  1, initialOffset: -105 },
    { id: 'cv_gnd2', type: 'suv',   color: '#f59e0b', speed: 0.20, laneIndex: 5, direction:  1, initialOffset:  -45 },
    { id: 'cv_gnd3', type: 'truck', color: '#64748b', speed: 0.16, laneIndex: 6, direction: -1, initialOffset:  110 },
    { id: 'cv_gnd4', type: 'sedan', color: '#ec4899', speed: 0.19, laneIndex: 7, direction: -1, initialOffset:   50 },

    // 3. Orbital Ring Road Outer Bypass Vehicles
    { id: 'cv_orb1', type: 'truck', color: '#475569', speed: 0.18, laneIndex: 8, direction:  1, initialOffset: -75 },
    { id: 'cv_orb2', type: 'suv',   color: '#06b6d4', speed: 0.22, laneIndex: 9, direction:  1, initialOffset: -20 },
    { id: 'cv_orb3', type: 'bus',   color: '#eab308', speed: 0.16, laneIndex: 10, direction: -1, initialOffset:  65 },
    { id: 'cv_orb4', type: 'sedan', color: '#14b8a6', speed: 0.23, laneIndex: 11, direction: -1, initialOffset: -40 },
  ],

  streetLights: [
    { id: 'csl1', position: [0, 0, -80], side: 'median' },
    { id: 'csl2', position: [0, 0, -40], side: 'median' },
    { id: 'csl3', position: [0, 0,   0], side: 'median' },
    { id: 'csl4', position: [0, 0,  40], side: 'median' },
    { id: 'csl5', position: [0, 0,  80], side: 'median' },
  ],

  constructionEquipment: [
    { id: 'cce1', type: 'crane', position: [14, 0, -10], activePhases: ['modification', 'road_base'] },
    { id: 'cce2', type: 'excavator', position: [-14, 0, 20], activePhases: ['earthwork', 'modification'] },
    { id: 'cce3', type: 'roller', position: [-18, 0, -70], activePhases: ['modification', 'road_base'] },
    { id: 'cce4', type: 'dump_truck', position: [18, 0, 80], activePhases: ['survey', 'earthwork'] },
  ],

  timeline: {
    startYear: 2026,
    endYear: 2030,
  },
};

// Scenario map
export const SCENARIOS: Record<DemoPlanType, InfrastructureScenario> = {
  four_lane: fourLaneScenario,
  flyover: flyoverScenario,
  ring_road: ringRoadScenario,
  road_sensor: fourLaneScenario,
  combined: combinedScenario,
};
