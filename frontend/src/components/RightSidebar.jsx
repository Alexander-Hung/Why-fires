import React from 'react';
import { PredictionResults } from './PredictionResults';
import { ProgressOverlay } from './ProgressOverlay';
import Dashboard from './Dashboard';

export const RightSidebar = ({
                                 isOpen,
                                 onToggle,
                                 showProgress,
                                 progressValue,
                                 progressPhase,
                                 showResults,
                                 predictionData,
                                 analysisResults
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

                <div className="right-sidebar-content">
                    {/* Prediction Results Section */}
                    {showResults && predictionData && (
                        <div className="prediction-results-section">
                            <div className="section-header">
                                <h2>Fire Risk Prediction</h2>
                            </div>
                            <PredictionResults predictionData={predictionData} />
                        </div>
                    )}

                    {/* Analysis Results/Dashboard Section */}
                    {analysisResults && (
                        <div className="analysis-results-section">
                            <div className="section-header">
                                <h2>Data Analysis</h2>
                            </div>
                            <div className="dashboard-container">
                                <Dashboard results={analysisResults} />
                            </div>
                        </div>
                    )}

                    {/* Empty state when no results are available */}
                    {!showResults && !predictionData && !analysisResults && (
                        <div className="no-results-message">
                            <h2>No Results Available</h2>
                            <p>Use the advanced analysis panel or prediction tools to generate results.</p>
                        </div>
                    )}
                </div>
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