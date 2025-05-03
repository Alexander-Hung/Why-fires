import React from 'react';
import '../styles/TemporalTab.css';
import ChartComponentWrapper from './ChartComponentWrapper';
import {
    BarChart, Bar, AreaChart, Area, ComposedChart, Line,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    Cell
} from 'recharts';

const TemporalTab = ({ chartData }) => {
    const {
        monthlyDataWithNames,
        timeOfDayData,
        seasonalData
    } = chartData;

    return (
        <div className="charts-grid">
            {/* Time of Day Distribution */}
            <div className="chart-container">
                <h3>Fire Distribution by Time of Day</h3>
                <ChartComponentWrapper width="100%" height={250}>
                    <BarChart data={timeOfDayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                borderRadius: "5px",
                                color: "white"
                            }}
                        />
                        <Legend />
                        <Bar dataKey="value" name="Fire Count">
                            {timeOfDayData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.time === "Night" ? "#3b82f6" :
                                        entry.time === "Dawn" ? "#8b5cf6" :
                                            entry.time === "Morning" ? "#f59e0b" :
                                                entry.time === "Afternoon" ? "#ef4444" :
                                                    entry.time === "Evening" ? "#8b5cf6" : "#3b82f6"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartComponentWrapper>
            </div>

            {/* Seasonal Patterns */}
            <div className="chart-container">
                <h3>Seasonal Fire Patterns</h3>
                <ChartComponentWrapper width="100%" height={250}>
                    <RadarChart outerRadius={90} data={seasonalData}>
                        <PolarGrid stroke="rgba(255,255,255,0.2)" />
                        <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.7)" />
                        <PolarRadiusAxis stroke="rgba(255,255,255,0.5)" />
                        <Radar name="Fire Percentage" dataKey="A" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.6} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                borderRadius: "5px",
                                color: "white"
                            }}
                            formatter={(value) => [`${value.toFixed(1)}%`, 'Percentage of Annual Fires']}
                        />
                        <Legend />
                    </RadarChart>
                </ChartComponentWrapper>
            </div>

            {/* Monthly Fire Trends with Year Comparison */}
            <div className="chart-container">
                <h3>Detailed Monthly Fire Trends</h3>
                <ChartComponentWrapper width="100%" height={320}>
                    <ComposedChart data={monthlyDataWithNames}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                borderRadius: "5px",
                                color: "white"
                            }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="count" fill="#4f46e5" stroke="#4f46e5" fillOpacity={0.2} name="Fire Count" />
                        <Line type="monotone" dataKey="count" stroke="#4f46e5" dot={{ stroke: '#4f46e5', strokeWidth: 2, r: 5 }} activeDot={{ r: 8 }} name="Fire Count" />
                    </ComposedChart>
                </ChartComponentWrapper>
            </div>

            {/* Additional Heat Calendar Chart */}
            <div className="chart-container">
                <h3>Daytime vs Nighttime Fire Pattern</h3>
                <div className="day-night-container">
                    <div className="day-chart">
                        <h4>Daytime Fire Trend</h4>
                        <ChartComponentWrapper width="100%" height={200}>
                            <AreaChart data={monthlyDataWithNames}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                                <YAxis stroke="rgba(255,255,255,0.7)" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1f2937",
                                        border: "none",
                                        borderRadius: "5px",
                                        color: "white"
                                    }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Day Fires" />
                            </AreaChart>
                        </ChartComponentWrapper>
                    </div>
                    <div className="night-chart">
                        <h4>Nighttime Fire Trend</h4>
                        <ChartComponentWrapper width="100%" height={200}>
                            <AreaChart data={monthlyDataWithNames}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                                <YAxis stroke="rgba(255,255,255,0.7)" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1f2937",
                                        border: "none",
                                        borderRadius: "5px",
                                        color: "white"
                                    }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Night Fires" />
                            </AreaChart>
                        </ChartComponentWrapper>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemporalTab;