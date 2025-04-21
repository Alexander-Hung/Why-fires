import React from 'react';

export const PredictionFilter = ({
                                     expanded,
                                     toggleExpand,
                                     params,
                                     onChange,
                                     onStartPrediction
                                 }) => {
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        onChange({
            ...params,
            startDate: value
        });
    };

    // Set default date to today if not already set
    const today = new Date().toISOString().split('T')[0];

    return (
        <div id="MLContainer">
            <div id="topSection3">
                <div id="topTitle3">Analyze & Prediction</div>
                <div id="topButton3">
                    <button id="nope3" onClick={toggleExpand}></button>
                </div>
            </div>

            <div id="expandContainer3" className={expanded ? 'expanded' : 'collapsed'}>
                <div id="expandContract3" className={expanded ? 'expanded' : 'collapsed'}>
                    <div style={{ fontSize: '14px', color: '#bdc3c7', marginBottom: '15px' }}>
                    </div>

                    <div>
                        <button
                            id="forecastButton"
                            onClick={onStartPrediction}
                            style={{ width: '100%' }}
                        >
                            Get Fire Risk Prediction
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};