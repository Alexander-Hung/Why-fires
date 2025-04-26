import React from 'react';
import '../styles/ProgressBar.css';

const ProgressBar = ({ progress }) => {
    return (
        <div className="progress-bar-container">
            <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
            ></div>
            <div className="progress-text">{progress}%</div>
        </div>
    );
};

export default ProgressBar;