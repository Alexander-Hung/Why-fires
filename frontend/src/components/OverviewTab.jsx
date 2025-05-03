import React, { useState } from 'react';
import '../styles/OverviewTab.css';
import ChartComponentWrapper from './ChartComponentWrapper';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    Cell
} from 'recharts';
import { COLORS } from './Dashboard';

const OverviewTab = ({ chartData, titles }) => {
    const [expandedCards, setExpandedCards] = useState({});

    // Toggle card expansion
    const toggleCardExpansion = (cardId) => {
        setExpandedCards({
            ...expandedCards,
            [cardId]: !expandedCards[cardId]
        });
    };

    const {
        monthlyDataWithNames,
        barChartData,
        yearlyData,
        dayNightChartData
    } = chartData;

    const { barChartTitle } = titles;

    return (
        <div className="charts-grid">
            {/* Monthly Trend Card */}
            <div className="chart-container">
                <div className="topSection">
                    <h3>Monthly Fire Trends</h3>
                    <button
                        onClick={() => toggleCardExpansion('monthlyTrend')}
                        className="topButton"
                    >
                        {expandedCards['monthlyTrend'] ? '▼' : '▲'}
                    </button>
                </div>
                <ChartComponentWrapper width="100%" height={expandedCards['monthlyTrend'] ? 400 : 200}>
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
                        <Area type="monotone" dataKey="count" fill="#4f46e5" stroke="#4f46e5" fillOpacity={0.3} name="Fire Count" />
                        <Line type="monotone" dataKey="count" stroke="#4f46e5" activeDot={{ r: 8 }} name="Fire Count" />
                    </ComposedChart>
                </ChartComponentWrapper>
            </div>

            {/* Top Regions Card */}
            <div className="chart-container">
                <div className="topSection">
                    <h3>{barChartTitle}</h3>
                    <button
                        onClick={() => toggleCardExpansion('topRegions')}
                        className="topButton"
                    >
                        {expandedCards['topRegions'] ? '▼' : '▲'}
                    </button>
                </div>
                <ChartComponentWrapper width="100%" height={expandedCards['topRegions'] ? 400 : 200}>
                    <BarChart data={barChartData.slice(0, expandedCards['topRegions'] ? 10 : 5)}>
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
                        <Bar dataKey="count" name="Fire Count">
                            {barChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartComponentWrapper>
            </div>

            {/* Yearly Comparison */}
            <div className="chart-container">
                <div className="topSection">
                    <h3>Year-over-Year Comparison</h3>
                    <button
                        onClick={() => toggleCardExpansion('yearlyComparison')}
                        className="topButton"
                    >
                        {expandedCards['yearlyComparison'] ? '▼' : '▲'}
                    </button>
                </div>
                <ChartComponentWrapper width="100%" height={expandedCards['yearlyComparison'] ? 400 : 200}>
                    <AreaChart data={yearlyData}>
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
                        <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} name="Fire Count" />
                    </AreaChart>
                </ChartComponentWrapper>
            </div>

            {/* Day/Night Distribution */}
            <div className="chart-container">
                <div className="topSection">
                    <h3>Day vs Night Fires</h3>
                    <button
                        onClick={() => toggleCardExpansion('dayNight')}
                        className="topButton"
                    >
                        {expandedCards['dayNight'] ? '▼' : '▲'}
                    </button>
                </div>
                <ChartComponentWrapper width="100%" height={expandedCards['dayNight'] ? 400 : 200}>
                    <BarChart data={dayNightChartData}>
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
                        <Bar dataKey="D" stackId="a" name="Day Fires" fill="#f59e0b" />
                        <Bar dataKey="N" stackId="a" name="Night Fires" fill="#3b82f6" />
                    </BarChart>
                </ChartComponentWrapper>
            </div>
        </div>
    );
};

export default OverviewTab;