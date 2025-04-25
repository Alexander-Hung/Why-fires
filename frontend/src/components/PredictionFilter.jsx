import React, { useState, useEffect } from 'react';

export const PredictionFilter = ({
                                     expanded,
                                     toggleExpand,
                                     onStartPrediction,
                                     countries = [],
                                     selectedCountry = '',
                                     showAreaRisk,
                                     onToggleAreaRisk,
                                     predictionAvailable
                                 }) => {
    // Local state for the prediction country, initialized from props but can be changed independently
    const [predictionCountry, setPredictionCountry] = useState(selectedCountry);

    // Update the local state when the main selectedCountry changes
    useEffect(() => {
        setPredictionCountry(selectedCountry);
    }, [selectedCountry]);

    const handleCountryChange = (e) => {
        setPredictionCountry(e.target.value);
    };

    const handleStartPrediction = () => {
        // Use the local predictionCountry instead of the main selectedCountry
        onStartPrediction(predictionCountry);
    };

    return (
        <div>
            <div><h2>Prediction:</h2></div>
            <div style={{ fontSize: '14px', color: '#bdc3c7', marginBottom: '15px' }}>
                Get predictions for wildfire risk in specific areas.
            </div>

            {/* Separate Country Filter for Prediction with custom-dropdown styling */}
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Country for Prediction:
                </label>
                <div className="select prediction-dropdown-wrapper">
                    <select
                        className="custom-prediction-dropdown"
                        value={predictionCountry}
                        onChange={handleCountryChange}
                    >
                        <option className="prediction-dropdown-options" value="">Select Country</option>
                        {countries.map((country) => (
                            <option className="prediction-dropdown-options" key={country} value={country}>
                                {country}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <button
                    id="forecastButton"
                    onClick={handleStartPrediction}
                    style={{ width: '100%' }}
                    disabled={!predictionCountry}
                >
                    Get Fire Risk Prediction
                </button>
                {!predictionCountry && (
                    <div style={{
                        fontSize: '12px',
                        color: '#e74c3c',
                        marginTop: '5px',
                        textAlign: 'center'
                    }}>
                        Please select a country for prediction
                    </div>
                )}
            </div>

            {/* Area Risk Toggle Button - Show when prediction country is selected */}
            {predictionCountry && (
                <div style={{ width: '100%', marginTop: '20px' }}>
                    <button
                        onClick={() => onToggleAreaRisk(predictionCountry)}
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
                        marginBottom: '5px'
                    }}>
                        {showAreaRisk ? 'Currently showing area risk predictions' : 'Currently showing data points'}
                    </div>
                    <div style={{
                        fontSize: '12px',
                        color: '#f39c12',
                        textAlign: 'center',
                        marginBottom: '15px'
                    }}>
                        Using country: {predictionCountry}
                    </div>
                </div>
            )}
        </div>
    );
};