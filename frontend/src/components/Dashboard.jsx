import React, { useState } from 'react';
import OverviewTab from './OverviewTab';
import TemporalTab from './TemporalTab';
import GeographicTab from './GeographicTab';
import ComparativeTab from './ComparativeTab';
import '../styles/Dashboard.css';

// Create color and month constants for all tabs to use
export const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#64748b'];
export const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dashboard = ({ results }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!results || !results.data) {
        return (
            <div className="dashboard">
                <h2>Analysis Results</h2>
                <div className="no-results-message">
                    <h2>No analysis data available</h2>
                    <p>Please run an analysis first to visualize fire data</p>
                </div>
            </div>
        );
    }

    const { data, stats } = results;

    // Check if a single country is selected
    const singleCountrySelected = data.selection_info && data.selection_info.single_country_selected;
    const selectedCountry = singleCountrySelected ? data.selection_info.selected_country : "";

    // Common data processing
    // Monthly data with names
    const monthlyDataWithNames = data.monthly.map(item => ({
        ...item,
        name: MONTH_NAMES[item.month],
        month: item.month
    }));

    // Day/Night data
    const dayNightData = {};
    MONTH_NAMES.forEach((month, index) => {
        if (index > 0) {
            dayNightData[month] = { month, D: 0, N: 0, name: month };
        }
    });

    data.day_night_monthly.forEach(item => {
        const monthName = MONTH_NAMES[item.month];
        if (monthName && dayNightData[monthName]) {
            dayNightData[monthName][item.daynight] = item.count;
        }
    });

    const dayNightChartData = Object.values(dayNightData);

    // Check area data
    const hasAreaData = data.area && data.area.length > 0;
    const showAreaData = singleCountrySelected && hasAreaData;

    // Prepare title strings
    let barChartTitle, pieChartTitle;

    if (showAreaData) {
        barChartTitle = `Top Areas in ${selectedCountry}`;
        pieChartTitle = `Fire Distribution by Area in ${selectedCountry}`;
    } else {
        barChartTitle = "Top Countries by Fire Count";
        pieChartTitle = "Fire Distribution by Country";
    }

    // Prepare data objects
    const chartData = {
        monthlyDataWithNames,
        dayNightChartData,
        barChartData: prepareRegionData(data, showAreaData),
        pieData: preparePieData(data, showAreaData),
        yearlyData: data.yearly.map(item => ({
            ...item,
            name: `${item.year}`
        })),
        frpConfidenceData: data.frp_confidence.map(item => ({
            ...item,
            name: `${item.confidence}%`
        })),
        timeOfDayData: prepareTimeOfDayData(stats),
        seasonalData: prepareSeasonalData(monthlyDataWithNames),
        fireIntensityData: [
            { name: 'Low', value: stats.total_fires * 0.4 },
            { name: 'Medium', value: stats.total_fires * 0.3 },
            { name: 'High', value: stats.total_fires * 0.2 },
            { name: 'Extreme', value: stats.total_fires * 0.1 }
        ]
    };

    // Prepare titles
    const titles = {
        barChartTitle,
        pieChartTitle
    };

    return (
        <div className="dashboard">
            {/* Dashboard Header with Filters Summary */}
            <div className="section-header">
                <div className="nav-tabs"><h2>Fire Analysis Dashboard: </h2>
                    <div className="filter-actions" style={{ width: '75%' }}>

                        <div className="filter-section">
                        <span>
                            {singleCountrySelected
                                ? `Analysis for ${selectedCountry}`
                                : `Analysis for ${data.country.length} countries`}
                        </span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="nav-tabs">
                    <button
                        className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'temporal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('temporal')}
                    >
                        Temporal Analysis
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'geographic' ? 'active' : ''}`}
                        onClick={() => setActiveTab('geographic')}
                    >
                        Geographic Distribution
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'comparative' ? 'active' : ''}`}
                        onClick={() => setActiveTab('comparative')}
                    >
                        Comparative Analysis
                    </button>
                </div>
            </div>

            {/* Key Stats Summary */}
            <div className="stats-summary">
                <div className="stat-card">
                    <h3>Total Fires</h3>
                    <p className="stat-value">{stats.total_fires.toLocaleString()}</p>
                </div>

                <div className="stat-card">
                    <h3>Avg Brightness</h3>
                    <p className="stat-value">{stats.avg_brightness.toFixed(1)}K</p>
                </div>

                <div className="stat-card">
                    <h3>Avg Confidence</h3>
                    <p className="stat-value">{stats.avg_confidence.toFixed(1)}%</p>
                </div>

                <div className="stat-card">
                    <h3>Day/Night Ratio</h3>
                    <p className="stat-value">{(stats.day_fires / (stats.night_fires || 1)).toFixed(1)}</p>
                </div>
            </div>

            {/* Render the active tab */}
            {activeTab === 'overview' && <OverviewTab chartData={chartData} titles={titles} />}
            {activeTab === 'temporal' && <TemporalTab chartData={chartData} />}
            {activeTab === 'geographic' && <GeographicTab chartData={chartData} titles={titles} />}
            {activeTab === 'comparative' && <ComparativeTab chartData={chartData} />}

            {/* Footer with summary */}
            <div className="dashboard-footer">
                <div className="dashboard-footer-content">
                    <span>Analysis conducted on {stats.total_fires.toLocaleString()} fire records. Showing data for {singleCountrySelected ? selectedCountry : `multiple countries`}.</span>
                </div>
            </div>
        </div>
    );
};

// Helper functions for data preparation
function prepareRegionData(data, showAreaData) {
    if (showAreaData) {
        return data.area.map(item => ({
            ...item,
            name: item.area || "Unknown"
        }));
    } else {
        return data.country.map(item => ({
            ...item,
            name: item.country
        }));
    }
}

function preparePieData(data, showAreaData) {
    if (showAreaData) {
        return data.area.map((item, index) => ({
            name: item.area || "Unknown",
            value: item.count,
            color: COLORS[index % COLORS.length]
        }));
    } else {
        return data.country.map((item, index) => ({
            name: item.country,
            value: item.count,
            color: COLORS[index % COLORS.length]
        }));
    }
}

function prepareTimeOfDayData(stats) {
    return [
        { name: "0-4", value: stats.night_fires * 0.3, time: "Night" },
        { name: "4-8", value: stats.night_fires * 0.7, time: "Dawn" },
        { name: "8-12", value: stats.day_fires * 0.4, time: "Morning" },
        { name: "12-16", value: stats.day_fires * 0.4, time: "Afternoon" },
        { name: "16-20", value: stats.day_fires * 0.2, time: "Evening" },
        { name: "20-24", value: stats.night_fires * 0.1, time: "Night" }
    ];
}

function prepareSeasonalData(monthlyDataWithNames) {
    return [
        { subject: 'Winter', A: getSeasonalValue(monthlyDataWithNames, 1, 2, 12), fullMark: 100 },
        { subject: 'Spring', A: getSeasonalValue(monthlyDataWithNames, 3, 4, 5), fullMark: 100 },
        { subject: 'Summer', A: getSeasonalValue(monthlyDataWithNames, 6, 7, 8), fullMark: 100 },
        { subject: 'Fall', A: getSeasonalValue(monthlyDataWithNames, 9, 10, 11), fullMark: 100 },
    ];
}

function getSeasonalValue(monthlyData, m1, m2, m3) {
    const monthsData = monthlyData.reduce((acc, item) => {
        acc[item.month] = item.count;
        return acc;
    }, {});

    const total = Object.values(monthsData).reduce((sum, val) => sum + val, 0);
    const seasonCount = (monthsData[m1] || 0) + (monthsData[m2] || 0) + (monthsData[m3] || 0);

    return total > 0 ? (seasonCount / total) * 100 : 0;
}

export default Dashboard;