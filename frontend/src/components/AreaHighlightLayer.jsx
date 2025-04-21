import React, { useState, useEffect, useRef } from 'react';

export const AreaHighlightLayer = ({
                                       country,
                                       predictions,
                                       showOnly,
                                       onLoadComplete
                                   }) => {
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Store the loaded GeoJSON files in a cache
    const geoJsonCacheRef = useRef({});

    // Function to get color based on percentage (green to red)
    const getRiskColor = (percentage) => {
        if (percentage == null) return 'rgba(200, 200, 200, 0.5)'; // Gray for unknown
        const r = Math.round((percentage / 100) * 255);
        const g = Math.round((1 - percentage / 100) * 255);
        return `rgba(${r}, ${g}, 0, 0.7)`;
    };

    // Load the GeoJSON data for areas (states in case of US)
    useEffect(() => {
        const loadAreasGeoJson = async () => {
            if (!country || !showOnly) return;

            // Check if we already have this country's area data in cache
            const cacheKey = `${country}_areas`;
            if (geoJsonCacheRef.current[cacheKey]) {
                const cachedData = geoJsonCacheRef.current[cacheKey];
                const enrichedData = enrichGeoJsonWithPredictions(cachedData, predictions);
                setGeoJsonData(enrichedData);
                if (onLoadComplete) onLoadComplete(enrichedData);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Format the country name for file access
                const formattedCountryName = country.replace(/\s+/g, '_').toLowerCase();

                // Load the areas GeoJSON file (e.g., united_states_areas.geojson)
                const response = await fetch(`/geojson/${formattedCountryName}_areas.geojson`);

                if (!response.ok) {
                    throw new Error(`Failed to load area GeoJSON for ${country}`);
                }

                const data = await response.json();

                // Store in cache
                geoJsonCacheRef.current[cacheKey] = data;

                // Enrich GeoJSON with prediction data
                const enrichedData = enrichGeoJsonWithPredictions(data, predictions);
                setGeoJsonData(enrichedData);

                if (onLoadComplete) onLoadComplete(enrichedData);

            } catch (err) {
                console.error('Error loading areas GeoJSON:', err);
                setError(err.message);
                setGeoJsonData(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadAreasGeoJson();
    }, [country, predictions, showOnly]);

    // Add prediction data to GeoJSON features
    const enrichGeoJsonWithPredictions = (geoJson, predictions) => {
        if (!geoJson || !predictions) return geoJson;

        // Create a lookup map for predictions
        const predictionMap = {};
        predictions.forEach(pred => {
            predictionMap[pred.area.toLowerCase()] = pred.fire_risk_percent;
        });

        // Enrich each feature with prediction data
        const enrichedGeoJson = {
            ...geoJson,
            features: geoJson.features.map(feature => {
                const areaName = feature.properties.NAME_1?.toLowerCase() ||
                    feature.properties.name?.toLowerCase() ||
                    feature.properties.NAME?.toLowerCase() ||
                    feature.properties.state?.toLowerCase() ||
                    '';

                const riskPercent = predictionMap[areaName];

                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        fire_risk_percent: riskPercent,
                        display_name: feature.properties.NAME_1 || feature.properties.name || feature.properties.NAME || feature.properties.state,
                        fill_color: getRiskColor(riskPercent)
                    }
                };
            })
        };

        return enrichedGeoJson;
    };

    // Create mapbox layer configuration for areas with colors
    const getMapboxLayerConfig = () => {
        if (!geoJsonData) return [];

        return [
            {
                sourcetype: 'geojson',
                source: geoJsonData,
                type: 'fill',
                // Use fill-color from properties
                color: {
                    type: 'identity',
                    property: 'fill_color'
                },
                opacity: 0.7,
                line: {
                    color: 'white',
                    width: 2
                },
                below: 'traces' // Places the layer below the data points
            },
            // Add text layer for area percentages
            {
                sourcetype: 'geojson',
                source: geoJsonData,
                type: 'symbol',
                layout: {
                    'text-field': ['concat', ['get', 'display_name'], '\n', ['to-string', ['get', 'fire_risk_percent']], '%'],
                    'text-size': 12,
                    'text-font': ['Open Sans Bold'],
                    'text-anchor': 'center',
                    'text-justify': 'center'
                },
                paint: {
                    'text-color': '#000000',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 2
                }
            }
        ];
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
                Loading area data...
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
    AreaHighlightLayer.getLayerConfig = getMapboxLayerConfig;
};

export default AreaHighlightLayer;