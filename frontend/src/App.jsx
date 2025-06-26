import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DetailContainer } from './components/DetailContainer';
import { RightSidebar } from './components/RightSidebar';
import { DownloadOverlay } from './components/DownloadOverlay';
import { ColorRangeBar } from './components/ColorRangeBar';
import Map from './components/Map';
import './styles/App.css';
import './styles/resizing.css';

// Apply global styles to prevent scrolling
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden'; // Prevent scrolling on the body

const App = () => {
    // Application state
    const [currentData, setCurrentData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedYear, setSelectedYear] = useState(2001);
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [countries, setCountries] = useState([]);
    const [countriesData, setCountriesData] = useState(null);
    const [showDownloadOverlay, setShowDownloadOverlay] = useState(false);
    const [showDetailContainer, setShowDetailContainer] = useState(false);
    const [detailContent, setDetailContent] = useState('');
    const [dataPointCount, setDataPointCount] = useState(0);
    const [temperatureRange, setTemperatureRange] = useState({ min: 0, max: 100 });

    // Sidebar visibility state
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

    // Filter state
    const [typeFilters, setTypeFilters] = useState({
        typePVF: true,
        typeOSLS: true,
        typeO: true,
        typeAV: true,
        typeDay: true,
        typeNight: true
    });

    // Prediction state
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressPhase, setProgressPhase] = useState('');
    const [predictionData, setPredictionData] = useState(null);
    const [showMlResults, setShowMlResults] = useState(false);

    // Advanced analysis state
    const [analyzeLoading, setAnalyzeLoading] = useState(false);
    const [analyzeProgress, setAnalyzeProgress] = useState(0);
    const [analysisResults, setAnalysisResults] = useState(null);

    // Area risk toggle state
    const [showAreaRisk, setShowAreaRisk] = useState(false);

    // Refs
    const eventSourceRef = useRef(null);

    const [analysisSessionId, setAnalysisSessionId] = useState(null);
    const [progressEventSource, setProgressEventSource] = useState(null);

    useEffect(() => {
        // Cleanup function that runs when component unmounts
        return () => {
            // Close any open event source
            if (progressEventSource) {
                console.log("Cleaning up progress event source");
                progressEventSource.close();
            }
        };
    }, [progressEventSource]);

    // Fetch countries data on load
    useEffect(() => {
        fetch('http://165.227.70.245:5000/api/countriesMeta')
            .then(response => response.json())
            .then(data => {
                setCountriesData(data);
            })
            .catch(error => {
                console.error('Error loading countries metadata:', error);
            });

        // Check data availability
        checkDataAvailability();
    }, []);

    // Fetch countries when year changes
    useEffect(() => {
        fetchCountries(selectedYear);
    }, [selectedYear]);

    // Load data when relevant filters change
    useEffect(() => {
        if (selectedCountry) {
            loadData();
        }
    }, [selectedYear, selectedCountry, selectedMonth, selectedDate]);

    // Apply front-end filters when they change
    useEffect(() => {
        if (currentData.length > 0) {
            const filtered = applyFrontEndFilters();
            setFilteredData(filtered);
            setDataPointCount(filtered.length);
        }
    }, [currentData, typeFilters, selectedMonth, selectedDate]);

    // Cleanup event source on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const fetchCountries = (year) => {
        const url = `http://165.227.70.245:5000/api/countries?year=${year}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.countries && data.countries.length > 0) {
                    setCountries(data.countries);
                }
            })
            .catch(error => console.error('Error fetching countries:', error));
    };

    const loadData = () => {
        const country = selectedCountry.replace(/\s/g, '_');
        const url = `http://165.227.70.245:5000/api/data?year=${selectedYear}&country=${encodeURIComponent(country)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                    setDataPointCount(0);
                    setCurrentData([]);
                    openDetailContainer("No data found for this selection.");
                    return;
                }

                setCurrentData(data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    };

    const applyFrontEndFilters = () => {
        if (!currentData || currentData.length === 0) {
            return [];
        }

        let filtered = [...currentData];

        // Day/Night filter
        if (!typeFilters.typeDay || !typeFilters.typeNight) {
            filtered = filtered.filter(d => {
                if (typeFilters.typeDay && d.daynight === 'D') return true;
                if (typeFilters.typeNight && d.daynight === 'N') return true;
                return false;
            });
        }

        // Fire types filter
        if (!typeFilters.typePVF || !typeFilters.typeOSLS || !typeFilters.typeO || !typeFilters.typeAV) {
            filtered = filtered.filter(d => {
                if (typeFilters.typePVF && d.type === 0) return true;
                if (typeFilters.typeOSLS && d.type === 2) return true;
                if (typeFilters.typeO && d.type === 3) return true;
                if (typeFilters.typeAV && d.type === 1) return true;
                return false;
            });
        }

        // Month filter
        if (selectedMonth !== 0) {
            filtered = filtered.filter(d => {
                const month = new Date(d.acq_date).getMonth() + 1;
                return month === selectedMonth;
            });
        }

        // Date filter
        if (selectedDate) {
            filtered = filtered.filter(d => d.acq_date === selectedDate);
        }

        // Calculate temperature range for the color bar
        if (filtered.length > 0) {
            let minBrightness = filtered.reduce((min, p) =>
                p.brightness < min ? p.brightness : min, filtered[0].brightness);
            let maxBrightness = filtered.reduce((max, p) =>
                p.brightness > max ? p.brightness : max, filtered[0].brightness);

            setTemperatureRange({ min: minBrightness, max: maxBrightness });
        }

        return filtered;
    };

    const handleMapPointClick = (pointData) => {
        if (!pointData) return;

        const bodyData = {
            year: selectedYear,
            country: selectedCountry.replace(/\s/g, '_'),
            latitude: pointData.latitude.toString(),
            longitude: pointData.longitude.toString(),
            acq_date: pointData.acq_date,
            acq_time: pointData.acq_time.toString()
        };

        fetch('http://165.227.70.245:5000/api/detail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        })
            .then(response => response.json())
            .then(detail => {
                if (!detail || detail === 'error' || detail.length === 0) {
                    openDetailContainer("No detail found for this point.");
                } else {
                    openDetailContainer(buildDetailHTML(detail[0]));
                }
            })
            .catch(err => {
                console.error("Error calling /api/detail:", err);
                openDetailContainer("Error retrieving detail.");
            });
    };

    const buildDetailHTML = (record) => {
        const typeMapping = {
            0: 'Presumed Vegetation Fire',
            1: 'Active Volcano',
            2: 'Other Static Land Source',
            3: 'Offshore',
            99: 'UNKNOWN'
        };

        const dayNightMapping = {
            'D': 'Daytime Fire',
            'N': 'Nighttime Fire'
        };

        const area = record.area || 'unknown area';
        const date = record.acq_date || 'unknown date';
        const time = record.acq_time || 'unknown time';
        const lat = record.latitude || 'unknown lat';
        const lon = record.longitude || 'unknown lon';
        const bright = record.brightness || 'N/A';
        const daynight = record.daynight ? dayNightMapping[record.daynight] : 'unknown';
        const typeDesc = typeMapping[record.type] || 'unknown';

        // Format time from "HHMM" to "HH:MM"
        const formattedTime = formatTime(time);

        return `
      <div><h1><b>${selectedCountry}</b></h1></div>
      <div><h2><b>${area}</b></h2></div>
      <div style="font-size: 18px;">
        <b>Date:</b> ${date} <br />
        <b>Time:</b> ${formattedTime} UTC (${daynight})
      </div>
      <br />
      <div style="font-size: 18px;">
        <b>Latitude:</b> ${lat} <br />
        <b>Longitude:</b> ${lon}
      </div>
      <br />
      <div style="font-size: 18px;">
        <b>Temperature:</b> ${bright} K <br />
        <b>Type:</b> ${typeDesc}
      </div>
      <br />
    `;
    };

    const formatTime = (timeVal) => {
        if (timeVal == null) {
            return 'Time not available';
        }

        // Convert input to a string
        let timeStr = String(timeVal);

        // Left-pad to 4 digits: e.g., '659' => '0659'
        // Then use regex to insert a colon: '0659' => '06:59'
        timeStr = timeStr.padStart(4, '0').replace(/^(..)(..)$/, '$1:$2');

        // If it's an unexpected format or empty, return a fallback
        if (!timeStr.includes(':')) {
            return 'Time not available';
        }
        return timeStr;
    };

    const openDetailContainer = (content) => {
        setDetailContent(content);
        setShowDetailContainer(true);
    };

    const closeDetailContainer = () => {
        setShowDetailContainer(false);
    };

    // Modified startPrediction and handleAnalyze functions

    const startPrediction = (predictionCountry) => {
        // Use the provided predictionCountry if specified, otherwise use selectedCountry
        const countryToUse = predictionCountry || selectedCountry;

        if (!countryToUse) {
            alert("Please select a country for prediction");
            return;
        }

        // Get today's date in YYYY-MM-DD format
        const getTodayDate = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Show progress overlay and reset values
        setShowProgress(true);
        setProgress(0);
        setProgressPhase('Loading model...');
        setShowMlResults(true);

        // We no longer reset analysis results
        // setPredictionData(null);
        // setAnalysisResults(null);

        // Open right sidebar if not already open
        if (!rightSidebarOpen) {
            setRightSidebarOpen(true);
        }

        // Simulate progress for visual feedback since we're making a direct API call
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return prev;
                }
                return prev + 10;
            });
        }, 200);

        // Call the new API endpoint with today's date
        fetch('http://165.227.70.245:5000/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                country: countryToUse,
                start_date: getTodayDate()
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to get predictions');
                }
                return response.json();
            })
            .then(data => {
                clearInterval(progressInterval);
                setProgress(100);
                setProgressPhase('Prediction complete!');

                // Update state with prediction data
                setPredictionData(data);

                // Hide progress after a short delay
                setTimeout(() => {
                    setShowProgress(false);
                }, 1000);
            })
            .catch(error => {
                clearInterval(progressInterval);
                console.error('Prediction error:', error);
                setProgressPhase('Error: ' + error.message);
                setTimeout(() => {
                    setShowProgress(false);
                }, 3000);
            });
    };

    const handleAnalyze = (filters) => {
        setAnalyzeLoading(true);
        setAnalyzeProgress(0);

        // Clear previous analysis results
        setAnalysisResults(null);

        // Clean up any existing event source
        if (progressEventSource) {
            progressEventSource.close();
            setProgressEventSource(null);
        }

        // Open right sidebar if not already open
        if (!rightSidebarOpen) {
            setRightSidebarOpen(true);
        }

        console.log("Starting analysis...");

        // Make API call to start the analysis
        fetch('http://165.227.70.245:5000/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filters),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store the session ID for progress tracking
                    const sessionId = data.session_id;
                    setAnalysisSessionId(sessionId);
                    console.log(`Analysis started with session ID: ${sessionId}`);

                    // Set up event source for progress tracking
                    const eventSource = new EventSource(`http://165.227.70.245:5000/api/progress/${sessionId}`);
                    setProgressEventSource(eventSource);

                    // Handle progress updates
                    eventSource.onmessage = function(event) {
                        try {
                            const eventData = JSON.parse(event.data);
                            console.log(`Progress update received: ${eventData.progress}%`);
                            setAnalyzeProgress(eventData.progress);

                            // If processing is complete (progress = 100%)
                            if (eventData.progress >= 100) {
                                console.log("Analysis complete, fetching results");

                                // Close the event source
                                eventSource.close();
                                setProgressEventSource(null);

                                // Fetch the analysis results
                                fetch(`http://165.227.70.245:5000/api/analysis_results/${sessionId}`)
                                    .then(response => response.json())
                                    .then(resultsData => {
                                        if (resultsData.success) {
                                            // Update analysis results
                                            setAnalysisResults(resultsData);
                                            console.log("Analysis results received:", resultsData);
                                        } else {
                                            console.error("Failed to get analysis results:", resultsData.message);
                                        }

                                        // Reset loading state after a short delay
                                        setTimeout(() => {
                                            setAnalyzeLoading(false);
                                        }, 500);
                                    })
                                    .catch(err => {
                                        console.error("Error fetching analysis results:", err);
                                        setAnalyzeLoading(false);
                                    });
                            }

                            // If processing was stopped (progress = 0)
                            if (eventData.progress === 0 && analyzeLoading) {
                                console.log("Analysis was stopped");

                                // Close the event source
                                eventSource.close();
                                setProgressEventSource(null);

                                // Reset states
                                setAnalyzeLoading(false);
                            }
                        } catch (err) {
                            console.error("Error parsing progress event:", err);
                        }
                    };

                    // Handle connection opened
                    eventSource.onopen = function() {
                        console.log("Progress event source connected");
                    };

                    // Handle errors
                    eventSource.onerror = function(err) {
                        console.error("EventSource failed:", err);
                        eventSource.close();
                        setProgressEventSource(null);

                        // If still loading, reset the state
                        if (analyzeLoading) {
                            setAnalyzeLoading(false);
                        }
                    };

                } else {
                    // Handle error from analysis
                    console.error("Analysis failed:", data.error);
                    setAnalyzeLoading(false);
                }
            })
            .catch(err => {
                console.error('Error connecting to the server:', err);
                setAnalyzeLoading(false);
            });
    };

    const handleStopAnalyze = () => {
        // If we have a session ID, include it in the stop request
        const requestData = {};
        if (analysisSessionId) {
            requestData.session_id = analysisSessionId;
        }

        console.log("Sending stop request...");

        // Call the stop endpoint
        fetch('http://165.227.70.245:5000/api/analyze/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(data => {
                console.log("Analysis stop request sent:", data.message);

                // Progress event handler will handle UI updates when it receives 0%
                // But as a fallback, we'll reset UI state after a timeout
                setTimeout(() => {
                    if (analyzeLoading) {
                        setAnalyzeLoading(false);
                        setAnalyzeProgress(0);
                    }
                }, 2000);
            })
            .catch(error => {
                console.error("Error sending stop request:", error);

                // Reset UI state immediately if request fails
                setAnalyzeLoading(false);
                setAnalyzeProgress(0);

                // Close event source if it exists
                if (progressEventSource) {
                    progressEventSource.close();
                    setProgressEventSource(null);
                }
            });
    };

    const checkDataAvailability = () => {
        // First check if data is already set up
        fetch('http://165.227.70.245:5000/api/data_setup')
            .then(response => response.json())
            .then(result => {
                if (result.data_setup === true) {
                    setShowDownloadOverlay(false);
                } else {
                    // Check if data files exist
                    fetch('http://165.227.70.245:5000/api/check_data')
                        .then(response => response.json())
                        .then(result => {
                            if (result.modis_exists) {
                                setShowDownloadOverlay(false);
                            } else {
                                setShowDownloadOverlay(true);
                            }
                        })
                        .catch(err => {
                            console.error("Error checking data:", err);
                            setShowDownloadOverlay(true);
                        });
                }
            })
            .catch(err => {
                console.error("Error checking data setup:", err);
                setShowDownloadOverlay(true);
            });
    };

    const toggleAreaRisk = (country) => {
        // If a specific country is provided, use it for displaying area risk
        // Otherwise use the currently selected country
        if (country && country !== selectedCountry) {
            // Temporarily store the currently selected country
            const previousCountry = selectedCountry;

            // Update to the specified country
            setSelectedCountry(country);

            // Toggle the area risk flag
            setShowAreaRisk(!showAreaRisk);

            // If we're hiding area risk, revert back to the original country
            if (showAreaRisk) {
                setTimeout(() => {
                    setSelectedCountry(previousCountry);
                }, 100);
            }
        } else {
            // Normal toggle behavior with the currently selected country
            setShowAreaRisk(!showAreaRisk);
        }
    };

    return (
        <div className="app-container">
            {/* Main Map Section */}
            <div id="mainMap">
                <div className="main">
                    <Map
                        filteredData={filteredData}
                        selectedCountry={selectedCountry}
                        countriesData={countriesData}
                        onPointClick={handleMapPointClick}
                        showAreaRisk={showAreaRisk}
                        predictionData={predictionData}
                    />

                    <Sidebar
                        isOpen={leftSidebarOpen}
                        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
                        selectedYear={selectedYear}
                        onYearChange={setSelectedYear}
                        selectedMonth={selectedMonth}
                        onMonthChange={setSelectedMonth}
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        countries={countries}
                        selectedCountry={selectedCountry}
                        onCountryChange={setSelectedCountry}
                        typeFilters={typeFilters}
                        onTypeFilterChange={(newFilters) => setTypeFilters(newFilters)}
                        onStartPrediction={startPrediction}
                        dataPointCount={dataPointCount}
                        showAreaRisk={showAreaRisk}
                        onToggleAreaRisk={toggleAreaRisk}
                        predictionAvailable={predictionData !== null}
                        onAnalyze={handleAnalyze}
                        onStopAnalyze={handleStopAnalyze}
                        analyzeLoading={analyzeLoading}
                        analyzeProgress={analyzeProgress}
                    />

                    <RightSidebar
                        isOpen={rightSidebarOpen}
                        onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
                        showProgress={showProgress}
                        progressValue={progress}
                        progressPhase={progressPhase}
                        showResults={showMlResults}
                        predictionData={predictionData}
                        analysisResults={analysisResults}
                    />
                </div>

                {/* Detail Container */}
                {showDetailContainer && (
                    <DetailContainer
                        content={detailContent}
                        onClose={closeDetailContainer}
                    />
                )}

                {/* Color Range Bar - hide when showing area risk */}
                {!showAreaRisk && (
                    <ColorRangeBar
                        minValue={temperatureRange.min}
                        maxValue={temperatureRange.max}
                        hidden={rightSidebarOpen}
                    />
                )}
            </div>

            {/* Download Overlay */}
            {showDownloadOverlay && (
                <DownloadOverlay onComplete={() => setShowDownloadOverlay(false)} />
            )}
        </div>
    );
};

export default App;