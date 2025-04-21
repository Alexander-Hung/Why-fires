import React from 'react';
import { PredictionResults } from './PredictionResults';
import { ProgressOverlay } from './ProgressOverlay';

export const RightSidebar = ({
                                 isOpen,
                                 onToggle,
                                 showProgress,
                                 progressValue,
                                 progressPhase,
                                 showResults,
                                 predictionData
                             }) => {
    return (
        <>
            <div className={`rightSidebar ${isOpen ? 'is-open' : ''}`}>
                {/* Progress Overlay */}
                {showProgress && (
                    <ProgressOverlay
                        progress={progressValue}
                        phase={progressPhase}
                    />
                )}

                {/* Prediction Results */}
                {showResults && predictionData && (
                    <PredictionResults predictionData={predictionData} />
                )}
            </div>

            <button
                className={`rightSidebar-toggle ${isOpen ? 'is-open' : ''}`}
                onClick={onToggle}
            >
                <span className="material-icons icon-open">keyboard_double_arrow_left</span>
                <span className="material-icons icon-close">keyboard_double_arrow_right</span>
            </button>
        </>
    );
};