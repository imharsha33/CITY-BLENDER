import React, { useRef, useState } from 'react';
import type { GeoAreaResponse } from '../../types/geo';

interface MapImportControlProps {
  onMapLoaded: (data: GeoAreaResponse) => void;
  disabled?: boolean;
}

interface ValidationState {
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  message: string;
  details?: {
    roads: number;
    buildings: number;
    water: number;
    pois: number;
    crs: string;
  };
}

const SUPPORTED_EXTS = ['.geojson', '.json', '.kml', '.kmz', '.zip', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.csv', '.txt'];

export const MapImportControl: React.FC<MapImportControlProps> = ({
  onMapLoaded,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validation, setValidation] = useState<ValidationState>({
    status: 'idle',
    message: '',
  });

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if needed
    e.target.value = '';

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTS.includes(ext)) {
      setValidation({
        status: 'invalid',
        message: `UNSUPPORTED FORMAT: '${ext}'. Supported: PDF, CAD Images (PNG/JPG/WEBP), GeoJSON, KML, KMZ, Shapefile (.zip), CSV`,
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setValidation({
        status: 'invalid',
        message: 'MAP INVALID: File exceeds maximum size limit (50 MB).',
      });
      return;
    }

    setValidation({
      status: 'validating',
      message: `VALIDATING & REPROJECTING ${file.name}...`,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import-map', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const reason = errJson.detail || `Server returned HTTP ${res.status}`;
        setValidation({
          status: 'invalid',
          message: `MAP INVALID: ${reason}`,
        });
        return;
      }

      const areaData: GeoAreaResponse = await res.json();

      // Geometry & feature validity check
      if (!areaData.roads || areaData.roads.length === 0) {
        setValidation({
          status: 'invalid',
          message: 'MAP INVALID: No road line geometries found in imported map.',
        });
        return;
      }

      setValidation({
        status: 'valid',
        message: `MAP VALID: ${file.name}`,
        details: {
          roads: areaData.roads.length,
          buildings: areaData.buildings.length,
          water: areaData.water.length,
          pois: areaData.pois.length,
          crs: areaData.coordinateReferenceSystem || 'EPSG:4326',
        },
      });

      // Pass parsed & normalized geographic data to parent application
      onMapLoaded(areaData);

      // Auto-clear success toast after 5s
      setTimeout(() => {
        setValidation(prev => (prev.status === 'valid' ? { status: 'idle', message: '' } : prev));
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setValidation({
        status: 'invalid',
        message: `MAP INVALID: Network upload failed (${msg})`,
      });
    }
  };

  return (
    <div className="map-import-control-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,.kml,.kmz,.zip,.pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <button
        className="neumorphic-btn map-import-btn"
        onClick={handleButtonClick}
        disabled={disabled || validation.status === 'validating'}
        title="Import Map / Engineering Document (PDF · CAD Image · GeoJSON · KML · CSV)"
      >
        <span className="map-import-btn__icon">📂</span>
        <div className="map-import-btn__text">
          <span className="map-import-btn__title">
            {validation.status === 'validating' ? 'IMPORTING...' : 'IMPORT MAP / DOC'}
          </span>
          <span className="map-import-btn__formats">PDF · CAD Img · GeoJSON · KML</span>
        </div>
      </button>

      {/* Validation status badge */}
      {validation.status === 'valid' && (
        <div className="map-import-feedback map-import-feedback--valid">
          <span className="map-import-feedback__badge">MAP VALID</span>
          <span className="map-import-feedback__title">{validation.message.replace('MAP VALID: ', '')}</span>
          {validation.details && (
            <span className="map-import-feedback__meta">
              {validation.details.roads} Roads · {validation.details.buildings} Bldgs · {validation.details.water} Water · CRS: {validation.details.crs}
            </span>
          )}
        </div>
      )}

      {validation.status === 'invalid' && (
        <div className="map-import-feedback map-import-feedback--invalid">
          <span className="map-import-feedback__badge">MAP INVALID</span>
          <span className="map-import-feedback__text">{validation.message.replace('MAP INVALID: ', '')}</span>
          <button
            className="map-import-feedback__close"
            onClick={() => setValidation({ status: 'idle', message: '' })}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
