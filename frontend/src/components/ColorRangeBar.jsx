import React, { useEffect, useState } from 'react';
import '../styles/ColorRangeBar.css';

export const ColorRangeBar = ({ minValue, maxValue, hidden }) => {
    const [gradientStyle, setGradientStyle] = useState({});

    // Convert brightness to color for the gradient
    const brightnessToColor = (value, minVal, maxVal) => {
        if (value === undefined) {
            return 'gray';
        }
        const hue = (1 - value / maxVal) * 150;
        return `hsl(${hue}, 100%, 50%)`;
    };

    useEffect(() => {
        // Update gradient style when min/max values change
        const gradientStart = brightnessToColor(minValue, minValue, maxValue);
        const gradientEnd = brightnessToColor(maxValue, minValue, maxValue);

        setGradientStyle({
            background: `linear-gradient(to top, ${gradientStart}, ${gradientEnd})`
        });
    }, [minValue, maxValue]);

    if (hidden) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '50px',
            right: '15px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>

            {/* Range values and color bar */}
            <div style={{ position: 'relative', height: '240px', display: 'flex', alignItems: 'center' }}>
                {/* Max value (top) */}
                <div style={{
                    position: 'absolute',
                    bottom: '16em',
                    right: '0',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    fontSize: '15px',
                    fontWeight: 'bold'
                }}>
                    {maxValue.toFixed(0)}K
                </div>

                {/* Color bar */}
                <div id="colorRangeBar" style={{
                    ...gradientStyle,
                    width: '20px',
                    height: '200px',
                    border: '1px solid #000',
                    borderRadius: '5px',
                    bottom: '4.5em',
                    marginRight: '20px'
                }}>
                    <div id="colorRangePoint"></div>
                </div>

                {/* Min value (bottom) */}
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    fontSize: '15px',
                    fontWeight: 'bold'
                }}>
                    {minValue.toFixed(0)}K
                </div>
            </div>
        </div>
    );
};