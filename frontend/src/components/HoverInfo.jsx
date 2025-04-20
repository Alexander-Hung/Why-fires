import React from 'react';

const HoverInfo = ({ info, position, color }) => {
    if (!info) return null;

    // Calculate text color based on background brightness
    // For darker backgrounds, use white text; for lighter backgrounds, use black text
    const getBrightness = (color) => {
        // If no color is provided, default to white background
        if (!color) return 255;

        // For HSL colors
        if (color.startsWith('hsl')) {
            // Extract the lightness value
            const match = color.match(/hsl\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*([\d.]+)%\s*\)/);
            if (match && match[1]) {
                const lightness = parseFloat(match[1]);
                return lightness * 2.55; // Convert 0-100 to 0-255 scale
            }
        }

        // Default to mid brightness if we can't parse
        return 128;
    };

    const brightness = getBrightness(color);
    const textColor = brightness > 140 ? 'black' : 'white';

    // Position the hover box near the cursor but with offset
    const style = {
        position: 'absolute',
        top: `${position.y + 10}px`,
        left: `${position.x + 10}px`,
        backgroundColor: color || 'white',
        border: '2px solid black',
        padding: '8px',
        borderRadius: '5px',
        zIndex: 1000,
        pointerEvents: 'none', // Ensures hover box doesn't interfere with map interaction
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        fontSize: '14px',
        fontWeight: 'bold',
        color: textColor,
        maxWidth: '200px'
    };

    return (
        <div id="hoverInfo" style={style}>
            <div><b>Lat:</b> {info.latitude.toFixed(4)}</div>
            <div><b>Lon:</b> {info.longitude.toFixed(4)}</div>
            <div><b>Temp:</b> {info.brightness ? `${info.brightness.toFixed(1)}K` : 'N/A'}</div>
        </div>
    );
};

export default HoverInfo;