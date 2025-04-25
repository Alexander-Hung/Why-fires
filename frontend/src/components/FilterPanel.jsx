import React, { useState, useRef, useEffect } from 'react';
import { PredictionFilter } from './PredictionFilter';
import ProgressBar from './ProgressBar';

const FilterPanel = ({
                       years,
                       countries,
                       onAnalyze,
                       onStopAnalyze,
                       disabled,
                       onStartPrediction,
                       showAreaRisk,
                       onToggleAreaRisk,
                       predictionAvailable,
                       expanded,
                       toggleExpand,
                       selectedCountry,
                       analyzeLoading,
                       analyzeProgress
                     }) => {
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [confidenceRange, setConfidenceRange] = useState({ min: 0, max: 100 });
  const [daynight, setDaynight] = useState('');
  const [fireType, setFireType] = useState('');
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  const yearDropdownRef = useRef(null);
  const countryDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setYearDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setCountryDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleYearChange = (year) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  const handleSelectAllYears = () => {
    setSelectedYears([...years]);
  };

  const handleDeselectAllYears = () => {
    setSelectedYears([]);
  };

  const handleCountryChange = (country) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter(c => c !== country));
    } else {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  const handleSelectAllCountries = () => {
    setSelectedCountries([...countries]);
  };

  const handleDeselectAllCountries = () => {
    setSelectedCountries([]);
  };

  const handleConfidenceChange = (e) => {
    const { name, value } = e.target;
    setConfidenceRange({ ...confidenceRange, [name]: parseInt(value, 10) });
  };

  const handleDaynightChange = (e) => {
    setDaynight(e.target.value);
  };

  const handleFireTypeChange = (e) => {
    setFireType(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Prepare filters object
    const filters = {
      years: selectedYears.length > 0 ? selectedYears : years,
      countries: selectedCountries.length > 0 ? selectedCountries : countries,
      confidenceRange,
      daynight: daynight || undefined,
      type: fireType !== '' ? parseInt(fireType, 10) : undefined
    };

    // Call the parent's onAnalyze function with the filters
    onAnalyze(filters);
  };

  const handleReset = () => {
    setSelectedYears([]);
    setSelectedCountries([]);
    setConfidenceRange({ min: 0, max: 100 });
    setDaynight('');
    setFireType('');
  };

  return (
      <div>
        <div className="filter-panel">
          <form onSubmit={handleSubmit}>
            <div className="filter-section">
              <h3>Years</h3>
              <div className="dropdown-container" ref={yearDropdownRef}>
                <div className="dropdown-actions">
                  <button
                      type="button"
                      className="dropdown-action-btn"
                      onClick={handleSelectAllYears}
                      disabled={disabled}
                  >
                    All
                  </button>
                  <button
                      type="button"
                      className="dropdown-action-btn"
                      onClick={handleDeselectAllYears}
                      disabled={disabled}
                  >
                    None
                  </button>
                </div>
                <div className="custom-dropdown">
                  <div
                      className="dropdown-header"
                      onClick={() => !disabled && setYearDropdownOpen(!yearDropdownOpen)}
                  >
                  <span>
                    {selectedYears.length === 0
                        ? 'Select Years'
                        : selectedYears.length === years.length
                            ? 'All Years'
                            : `${selectedYears.length} Selected`}
                  </span>
                    <span className="dropdown-arrow">{yearDropdownOpen ? '▲' : '▼'}</span>
                  </div>
                  {yearDropdownOpen && (
                      <div className="dropdown-options">
                        {years.map(year => (
                            <div
                                key={year}
                                className="dropdown-option"
                                onClick={() => !disabled && handleYearChange(year)}
                            >
                              <input
                                  type="checkbox"
                                  checked={selectedYears.includes(year)}
                                  onChange={() => {}}
                                  disabled={disabled}
                              />
                              {year}
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </div>
            </div>

            <div className="filter-section">
              <h3>Countries</h3>
              <div className="dropdown-container" ref={countryDropdownRef}>
                <div className="dropdown-actions">
                  <button
                      type="button"
                      className="dropdown-action-btn"
                      onClick={handleSelectAllCountries}
                      disabled={disabled}
                  >
                    All
                  </button>
                  <button
                      type="button"
                      className="dropdown-action-btn"
                      onClick={handleDeselectAllCountries}
                      disabled={disabled}
                  >
                    None
                  </button>
                </div>
                <div className="custom-dropdown">
                  <div
                      className="dropdown-header"
                      onClick={() => !disabled && setCountryDropdownOpen(!countryDropdownOpen)}
                  >
                  <span>
                    {selectedCountries.length === 0
                        ? 'Select Countries'
                        : selectedCountries.length === countries.length
                            ? 'All Countries'
                            : `${selectedCountries.length} Selected`}
                  </span>
                    <span className="dropdown-arrow">{countryDropdownOpen ? '▲' : '▼'}</span>
                  </div>
                  {countryDropdownOpen && (
                      <div className="dropdown-options">
                        {countries.map(country => (
                            <div
                                key={country}
                                className="dropdown-option"
                                onClick={() => !disabled && handleCountryChange(country)}
                            >
                              <input
                                  type="checkbox"
                                  checked={selectedCountries.includes(country)}
                                  onChange={() => {}}
                                  disabled={disabled}
                              />
                              {country}
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </div>
            </div>

            <div className="filter-section">
              <h3>Confidence Level (%)</h3>
              <div className="range-slider">
                <div>
                  Min: {confidenceRange.min}%
                  <input
                      type="range"
                      name="min"
                      min="0"
                      max="100"
                      value={confidenceRange.min}
                      onChange={handleConfidenceChange}
                      disabled={disabled}
                      style={{ width: '100%' }}
                  />
                </div>
                <div>
                  Max: {confidenceRange.max}%
                  <input
                      type="range"
                      name="max"
                      min="0"
                      max="100"
                      value={confidenceRange.max}
                      onChange={handleConfidenceChange}
                      disabled={disabled}
                      style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="filter-section">
              <h3>Day/Night</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label>
                  <input
                      type="radio"
                      name="daynight"
                      value="D"
                      checked={daynight === 'D'}
                      onChange={handleDaynightChange}
                      disabled={disabled}
                  />
                  Day
                </label>
                <label>
                  <input
                      type="radio"
                      name="daynight"
                      value="N"
                      checked={daynight === 'N'}
                      onChange={handleDaynightChange}
                      disabled={disabled}
                  />
                  Night
                </label>
                <label>
                  <input
                      type="radio"
                      name="daynight"
                      value=""
                      checked={daynight === ''}
                      onChange={handleDaynightChange}
                      disabled={disabled}
                  />
                  Both
                </label>
              </div>
            </div>

            <div className="filter-section">
              <h3>Fire Type</h3>
              <select
                  value={fireType}
                  onChange={handleFireTypeChange}
                  disabled={disabled}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'var(--primaryColor)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                  }}
              >
                <option value="">All Types</option>
                <option value="0">Presumed Vegetation Fire</option>
                <option value="1">Offshore</option>
                <option value="2">Active Volcano</option>
                <option value="3">Other Static Land Source</option>
              </select>
            </div>

            <div className="filter-actions">
              <button type="button" onClick={handleReset} disabled={disabled}>
                Reset
              </button>
              <button type="submit" disabled={disabled}>
                Analyze
              </button>
            </div>
          </form>
        </div>

        {/* Progress indicator with stop button */}
        {analyzeLoading && (
            <div className="progress-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p>Analyzing data...</p>
                <button
                    className="stop-analyze-btn"
                    onClick={onStopAnalyze}
                >
                  Stop Analysis
                </button>
              </div>
              <ProgressBar progress={analyzeProgress} />
            </div>
        )}

        {/* Prediction Filter with Area Risk button inside */}
        <PredictionFilter
            expanded={expanded}
            toggleExpand={toggleExpand}
            onStartPrediction={onStartPrediction}
            countries={countries}
            selectedCountry={selectedCountry}
            showAreaRisk={showAreaRisk}
            onToggleAreaRisk={onToggleAreaRisk}
            predictionAvailable={predictionAvailable}
        />

        <br />
      </div>
  );
};

export default FilterPanel;