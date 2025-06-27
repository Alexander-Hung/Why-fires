import React, { useState, useEffect } from 'react';
import ResizableSidebar from './ResizableSidebar';
import { TypeFilter } from './TypeFilter';
import { DateFilter } from './DateFilter';
import { DataCount } from './DataCount';
import FilterPanel from './FilterPanel';
import '../styles/Sidebar.css';

const base = process.env.REACT_APP_API_BASE;

export const Sidebar = ({
                            isOpen,
                            onToggle,
                            selectedYear,
                            onYearChange,
                            selectedMonth,
                            onMonthChange,
                            selectedDate,
                            onDateChange,
                            countries,
                            selectedCountry,
                            onCountryChange,
                            typeFilters,
                            onTypeFilterChange,
                            onStartPrediction,
                            dataPointCount,
                            showAreaRisk,
                            onToggleAreaRisk,
                            predictionAvailable,
                            onAnalyze,
                            onStopAnalyze,
                            analyzeLoading,
                            analyzeProgress
                        }) => {
    // State for expandable sections
    const [expandedSections, setExpandedSections] = useState({
        type: true,
        date: false,
        prediction: false,
        advanced: false
    });

    // State for available years (for FilterPanel)
    const [availableYears, setAvailableYears] = useState([]);

    // Fetch available years when component mounts
    useEffect(() => {
        fetch(`${base}/api/analyze/years`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setAvailableYears(data.years);
                }
            })
            .catch(err => {
                console.error('Error fetching years:', err);
            });
    }, []);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleCountryChange = (e) => {
        onCountryChange(e.target.value);
    };

    const handleTypeFilterChange = (filterName, checked) => {
        onTypeFilterChange({
            ...typeFilters,
            [filterName]: checked
        });
    };

    // Create sidebar content
    const sidebarContent = (
        <div className="sidebar-inner-content">
            <a href="https://github.com/Alexander-Hung/Why-fires" className="logo-container">
                <img
                    src="./images/WHY_FIRES.png"
                    alt="WHY FIRES"
                    className="center logo-image"
                />
            </a>
            <hr />
            <br />

            <div id="sidebar-feature">
                {/* Country Filter */}
                <div id="filter" className="filter-container">
                    <div className="select">
                        <select
                            id="countryFilter"
                            value={selectedCountry}
                            onChange={handleCountryChange}
                        >
                            <option value="">Select Country</option>
                            {countries.map((country) => (
                                <option key={country} value={country}>
                                    {country}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <br />

                {/* Type Filter */}
                <TypeFilter
                    expanded={expandedSections.type}
                    toggleExpand={() => toggleSection('type')}
                    filters={typeFilters}
                    onChange={handleTypeFilterChange}
                />

                <br />

                {/* Date Filter */}
                <DateFilter
                    expanded={expandedSections.date}
                    toggleExpand={() => toggleSection('date')}
                    year={selectedYear}
                    onYearChange={onYearChange}
                    month={selectedMonth}
                    onMonthChange={onMonthChange}
                    date={selectedDate}
                    onDateChange={onDateChange}
                />

                <br />

                {/* Advanced Filter Panel */}
                <div id="advancedFilterContainer">
                    <div id="topSection3">
                        <div id="topTitle3">Prediction & Analysis</div>
                        <div id="topButton3">
                            <button id="nope3" onClick={() => toggleSection('advanced')}></button>
                        </div>
                    </div>

                    <div id="expandContainer3" className={expandedSections.advanced ? 'expanded' : 'collapsed'}>
                        <div id="expandContract3" className={expandedSections.advanced ? 'expanded' : 'collapsed'}>
                            <FilterPanel
                                years={availableYears}
                                countries={countries}
                                selectedCountry={selectedCountry}
                                onAnalyze={onAnalyze}
                                onStopAnalyze={onStopAnalyze}
                                disabled={analyzeLoading}
                                onStartPrediction={onStartPrediction}
                                showAreaRisk={showAreaRisk}
                                onToggleAreaRisk={onToggleAreaRisk}
                                predictionAvailable={predictionAvailable}
                                expanded={expandedSections.prediction}
                                toggleExpand={() => toggleSection('prediction')}
                                analyzeLoading={analyzeLoading}
                                analyzeProgress={analyzeProgress}
                            />
                        </div>
                    </div>
                </div>

                <br />
            </div>
            <br />
            <div style={{ height: '27vh' }}></div> {/* Filler space */}
        </div>
    );

    // Create footer content
    const footerContent = <DataCount count={dataPointCount} />;

    return (
        <ResizableSidebar
            isOpen={isOpen}
            onToggle={onToggle}
            position="left"
            defaultWidth={320}
            minWidth={250}
            maxWidth={500}
            footer={footerContent}
        >
            {sidebarContent}
        </ResizableSidebar>
    );
};

export default Sidebar;