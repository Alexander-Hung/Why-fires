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
                            predictionParams,
                            onPredictionParamChange,
                            onStartPrediction,
                            dataPointCount
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
            <div className={`sidebar ${!isOpen ? 'is-closed' : ''}`} style={{height:'100vh'}}>
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
                            params={predictionParams}
                            onChange={onPredictionParamChange}
                            onStartPrediction={onStartPrediction}
                        />
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