from fastapi import FastAPI, Query, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn
import logging

from models import LocationResult, GeoArea, AnalysisResultResponse
from geocoding import geocode_location
from osm_service import fetch_geo_area
from map_importer import parse_geospatial_file
from analysis.analysis_engine import run_infrastructure_analysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("roadvision-backend")

app = FastAPI(
    title="RoadVision Geospatial & Infrastructure Analysis Engine",
    description="Backend microservice providing OpenStreetMap geocoding, Map Import (GeoJSON/KML/KMZ/Shapefile), and Phase 3 Infrastructure Problem Analysis.",
    version="3.1.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "RoadVision Phase 3 Intelligent Infrastructure Analysis Engine",
        "version": "3.1.0",
        "osmSource": "OpenStreetMap Nominatim + Overpass API",
        "supportedImports": ["GeoJSON (.geojson, .json)", "KML (.kml)", "KMZ (.kmz)", "Shapefile ZIP (.zip)"],
        "capabilities": [
            "Geocoding",
            "Geospatial Area Extraction",
            "User Map Ingestion & Reprojection",
            "Topological Graph Building",
            "Planning-Level Capacity Analysis",
            "Modelled Traffic Demand",
            "Junction Conflict Scoring",
            "Bottleneck Detection",
            "Network Criticality Scoring"
        ]
    }

@app.get("/api/geocode", response_model=List[LocationResult])
async def geocode(q: str = Query(..., min_length=1, description="Location search query (e.g. 'Varkala, Kerala')")):
    try:
        results = await geocode_location(q)
        return results
    except Exception as e:
        logger.error(f"Geocoding error for '{q}': {e}")
        raise HTTPException(status_code=500, detail=f"Geocoding service unavailable: {str(e)}")

@app.get("/api/geo-area", response_model=GeoArea)
async def get_geo_area(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    radius: float = Query(1.5, ge=0.5, le=5.0, description="Planning radius in km (default 1.5 - 2.0 km)"),
    name: Optional[str] = Query("", description="Optional location name for metadata"),
):
    try:
        area = await fetch_geo_area(lat, lon, radius, name or "")
        return area
    except Exception as e:
        logger.error(f"Error fetching geo-area at ({lat}, {lon}): {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract geospatial infrastructure: {str(e)}")

@app.post("/api/import-map", response_model=GeoArea)
async def import_geospatial_map(file: UploadFile = File(...)):
    """
    Import user-provided geospatial map (GeoJSON, KML, KMZ, Shapefile ZIP).
    Validates geometry, detects/reprojects CRS, and normalizes into standard GeoArea model.
    """
    try:
        filename = file.filename or "uploaded_map.geojson"
        content = await file.read()
        logger.info(f"Received map import file: {filename} ({len(content)} bytes)")

        area = parse_geospatial_file(filename, content)
        logger.info(f"Successfully normalized map: {len(area.roads)} roads, {len(area.buildings)} buildings, {len(area.water)} water features")
        return area
    except ValueError as ve:
        logger.warning(f"Validation error importing {file.filename}: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error importing map {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process map file: {str(e)}")

@app.get("/api/analyze", response_model=AnalysisResultResponse)
async def analyze_area_get(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    radius: float = Query(1.5, ge=0.5, le=5.0),
    name: Optional[str] = Query(""),
):
    try:
        area = await fetch_geo_area(lat, lon, radius, name or "")
        analysis_result = run_infrastructure_analysis(area)
        return analysis_result
    except Exception as e:
        logger.error(f"Error analyzing infrastructure at ({lat}, {lon}): {e}")
        raise HTTPException(status_code=500, detail=f"Infrastructure analysis failed: {str(e)}")

@app.post("/api/analyze", response_model=AnalysisResultResponse)
async def analyze_area_post(payload: dict = Body(...)):
    """
    Analyze either a direct GeoArea payload (e.g. from user import or loaded map)
    or coordinates. Guarantees 100% parity between displayed map and analyzed map.
    """
    try:
        # Check if full GeoArea was provided directly
        if "roads" in payload and isinstance(payload["roads"], list):
            area = GeoArea(**payload)
            logger.info(f"Analyzing directly supplied GeoArea '{area.locationName}' with {len(area.roads)} roads")
            analysis_result = run_infrastructure_analysis(area)
            return analysis_result

        # Otherwise fetch by lat/lon
        lat = float(payload.get("latitude", payload.get("lat", 8.7379)))
        lon = float(payload.get("longitude", payload.get("lon", 76.7163)))
        radius = float(payload.get("radiusKm", payload.get("radius", 1.5)))
        name = str(payload.get("locationName", payload.get("name", "")))

        area = await fetch_geo_area(lat, lon, radius, name)
        analysis_result = run_infrastructure_analysis(area)
        return analysis_result
    except Exception as e:
        logger.error(f"Error analyzing payload: {e}")
        raise HTTPException(status_code=500, detail=f"Infrastructure analysis failed: {str(e)}")

from planning.models import PlanningRequest, PlanningResponse
from planning.planning_engine import run_planning_engine
from forecasting.models import ForecastRequest, ForecastResponse
from forecasting.engine import run_forecasting_pipeline

@app.post("/api/plans/generate", response_model=PlanningResponse)
async def generate_plans(request: PlanningRequest = Body(...)):
    """
    Generate, evaluate, compare, and rank candidate infrastructure intervention plans
    for the active geographic dataset and Phase 3 diagnostic findings.
    """
    try:
        geo_area_data = request.geo_area
        analysis_data = request.analysis
        priority = request.priority or "balanced"

        logger.info(f"Generating Phase 4 candidate plans under priority: '{priority}'")
        response = run_planning_engine(geo_area_data, analysis_data, priority)
        logger.info(f"Successfully generated {len(response.candidates)} candidate plans. Recommended: {response.recommendedPlanId}")
        return response
    except Exception as e:
        logger.error(f"Planning engine failure: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Infrastructure plan generation failed: {str(e)}")

@app.post("/api/forecast/generate", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest = Body(...)):
    """
    Phase 5: Forecast future traffic demand, identify future bottlenecks,
    quantify urban development pressure, and evaluate Phase 4 candidate plans
    under multiple future horizons and growth scenarios.
    """
    try:
        logger.info(f"Running Phase 5 forecast for {request.active_year} under scenario '{request.active_scenario}'")
        response = run_forecasting_pipeline(request)
        logger.info(f"Forecast complete: {len(response.future_bottlenecks)} future bottlenecks detected, {len(response.plan_performances)} plans simulated")
        return response
    except Exception as e:
        logger.error(f"Forecasting engine failure: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Future demand forecasting failed: {str(e)}")

from optimization.models import OptimizationRequest, OptimizationResponse
from optimization.optimizer import run_optimization_pipeline

@app.post("/api/optimization/generate", response_model=OptimizationResponse)
async def generate_optimization(request: OptimizationRequest = Body(...)):
    """
    Phase 6: Multi-objective optimization across current conditions, future scenarios,
    geographic constraints, cost, land impact, safety, resilience, and construction disruption
    to produce the best overall infrastructure strategy.
    """
    if not request.geo_area or not request.analysis:
        raise HTTPException(
            status_code=400,
            detail="INSUFFICIENT DATA FOR RELIABLE OPTIMIZATION: Geographic area and Phase 3 analysis are required."
        )

    if not request.plans or len(request.plans) == 0:
        raise HTTPException(
            status_code=400,
            detail="INSUFFICIENT DATA FOR RELIABLE OPTIMIZATION: At least one Phase 4 candidate plan is required for strategy synthesis."
        )

    try:
        logger.info(f"Running Phase 6 strategy optimization under mode: '{request.optimization_mode}'")
        response = run_optimization_pipeline(request)
        logger.info(f"Optimization complete: {response.total_strategies_evaluated} combinations evaluated, {len(response.pareto_strategies)} Pareto-optimal strategies found")
        return response
    except ValueError as ve:
        logger.warning(f"Optimization validation issue: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Optimization engine failure: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Strategy optimization failed: {str(e)}")

from optimization.similarity import compare_strategy_fingerprints

@app.post("/api/verification/similarity")
async def verify_similarity(payload: dict = Body(...)):
    """
    Phase 9: Anti-template plan similarity detector.
    Compares two strategy fingerprints to ensure non-generic planning and honest differentiation.
    """
    fp_a = payload.get("fingerprintA") or payload.get("fingerprint_a") or {}
    fp_b = payload.get("fingerprintB") or payload.get("fingerprint_b") or {}
    result = compare_strategy_fingerprints(fp_a, fp_b)
    return result

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)



