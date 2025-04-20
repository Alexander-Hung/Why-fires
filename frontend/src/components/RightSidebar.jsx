import React from 'react';
import { ForecastResults } from './ForecastResults';
import { ProgressOverlay } from './ProgressOverlay';

export const RightSidebar = ({
                                 isOpen,
                                 onToggle,
                                 showProgress,
                                 progressValue,
                                 progressPhase,
                                 showResults,
                                 mlResults
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

                {/* ML Results */}
                {showResults && (
                    <div className="Row" id="mlResults" style={{ display: 'grid' }}>
                        <ForecastResults
                            annualCounts={mlResults.annualCounts}
                            probabilities={mlResults.probabilities}
                        />
                    </div>
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