import React from 'react';
import {
    PieChart, Pie, BarChart, Bar, Treemap,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    Cell
} from 'recharts';
import { COLORS } from './Dashboard';
import ChartComponentWrapper from './ChartComponentWrapper';
import '../styles/GeographicTabTreemapFix.css'; // Import the new CSS fix

// Custom component for Treemap content with simplified rendering
const CustomizedContent = (props) => {
    const { depth, x, y, width, height, index, colors, name, value } = props;

    // Only render text if there's enough space
    const shouldRenderText = width > 40 && height > 25;
    const shouldRenderValue = width > 40 && height > 40;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: depth < 2 ? colors[Math.floor(index / 2) % colors.length] : 'none',
                    stroke: '#374151',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {depth === 1 && shouldRenderText ? (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                >
                    {/* Truncate long names */}
                    {name.length > 10 ? `${name.substring(0, 8)}...` : name}
                </text>
            ) : null}
            {depth === 1 && shouldRenderValue ? (
                <text
                    x={x + width / 2}
                    y={y + height / 2 - 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={14}
                    fontWeight="bold"
                >
                    {value}
                </text>
            ) : null}
        </g>
    );
};

const GeographicTab = ({ chartData, titles }) => {
    const { pieData, barChartData } = chartData;
    const { pieChartTitle, barChartTitle } = titles;

    // Limit data for treemap to prevent performance issues
    const limitedTreemapData = pieData.slice(0, 10);

    return (
        <div className="charts-grid">
            {/* Regional Distribution Pie Chart */}
            <div className="chart-container">
                <h3>{pieChartTitle}</h3>
                <ChartComponentWrapper>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                borderRadius: "5px",
                                color: "white"
                            }}
                        />
                    </PieChart>
                </ChartComponentWrapper>
            </div>

            {/* Regional Bar Chart (Top Regions by Fire Count) */}
            <div className="chart-container">
                <h3>{barChartTitle}</h3>
                <ChartComponentWrapper>
                    <BarChart layout="vertical" data={barChartData.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" stroke="rgba(255,255,255,0.7)" />
                        <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.7)" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                borderRadius: "5px",
                                color: "white"
                            }}
                        />
                        <Legend />
                        <Bar dataKey="count" name="Fire Count">
                            {barChartData.slice(0, 10).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartComponentWrapper>
            </div>

            {/* Geographic Heatmap / Treemap - WITH FIXED HEIGHT */}
            <div className="chart-container treemap-container">
                <h3>Top Regions Comparison</h3>
                {/* Using a div with fixed height instead of ChartComponentWrapper */}
                <div style={{ height: '300px', width: '100%' }}>
                    <ChartComponentWrapper width="100%" height={300} className="treemap-wrapper">
                        <Treemap
                            data={limitedTreemapData}
                            dataKey="value"
                            ratio={4/3}
                            stroke="#fffff"
                            fill="#4f46e5"
                            content={<CustomizedContent colors={COLORS} />}
                            isAnimationActive={false} // Disable animation
                        >
                        </Treemap>
                    </ChartComponentWrapper>
                </div>
            </div>

        </div>
    );
};

export default GeographicTab;