import React from 'react';
import '../styles/ProgressOverlay.css';

export const ProgressOverlay = ({ progress, phase }) => {
    return (
        <div id="progressOverlay" style={{ display: 'flex' }}>
            <div className="progressContent">
                <span id="phaseDisplay">{phase || 'Processing'}: </span>
                <progress id="progressBar" value={progress} max="100"></progress>
                <span id="progressDisplay">{progress}%</span>
            </div>
        </div>
    );
};