import React, { useState } from 'react';
import { TypeFilter } from './TypeFilter';
import { DateFilter } from './DateFilter';
import { PredictionFilter } from './PredictionFilter';
import { DataCount } from './DataCount';

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
                            predictionAvailable
                        }) => {
    // State for expandable sections
    const [expandedSections, setExpandedSections] = useState({
        type: true,
        date: false,
        prediction: false
    });

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

    return (
        <>
            <div className={`sidebar ${!isOpen ? 'is-closed' : ''}`}>
                <div>
                    <a href="https://github.com/Alexander-Hung/Why-fires">
                        <img
                            src="./images/WHY_FIRES.png"
                            width="320"
                            height="110"
                            alt="WHY FIRES"
                            className="center"
                        />
                    </a>
                    <hr />
                    <br />

                    <div id="sidebar-feature">
                        {/* Country Filter */}
                        <div id="filter">
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

                        {/* Prediction Filter */}
                        <PredictionFilter
                            expanded={expandedSections.prediction}
                            toggleExpand={() => toggleSection('prediction')}
                            onStartPrediction={onStartPrediction}
                        />

                        <br />

                        {/* Area Risk Toggle Button */}
                        {predictionAvailable && (
                            <div style={{ width: '100%', marginTop: '10px' }}>
                                <button
                                    onClick={onToggleAreaRisk}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: showAreaRisk ? '#e74c3c' : '#2ecc71',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        transition: 'background-color 0.3s ease',
                                        marginBottom: '10px'
                                    }}
                                >
                                    {showAreaRisk ? 'Show Data Points' : 'Show Area Risk'}
                                </button>
                                <div style={{
                                    fontSize: '12px',
                                    color: '#bdc3c7',
                                    textAlign: 'center',
                                    marginBottom: '15px'
                                }}>
                                    {showAreaRisk ? 'Currently showing area risk predictions' : 'Currently showing data points'}
                                </div>
                            </div>
                        )}
                    </div>
                    <br />
                    <div style={{ height: '27vh' }}></div> {/* Filler space */}
                </div>
            </div>

            <div className={`sidebar-footer ${!isOpen ? 'is-closed' : ''}`}>
                <DataCount count={dataPointCount} />
            </div>

            <button className={`sidebar-toggle ${!isOpen ? 'is-closed' : ''}`} onClick={onToggle}>
                <span className="material-icons icon-open">keyboard_double_arrow_right</span>
                <span className="material-icons icon-close">keyboard_double_arrow_left</span>
            </button>
        </>
    );
};