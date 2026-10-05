import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { LocationResult } from '../../types/geo';

interface LocationSearchProps {
  onSelectLocation: (loc: LocationResult) => void;
  isLoading: boolean;
}

// Authoritative primary demonstration city
const FEATURED_MADURAI: LocationResult = {
  id: 'madurai-city-tamilnadu',
  displayName: 'Madurai, Tamil Nadu, India',
  name: 'Madurai',
  latitude: 9.9261,
  longitude: 78.1141,
  type: 'city',
  category: 'place',
  address: { city: 'Madurai', county: 'Madurai South', state: 'Tamil Nadu', country: 'India' },
  importance: 0.98,
  boundingBox: { min_lat: 9.8245, max_lat: 9.9934, min_lon: 78.0156, max_lon: 78.2030 },
};

export const LocationSearch: React.FC<LocationSearchProps> = ({ onSelectLocation, isLoading }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setStatusMessage(null);
      return;
    }

    // Cancel any previous pending network request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentRequestId = ++requestIdRef.current;
    setIsSearching(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
        signal: abortController.signal,
      });

      // Discard stale response if a newer query was fired
      if (currentRequestId !== requestIdRef.current) return;

      if (res.ok) {
        const data: LocationResult[] = await res.json();
        setResults(data);
        if (data.length === 0) {
          setStatusMessage('No matching locations found.');
        } else {
          setStatusMessage(null);
        }
        setIsOpen(true);
      } else if (res.status === 429) {
        setResults([]);
        setStatusMessage('Location search temporarily unavailable.');
        setIsOpen(true);
      } else {
        setResults([]);
        setStatusMessage('Location search unavailable. Please try again.');
        setIsOpen(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Ignored: request was cleanly superseded
        return;
      }
      if (currentRequestId === requestIdRef.current) {
        setResults([]);
        setStatusMessage('Location search unavailable. Please try again.');
        setIsOpen(true);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setActiveIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults([]);
      setIsSearching(false);
      setStatusMessage(null);
      setIsOpen(true); // Keep open to show featured demo city recommendation
      return;
    }

    setIsSearching(true);
    setStatusMessage(null);
    setIsOpen(true);

    // Controlled 300ms debounce
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(trimmed);
    }, 300);
  };

  const handleSelect = (loc: LocationResult) => {
    const primaryName = loc.name || loc.displayName.split(',')[0].trim();
    setQuery(primaryName);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelectLocation(loc);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = results.length > 0 ? results : (query.trim().length < 2 ? [FEATURED_MADURAI] : []);
    if (!isOpen || list.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % list.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? list.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < list.length) {
        handleSelect(list[activeIndex]);
      } else if (list.length > 0) {
        handleSelect(list[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const showFeaturedEmptyPrompt = query.trim().length < 2;

  return (
    <div className="location-search" ref={containerRef} onKeyDown={handleKeyDown}>
      <div className="location-search__input-wrapper">
        <input
          type="text"
          className="location-search__input"
          placeholder="Search city, place or area (e.g. Madurai)..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
          spellCheck="false"
        />
        <div className="location-search__icon">
          {isLoading || isSearching ? (
            <span className="search-spinner" title="Searching..." />
          ) : query ? (
            <button
              type="button"
              className="location-search__clear"
              onClick={() => {
                setQuery('');
                setResults([]);
                setStatusMessage(null);
                setIsOpen(true);
              }}
              title="Clear search"
            >
              ✕
            </button>
          ) : (
            <span className="location-search__mag">🔍</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="location-search__results">
          {/* Subtle Empty State: Primary Featured Demo City Suggestion */}
          {showFeaturedEmptyPrompt && !isSearching && (
            <div className="location-search__featured-block">
              <div className="location-search__section-title">
                FEATURED DEVELOPMENT AREA
              </div>
              <button
                type="button"
                className={`location-search__item location-search__item--featured ${
                  activeIndex === 0 ? 'location-search__item--active' : ''
                }`}
                onClick={() => handleSelect(FEATURED_MADURAI)}
              >
                <div className="location-search__item-primary">
                  <span className="location-pin">📍</span>
                  <span className="location-name">Madurai</span>
                  <span className="location-tag location-tag--featured">PRIMARY DEMO</span>
                </div>
                <div className="location-search__item-secondary">
                  Madurai, Tamil Nadu, India · City Digital Twin
                </div>
              </button>
            </div>
          )}

          {/* Searching Status Indicator */}
          {isSearching && (
            <div className="location-search__status location-search__status--searching">
              <span className="search-spinner" />
              <span>SEARCHING LOCATIONS...</span>
            </div>
          )}

          {/* Error or Empty State Feedback */}
          {!isSearching && statusMessage && (
            <div className="location-search__status location-search__status--message">
              {statusMessage}
            </div>
          )}

          {/* Real Geographic Results */}
          {!isSearching && results.length > 0 && (
            <>
              <div className="location-search__section-title">
                MATCHING GEOGRAPHIC RESULTS
              </div>
              {results.map((loc, idx) => {
                const parts = loc.displayName.split(',');
                const primary = loc.name || parts[0]?.trim();
                const secondary = parts.slice(1).join(',').trim() || loc.displayName;
                const isSelected = activeIndex === idx;

                return (
                  <button
                    key={loc.id || `${loc.latitude}-${loc.longitude}-${idx}`}
                    type="button"
                    className={`location-search__item ${isSelected ? 'location-search__item--active' : ''}`}
                    onClick={() => handleSelect(loc)}
                  >
                    <div className="location-search__item-primary">
                      <span className="location-pin">📍</span>
                      <span className="location-name">{primary}</span>
                      {loc.type && (
                        <span className={`location-tag ${loc.type === 'city' ? 'location-tag--city' : ''}`}>
                          {loc.type.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {secondary && (
                      <div className="location-search__item-secondary" title={loc.displayName}>
                        {secondary}
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
