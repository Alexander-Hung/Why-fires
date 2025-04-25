import React from 'react';

export const PredictionResults = ({ predictionData }) => {
    if (!predictionData) return null;

    const {
        country,
        country_area_percentage,
        predictions
    } = predictionData;

    // Format dates for display
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get risk level color based on percentage
    const getRiskColor = (percentage) => {
        if (percentage >= 75) return '#e74c3c'; // High risk - red
        if (percentage >= 50) return '#f39c12'; // Medium risk - orange
        if (percentage >= 25) return '#f1c40f'; // Low risk - yellow
        return '#2ecc71'; // Very low risk - green
    };

    return (
        <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
            {/* Country Overview */}
            <div style={{
                textAlign: 'center',
                fontSize: '24px',
                marginBottom: '15px',
                backgroundColor: getRiskColor(country_area_percentage),
                padding: '20px',
                borderRadius: '12px',
                color: country_area_percentage >= 50 ? 'white' : 'black',
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}><h2 style={{ margin: '0 0 20px 0', fontSize: '36px' }}>{country.charAt(0).toUpperCase() + country.slice(1)}</h2>
                <div style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    lineHeight: '1'
                }}>
                    {country_area_percentage}%
                </div>
            </div>

            {/* Area Predictions */}
            <div>
                <h3 style={{ marginBottom: '15px' }}>Area Predictions (Top 10)</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '15px'
                }}>
                    {predictions.slice(0, 10).map((area, index) => (
                        <div
                            key={area.area}
                            style={{
                                backgroundColor: '#34495e',
                                borderRadius: '8px',
                                padding: '15px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'pointer',
                                ':hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                                }
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        marginBottom: '5px'
                                    }}>
                                        {area.area}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                                        Rank: #{index + 1}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: getRiskColor(area.fire_risk_percent)
                                }}>
                                    {area.fire_risk_percent}%
                                </div>
                            </div>

                            {/* Risk bar */}
                            <div style={{
                                marginTop: '10px',
                                height: '8px',
                                backgroundColor: '#2c3e50',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${area.fire_risk_percent}%`,
                                    height: '100%',
                                    backgroundColor: getRiskColor(area.fire_risk_percent),
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {predictions.length > 20 && (
                    <div style={{
                        marginTop: '20px',
                        textAlign: 'center',
                        color: '#bdc3c7',
                        fontSize: '14px'
                    }}>
                        Showing top 10 of {predictions.length} areas
                    </div>
                )}
            </div>
        </div>
    );
};