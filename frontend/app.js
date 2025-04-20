import React, { useState, useEffect } from 'react';
import './App.css';
import MainMap from './components/MainMap';
import DownloadOverlay from './components/DownloadOverlay';
import MLSection from './components/MLSection';
import { FilterProvider } from './context/FilterContext';
import { checkData, checkDataSetup } from './services/api';

function App() {
    // State to control the download overlay visibility
    const [showDownloadOverlay, setShowDownloadOverlay] = useState(true);
    // State to track data availability
    const [dataStatus, setDataStatus] = useState({
        modisExists: false,
        combinedExists: false,
        modelExists: false,
        dataSetup: false
    });

    // Check data availability on component mount
    useEffect(() => {
        const fetchDataStatus = async () => {
            try {
                // First check if data setup is complete
                const setupResult = await checkDataSetup();
                if (setupResult.data_setup) {
                    setDataStatus(prev => ({ ...prev, dataSetup: true }));
                    setShowDownloadOverlay(false);
                    return;
                }

                // If not, check individual data components
                const checkResult = await checkData();
                setDataStatus({
                    modisExists: checkResult.modis_exists,
                    combinedExists: checkResult.combined_exists,
                    modelExists: checkResult.model_exists,
                    dataSetup: false
                });

                // Hide overlay if MODIS data exists
                if (checkResult.modis_exists) {
                    setShowDownloadOverlay(false);
                }
            } catch (error) {
                console.error("Error checking data availability:", error);
            }
        };

        fetchDataStatus();
    }, []);

    // Function to handle data setup completion
    const handleDataSetupComplete = () => {
        setShowDownloadOverlay(false);
        setDataStatus(prev => ({ ...prev, dataSetup: true }));
    };

    return (
        <FilterProvider>
            <div className="App">
                {/* Conditional rendering of the download overlay */}
                {showDownloadOverlay && (
                    <DownloadOverlay
                        filesStatus={dataStatus}
                        onSetupComplete={handleDataSetupComplete}
                    />
                )}

                <main>
                    {/* Main map component with sidebar */}
                    <MainMap />

                    {/* Machine Learning section */}
                    <MLSection />
                </main>
            </div>
        </FilterProvider>
    );
}

export default App;