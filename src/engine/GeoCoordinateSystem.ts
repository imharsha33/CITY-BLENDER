import * as THREE from 'three';

const EARTH_RADIUS = 6378137.0; // WGS84 equatorial radius in meters
const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

export interface GeoOrigin {
  latitude: number;
  longitude: number;
}

export class GeoCoordinateSystem {
  private originLat: number;
  private originLon: number;
  private cosLat: number;

  constructor(origin: GeoOrigin) {
    this.originLat = origin.latitude;
    this.originLon = origin.longitude;
    this.cosLat = Math.cos(origin.latitude * DEG2RAD);
  }

  setOrigin(origin: GeoOrigin): void {
    this.originLat = origin.latitude;
    this.originLon = origin.longitude;
    this.cosLat = Math.cos(origin.latitude * DEG2RAD);
  }

  getOrigin(): GeoOrigin {
    return { latitude: this.originLat, longitude: this.originLon };
  }

  /**
   * Converts (latitude, longitude) to local Three.js coordinates (X, Y, Z) in meters.
   * X: East (+X) / West (-X)
   * Y: Up (Elevation)
   * Z: South (+Z) / North (-Z)
   */
  geoToWorld(lat: number, lon: number, elevation: number = 0): THREE.Vector3 {
    const dLon = (lon - this.originLon) * DEG2RAD;
    const dLat = (lat - this.originLat) * DEG2RAD;

    const x = dLon * EARTH_RADIUS * this.cosLat;
    const z = -dLat * EARTH_RADIUS; // -Z points North in standard 3D scene

    return new THREE.Vector3(x, elevation, z);
  }

  /**
   * Converts local Three.js Cartesian coordinate back to (latitude, longitude).
   */
  worldToGeo(x: number, z: number): [number, number] {
    const dLat = -z / EARTH_RADIUS;
    const dLon = x / (EARTH_RADIUS * this.cosLat);

    const lat = this.originLat + dLat * RAD2DEG;
    const lon = this.originLon + dLon * RAD2DEG;

    return [lat, lon];
  }

  /**
   * Calculates geodesic distance between two points in meters using haversine formula.
   */
  static haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = (lat2 - lat1) * DEG2RAD;
    const dLon = (lon2 - lon1) * DEG2RAD;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS * c;
  }
}
