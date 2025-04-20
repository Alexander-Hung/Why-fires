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
        // Map HTML input IDs to state property names
        const paramMapping = {
            'mapKeyInput': 'mapKey',
            'daysInput': 'days',
            'periodsInput': 'periods',
            'startDateInput': 'startDate'
        };

        onChange({
            ...params,
            [paramMapping[id]]: value
        });
    };

    return (
        <div id="MLContainer">
            <div id="topSection3">
                <div id="topTitle3">Prediction</div>
                <div id="topButton3">
                    <button id="nope3" onClick={toggleExpand}></button>
                </div>
            </div>

            <div id="expandContainer3" className={expanded ? 'expanded' : 'collapsed'}>
                <div id="expandContract3" className={expanded ? 'expanded' : 'collapsed'}>
                    <div>
                        <input
                            className="input"
                            type="text"
                            id="mapKeyInput"
                            placeholder="Enter Map Key"
                            value={params.mapKey}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <input
                            className="input"
                            type="number"
                            id="daysInput"
                            placeholder="Days(max 10)"
                            min="1"
                            max="10"
                            value={params.days}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <input
                            className="input"
                            type="number"
                            id="periodsInput"
                            placeholder="Periods(e.g., 10)"
                            min="1"
                            max="20"
                            value={params.periods}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <br />
                        <span><b>Start Date:</b></span>
                        <input
                            className="input"
                            type="date"
                            id="startDateInput"
                            value={params.startDate}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div>
                        <div style={{ margin: '0.5em' }}>
                            <button
                                id="forecastButton"
                                onClick={onStartPrediction}
                            >
                                Prediction
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};