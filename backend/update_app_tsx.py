import os

app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'App.tsx'))

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DevelopmentZonesPanel import
if 'DevelopmentZonesPanel' not in content:
    content = content.replace(
        "import { OptimizationPanel } from './components/Panels/OptimizationPanel';",
        "import { OptimizationPanel } from './components/Panels/OptimizationPanel';\nimport { DevelopmentZonesPanel } from './components/Panels/DevelopmentZonesPanel';"
    )
    content = content.replace(
        "import type { GeoAreaResponse, LayerVisibility, LocationResult, SceneMode, RoadSegmentGeo } from './types/geo';",
        "import type { GeoAreaResponse, LayerVisibility, LocationResult, SceneMode, RoadSegmentGeo, DevelopmentZone } from './types/geo';"
    )

# 2. Add isZonesOpen state
if 'const [isZonesOpen, setIsZonesOpen]' not in content:
    content = content.replace(
        "const [isOptimizationOpen, setIsOptimizationOpen]   = useState(false);",
        "const [isOptimizationOpen, setIsOptimizationOpen]   = useState(false);\n  const [isZonesOpen, setIsZonesOpen]                 = useState(false);"
    )

# 3. Reset isZonesOpen on location change
if 'setIsZonesOpen(false);' not in content:
    content = content.replace(
        "setIsOptimizationOpen(false);",
        "setIsOptimizationOpen(false);\n    setIsZonesOpen(false);"
    )

# 4. Add handleFocusZone
if 'handleFocusZone' not in content:
    focus_fn = """  const handleFocusZone = (zone: DevelopmentZone) => {
    setFocusTarget({
      lat: zone.center[0],
      lon: zone.center[1],
      viewType: 'zone',
      timestamp: Date.now(),
    });
  };

"""
    content = content.replace("  // Phase 4: Generate Civil Planning Alternatives", focus_fn + "  // Phase 4: Generate Civil Planning Alternatives")

# 5. Connect Header props
content = content.replace(
    "onTogglePlanning={handleTogglePlanning}",
    "onToggleZones={() => setIsZonesOpen(prev => !prev)}\n          isZonesOpen={isZonesOpen}\n          zonesCount={analysisData?.developmentZones?.length || 0}\n          onTogglePlanning={handleTogglePlanning}"
)

# 6. Render DevelopmentZonesPanel
if '<DevelopmentZonesPanel' not in content:
    panel_code = """        {/* Phase 8 Development Zones Panel */}
        {mode === 'real_location' && isZonesOpen && analysisData?.developmentZones && (
          <DevelopmentZonesPanel
            zones={analysisData.developmentZones}
            placeName={realLocationData?.locationName || 'Selected Location'}
            wholePlacePlan={optimizationData?.whole_place_plan as any}
            selectedStrategy={selectedStrategy}
            onFocusZone={handleFocusZone}
            onClose={() => setIsZonesOpen(false)}
          />
        )}

"""
    content = content.replace(
        "{mode === 'real_location' && isOptimizationOpen && (",
        panel_code + "        {mode === 'real_location' && isOptimizationOpen && ("
    )

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx successfully updated with Development Zones support!")
