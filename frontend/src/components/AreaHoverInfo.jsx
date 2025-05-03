import React from 'react';
import '../styles/AreaHoverInfo.css';

/**
 * Component to display area information on hover
 */
const AreaHoverInfo = ({ info, position }) => {
    if (!info) return null;

    // Style for the hover box
    const style = {
        position: 'absolute',
        top: `${position.y + 15}px`,  // Position below the mouse
        left: `${position.x - 75}px`, // Center it horizontally with the mouse
        backgroundColor: info.color || 'white',
        border: '2px solid white',
        padding: '8px 12px',
        borderRadius: '5px',
        zIndex: 1000,
        pointerEvents: 'none', // Ensures hover box doesn't interfere with map interaction
        boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
        minWidth: '150px',
        textAlign: 'center'
    };

    // Determine text color based on background brightness
    // For darker backgrounds, use white text; for lighter backgrounds, use black
    const getBrightness = (colorStr) => {
        if (!colorStr || !colorStr.startsWith('rgba')) return 255;

        // Parse RGBA
        const match = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            // Simple brightness formula (higher values = brighter)
            return (r + g) / 2;
        }
        return 128;
    };

    const brightness = getBrightness(info.color);
    const textColor = brightness > 128 ? 'black' : 'white';

    return (
        <div style={{
            ...style,
            color: textColor
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>{info.name}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{info.percentage}%</div>
        </div>
    );
};

export default AreaHoverInfo;