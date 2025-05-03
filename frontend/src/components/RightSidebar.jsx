import React from 'react';
import ResizableSidebar from './ResizableSidebar';
import { PredictionResults } from './PredictionResults';
import { ProgressOverlay } from './ProgressOverlay';
import Dashboard from './Dashboard';
import '../styles/RightSidebar.css';

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
    // Create the content for the right sidebar
    const sidebarContent = (
        <>
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
        </>
    );

    return (
        <ResizableSidebar
            isOpen={isOpen}
            onToggle={onToggle}
            position="right"
            defaultWidth={750}
            minWidth={400}
            maxWidth={1200}
        >
            {sidebarContent}
        </ResizableSidebar>
    );
};

export default RightSidebar;