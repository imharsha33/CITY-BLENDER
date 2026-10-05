import React, { useState, useRef, useEffect } from 'react';
import type { LocationResult } from '../../types/geo';

interface CitySelectBarProps {
  locationName?: string;
  onSelectLocation: (loc: LocationResult) => void;
  onSelectDemoPlan?: (plan: 'four_lane' | 'flyover' | 'ring_road' | 'road_sensor') => void;
  isLoading?: boolean;
}

const PRESET_CITIES: { name: string; region: string; loc: LocationResult }[] = [
  {
    name: 'Madurai',
    region: 'Tamil Nadu, India',
    loc: {
      id: 'madurai-city-tamilnadu',
      displayName: 'Madurai, Tamil Nadu, India',
      name: 'Madurai',
      latitude: 9.9261,
      longitude: 78.1141,
    },
  },
  {
    name: 'Siddipet',
    region: 'Telangana, India',
    loc: {
      id: 'siddipet-telangana',
      displayName: 'Siddipet, Telangana, India',
      name: 'Siddipet',
      latitude: 18.1018,
      longitude: 78.8520,
    },
  },
  {
    name: 'Nellore',
    region: 'Andhra Pradesh, India',
    loc: {
      id: 'nellore-ap',
      displayName: 'Nellore, Andhra Pradesh, India',
      name: 'Nellore',
      latitude: 14.4426,
      longitude: 79.9865,
    },
  },
  {
    name: 'Varkala',
    region: 'Kerala, India',
    loc: {
      id: 'varkala-kerala',
      displayName: 'Varkala, Kerala, India',
      name: 'Varkala',
      latitude: 8.7379,
      longitude: 76.7163,
    },
  },
];

export const CitySelectBar: React.FC<CitySelectBarProps> = ({
  locationName = 'Madurai',
  onSelectLocation,
  onSelectDemoPlan,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search API
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search-location?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data: LocationResult[] = await res.json();
          setSearchResults(data.slice(0, 5));
        }
      } catch {
        // Fallback filter on presets
        const filtered = PRESET_CITIES.filter(c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(c => c.loc);
        setSearchResults(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayLabel = locationName ? locationName.split(',')[0].trim() : 'Select City';

  return (
    <div className="city-select-bar-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="city-select-bar-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Select city digital twin or search location"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#ea4335" style={{ flexShrink: 0 }}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span className="city-select-bar-label">{isLoading ? 'Loading...' : displayLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#5f6368" style={{ marginLeft: 4, flexShrink: 0 }}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="city-select-dropdown">
          {/* Quick Search Input */}
          <div className="city-search-input-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#5f6368">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              className="city-search-field"
              placeholder="Search any city or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {isSearching && <span className="city-search-mini-spinner" />}
          </div>

          {/* Search Results (if searching) */}
          {searchResults.length > 0 && (
            <div className="city-dropdown-section">
              <span className="city-dropdown-section-title">Search Results</span>
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  className="city-dropdown-item"
                  onClick={() => {
                    onSelectLocation(res);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="city-item-name">{res.name}</span>
                  <span className="city-item-sub">{res.displayName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Featured Cities */}
          <div className="city-dropdown-section">
            <span className="city-dropdown-section-title">Verified Digital Twins</span>
            {PRESET_CITIES.map((c) => {
              const isActive = locationName.toLowerCase().includes(c.name.toLowerCase());
              return (
                <button
                  key={c.name}
                  className={`city-dropdown-item ${isActive ? 'city-dropdown-item--active' : ''}`}
                  onClick={() => {
                    onSelectLocation(c.loc);
                    setIsOpen(false);
                  }}
                >
                  <div className="city-item-left">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={isActive ? '#1a73e8' : '#ea4335'}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    <span className="city-item-name">{c.name}</span>
                  </div>
                  <span className="city-item-region">{c.region}</span>
                </button>
              );
            })}
          </div>

          {/* Simulations / Showcases */}
          {onSelectDemoPlan && (
            <div className="city-dropdown-section">
              <span className="city-dropdown-section-title">Interactive 3D Showcases</span>
              <button
                className="city-dropdown-item"
                onClick={() => {
                  onSelectDemoPlan('road_sensor');
                  setIsOpen(false);
                }}
              >
                <div className="city-item-left">
                  <span style={{ fontSize: 13 }}>🚥</span>
                  <span className="city-item-name" style={{ color: '#1a73e8', fontWeight: 600 }}>
                    Signal Junction & Road Sensor
                  </span>
                </div>
                <span className="city-item-region">Piezoresistive TCU</span>
              </button>
              <button
                className="city-dropdown-item"
                onClick={() => {
                  onSelectDemoPlan('four_lane');
                  setIsOpen(false);
                }}
              >
                <div className="city-item-left">
                  <span style={{ fontSize: 13 }}>🛣️</span>
                  <span className="city-item-name">4-Lane Highway Construction</span>
                </div>
                <span className="city-item-region">Civil Timeline</span>
              </button>
              <button
                className="city-dropdown-item"
                onClick={() => {
                  onSelectDemoPlan('flyover');
                  setIsOpen(false);
                }}
              >
                <div className="city-item-left">
                  <span style={{ fontSize: 13 }}>🌉</span>
                  <span className="city-item-name">Elevated Flyover Viaduct</span>
                </div>
                <span className="city-item-region">Grade Separation</span>
              </button>
              <button
                className="city-dropdown-item"
                onClick={() => {
                  onSelectDemoPlan('ring_road');
                  setIsOpen(false);
                }}
              >
                <div className="city-item-left">
                  <span style={{ fontSize: 13 }}>🔄</span>
                  <span className="city-item-name">Orbital Ring Road Bypass</span>
                </div>
                <span className="city-item-region">Beltway Logistics</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
