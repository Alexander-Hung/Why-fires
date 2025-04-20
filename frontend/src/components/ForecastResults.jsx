import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export const ForecastResults = ({ annualCounts, probabilities }) => {
    const annualCountsRef = useRef(null);
    const forecastContainerRef = useRef(null);

    // Render annual counts chart
    useEffect(() => {
        if (annualCountsRef.current && annualCounts && Object.keys(annualCounts).length > 0) {
            const trace = {
                x: Object.keys(annualCounts),
                y: Object.values(annualCounts),
                type: 'bar'
            };

            const layout = {
                title: 'Annual Fire Counts',
                xaxis: { title: 'Year' },
                yaxis: { title: 'Number of Fires' },
                paper_bgcolor: '#333',
                plot_bgcolor: '#333',
                font: { color: 'white' }
            };

            Plotly.newPlot(annualCountsRef.current, [trace], layout);
        }
    }, [annualCounts]);

    // Create forecast calendar view
    useEffect(() => {
        if (forecastContainerRef.current && probabilities && probabilities.length > 0) {
            displayForecastCalendar();
        }
    }, [probabilities]);

    const displayForecastCalendar = () => {
        const container = forecastContainerRef.current;
        container.innerHTML = ''; // Clear any existing content

        if (!probabilities || !probabilities.length) {
            container.textContent = 'No forecast available';
            return;
        }

        // Build a lookup mapping from date string to forecast probability
        const forecastMap = {};
        probabilities.forEach(item => {
            forecastMap[item.date] = item.fire_probability;
        });

        // Ensure dates are interpreted in local time
        const forecastStart = new Date(probabilities[0].date + "T00:00:00");
        const forecastEnd = new Date(probabilities[probabilities.length - 1].date + "T00:00:00");

        // Compute grid boundaries for a complete week view
        const gridStart = new Date(forecastStart);
        gridStart.setDate(gridStart.getDate() - gridStart.getDay());

        const gridEnd = new Date(forecastEnd);
        gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

        // Create calendar table and header
        const table = document.createElement('table');
        table.className = 'calendar-table';

        const headerRow = document.createElement('tr');
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const th = document.createElement('th');
            th.textContent = day;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Create calendar cells
        let current = new Date(gridStart);
        let row = document.createElement('tr');
        let colCount = 0;

        while (current <= gridEnd) {
            const cell = document.createElement('td');

            // Format date as YYYY-MM-DD
            const year = current.getFullYear();
            let month = current.getMonth() + 1;
            let day = current.getDate();
            month = (month < 10 ? '0' : '') + month;
            day = (day < 10 ? '0' : '') + day;
            const formattedDate = `${year}-${month}-${day}`;

            // Check if date is within forecast range
            if (current >= forecastStart && current <= forecastEnd) {
                let cellContent = `<div class="date-number">${formattedDate}</div>`;
                if (forecastMap[formattedDate] !== undefined) {
                    cellContent += `<div class="forecast-probability">Probability: ${forecastMap[formattedDate].toFixed(2)}%</div>`;
                } else {
                    cellContent += `<div class="forecast-probability">No data</div>`;
                }
                cell.innerHTML = cellContent;
            } else {
                // Empty cell for dates outside range
                cell.className = 'empty-cell';
            }

            row.appendChild(cell);
            colCount++;

            // Start a new row after 7 cells
            if (colCount === 7) {
                table.appendChild(row);
                row = document.createElement('tr');
                colCount = 0;
            }

            // Move to next day
            current.setDate(current.getDate() + 1);
        }

        // Add the final row if it has cells
        if (colCount > 0) {
            table.appendChild(row);
        }

        // Add table to container
        container.appendChild(table);
    };

    return (
        <>
            {/* Top-left cell: Forecast Probabilities */}
            <div className="Column" id="forecastContainer" ref={forecastContainerRef}>
                {!probabilities || probabilities.length === 0 ? 'No forecast data available' : ''}
            </div>

            {/* Top-right cell (blank) */}
            <div className="Column" id="blankTopRight"></div>

            {/* Bottom-left cell: Annual Counts */}
            <div className="Column" id="annualCounts" ref={annualCountsRef}>
                {!annualCounts || Object.keys(annualCounts).length === 0 ? 'No annual count data available' : ''}
            </div>

            {/* Bottom-right cell (blank) */}
            <div className="Column" id="blankBottomRight"></div>
        </>
    );
};