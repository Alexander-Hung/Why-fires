import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import HoverInfo from './HoverInfo';
import AreaHoverInfo from './AreaHoverInfo';
import ZoomControls from './ZoomControls';
import '../styles/Map.css';

const Map = ({
                 filteredData,
                 selectedCountry,
                 countriesData,
                 onPointClick,
                 showAreaRisk,
                 predictionData
             }) => {
    const mapContainerRef = useRef(null);
    const [hoverInfo, setHoverInfo] = useState(null);
    const [hoverColor, setHoverColor] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [countryGeoJson, setCountryGeoJson] = useState(null);
    const [areaGeoJson, setAreaGeoJson] = useState(null);
    const [areaHoverInfo, setAreaHoverInfo] = useState(null);
    const geoJsonCacheRef = useRef({});

    // Track mouse position
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });

            // Check if we're in area risk mode and have area data
            if (showAreaRisk && areaGeoJson) {
                checkAreaHover(e.clientX, e.clientY);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [showAreaRisk, areaGeoJson]);

    // Function to check if mouse is over an area polygon
    const checkAreaHover = (mouseX, mouseY) => {
        if (!mapContainerRef.current || !areaGeoJson) {
            setAreaHoverInfo(null);
            return;
        }

        // Get the map's current layout to determine GPS coordinates from screen coordinates
        const layout = mapContainerRef.current.layout || {};
        const mapbox = layout.mapbox || {};

        // If we don't have the necessary map info, don't try to determine hover
        if (!mapbox.center || !mapbox.zoom) {
            setAreaHoverInfo(null);
            return;
        }

        // Get the plot area dimensions
        const plotRect = mapContainerRef.current.getBoundingClientRect();

        // Calculate relative position within the plot
        const relX = (mouseX - plotRect.left) / plotRect.width;
        const relY = (mouseY - plotRect.top) / plotRect.height;

        // This is a simplified approach - for exact coordinates, we would need to use the
        // Mapbox GL JS API directly, which is not accessible through Plotly's interface
        const mouseInPlot = relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1;

        if (!mouseInPlot) {
            setAreaHoverInfo(null);
            return;
        }

        // Since we can't easily get the exact coordinates from mouse position,
        // we'll use the trace hover events from Plotly instead
        // (The actual hover detection is done in the plotly_hover event)
    };

    // Function to get color based on percentage (green to red)
    const getRiskColor = (percentage) => {
        if (percentage == null) return 'rgba(200, 200, 200, 0.5)'; // Gray for unknown
        const r = Math.round((percentage / 100) * 255);
        const g = Math.round((1 - percentage / 100) * 255);
        return `rgba(${r}, ${g}, 0, 0.7)`;
    };

    // Function to match area names more flexibly, including region keywords
    const matchAreaName = (areaNameFromGeoJson, predictionAreas) => {
        if (!areaNameFromGeoJson || !predictionAreas || predictionAreas.length === 0) {
            return null;
        }

        // Convert to lowercase for case-insensitive matching
        const normalizedAreaName = areaNameFromGeoJson.toLowerCase();

        // Define region keywords
        const regionKeywords = [
            'north', 'south', 'east', 'west', 'central',
            'northeast', 'northwest', 'southeast', 'southwest',
            'midwest', 'eastern', 'western', 'southern', 'northern'
        ];

        // First try exact match
        const exactMatch = predictionAreas.find(area =>
            area.area.toLowerCase() === normalizedAreaName
        );

        if (exactMatch) {
            return exactMatch.fire_risk_percent;
        }

        // Check for region keywords in area name
        const isRegion = regionKeywords.some(keyword => normalizedAreaName.includes(keyword));

        if (isRegion) {
            // For region names, try to find matching prediction
            const regionMatch = predictionAreas.find(area =>
                area.area.toLowerCase() === normalizedAreaName ||
                normalizedAreaName.includes(area.area.toLowerCase()) ||
                area.area.toLowerCase().includes(normalizedAreaName)
            );

            if (regionMatch) {
                return regionMatch.fire_risk_percent;
            }
        }

        // No match found
        return null;
    };

    // Load country boundary GeoJSON
    useEffect(() => {
        const loadCountryGeoJson = async () => {
            if (!selectedCountry) {
                setCountryGeoJson(null);
                return;
            }

            const cacheKey = `${selectedCountry}_country`;
            if (geoJsonCacheRef.current[cacheKey]) {
                setCountryGeoJson(geoJsonCacheRef.current[cacheKey]);
                return;
            }

            try {
                const formattedCountry = selectedCountry.replace(/\s+/g, '_').toLowerCase();
                const response = await fetch(`/geojson/${formattedCountry}.geojson`);

                if (!response.ok) {
                    console.error(`Failed to load GeoJSON for ${selectedCountry}`);
                    return;
                }

                const geoJson = await response.json();

                // If we want to show only the country boundary, we need to merge all features
                // For now, we'll use the same file for both country and area display
                geoJsonCacheRef.current[cacheKey] = geoJson;
                setCountryGeoJson(geoJson);

            } catch (error) {
                console.error(`Error loading GeoJSON for ${selectedCountry}:`, error);
            }
        };

        loadCountryGeoJson();
    }, [selectedCountry]);

    // Load area risk GeoJSON when showing area risk
    useEffect(() => {
        const loadAreaGeoJson = async () => {
            if (!selectedCountry || !showAreaRisk || !predictionData) {
                setAreaGeoJson(null);
                return;
            }

            const cacheKey = `${selectedCountry}_areas`;
            if (geoJsonCacheRef.current[cacheKey]) {
                const enrichedData = enrichGeoJsonWithPredictions(
                    geoJsonCacheRef.current[cacheKey],
                    predictionData.predictions
                );
                setAreaGeoJson(enrichedData);
                return;
            }

            try {
                const formattedCountry = selectedCountry.replace(/\s+/g, '_').toLowerCase();
                // Try to load the country's GeoJSON file
                const response = await fetch(`/geojson/${formattedCountry}.geojson`);

                if (!response.ok) {
                    console.error(`Failed to load GeoJSON for ${selectedCountry}`);
                    return;
                }

                const geoJson = await response.json();

                // For Palestine or other countries with district subdivisions, we can use the same file
                geoJsonCacheRef.current[cacheKey] = geoJson;

                const enrichedData = enrichGeoJsonWithPredictions(geoJson, predictionData.predictions);
                setAreaGeoJson(enrichedData);

            } catch (error) {
                console.error(`Error loading GeoJSON for ${selectedCountry}:`, error);
            }
        };

        loadAreaGeoJson();
    }, [selectedCountry, showAreaRisk, predictionData]);

    // Enrich GeoJSON with prediction data
    const enrichGeoJsonWithPredictions = (geoJson, predictions) => {
        if (!geoJson || !predictions) return geoJson;

        return {
            ...geoJson,
            features: geoJson.features.map(feature => {
                const areaName = feature.properties.NAME_1 ||
                    feature.properties.name ||
                    feature.properties.NAME ||
                    feature.properties.state ||
                    '';

                // Use the more flexible matching function
                const riskPercent = matchAreaName(areaName, predictions);

                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        fire_risk_percent: riskPercent,
                        display_name: areaName,
                        fill_color: getRiskColor(riskPercent)
                    }
                };
            })
        };
    };

    useEffect(() => {
        createMap();
    }, [filteredData, selectedCountry, countriesData, countryGeoJson, areaGeoJson, showAreaRisk]);

    const brightnessToColor = (value, minVal, maxVal) => {
        if (value === undefined) {
            return 'gray';
        }
        const hue = (1 - value / maxVal) * 150;
        return `hsl(${hue}, 100%, 50%)`;
    };

    const handleZoomIn = () => {
        if (mapContainerRef.current) {
            const currentLayout = mapContainerRef.current.layout || {};
            const currentZoom = currentLayout.mapbox?.zoom || 2;

            Plotly.relayout(mapContainerRef.current, {
                'mapbox.zoom': currentZoom + 1
            });
        }
    };

    const handleZoomOut = () => {
        if (mapContainerRef.current) {
            const currentLayout = mapContainerRef.current.layout || {};
            const currentZoom = currentLayout.mapbox?.zoom || 2;

            Plotly.relayout(mapContainerRef.current, {
                'mapbox.zoom': Math.max(1, currentZoom - 1)
            });
        }
    };

    const handleResetView = () => {
        if (mapContainerRef.current) {
            let mapCenter = { lat: 20, lon: 0 };
            let mapZoom = 2;

            if (countriesData && selectedCountry && countriesData.countriesLonLat[selectedCountry]) {
                mapCenter = {
                    lat: countriesData.countriesLonLat[selectedCountry].lat,
                    lon: countriesData.countriesLonLat[selectedCountry].lon
                };
                mapZoom = countriesData.countriesZoom[selectedCountry];
            }

            Plotly.relayout(mapContainerRef.current, {
                'mapbox.center': mapCenter,
                'mapbox.zoom': mapZoom
            });
        }
    };

    const createMap = () => {
        if (!mapContainerRef.current) return;

        let mapCenter = { lat: 20, lon: 0 };
        let mapZoom = 2;

        if (countriesData && selectedCountry && countriesData.countriesLonLat[selectedCountry]) {
            mapCenter = {
                lat: countriesData.countriesLonLat[selectedCountry].lat,
                lon: countriesData.countriesLonLat[selectedCountry].lon
            };
            mapZoom = countriesData.countriesZoom[selectedCountry];
        }

        let layout, config, trace;

        // Create data trace based on current mode
        if (!showAreaRisk && filteredData && filteredData.length > 0) {
            // Data points mode
            let minBrightness = filteredData.reduce(
                (min, p) => p.brightness < min ? p.brightness : min,
                filteredData[0].brightness
            );
            let maxBrightness = filteredData.reduce(
                (max, p) => p.brightness > max ? p.brightness : max,
                filteredData[0].brightness
            );

            if (minBrightness === Infinity || maxBrightness === -Infinity) {
                minBrightness = 0;
                maxBrightness = 100;
            }

            const colors = filteredData.map(d =>
                brightnessToColor(d.brightness, minBrightness, maxBrightness)
            );

            trace = {
                type: 'scattermapbox',
                mode: 'markers',
                lat: filteredData.map(d => d.latitude),
                lon: filteredData.map(d => d.longitude),
                text: filteredData.map(d => `${selectedCountry}(${d.latitude}, ${d.longitude}), ${d.brightness}K`),
                hoverinfo: 'text',
                customdata: filteredData.map(d => ({
                    latitude: d.latitude,
                    longitude: d.longitude,
                    brightness: d.brightness,
                    acq_date: d.acq_date,
                    acq_time: d.acq_time
                })),
                marker: {
                    color: colors,
                    size: 6,
                    opacity: 0.8
                },
                showlegend: false
            };
        } else if (showAreaRisk && areaGeoJson) {
            // Area risk mode - create hover points at centroids
            const centroids = areaGeoJson.features
                .map(feature => {
                    const centroid = calculateCentroid(feature);
                    return {
                        centroid,
                        properties: feature.properties
                    };
                })
                .filter(item => item.centroid && item.properties.fire_risk_percent);

            trace = {
                type: 'scattermapbox',
                mode: 'markers',
                lat: centroids.map(item => item.centroid.lat),
                lon: centroids.map(item => item.centroid.lon),
                text: centroids.map(item =>
                    `${item.properties.display_name}: ${item.properties.fire_risk_percent}%`
                ),
                hoverinfo: 'text',
                customdata: centroids.map(item => ({
                    name: item.properties.display_name,
                    percentage: item.properties.fire_risk_percent,
                    color: item.properties.fill_color
                })),
                marker: {
                    size: 25,  // Large enough to cover most of the area
                    opacity: 0, // Invisible markers
                    color: 'rgba(0,0,0,0)'
                },
                showlegend: false
            };
        } else {
            // Empty trace for fallback
            trace = {
                type: 'scattermapbox',
                mode: 'markers',
                lat: [],
                lon: [],
                hoverinfo: 'none',
                marker: {
                    size: 1,
                    color: 'rgba(0,0,0,0)'
                },
                showlegend: false
            };
        }

        // Create layers array
        const layers = [];

        // Add country boundary layer when not showing area risk
        if (countryGeoJson && !showAreaRisk) {
            layers.push({
                sourcetype: 'geojson',
                source: countryGeoJson,
                type: 'fill',
                color: 'rgba(243, 156, 18, 0.15)',
                opacity: 0.3,
                line: {
                    color: 'rgba(243, 156, 18, 0.8)',
                    width: 2
                },
                below: 'traces'
            });
        }

        // Add area risk layers when showing area risk
        if (showAreaRisk && areaGeoJson) {
            // Add individual area fills with proper color
            areaGeoJson.features.forEach((feature, index) => {
                layers.push({
                    sourcetype: 'geojson',
                    source: {
                        type: 'Feature',
                        geometry: feature.geometry,
                        properties: feature.properties
                    },
                    type: 'fill',
                    color: feature.properties.fill_color || 'rgba(200, 200, 200, 0.5)',
                    opacity: 0.7,
                    below: 'traces'
                });
            });

            // Add border layer for all areas
            layers.push({
                sourcetype: 'geojson',
                source: areaGeoJson,
                type: 'line',
                line: {
                    color: 'white',
                    width: 2
                }
            });
        }

        layout = {
            autosize: true,
            mapbox: {
                style: 'carto-positron',
                center: mapCenter,
                zoom: mapZoom,
                layers: layers
            },
            margin: { l: 0, r: 0, b: 0, t: 0 },
            hoverlabel: {
                bgcolor: '#fff',
                bordercolor: '#000',
                font: { size: 13 }
            }
        };

        config = {
            responsive: true,
            displayModeBar: false,
            mapboxAccessToken: 'YOUR_MAPBOX_ACCESS_TOKEN',
            scrollZoom: true
        };

        Plotly.newPlot(mapContainerRef.current, [trace], layout, config);

        // Add event handlers for hover and click
        if (mapContainerRef.current) {
            // Add click event handler for data points mode
            if (!showAreaRisk && filteredData && filteredData.length > 0) {
                mapContainerRef.current.on('plotly_click', (data) => {
                    const clickedPoint = data.points[0];
                    if (clickedPoint && clickedPoint.customdata) {
                        onPointClick(clickedPoint.customdata);
                    }
                });
            }

            // Add hover events
            mapContainerRef.current.on('plotly_hover', (data) => {
                const hoverPoint = data.points[0];

                if (showAreaRisk) {
                    // Area risk mode - show area hover info
                    if (hoverPoint && hoverPoint.customdata) {
                        setAreaHoverInfo(hoverPoint.customdata);
                    }
                } else {
                    // Data points mode - show data point hover info
                    if (hoverPoint && hoverPoint.customdata) {
                        setHoverInfo(hoverPoint.customdata);

                        if (hoverPoint.marker && hoverPoint.marker.color) {
                            setHoverColor(hoverPoint.marker.color);
                        } else {
                            const brightness = hoverPoint.customdata.brightness;
                            if (brightness !== undefined) {
                                const minBrightness = filteredData.reduce(
                                    (min, p) => p.brightness < min ? p.brightness : min,
                                    filteredData[0].brightness
                                );
                                const maxBrightness = filteredData.reduce(
                                    (max, p) => p.brightness > max ? p.brightness : max,
                                    filteredData[0].brightness
                                );
                                setHoverColor(brightnessToColor(brightness, minBrightness, maxBrightness));
                            }
                        }
                    }
                }
            });

            // Clear hover info when not hovering
            mapContainerRef.current.on('plotly_unhover', () => {
                setHoverInfo(null);
                setHoverColor(null);
                setAreaHoverInfo(null);
            });
        }
    };

    // Calculate centroid of a GeoJSON feature
    const calculateCentroid = (feature) => {
        if (!feature.geometry) return null;

        let coordinates;
        if (feature.geometry.type === 'Polygon') {
            coordinates = feature.geometry.coordinates[0];
        } else if (feature.geometry.type === 'MultiPolygon') {
            coordinates = feature.geometry.coordinates[0][0];
        } else {
            return null;
        }

        let sumLat = 0, sumLon = 0, count = 0;

        coordinates.forEach(coord => {
            sumLon += coord[0];
            sumLat += coord[1];
            count++;
        });

        return {
            lat: sumLat / count,
            lon: sumLon / count
        };
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div
                id="map2D"
                ref={mapContainerRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            ></div>

            <ZoomControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleResetView}
            />

            {/* Show appropriate hover info based on mode */}
            {hoverInfo && !showAreaRisk && (
                <HoverInfo
                    info={hoverInfo}
                    position={mousePosition}
                    color={hoverColor}
                />
            )}

            {areaHoverInfo && showAreaRisk && (
                <AreaHoverInfo
                    info={areaHoverInfo}
                    position={mousePosition}
                />
            )}
        </div>
    );
};

export default Map;