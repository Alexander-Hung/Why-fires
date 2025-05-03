import React from 'react';
import '../styles/ComparativeTab.css';
import ChartComponentWrapper from './ChartComponentWrapper';
import {
    ScatterChart, Scatter, BarChart, Bar, RadialBarChart, RadialBar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    Cell
} from 'recharts';
import { COLORS } from './Dashboard';

const ComparativeTab = ({ chartData }) => {
    const {
        frpConfidenceData,
        fireIntensityData,
        yearlyData
    } = chartData;

    return (
        <div className="charts-grid">
            {/* FRP vs Confidence */}
            <div className="chart-container">
                <h3>FRP by Confidence Level</h3>
                <ChartComponentWrapper width="100%" height={250}>
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="confidence"
                            type="number"
                            name="Confidence"
                            unit="%"
                            stroke="rgba(255,255,255,0.7)"
                        />
                        <YAxis
                            dataKey="frp"
                            name="FRP"
                            stroke="rgba(255,255,255,0.7)"
                        />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                borderRadius: "5px",
                                color: "white"
                            }}
                            formatter={(value, name) => [value, name]}
                        />
                        <Scatter
                            name="FRP Values"
                            data={frpConfidenceData}
                            fill="#8b5cf6"
                        />
                    </ScatterChart>
                </ChartComponentWrapper>
            </div>

            {/* Intensity Distribution */}
            <div className="chart-container">
                <h3>Fire Intensity Distribution</h3>
                <ChartComponentWrapper width="100%" height={250}>
                    <RadialBarChart
                        innerRadius="20%"
                        outerRadius="80%"
                        data={fireIntensityData}
                        startAngle={180}
                        endAngle={0}
                    >
                        <RadialBar
                            label={{ fill: '#fff', position: 'insideStart' }}
                            background
                            dataKey='value'
                            nameKey='name'
                        >
                            {fireIntensityData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={index === 0 ? '#10b981' :
                                        index === 1 ? '#f59e0b' :
                                            index === 2 ? '#f97316' : '#ef4444'}
                                />
                            ))}
                        </RadialBar>
                        <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                borderRadius: "5px",
                                color: "white"
                            }}
                        />
                    </RadialBarChart>
                </ChartComponentWrapper>
            </div>

            {/* Year Comparison */}
            <div className="chart-container">
                <h3>Multi-Year Fire Count Comparison</h3>
                <ChartComponentWrapper width="100%" height={300}>
                    <BarChart data={yearlyData}>
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
                            {yearlyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartComponentWrapper>
            </div>

            {/* Confidence vs Fire Count Line */}
            <div className="chart-container">
                <h3>Confidence Level Distribution</h3>
                <div className="confidence-chart">
                    <ChartComponentWrapper width="100%" height={250}>
                        <BarChart data={frpConfidenceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="confidence" stroke="rgba(255,255,255,0.7)" />
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
                            <Bar dataKey="frp" name="Fire Radiative Power">
                                {frpConfidenceData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.confidence < 30 ? '#ef4444' :
                                            entry.confidence < 60 ? '#f97316' :
                                                entry.confidence < 80 ? '#f59e0b' : '#10b981'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartComponentWrapper>
                    <div className="confidence-legend">
                        <div className="confidence-item">
                            <div className="confidence-color" style={{ backgroundColor: '#ef4444' }}></div>
                            <span className="confidence-label">Low Confidence</span>
                        </div>
                        <div className="confidence-item">
                            <div className="confidence-color" style={{ backgroundColor: '#f97316' }}></div>
                            <span className="confidence-label">Medium Confidence</span>
                        </div>
                        <div className="confidence-item">
                            <div className="confidence-color" style={{ backgroundColor: '#f59e0b' }}></div>
                            <span className="confidence-label">High Confidence</span>
                        </div>
                        <div className="confidence-item">
                            <div className="confidence-color" style={{ backgroundColor: '#10b981' }}></div>
                            <span className="confidence-label">Very High Confidence</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparativeTab;