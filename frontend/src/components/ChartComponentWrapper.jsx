import React from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * ChartComponentWrapper - A wrapper to ensure charts display correctly
 *
 * This component ensures charts have proper dimensions and positioning
 * by wrapping them in a properly configured ResponsiveContainer
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The chart component to render
 * @param {number} props.height - The height in pixels (default: 300)
 * @param {number} props.minHeight - The minimum height in pixels (default: 250)
 * @param {number} props.aspect - The aspect ratio width/height (optional)
 */
const ChartComponentWrapper = ({
                                   children,
                                   height = 300,
                                   minHeight = 250,
                                   aspect = undefined
                               }) => {
    return (
        <div style={{
            width: '100%',
            height: height,
            minHeight: minHeight,
            position: 'relative'
        }}>
            <ResponsiveContainer width="100%" height="100%" aspect={aspect}>
                {children}
            </ResponsiveContainer>
        </div>
    );
};

export default ChartComponentWrapper;