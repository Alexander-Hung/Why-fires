import React from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell
} from 'recharts';

const Dashboard = ({ results }) => {
    if (!results || !results.data) {
        return (
            <div className="dashboard">
                <h2>Analysis Results</h2>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>No analysis data available. Please run an analysis first.</p>
                </div>
            </div>
        );
    }

    const { data, stats } = results;

    // Check if a single country is selected
    const singleCountrySelected = data.selection_info && data.selection_info.single_country_selected;
    const selectedCountry = singleCountrySelected ? data.selection_info.selected_country : "";

    // Check if we have area data
    const hasAreaData = data.area && data.area.length > 0;

    // Flag to determine whether to show area data
    const showAreaData = singleCountrySelected && hasAreaData;

    // Define colors for charts
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
    const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Prepare data for monthly chart with month names
    const monthlyDataWithNames = data.monthly.map(item => ({
        ...item,
        name: MONTH_NAMES[item.month]
    }));

    // Prepare data for day vs night chart
    const dayNightData = {};
    MONTH_NAMES.forEach((month, index) => {
        if (index > 0) {
            dayNightData[month] = { month, D: 0, N: 0 };
        }
    });

    data.day_night_monthly.forEach(item => {
        const monthName = MONTH_NAMES[item.month];
        if (monthName && dayNightData[monthName]) {
            dayNightData[monthName][item.daynight] = item.count;
        }
    });

    const dayNightChartData = Object.values(dayNightData);

    // Prepare data for pie chart and bar chart based on whether we're showing area or country data
    let barChartData, pieData, barChartXKey, barChartTitle, pieChartTitle;

    if (showAreaData) {
        barChartData = data.area.map(item => ({
            ...item,
            name: item.area || "Unknown"
        }));

        pieData = data.area.map((item, index) => ({
            name: item.area || "Unknown",
            value: item.count,
            color: COLORS[index % COLORS.length]
        }));

        barChartXKey = "name";
        barChartTitle = `Top Areas in ${selectedCountry} by Fire Count`;
        pieChartTitle = `Fire Distribution by Area in ${selectedCountry}`;
    } else if (data.country && data.country.length > 0) {
        barChartData = data.country.map(item => ({
            ...item,
            name: item.country
        }));

        pieData = data.country.map((item, index) => ({
            name: item.country,
            value: item.count,
            color: COLORS[index % COLORS.length]
        }));

        barChartXKey = "name";
        barChartTitle = "Top Countries by Fire Count";
        pieChartTitle = "Fire Distribution by Country";
    } else {
        // Fallback to empty data
        barChartData = [];
        pieData = [];
        barChartXKey = "name";
        barChartTitle = "No Country Data Available";
        pieChartTitle = "No Distribution Data Available";
    }

    return (
        <div className="dashboard">
            <h2>Analysis Results</h2>

            <div className="stats-summary">
                <div className="stat-card">
                    <h3>Total Fires</h3>
                    <p className="stat-value">{stats.total_fires.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                    <h3>Avg Brightness</h3>
                    <p className="stat-value">{stats.avg_brightness.toFixed(2)}</p>
                </div>
                <div className="stat-card">
                    <h3>Avg Confidence</h3>
                    <p className="stat-value">{stats.avg_confidence.toFixed(2)}%</p>
                </div>
                <div className="stat-card">
                    <h3>Avg FRP</h3>
                    <p className="stat-value">{stats.avg_frp.toFixed(2)}</p>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Monthly Fire Trends</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={monthlyDataWithNames}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                            <YAxis stroke="rgba(255,255,255,0.7)" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#2c3e50",
                                    border: "none",
                                    borderRadius: "5px",
                                    color: "white"
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} name="Fire Count" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3>{barChartTitle}</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey={barChartXKey} stroke="rgba(255,255,255,0.7)" />
                            <YAxis stroke="rgba(255,255,255,0.7)" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#2c3e50",
                                    border: "none",
                                    borderRadius: "5px",
                                    color: "white"
                                }}
                            />
                            <Legend />
                            <Bar dataKey="count" fill="#82ca9d" name="Fire Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3>{pieChartTitle}</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
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
                                    backgroundColor: "#2c3e50",
                                    border: "none",
                                    borderRadius: "5px",
                                    color: "white"
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3>Day vs Night Fires by Month</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart
                            data={dayNightChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
                            <YAxis stroke="rgba(255,255,255,0.7)" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#2c3e50",
                                    border: "none",
                                    borderRadius: "5px",
                                    color: "white"
                                }}
                            />
                            <Legend />
                            <Bar dataKey="D" name="Day Fires" stackId="a" fill="#FFBB28" />
                            <Bar dataKey="N" name="Night Fires" stackId="a" fill="#0088FE" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Additional charts could be added here */}
            </div>
        </div>
    );
};

export default Dashboard;