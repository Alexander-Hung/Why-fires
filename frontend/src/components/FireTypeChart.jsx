import React from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Custom colors for fire types
const FIRE_TYPE_COLORS = {
    'Presumed Vegetation Fire': '#4ade80', // Green
    'Active Volcano': '#ef4444',           // Red
    'Other Static Land Source': '#f97316', // Orange
    'Offshore': '#3b82f6'                  // Blue
};

// Fire type mapping
const FIRE_TYPES = {
    0: 'Presumed Vegetation Fire',
    1: 'Active Volcano',
    2: 'Other Static Land Source',
    3: 'Offshore'
};

/**
 * FireTypeChart - A component to display fire distribution by type
 *
 * @param {Object} props
 * @param {Array} props.data - The dataset containing fire type information
 * @param {string} props.viewType - 'pie' or 'bar' to determine chart type
 */
const FireTypeChart = ({ data, viewType = 'pie' }) => {
    // If no data is provided, return empty state
    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                No data available for fire types
            </div>
        );
    }

    // Process data to count fire types
    const processData = () => {
        const typeCounts = {};

        // Initialize counts
        Object.values(FIRE_TYPES).forEach(type => {
            typeCounts[type] = 0;
        });

        // Count each type
        data.forEach(item => {
            const typeLabel = FIRE_TYPES[item.type] || 'Unknown';
            typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1;
        });

        // Convert to array format for charts
        return Object.entries(typeCounts).map(([name, value]) => ({
            name,
            value,
            color: FIRE_TYPE_COLORS[name] || '#64748b' // Default gray for unknown types
        }));
    };

    const chartData = processData();

    // Custom tooltip formatter to round values
    const tooltipFormatter = (value, name, props) => {
        // Round percentage to 2 decimal places
        if (name === 'value') {
            return [value.toFixed(2), 'Count'];
        }
        return [value, name];
    };

    // Custom label formatter for pie chart
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // Only show label if percentage is significant enough
        if (percent < 0.05) return null;

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize={12}
            >
                {`${(percent * 100).toFixed(2)}%`}
            </text>
        );
    };

    return (
        <>
            {viewType === 'pie' ? (
                // Pie chart view
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip formatter={tooltipFormatter} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                // Bar chart view
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => value.toFixed(2)} />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip formatter={tooltipFormatter} />
                        <Legend />
                        <Bar dataKey="value" name="Count">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </>
    );
};

export default FireTypeChart;