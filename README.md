# RoadVision — Intelligent Road Infrastructure Planning & Visualization System

RoadVision is a civil engineering digital twin, GIS infrastructure analysis platform, and cinematic 3D visualization engine.

---

## Current Status: Phase 3 Geographic Input & True Location Visualization Correction Complete

- **Two Authoritative Input Methods**:
  - **Method A — Location Search**: Searches and geocodes any real-world location (e.g. `Varkala, Kerala`, `Nellore, Andhra Pradesh`, `Siddipet, Telangana`), retrieves authentic OpenStreetMap infrastructure, and renders that specific environment.
  - **Method B — User Geospatial Map Import**: Compact `[ IMPORT MAP ]` control supporting GeoJSON, KML, KMZ, and Shapefile ZIP (`.zip`). Performs instant validation (`MAP VALID` / `MAP INVALID`) with feature counts and detected CRS.
- **Authoritative Priority**: User-uploaded maps take absolute priority for the session. Geometry is never replaced by generic or procedural mock data.
- **Accurate Coordinate Reference Systems (CRS)**: Detects and normalizes WGS84 (EPSG:4326), Web Mercator (EPSG:3857), UTM, and projected systems. Unknown CRSs trigger explicit validation warnings.
- **True Geographic 3D Visualization**:
  - Roads follow exact surveyed geometry and hierarchy.
  - Buildings extruded from authentic footprints with corrected Z-axis coordinates.
  - Water bodies (coastlines, rivers, canals, reservoirs) faithfully represented.
  - Dynamic ground terrain plane generated to fit the exact geographic extent rather than a fixed demo road strip.
  - **Automatic Camera Fit**: Camera dynamically calculates `minX, maxX, minZ, maxZ` and frames the actual geographic area (village, corridor, town, or regional map).
- **Vehicle Simulation Collision Elimination**:
  - Fixed directional lane assignments: Southbound and Northbound traffic travel on physically separated lanes in both 2-way and 4-lane divided configurations.
  - Added intelligent car-following headway model: vehicles smoothly brake and maintain a safe buffer behind lead traffic, eliminating rear-end and head-on collisions.
- **100% Analysis & Visualization Parity**: Clicking `ANALYZE` sends the currently displayed `GeoArea` directly to `POST /api/analyze`. The exact displayed road segments, junctions, and IDs match 1:1 with the analyzed graph.
- **Accurate Source Indicator**: Transparently displays `SOURCE: OPENSTREETMAP`, `SOURCE: USER IMPORT`, or `SOURCE: DEMO DATA` alongside detected CRS.

---

## Architecture Overview

```
                      User Location Query (e.g. "Varkala, Kerala")
                                      │
                                      ▼
                      FastAPI Backend (/api/geocode)
                       (OSM Nominatim + Disk Cache)
                                      │
                                      ▼
                      FastAPI Backend (/api/geo-area)
                    (Overpass API + Shapely Normalizer)
                                      │
                                      ▼
                   FastAPI Backend (/api/analyze)
  ┌───────────────────────────────────┼───────────────────────────────────┐
  ▼                                   ▼                                   ▼
Network Graph & Centrality     Capacity & Demand Model            Junction Conflict Analysis
(NetworkX Betweenness)          (Lane / Hierarchy / Land-Use)      (Arms / Angles / Geometry)
  │                                   │                                   │
  └───────────────────────────────────┼───────────────────────────────────┘
                                      ▼
                        Bottleneck & Issue Scorer
                  (V/C Ratio, Severities, Confidence %)
                                      │
                                      ▼
                         AnalysisResultResponse JSON
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
Three.js 3D Viewport                               Minimal Neumorphic UI
- Neutral Asphalt + Muted Concrete                 - Compact Analysis Panel (Top-Right)
- Problem Highlights Only (Red/Orange/Amber)       - Findings Drawer with [INSPECT]
- Ground Junction Indicators on Nodes              - Detailed Inspection Card
- Smooth Cinematic Inspection Camera Flight        - Normal Mode vs Analysis Mode Toggle
```

---

## Technology Stack

- **Frontend**: React 19, Three.js 0.186, Vite 8, TypeScript 6.
- **Backend**: Python 3.14, FastAPI, Uvicorn, NetworkX, Shapely, Pydantic v2, httpx.
- **Geospatial Sources**: OpenStreetMap via Nominatim Geocoding and Overpass API.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and OpenStreetMap connectivity status |
| `GET` | `/api/geocode?q={query}` | Search and resolve real-world places to coordinates and bounding boxes |
| `GET` | `/api/geo-area?lat={lat}&lon={lon}&radius={km}` | Extract 2 km normalized corridor network (roads, buildings, water, POIs) |
| `GET` | `/api/analyze?lat={lat}&lon={lon}&radius={km}` | Run complete Phase 3 infrastructure analysis on corridor network |
| `POST` | `/api/analyze` | Analyze provided `GeoAreaResponse` directly without re-fetching |

---

## Setup & Running Locally

### 1. Backend Setup (FastAPI)
```bash
cd roadvision/backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup (React + Vite)
```bash
cd roadvision
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Example Real Locations to Test

1. **`Varkala, Kerala`**: Coastal road corridor with cliff topography, Arabian Sea coastline, temple water tanks, railway station, and arterial connectivity.
2. **`NH Road, Nellore`**: High-capacity trunk highway (NH 16) with bypass connector, industrial feeders, town service lanes, and irrigation canals.
3. **`Siddipet, Telangana`**: Rapidly urbanizing collector and regional arterial ring road network.

---

## Strict Scope Disclosure & Phase 4 Transition

- **Phase 3 Scope Boundary**: Strictly identifies, scores, and visualizes existing structural deficiencies. All traffic demand values are explicitly identified as **MODELLED DEMAND** derived from network topological simulations and OpenStreetMap attributes, not real-time physical sensor feeds.
- **Phase 4 Preview**: Formulates multi-option engineering interventions (flyover construction, bypass routing, lane widening, grade separation, intersection signalization) and cost/benefit evaluations based on Phase 3 problem findings.
