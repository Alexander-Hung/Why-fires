import React from 'react';

const ZoomControls = ({ onZoomIn, onZoomOut, onReset }) => {
    return (
        <div className="zoom-controls">
            <div
                className="zoom-control-button"
                onClick={onZoomIn}
                title="Zoom In"
            >
                +
            </div>
            <div
                className="zoom-control-button"
                onClick={onZoomOut}
                title="Zoom Out"
            >
                -
            </div>
            <div
                className="zoom-control-button"
                onClick={onReset}
                title="Reset View"
            >
                ↺
            </div>
        </div>
    );
};

export default ZoomControls;