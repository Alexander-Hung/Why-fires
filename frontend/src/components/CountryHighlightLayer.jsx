import React, { useState, useEffect, useRef } from 'react';

export const CountryHighlightLayer = ({ highlightedCountry, highlightColor = 'rgba(243, 156, 18, 0.5)' }) => {
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Store the loaded GeoJSON files in a cache to avoid repeated fetching
    const geoJsonCacheRef = useRef({});

    useEffect(() => {
        const loadCountryGeoJson = async () => {
            if (!highlightedCountry) {
                setGeoJsonData(null);
                return;
            }

            // Check if we already have this country's data in cache
            if (geoJsonCacheRef.current[highlightedCountry]) {
                setGeoJsonData(geoJsonCacheRef.current[highlightedCountry]);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Format the country name for file access (replace spaces with underscores, etc.)
                const formattedCountryName = highlightedCountry.replace(/\s+/g, '_').toLowerCase();

                // Load the GeoJSON file for this country
                // Adjust the path based on where your GeoJSON files are located
                const response = await fetch(`/geojson/${formattedCountryName}.geojson`);

                if (!response.ok) {
                    throw new Error(`Failed to load GeoJSON for ${highlightedCountry}`);
                }

                const data = await response.json();

                // Store in cache
                geoJsonCacheRef.current[highlightedCountry] = data;
                setGeoJsonData(data);

            } catch (err) {
                console.error('Error loading GeoJSON:', err);
                setError(err.message);
                setGeoJsonData(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadCountryGeoJson();
    }, [highlightedCountry]);

    // Create a mapbox layer configuration for the highlighted country
    const getMapboxLayerConfig = () => {
        if (!geoJsonData) return [];

        return [{
            sourcetype: 'geojson',
            source: geoJsonData,
            type: 'fill',
            color: highlightColor,
            opacity: 0.6,
            line: {
                color: 'white',
                width: 2
            },
            below: 'traces' // Places the layer below the data points
        }];
    };

    if (isLoading) {
        return (
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                zIndex: 1000
            }}>
                Loading country data...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(255,0,0,0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                zIndex: 1000
            }}>
                Error: {error}
            </div>
        );
    }

    // Return null since we handle the layer inside the map component
    return null;

    // Export the layer configuration
    // This should be passed to your map component's layout configuration
    CountryHighlightLayer.getLayerConfig = getMapboxLayerConfig;
};

export default CountryHighlightLayer;