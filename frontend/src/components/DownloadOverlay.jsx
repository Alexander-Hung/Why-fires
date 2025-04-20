import React, { useState, useRef, useEffect } from 'react';

export const DownloadOverlay = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Click the button below to download and convert data from R2.');
    const [fileStatus, setFileStatus] = useState('');
    const eventSourceRef = useRef(null);

    // Check data availability on mount
    useEffect(() => {
        checkDataStatus();

        // Clean up any event sources on unmount
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const checkDataStatus = () => {
        fetch('http://localhost:5000/api/check_data')
            .then(response => response.json())
            .then(result => {
                updateFileStatusUI(result.combined_exists, result.model_exists);
            })
            .catch(err => {
                console.error('Error checking data status:', err);
                setFileStatus('Error checking file status');
            });
    };

    const updateFileStatusUI = (parquetExists, modelExists) => {
        let statusText = '';
        if (parquetExists && modelExists) {
            statusText = 'All files are available, but conversion is needed.';
        } else if (parquetExists) {
            statusText = 'Dataset file is available. Model file needs to be downloaded.';
        } else if (modelExists) {
            statusText = 'Model file is available. Dataset file needs to be downloaded.';
        } else {
            statusText = 'Both dataset and model files need to be downloaded.';
        }
        setFileStatus(statusText);
    };

    const startFullDownload = () => {
        // Reset progress display
        setProgress(0);
        setMessage('Starting downloads...');

        // Start the download process
        const url = 'http://localhost:5000/api/download_all';

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.progress !== null) {
                    setProgress(data.progress);
                }
                if (data.phase && data.message) {
                    setMessage(`${data.phase}: ${data.message}`);
                }

                // When all downloads complete, start conversion
                if (data.phase === 'all complete' && data.progress === 100) {
                    eventSource.close();
                    eventSourceRef.current = null;
                    startDataConversion();
                }
            } catch (err) {
                console.error('Error parsing download event:', err);
            }
        };

        eventSource.onerror = function(error) {
            console.error('Download event source error:', error);
            eventSource.close();
            eventSourceRef.current = null;
            setMessage('Error during download process');
        };
    };

    const downloadModelOnly = () => {
        // Reset progress display
        setProgress(0);
        setMessage('Starting model download...');

        const url = 'http://localhost:5000/api/download_model';

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.progress !== null) {
                    setProgress(data.progress);
                }
                if (data.phase && data.message) {
                    setMessage(`${data.phase}: ${data.message}`);
                }

                // When model download completes
                if ((data.phase === 'download complete' || data.phase === 'download skip') && data.progress === 100) {
                    eventSource.close();
                    eventSourceRef.current = null;

                    // Refresh file status
                    fetch('http://localhost:5000/api/check_data')
                        .then(response => response.json())
                        .then(result => {
                            updateFileStatusUI(result.combined_exists, result.model_exists);

                            // Check if we can now proceed with conversion
                            if (result.combined_exists && result.model_exists) {
                                setMessage('Model download complete. Ready for conversion.');
                                if (window.confirm('Model download complete. Start data conversion now?')) {
                                    startDataConversion();
                                }
                            }
                        });
                }
            } catch (err) {
                console.error('Error parsing model download event:', err);
            }
        };

        eventSource.onerror = function(error) {
            console.error('Model download event source error:', error);
            eventSource.close();
            eventSourceRef.current = null;
            setMessage('Error during model download');
        };
    };

    const startDataConversion = () => {
        setMessage('Starting conversion process...');

        const url = 'http://localhost:5000/api/convert_data';

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.progress !== null) {
                    setProgress(data.progress);
                }
                if (data.phase && data.message) {
                    setMessage(`${data.phase}: ${data.message}`);
                }

                // When conversion completes
                if ((data.phase === 'complete' || data.phase === 'done') && data.progress === 100) {
                    // Set the DATA_SETUP flag to true
                    fetch('http://localhost:5000/api/set_data_setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data_setup: true })
                    })
                        .then(response => response.json())
                        .then(result => {
                            console.log('DATA_SETUP updated:', result);
                        })
                        .catch(err => {
                            console.error('Error updating DATA_SETUP:', err);
                        });

                    setTimeout(() => {
                        eventSource.close();
                        eventSourceRef.current = null;
                        onComplete(); // Inform parent component that setup is complete
                    }, 500);
                }
            } catch (err) {
                console.error('Error parsing conversion event:', err);
            }
        };

        eventSource.onerror = function(error) {
            console.error('Conversion event source error:', error);
            eventSource.close();
            eventSourceRef.current = null;
            setMessage('Error during conversion process');
        };
    };

    return (
        <div id="downloadOverlay" style={{ display: 'flex' }}>
            <div id="overlayContent">
                <div id="filesStatus">{fileStatus}</div>
                <h2>Data Download & Conversion</h2>
                <p id="downloadMessage">{message}</p>
                <progress id="firstProgressBar" value={progress} max="100"></progress>
                <p id="progressText">{progress}%</p>
                <div className="button-container">
                    <button id="startDownloadBtn" onClick={startFullDownload}>
                        Start All Downloads
                    </button>
                    <button id="downloadModelBtn" onClick={downloadModelOnly}>
                        Download Model Only
                    </button>
                </div>
            </div>
        </div>
    );
};