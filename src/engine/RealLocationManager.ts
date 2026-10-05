import * as THREE from 'three';
import type { GeoAreaResponse, LayerVisibility } from '../types/geo';
import { GeoCoordinateSystem } from './GeoCoordinateSystem';
import { RoadNetworkManager } from './RoadNetworkManager';
import { RealTrafficSimulation } from './RealTrafficSimulation';
import { buildRealBuildings } from '../components/Scene/RealBuildings';
import { buildRealWaterFeatures } from '../components/Scene/RealWater';
import { buildRealPOIMarkers } from '../components/Scene/RealPOIs';

export interface GeoBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  maxSpan: number;
}

export class RealLocationManager {
  rootGroup: THREE.Group;
  roadNetMgr: RoadNetworkManager;
  trafficSim: RealTrafficSimulation;
  private buildingsGroup: THREE.Group | null = null;
  private waterGroup: THREE.Group | null = null;
  private poisGroup: THREE.Group | null = null;
  private groundMesh: THREE.Mesh | null = null;

  coordSystem: GeoCoordinateSystem | null = null;
  currentArea: GeoAreaResponse | null = null;
  bounds: GeoBounds | null = null;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'real-location-root';
    this.rootGroup.visible = false;
    this.roadNetMgr = new RoadNetworkManager();
    this.rootGroup.add(this.roadNetMgr.rootGroup);
    this.trafficSim = new RealTrafficSimulation();
    this.rootGroup.add(this.trafficSim.rootGroup);
  }


  async fetchGeoArea(
    lat: number,
    lon: number,
    radiusKm: number = 1.5,
    name: string = ''
  ): Promise<GeoAreaResponse> {
    const url = `/api/geo-area?lat=${lat}&lon=${lon}&radius=${radiusKm}&name=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load geographic data (${res.status} ${res.statusText})`);
    }
    const data: GeoAreaResponse = await res.json();
    return data;
  }

  buildAreaScene(data: GeoAreaResponse): void {
    this.clear();
    this.currentArea = data;

    const [centerLat, centerLon] = data.center;
    this.coordSystem = new GeoCoordinateSystem({ latitude: centerLat, longitude: centerLon });

    // Calculate exact real-world 3D geographic bounds across ALL infrastructure layers
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // 1. Roads
    data.roads.forEach(road => {
      road.geometry.forEach(([lat, lon]) => {
        const w = this.coordSystem!.geoToWorld(lat, lon);
        if (w.x < minX) minX = w.x;
        if (w.x > maxX) maxX = w.x;
        if (w.z < minZ) minZ = w.z;
        if (w.z > maxZ) maxZ = w.z;
      });
    });

    // 2. Buildings
    data.buildings?.forEach(b => {
      b.geometry.forEach(([lat, lon]) => {
        const w = this.coordSystem!.geoToWorld(lat, lon);
        if (w.x < minX) minX = w.x;
        if (w.x > maxX) maxX = w.x;
        if (w.z < minZ) minZ = w.z;
        if (w.z > maxZ) maxZ = w.z;
      });
    });

    // 3. Water Features
    data.water?.forEach(wf => {
      wf.geometry.forEach(([lat, lon]) => {
        const w = this.coordSystem!.geoToWorld(lat, lon);
        if (w.x < minX) minX = w.x;
        if (w.x > maxX) maxX = w.x;
        if (w.z < minZ) minZ = w.z;
        if (w.z > maxZ) maxZ = w.z;
      });
    });

    // 4. POIs
    data.pois?.forEach(poi => {
      const w = this.coordSystem!.geoToWorld(poi.coordinate[0], poi.coordinate[1]);
      if (w.x < minX) minX = w.x;
      if (w.x > maxX) maxX = w.x;
      if (w.z < minZ) minZ = w.z;
      if (w.z > maxZ) maxZ = w.z;
    });

    // Fallback if bounds could not be determined
    if (!isFinite(minX) || !isFinite(maxX)) {
      if (data.boundingBox) {
        const p1 = this.coordSystem.geoToWorld(data.boundingBox.min_lat, data.boundingBox.min_lon);
        const p2 = this.coordSystem.geoToWorld(data.boundingBox.max_lat, data.boundingBox.max_lon);
        minX = Math.min(p1.x, p2.x);
        maxX = Math.max(p1.x, p2.x);
        minZ = Math.min(p1.z, p2.z);
        maxZ = Math.max(p1.z, p2.z);
      } else {
        const r = (data.radiusKm || 1.5) * 1000;
        minX = -r; maxX = r; minZ = -r; maxZ = r;
      }
    }

    const spanX = Math.max(120, maxX - minX);
    const spanZ = Math.max(120, maxZ - minZ);
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const maxSpan = Math.max(spanX, spanZ);

    this.bounds = {
      minX,
      maxX,
      minZ,
      maxZ,
      centerX,
      centerZ,
      maxSpan,
    };

    // Authentic dynamic terrain mesh sized exactly to the active geographic extent
    const groundSize = Math.max(1600, maxSpan * 2.8);
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf2efe9, // Google Maps crisp light land canvas
      roughness: 0.96,
      metalness: 0.02,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.name = 'real-ground-plane';
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(centerX, -0.01, centerZ);

    this.groundMesh.receiveShadow = true;
    this.rootGroup.add(this.groundMesh);

    // 1. Roads (Dedicated Whole-City RoadNetworkManager with hierarchy & GIS centerlines)
    this.roadNetMgr.buildNetwork(data.roads, this.coordSystem);
    if (!this.rootGroup.children.includes(this.roadNetMgr.rootGroup)) {
      this.rootGroup.add(this.roadNetMgr.rootGroup);
    }

    // 1b. Real City Traffic Simulation (Living multi-agent traffic across road geometry)
    this.trafficSim.buildSimulation(data.roads, this.coordSystem);
    if (!this.rootGroup.children.includes(this.trafficSim.rootGroup)) {
      this.rootGroup.add(this.trafficSim.rootGroup);
    }

    // 2. Buildings
    this.buildingsGroup = buildRealBuildings(data.buildings, this.coordSystem);
    this.rootGroup.add(this.buildingsGroup);

    // 3. Water Features
    this.waterGroup = buildRealWaterFeatures(data.water, this.coordSystem);
    this.rootGroup.add(this.waterGroup);

    // 4. POIs
    this.poisGroup = buildRealPOIMarkers(data.pois, this.coordSystem);
    this.rootGroup.add(this.poisGroup);

    this.rootGroup.visible = true;
  }

  update(delta: number): void {
    this.trafficSim.update(delta);
  }

  setLayerVisibility(visibility: LayerVisibility): void {
    this.roadNetMgr.setVisible(visibility.roads);
    this.trafficSim.setVisible(visibility.roads);
    if (this.buildingsGroup) this.buildingsGroup.visible = visibility.buildings;
    if (this.waterGroup) this.waterGroup.visible = visibility.water;
    if (this.poisGroup) this.poisGroup.visible = visibility.pois;
  }

  highlightRoad(roadId: string | null): void {
    this.roadNetMgr.highlightRoad(roadId);
  }

  setVisible(visible: boolean): void {
    this.rootGroup.visible = visible;
  }

  getBounds(): GeoBounds | null {
    return this.bounds;
  }

  clear(): void {
    this.roadNetMgr.clear();
    this.trafficSim.clear();

    if (this.groundMesh) {
      this.rootGroup.remove(this.groundMesh);
      this.groundMesh.geometry?.dispose();
      this.groundMesh = null;
    }


    if (this.buildingsGroup) {
      this.rootGroup.remove(this.buildingsGroup);
      this.buildingsGroup = null;
    }

    if (this.waterGroup) {
      this.rootGroup.remove(this.waterGroup);
      this.waterGroup = null;
    }

    if (this.poisGroup) {
      this.rootGroup.remove(this.poisGroup);
      this.poisGroup = null;
    }
    this.bounds = null;
    this.currentArea = null;
  }
}
