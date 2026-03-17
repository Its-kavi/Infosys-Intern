import React, { memo, useCallback, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, Polyline } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '12px'
};
// Center of India (Default)
const defaultCenter = { lat: 20.5937, lng: 78.9629 };

/**
 * InteractiveMap - Displays markers for multiple rides with click interactions
 * @param {Array} rides - Array of ride objects with source coordinates
 * @param {Function} onMarkerClick - Callback when a marker is clicked
 * @param {Function} onRideSelect - Callback when a marker is clicked (legacy)
 * @param {number} selectedRideId - Currently selected ride ID
 * @param {number} highlightedRideId - Currently highlighted ride ID (from hover)
 */
function InteractiveMap({
  rides = [],
  onMarkerClick,
  onRideSelect,
  selectedRideId,
  highlightedRideId,
  style = {}
}) {
  const [activeMarker, setActiveMarker] = useState(null);

  const mapStyle = {
    ...containerStyle,
    ...style
  };

  const handleMarkerClick = useCallback(
    (ride) => {
      setActiveMarker(ride.id);
      // Support both callback names
      if (onMarkerClick) {
        onMarkerClick(ride.id);
      }
      if (onRideSelect) {
        onRideSelect(ride.id);
      }
    },
    [onMarkerClick, onRideSelect]
  );

  const handleInfoWindowClose = useCallback(() => {
    setActiveMarker(null);
  }, []);

  // Calculate map center based on rides
  const center = calculateMapCenter(rides);

  if (!rides || rides.length === 0) {
    return (
      <div style={containerStyle} className="bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">No rides to display on map</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapStyle}
      center={center}
      zoom={10}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {/* Render routes for all rides using encoded polylines from backend */}
      {rides.map((ride) => {
        // Backend now provides encodedPolyline - decode it
        if (!ride.encodedPolyline || !window.google?.maps?.geometry) {
          return null;
        }

        const decodedPath = window.google.maps.geometry.encoding.decodePath(ride.encodedPolyline);
        const isHighlighted = highlightedRideId === ride.id;
        const isSelected = selectedRideId === ride.id;

        // Get source and destination coordinates from backend OR extract from polyline
        let sourcePos = getCoordinates(ride.sourceCoordinates || ride.sourceLocation);
        let destPos = getCoordinates(ride.destinationCoordinates || ride.destinationLocation);
        
        // Fallback: Extract from decoded polyline if backend didn't provide coordinates
        if (!sourcePos && decodedPath.length > 0) {
          sourcePos = decodedPath[0]; // First point is source
        }
        if (!destPos && decodedPath.length > 0) {
          destPos = decodedPath[decodedPath.length - 1]; // Last point is destination
        }

        return (
          <React.Fragment key={`route-${ride.id}`}>
            {/* Render polyline */}
            <Polyline
              path={decodedPath}
              options={{
                strokeColor: isSelected ? '#ef4444' : isHighlighted ? '#f59e0b' : '#2563eb',
                strokeOpacity: isSelected || isHighlighted ? 0.9 : 0.6,
                strokeWeight: isSelected ? 5 : isHighlighted ? 4 : 3,
              }}
            />
            {/* Source Marker */}
            {sourcePos && (
              <Marker
                position={sourcePos}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: '#10b981',
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                title={`Start: ${ride.source}`}
              />
            )}
            {/* Destination Marker */}
            {destPos && (
              <Marker
                position={destPos}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: '#ef4444',
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                title={`End: ${ride.destination}`}
              />
            )}
          </React.Fragment>
        );
      })}

      {rides.map((ride) => {
        const position = getRideSourcePosition(ride);

        if (!position) return null;

        // Determine marker style based on state
        const isHighlighted = highlightedRideId === ride.id;
        const isSelected = selectedRideId === ride.id;
        const isActive = activeMarker === ride.id;

        return (
          <Marker
            key={ride.id}
            position={position}
            onClick={() => handleMarkerClick(ride)}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: isSelected || isActive ? 12 : isHighlighted ? 10 : 8,
              fillColor: isSelected || isActive ? '#ef4444' : isHighlighted ? '#f59e0b' : '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            animation={isHighlighted ? window.google.maps.Animation.BOUNCE : null}
          >
            {activeMarker === ride.id && (
              <InfoWindow onCloseClick={handleInfoWindowClose}>
                <div style={{ maxWidth: '220px', padding: '0.5rem' }}>
                  <h3 style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {ride.source || 'Pickup'} → {ride.destination || 'Drop'}
                  </h3>
                  {ride.driverName && (
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Driver: {ride.driverName}
                    </p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    {ride.time || 'Time not available'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    ₹{ride.price || '0'} per seat
                  </p>
                  {ride.seats !== undefined && (
                    <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem', fontWeight: '500' }}>
                      {ride.seats} seats available
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  );
}

// Extract coordinates from backend geometry object (PostGIS format or standard lat/lng)
function getCoordinates(coordObject) {
  if (!coordObject) return null;

  // PostGIS Point format: { x: lng, y: lat } or { coordinates: [lng, lat] }
  if (coordObject.x !== undefined && coordObject.y !== undefined) {
    return { lat: Number(coordObject.y), lng: Number(coordObject.x) };
  }

  // GeoJSON format
  if (coordObject.coordinates && Array.isArray(coordObject.coordinates)) {
    return { lat: Number(coordObject.coordinates[1]), lng: Number(coordObject.coordinates[0]) };
  }

  // Standard format: { lat, lng } or { latitude, longitude }
  if (coordObject.lat !== undefined && coordObject.lng !== undefined) {
    return { lat: Number(coordObject.lat), lng: Number(coordObject.lng) };
  }

  if (coordObject.latitude !== undefined && coordObject.longitude !== undefined) {
    return { lat: Number(coordObject.latitude), lng: Number(coordObject.longitude) };
  }

  return null;
}

// Extract source coordinates from ride object
function getRideSourcePosition(ride) {
  // Try backend geometry fields first (new format)
  if (ride.sourceCoordinates || ride.sourceLocation) {
    return getCoordinates(ride.sourceCoordinates || ride.sourceLocation);
  }

  // Fallback to legacy separate lat/lng fields
  if (ride.sourceLat && ride.sourceLng) {
    return { lat: Number(ride.sourceLat), lng: Number(ride.sourceLng) };
  }

  if (ride.sourceLatitude && ride.sourceLongitude) {
    return { lat: Number(ride.sourceLatitude), lng: Number(ride.sourceLongitude) };
  }

  return null;
}

// Calculate center point based on all rides
function calculateMapCenter(rides) {
  if (!rides || rides.length === 0) return defaultCenter;

  const positions = rides
    .map(getRideSourcePosition)
    .filter(Boolean);

  if (positions.length === 0) return defaultCenter;

  const bounds = positions.reduce(
    (acc, pos) => ({
      minLat: Math.min(acc.minLat, pos.lat),
      maxLat: Math.max(acc.maxLat, pos.lat),
      minLng: Math.min(acc.minLng, pos.lng),
      maxLng: Math.max(acc.maxLng, pos.lng),
    }),
    {
      minLat: positions[0].lat,
      maxLat: positions[0].lat,
      minLng: positions[0].lng,
      maxLng: positions[0].lng,
    }
  );

  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

export default memo(InteractiveMap);