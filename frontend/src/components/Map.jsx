import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import HoverInfo from './HoverInfo';
import ZoomControls from './ZoomControls';

const Map = ({ filteredData, selectedCountry, countriesData, onPointClick }) => {
    const mapContainerRef = useRef(null);
    const [hoverInfo, setHoverInfo] = useState(null);
    const [hoverColor, setHoverColor] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Track mouse position
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Prevent scrolling when mouse is over map
    useEffect(() => {
        // We're no longer preventing scroll to allow map zooming
        const handleWheel = (e) => {
            // Only prevent default page scrolling when Ctrl key is not pressed
            // This allows map zooming with scroll wheel but prevents page scrolling
            if (!e.ctrlKey) {
                e.stopPropagation();
            }
        };

        const mapElement = mapContainerRef.current;
        if (mapElement) {
            // Add wheel event listener with passive option to improve performance
            mapElement.addEventListener('wheel', handleWheel);
        }

        return () => {
            if (mapElement) {
                mapElement.removeEventListener('wheel', handleWheel);
            }
        };
    }, []);

    useEffect(() => {
        // Initial render of the map
        createMap();
    }, []);

    useEffect(() => {
        // Update map when data or country changes
        createMap();
    }, [filteredData, selectedCountry, countriesData]);

    const brightnessToColor = (value, minVal, maxVal) => {
        if (value === undefined) {
            return 'gray';
        }
        const hue = (1 - value / maxVal) * 150;
        return `hsl(${hue}, 100%, 50%)`;
    };

    // Handle custom zoom controls
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
            // Reset to the default center and zoom for the selected country
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

        // Decide map center and zoom based on selected country
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

        // Create an empty trace if no data
        if (!filteredData || filteredData.length === 0) {
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
        } else {
            // Calculate min/max brightness for color scale
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

            // Generate colors based on brightness
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
        }

        layout = {
            autosize: true,
            mapbox: {
                style: 'carto-positron',
                center: mapCenter,
                zoom: mapZoom
            },
            margin: { l: 0, r: 0, b: 0, t: 0 }
        };

        config = {
            responsive: true,
            displayModeBar: false, // Hide the built-in Plotly controls
            mapboxAccessToken: 'YOUR_MAPBOX_ACCESS_TOKEN',
            scrollZoom: true // Enable scroll zoom
        };

        Plotly.newPlot(mapContainerRef.current, [trace], layout, config);

        // Add click event for details
        if (mapContainerRef.current && filteredData && filteredData.length > 0) {
            mapContainerRef.current.on('plotly_click', (data) => {
                const clickedPoint = data.points[0];
                if (clickedPoint && clickedPoint.customdata) {
                    onPointClick(clickedPoint.customdata);
                }
            });

            // Add hover event for hover info
            mapContainerRef.current.on('plotly_hover', (data) => {
                const hoverPoint = data.points[0];
                if (hoverPoint && hoverPoint.customdata) {
                    setHoverInfo(hoverPoint.customdata);

                    // Get the color of the hovered point
                    if (hoverPoint.marker && hoverPoint.marker.color) {
                        setHoverColor(hoverPoint.marker.color);
                    } else {
                        // Calculate color based on brightness
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
            });

            // Clear hover info when not hovering
            mapContainerRef.current.on('plotly_unhover', () => {
                setHoverInfo(null);
                setHoverColor(null);
            });
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div
                id="map2D"
                ref={mapContainerRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            ></div>

            {/* Custom zoom controls */}
            <ZoomControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleResetView}
            />

            {hoverInfo && (
                <HoverInfo
                    info={hoverInfo}
                    position={mousePosition}
                    color={hoverColor}
                />
            )}
        </div>
    );
};

export default Map;