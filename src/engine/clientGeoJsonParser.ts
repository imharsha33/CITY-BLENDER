import type { GeoAreaResponse, RoadSegmentGeo, BuildingGeo, WaterFeatureGeo, POIGeo, BoundingBox } from '../types/geo';

export function parseGeoJsonClientSide(filename: string, json: any): GeoAreaResponse {
  const features = json.type === 'FeatureCollection' ? json.features : json.type === 'Feature' ? [json] : [];
  if (!features || features.length === 0) {
    throw new Error('No features found in GeoJSON file.');
  }

  let min_lat = 90.0, max_lat = -90.0, min_lon = 180.0, max_lon = -180.0;

  function updateBounds(lat: number, lon: number) {
    if (lat < min_lat) min_lat = lat;
    if (lat > max_lat) max_lat = lat;
    if (lon < min_lon) min_lon = lon;
    if (lon > max_lon) max_lon = lon;
  }

  const roads: RoadSegmentGeo[] = [];
  const buildings: BuildingGeo[] = [];
  const water: WaterFeatureGeo[] = [];
  const pois: POIGeo[] = [];

  features.forEach((f: any, idx: number) => {
    const geom = f.geometry;
    const props = f.properties || {};
    if (!geom) return;

    const fid = f.id || props.id || `f-${idx + 1}`;
    const gtype = geom.type;

    if (gtype === 'LineString' && Array.isArray(geom.coordinates)) {
      const coords: [number, number][] = [];
      geom.coordinates.forEach((c: any) => {
        if (Array.isArray(c) && c.length >= 2) {
          const lon = Number(c[0]);
          const lat = Number(c[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            updateBounds(lat, lon);
            coords.push([lat, lon]);
          }
        }
      });
      if (coords.length >= 2) {
        const lanes = props.lanes ? parseInt(props.lanes, 10) : null;
        const width = props.width ? Number(props.width) : (lanes ? lanes * 3.5 : 6.5);
        roads.push({
          id: `road-${fid}`,
          name: props.name || props.road_name || `Road ${idx + 1}`,
          highwayType: props.highway || props.type || 'primary',
          geometry: coords,
          lanes: lanes || undefined,
          estimatedWidth: width,
          oneWay: props.oneway === 'yes' || props.oneway === true,
          surface: props.surface || null,
          maxSpeed: props.maxspeed || null,
          bridge: props.bridge === 'yes' || props.bridge === true,
          tunnel: props.tunnel === 'yes' || props.tunnel === true,
        });
      }
    } else if (gtype === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
      const ring = geom.coordinates[0];
      const coords: [number, number][] = [];
      ring.forEach((c: any) => {
        if (Array.isArray(c) && c.length >= 2) {
          const lon = Number(c[0]);
          const lat = Number(c[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            updateBounds(lat, lon);
            coords.push([lat, lon]);
          }
        }
      });
      if (coords.length >= 3) {
        if (props.natural === 'water' || props.water || props.waterway) {
          water.push({
            id: `water-${fid}`,
            name: props.name || 'Water Body',
            geometry: coords,
            type: props.natural || 'water',
          });
        } else {
          buildings.push({
            id: `bldg-${fid}`,
            geometry: coords,
            height: props.height ? Number(props.height) : undefined,
            estimatedHeight: props.levels ? Number(props.levels) * 3.4 : 7.0,
            type: props.building || 'commercial',
            levels: props.levels ? Number(props.levels) : undefined,
          });
        }
      }
    } else if (gtype === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
      const lon = Number(geom.coordinates[0]);
      const lat = Number(geom.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        updateBounds(lat, lon);
        pois.push({
          id: `poi-${fid}`,
          name: props.name || props.amenity || `Point ${idx + 1}`,
          type: props.amenity || props.shop || props.highway || 'amenity',
          coordinate: [lat, lon],
        });
      }
    }
  });

  if (min_lat > max_lat) {
    min_lat = 14.4426; max_lat = 14.4550;
    min_lon = 79.9865; max_lon = 79.9985;
  }

  const centerLat = (min_lat + max_lat) / 2;
  const centerLon = (min_lon + max_lon) / 2;

  const boundingBox: BoundingBox = {
    min_lat,
    max_lat,
    min_lon,
    max_lon,
  };

  const nameBase = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const capitalized = nameBase.charAt(0).toUpperCase() + nameBase.slice(1);

  return {
    locationName: capitalized,
    center: [centerLat, centerLon],
    radiusKm: 2.0,
    boundingBox,
    dataSource: 'USER_IMPORT',
    roads,
    buildings,
    water,
    pois,
  };
}
