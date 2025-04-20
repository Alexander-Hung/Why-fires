/**************************************************/
/*                WHY-FIRES.JS (Updated)          */
/**************************************************/

let mousePosition = { x: 0, y: 0 };

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

const monthText = {
  0: 'All Months',
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December'
};

let countriesData = null;

fetch('http://localhost:5000/api/countriesMeta')
    .then(response => response.json())
    .then(json => {
      countriesData = json;
      //console.log('Loaded country lat/lon and zoom data:', countriesData);
    })
    .catch(err => {
      console.error('Error loading countries.json:', err);
    });

let currentData = [];

document.addEventListener('mousemove', (event) => {
  mousePosition.x = event.clientX;
  mousePosition.y = event.clientY;
});

document.addEventListener('DOMContentLoaded', function() {
  const yearSlider = document.getElementById('yearSlider');
  const yearDisplay = document.getElementById('yearDisplay');
  yearDisplay.textContent = yearSlider.value;

  // Fetch countries for the default year
  fetchCountries(yearSlider.value);

  // Update date range
  updateDateRange();

  // Load default data
  loadData();
});

/**************************************************/
/*                 EVENT HANDLERS                 */
/**************************************************/
document.getElementById('yearSlider').addEventListener('input', function() {
  const year = this.value;
  document.getElementById('yearDisplay').textContent = year;
  fetchCountries(year);
});

document.getElementById('yearSlider').addEventListener('change', loadData);
document.getElementById('monthSlider').addEventListener('input', function() {
  const month = this.value;
  document.getElementById('monthDisplay').textContent = monthText[month];
  updateDateRange();
});
document.getElementById('monthSlider').addEventListener('change', loadData);
document.getElementById('dateFilter').addEventListener('change', loadData);

document.getElementById('typeDay').addEventListener('change', applyFrontEndFilters);
document.getElementById('typeNight').addEventListener('change', applyFrontEndFilters);
document.getElementById('typePVF').addEventListener('change', applyFrontEndFilters);
document.getElementById('typeOSLS').addEventListener('change', applyFrontEndFilters);
document.getElementById('typeO').addEventListener('change', applyFrontEndFilters);
document.getElementById('typeAV').addEventListener('change', applyFrontEndFilters);

document.getElementById('countryFilter').addEventListener('change', loadData);

/**************************************************/
/*               FETCHING COUNTRIES               */
/**************************************************/
function fetchCountries(year) {
  const countrySelect = document.getElementById('countryFilter');
  // Store the current selected country
  const currentSelected = countrySelect.value;

  const url = `http://localhost:5000/api/countries?year=${year}`;
  fetch(url)
      .then(response => response.json())
      .then(data => {
        // Clear the select element and add the default option
        countrySelect.innerHTML = '<option value="">Select Country</option>';

        if (data.countries && data.countries.length > 0) {
          data.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            // Re-select the option if it was previously selected
            if (country === currentSelected) {
              option.selected = true;
            }
            countrySelect.appendChild(option);
          });
        }
      })
      .catch(error => console.error('Error fetching countries:', error));
}


/**************************************************/
/*                  LOAD DATA                     */
/**************************************************/
function loadData() {
  const year = document.getElementById('yearSlider').value;
  const rawCountry = document.getElementById('countryFilter').value;

  if (!year || !rawCountry) {
    console.log("Year or country not selected yet");
    create2DMap();
    return;
  }

  // Transform country: spaces -> underscores
  const country = rawCountry.replace(/\s/g, '_');

  const url = `http://localhost:5000/api/data?year=${year}&country=${encodeURIComponent(country)}`;

  //console.log('Fetching data from:', url);

  fetch(url)
      .then(response => response.json())
      .then(data => {
        //console.log('Data fetched:', data);

        if (data.error) {
          console.error(data.error);
          updateDataCount(0);
          clearMap();
          openDetailContainer("No data found for this selection.");
          return;
        }

        currentData = data;
        const filteredData = applyFrontEndFilters();
        updateDataCount(filteredData.length);
        create2DMap(filteredData);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
}

/**************************************************/
/*         FRONT-END FILTERS (OPTIONAL)           */
/**************************************************/
function applyFrontEndFilters() {
  if (!currentData || currentData.length === 0) {
    return [];
  }
  let filteredData = [...currentData];

  // Day/Night
  const typeDay = document.getElementById('typeDay').checked;
  const typeNight = document.getElementById('typeNight').checked;
  if (!typeDay || !typeNight) {
    filteredData = filteredData.filter(d => {
      if (typeDay && d.daynight === 'D') return true;
      if (typeNight && d.daynight === 'N') return true;
      return false;
    });
  }

  // Fire types
  const typePVF = document.getElementById('typePVF').checked;
  const typeOSLS = document.getElementById('typeOSLS').checked;
  const typeO = document.getElementById('typeO').checked;
  const typeAV = document.getElementById('typeAV').checked;
  if (!typePVF || !typeOSLS || !typeO || !typeAV) {
    filteredData = filteredData.filter(d => {
      if (typePVF && d.type === 0) return true;
      if (typeOSLS && d.type === 2) return true;
      if (typeO && d.type === 3) return true;
      if (typeAV && d.type === 1) return true;
      return false;
    });
  }

  // Month slider
  const monthFilter = document.getElementById('monthSlider').value;
  if (monthFilter !== "0") {
    filteredData = filteredData.filter(d => {
      const month = new Date(d.acq_date).getMonth() + 1;
      return month.toString() === monthFilter;
    });
  }

  // Single date filter
  const dateFilter = document.getElementById('dateFilter').value;
  if (dateFilter) {
    filteredData = filteredData.filter(d => d.acq_date === dateFilter);
  }

  //console.log('Filtered data:', filteredData);

  create2DMap(filteredData);
  updateDataCount(filteredData.length);
  return filteredData;
}

/**************************************************/
/*             SETUP DATE RANGE SLIDER            */
/**************************************************/
function updateDateRange() {
  const year = document.getElementById('yearSlider').value;
  const month = document.getElementById('monthSlider').value;

  let minDate, maxDate;
  if (month === "0") { // This indicates a year-wide range
    minDate = `${year}-01-01`;
    maxDate = `${year}-12-31`;
  } else {
    const daysInMonth = new Date(year, month, 0).getDate();
    minDate = `${year}-${String(month).padStart(2, '0')}-01`;
    maxDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    document.getElementById('monthDisplay').textContent = monthText[month];
  }

  // Update the date range of the dateFilter element
  const dateFilterEl = document.getElementById('dateFilter');
  dateFilterEl.setAttribute('min', minDate);
  dateFilterEl.setAttribute('max', maxDate);
}

// Add an event listener to the yearSlider to trigger updateDateRange whenever it changes
document.getElementById('yearSlider').addEventListener('change', updateDateRange);

/**************************************************/
/*                CREATE MAP (2D)                 */
/**************************************************/
function create2DMap(data) {
  const container = document.getElementById('map2D');
  container.style.display = 'block';

  const selectedCountry = document.getElementById('countryFilter').value;

  // Decide map center and zoom.
  let mapCenter = { lat: 20, lon: 0 };
  let mapZoom = 2;

  if (countriesData && selectedCountry && countriesData.countriesLonLat[selectedCountry]) {
    // 1) Get lat/lon from the JSON
    mapCenter = {
      lat: countriesData.countriesLonLat[selectedCountry].lat,
      lon: countriesData.countriesLonLat[selectedCountry].lon
    };

    // 2) Get zoom from the JSON
    mapZoom = countriesData.countriesZoom[selectedCountry];
  }

  // Prepare layout and config for the map
  let layout, config;

  // We’ll define separate trace, layout, and config depending on data presence.
  if (!data || data.length === 0) {
    // ──────────────────────────────────────────────────────────
    // Case: No data
    // ──────────────────────────────────────────────────────────
    console.log("No data to plot. Displaying empty map.");

    // Create an empty trace for Plotly (this ensures the map still renders)
    const emptyTrace = {
      type: 'scattermapbox',
      mode: 'markers',
      lat: [],
      lon: [],
      hoverinfo: 'none', // No hover info
      marker: {
        size: 1, // can be 0 or 1 to be invisible
        color: 'rgba(0,0,0,0)' // transparent
      },
      showlegend: false
    };

    layout = {
      autosize: true,
      mapbox: {
        style: 'carto-positron',
        center: mapCenter,
        zoom: mapZoom
      },
      margin: { l: 0, r: 0, b: 0, t: 0 }
    };

    config = {
      responsive: true,
      displayModeBar: false,
      mapboxAccessToken: 'YOUR_MAPBOX_ACCESS_TOKEN'
    };

    // Plot the empty trace
    Plotly.newPlot('map2D', [emptyTrace], layout, config);

    // Optionally, show a message in your detail container (or anywhere):
    openDetailContainer("No data to display for this selection.");

  } else {
    // ──────────────────────────────────────────────────────────
    // Case: We have data
    // ──────────────────────────────────────────────────────────

    // (Optional) compute your color scale, brightness, etc.
    let minBrightness = data.reduce((min, p) => p.brightness < min ? p.brightness : min, data[0].brightness);
    let maxBrightness = data.reduce((max, p) => p.brightness > max ? p.brightness : max, data[0].brightness);
    data.forEach(d => {
      if (d.brightness !== undefined) {
        const val = Number(d.brightness);
        if (val < minBrightness) minBrightness = val;
        if (val > maxBrightness) maxBrightness = val;
      }
    });
    if (minBrightness === Infinity || maxBrightness === -Infinity) {
      minBrightness = 0;
      maxBrightness = 100;
    }

    // color for each point
    const colors = data.map(d => brightnessToColor(d.brightness, minBrightness, maxBrightness));

    // (Optional) update color scale bar
    updateColorRangeBar(minBrightness, maxBrightness);

    const normalTrace = {
      type: 'scattermapbox',
      mode: 'markers',
      lat: data.map(d => d.latitude),
      lon: data.map(d => d.longitude),
      text: data.map(d => `${selectedCountry}(${d.latitude}, ${d.longitude}), ${d.brightness}K`),
      hoverinfo: 'text',
      customdata: data.map(d => ({
        // For /api/detail or your detail container
        latitude: d.latitude,
        longitude: d.longitude,
        acq_date: d.acq_date,
        acq_time: d.acq_time
      })),
      marker: {
        color: colors,
        size: 6,
        opacity: 0.8
      },
      showlegend: false
    };

    layout = {
      autosize: true,
      mapbox: {
        style: 'carto-positron',
        center: mapCenter,
        zoom: mapZoom
      },
      margin: { l: 0, r: 0, b: 0, t: 0 }
    };

    config = {
      responsive: true,
      displayModeBar: false,
      mapboxAccessToken: 'YOUR_MAPBOX_ACCESS_TOKEN'
    };

    // Now plot the real data
    Plotly.newPlot('map2D', [normalTrace], layout, config);

    // Add click event for details
    const map2D = document.getElementById('map2D');
    map2D.on('plotly_click', handleMapClick);

    // Show a default message
    openDetailContainer("Select a point to learn more about the wildfire.");
  }
}

/**************************************************/
/*          CONVERT BRIGHTNESS TO COLOR           */
/**************************************************/
function brightnessToColor(value, minVal, maxVal) {
  if (value === undefined) {
    return 'gray';
  }
  const hue = (1 - value / maxVal) * 150;
  return `hsl(${hue}, 100%, 50%)`;
}

/**************************************************/
/*          UPDATE COLOR RANGE BAR                */
/**************************************************/
function updateColorRangeBar(minValue, maxValue) {
  const gradientStart = brightnessToColor(minValue, minValue, maxValue);
  const gradientEnd = brightnessToColor(maxValue, minValue, maxValue);
  const colorRangeBar = document.getElementById('colorRangeBar');
  colorRangeBar.style.background = `linear-gradient(to top, ${gradientStart}, ${gradientEnd})`;

  const colorRangeRange = document.getElementById('colorRangeRange');
  colorRangeRange.innerHTML = `
    <div style="color: black">
      ${maxValue.toFixed(0)} K
      <br><br><br><br><br><br><br><br><br>
      ${minValue.toFixed(0)} K
    </div>
  `;
}

/**************************************************/
/*         HANDLE MAP CLICK - GET DETAIL          */
/**************************************************/
function handleMapClick(data) {
  const clickedPoint = data.points[0];
  if (!clickedPoint) return;

  const detailParams = clickedPoint.data.customdata[clickedPoint.pointIndex];
  if (!detailParams) return;

  const year = document.getElementById('yearSlider').value;
  let rawCountry = document.getElementById('countryFilter').value;
  rawCountry = rawCountry.replace(/\s/g, '_'); // convert spaces to underscores

  // Build the POST body to match your backend’s new logic
  const bodyData = {
    year: year,
    country: rawCountry,
    latitude: detailParams.latitude.toString(),
    longitude: detailParams.longitude.toString(),
    acq_date: detailParams.acq_date,            // no transformation needed
    acq_time: detailParams.acq_time.toString()  // or empty string if needed
  };

  //console.log('Detail request body:', bodyData);

  fetch('http://localhost:5000/api/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData)
  })
      .then(response => response.json())
      .then(detail => {
        //console.log('Detail fetched:', detail);

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
}

/**************************************************/
/*           BUILD HTML FOR DETAIL BOX            */
/**************************************************/
function buildDetailHTML(record) {
  const date = record.acq_date || 'unknown date';
  const time = record.acq_time || 'unknown time';
  const lat = record.latitude || 'unknown lat';
  const lon = record.longitude || 'unknown lon';
  const bright = record.brightness || 'N/A';
  const daynight = record.daynight ? dayNightMapping[record.daynight] : 'unknown';
  const typeDesc = typeMapping[record.type] || 'unknown';

  // If your data already has "HHMM" format, you can transform it if you want
  const formattedTime = formatTime(time);

  const country = document.getElementById('countryFilter').value;

  return `
    <div><h2><b>${country}</b></h2></div>
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
}

/**************************************************/
/*                 HELPER FUNCTIONS               */
/**************************************************/
function formatTime(timeVal) {
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
}

function updateDataCount(count) {
  document.getElementById('totalDataPoints').textContent = count;
}

function openDetailContainer(htmlContent) {
  const detailContainer = document.getElementById('detailContainer');
  const closeButton = document.getElementById('closeButton');
  const detailsBox = document.getElementById('detailBox');
  const detailsBoxText = document.getElementById('detailBoxText');

  detailContainer.style.display = "initial";
  closeButton.style.display = "initial";
  detailsBox.style.display = 'block';
  detailsBoxText.innerHTML = htmlContent;
}

function closeDetailContainer() {
  document.getElementById('detailContainer').style.display = "none";
}

function clearMap() {
  Plotly.purge('map2D');
}

/**************************************************/
/*          SIDEBAR AND MISCELLANEOUS            */
/**************************************************/
const toggleBtn = document.querySelector('.sidebar-toggle');
const rightToggleBtn = document.querySelector('.rightSidebar-toggle');
const rightSidebar = document.querySelector('.rightSidebar');
const sidebar = document.querySelector('.sidebar');
const sidebarFooter = document.querySelector('.sidebar-footer');
const colorRangeBar = document.querySelector('#colorRangeBar');
const colorRangeRange = document.querySelector('#colorRangeRange');

toggleBtn.addEventListener('click', () => {
  toggleBtn.classList.toggle('is-closed');
  sidebar.classList.toggle('is-closed');
  sidebarFooter.classList.toggle('is-closed');
});

rightToggleBtn.addEventListener('click', () => {
  rightToggleBtn.classList.toggle('is-open');
  rightSidebar.classList.toggle('is-open');

  colorRangeBar.classList.toggle('toggle-display');
  colorRangeRange.classList.toggle('toggle-display');
});

function expandContract() {
  const container = document.getElementById("expandContainer");
  container.classList.toggle('expanded');
  container.classList.toggle('collapsed');

  const content = document.getElementById("expandContract");
  content.classList.toggle('expanded');
  content.classList.toggle('collapsed');
}

function expandContract2() {
  const container = document.getElementById("expandContainer2");
  container.classList.toggle('expanded');
  container.classList.toggle('collapsed');

  const content = document.getElementById("expandContract2");
  content.classList.toggle('expanded');
  content.classList.toggle('collapsed');
}

function expandContract3() {
  const container = document.getElementById("expandContainer3");
  container.classList.toggle('expanded');
  container.classList.toggle('collapsed');

  const content = document.getElementById("expandContract3");
  content.classList.toggle('expanded');
  content.classList.toggle('collapsed');
}

/**************************************************/
/*          PREDICTION BOX            */
/**************************************************/

function startForecastStream(payload) {
  // Build query string from payload parameters.
  // (Since EventSource only supports GET, we send parameters as query strings.)
  const urlParams = new URLSearchParams({
    country_name: payload.country_name,
    map_key: payload.map_key,
    days: payload.days,
    start_date: payload.start_date,
    periods: payload.periods
  });
  const url = `http://localhost:5000/api/forecast_stream?${urlParams.toString()}`;
  console.log("Opening EventSource to:", url);

  // Create EventSource connection.
  const eventSource = new EventSource(url);

  eventSource.onmessage = function(event) {
    // Each message from the backend is a JSON string.
    console.log("Received SSE message:", event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.progress !== undefined) {
        // Update the progress overlay elements
        document.getElementById("progressBar").value = data.progress;
        document.getElementById("progressDisplay").textContent = `${data.progress}%`;
        document.getElementById("phaseDisplay").textContent = `${data.phase}: `;
      }
      // When final results are sent, hide the progress overlay and show ML results.
      if (data.progress === 100 && data.annual_fire_counts && data.probabilities) {
        // Hide the progress overlay
        document.getElementById("progressOverlay").style.display = "none";
        // Reveal the results container
        document.getElementById("mlResults").style.display = "grid";

        // Display the forecast results using your existing functions
        displayAnnualCounts(data.annual_fire_counts);
        displayForecastCalendar(data.probabilities);
        eventSource.close(); // Close the SSE connection once complete.
      }
    } catch (err) {
      console.error("Error parsing SSE message:", err);
    }
  };

  eventSource.onerror = function(error) {
    console.error("SSE connection error:", error);
    eventSource.close();
  };
}

function displayAnnualCounts(annualCounts) {
  const trace = {
    x: Object.keys(annualCounts),
    y: Object.values(annualCounts),
    type: 'bar'
  };

  const layout = {
    title: 'Annual Fire Counts',
    xaxis: { title: 'Year' },
    yaxis: { title: 'Number of Fires' }
  };

  Plotly.newPlot('annualCounts', [trace], layout);
}

function displayForecastCalendar(probabilities) {
  const container = document.getElementById('forecastContainer');
  container.innerHTML = ''; // Clear any existing content

  if (!probabilities.length) {
    container.textContent = 'No forecast available';
    return;
  }

  // Build a lookup mapping from date string ("YYYY-MM-DD") to forecast probability.
  const forecastMap = {};
  probabilities.forEach(item => {
    forecastMap[item.date] = item.fire_probability;
  });

  // IMPORTANT: Append "T00:00:00" to ensure the date string is interpreted in local time.
  const forecastStart = new Date(probabilities[0].date + "T00:00:00");
  const forecastEnd   = new Date(probabilities[probabilities.length - 1].date + "T00:00:00");

  // Compute the grid boundaries:
  //   Grid start: Sunday of the week containing forecastStart.
  //   Grid end: Saturday of the week containing forecastEnd.
  const gridStart = new Date(forecastStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(forecastEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  // Create the calendar table and header row.
  const table = document.createElement('table');
  table.className = 'calendar-table';

  const headerRow = document.createElement('tr');
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    const th = document.createElement('th');
    th.textContent = day;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Loop from gridStart to gridEnd (inclusive) one day at a time.
  let current = new Date(gridStart);
  let row = document.createElement('tr');
  let colCount = 0;

  while (current <= gridEnd) {
    const cell = document.createElement('td');

    // Format the date as "YYYY-MM-DD"
    const year = current.getFullYear();
    let month = current.getMonth() + 1; // months are zero-indexed
    let day = current.getDate();
    month = (month < 10 ? '0' : '') + month;
    day   = (day < 10   ? '0' : '') + day;
    const formattedDate = `${year}-${month}-${day}`;

    // If the current date is within the forecast range, show the data.
    if (current >= forecastStart && current <= forecastEnd) {
      let cellContent = `<div class="date-number">${formattedDate}</div>`;
      if (forecastMap[formattedDate] !== undefined) {
        cellContent += `<div class="forecast-probability">Probability: ${forecastMap[formattedDate].toFixed(2)}%</div>`;
      } else {
        cellContent += `<div class="forecast-probability">No data</div>`;
      }
      cell.innerHTML = cellContent;
    } else {
      // Dates outside the forecast range are rendered as empty cells.
      cell.className = 'empty-cell';
    }

    row.appendChild(cell);
    colCount++;

    // Once we've added 7 cells (a full week), append the row.
    if (colCount === 7) {
      table.appendChild(row);
      row = document.createElement('tr');
      colCount = 0;
    }

    // Move to the next day.
    current.setDate(current.getDate() + 1);
  }
  if (colCount > 0) {
    table.appendChild(row);
  }

  // Append the calendar table to the container.
  container.appendChild(table);

  // Evenly distribute the available container height among all table rows.
  const totalRows = table.rows.length;
  for (let i = 0; i < totalRows; i++) {
    table.rows[i].style.height = (100 / totalRows) + '%';
  }
}

document.getElementById("forecastButton").addEventListener("click", function() {
  // Gather inputs from the UI.
  const country_name = document.getElementById("countryFilter").value;
  const map_key = document.getElementById("mapKeyInput").value;
  const days = document.getElementById("daysInput").value;
  const periods = document.getElementById("periodsInput").value;
  const start_date = document.getElementById("startDateInput").value;

  // Validate required fields.
  let missingFields = [];
  if (!country_name) missingFields.push("Country");
  if (!map_key) missingFields.push("Map Key");
  if (!days) missingFields.push("Days");
  if (!periods) missingFields.push("Periods");
  if (!start_date) missingFields.push("Start Date");

  if (missingFields.length > 0) {
    alert("Please fill in the following fields: " + missingFields.join(", "));
    return; // Stop further execution if any required field is missing.
  }

  // Build the payload.
  const payload = { country_name, map_key, days, start_date, periods };

  // Clear previous results and reset the progress bar.
  document.getElementById("progressBar").value = 0;
  document.getElementById("annualCounts").innerHTML = "";
  document.getElementById("forecastContainer").innerHTML = "";

  // Show the progress overlay (since the forecast is starting).
  document.getElementById("progressOverlay").style.display = "flex";

  // Start the SSE connection to stream progress and results.
  startForecastStream(payload);

  // Check if the right sidebar is already open.
  if (!rightSidebar.classList.contains("is-open")) {
    rightToggleBtn.classList.toggle("is-open");
    rightSidebar.classList.toggle("is-open");
  } else {
    // If the right sidebar is already open, ensure that the color range elements remain hidden.
    colorRangeBar.classList.add('toggle-display');
    colorRangeRange.classList.add('toggle-display');
  }
});


// -----------------------------
// Check Data Availability
// -----------------------------
function checkData() {
  // First, check the data setup flag.
  fetch('http://localhost:5000/api/data_setup')
      .then(response => response.json())
      .then(result => {
        if (result.data_setup === true) {
          // The DATA_SETUP flag is true, so we assume data is already set up.
          document.getElementById("downloadOverlay").style.display = "none";
        } else {
          // DATA_SETUP is false, so run the regular check.
          fetch('http://localhost:5000/api/check_data')
              .then(response => response.json())
              .then(result => {
                // If modis data exists, no need to show overlay.
                if (result.modis_exists) {
                  document.getElementById("downloadOverlay").style.display = "none";
                } else {
                  document.getElementById("downloadOverlay").style.display = "flex";

                  // Update UI to show status of parquet and model files
                  updateFileStatusUI(result.combined_exists, result.model_exists);
                }
              })
              .catch(err => {
                console.error("Error checking data:", err);
                document.getElementById("downloadOverlay").style.display = "flex";
              });
        }
      })
      .catch(err => {
        console.error("Error checking data setup:", err);
        document.getElementById("downloadOverlay").style.display = "flex";
      });
}

// Update UI based on file availability
function updateFileStatusUI(parquetExists, modelExists) {
  const statusElement = document.getElementById("filesStatus");
  if (!statusElement) return;

  let statusText = "";
  if (parquetExists && modelExists) {
    statusText = "All files are available, but conversion is needed.";
  } else if (parquetExists) {
    statusText = "Dataset file is available. Model file needs to be downloaded.";
  } else if (modelExists) {
    statusText = "Model file is available. Dataset file needs to be downloaded.";
  } else {
    statusText = "Both dataset and model files need to be downloaded.";
  }

  statusElement.textContent = statusText;
}

document.addEventListener('DOMContentLoaded', function() {
  checkData();
});

// -----------------------------
// Download All Data via /api/download_all
// -----------------------------
function startDownload() {
  const progressElem = document.getElementById("firstProgressBar");
  const textElem = document.getElementById("progressText");
  const messageElem = document.getElementById("downloadMessage");

  const url = 'http://localhost:5000/api/download_all';
  console.log("Starting downloads via:", url);
  const eventSource = new EventSource(url);

  eventSource.onmessage = function(event) {
    console.log("Download SSE:", event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.progress !== null) {
        progressElem.value = data.progress;
        textElem.textContent = data.progress + "%";
      }
      if (data.phase) {
        messageElem.textContent = data.phase + ": " + data.message;
      }

      // When both downloads complete, trigger conversion
      if (data.phase === "all complete" && data.progress === 100) {
        eventSource.close();
        startConversion();
      }
      // Handle individual file downloads completing
      else if ((data.phase === "download parquet complete" ||
              data.phase === "download model complete") &&
          data.progress === 100) {
        // Continue listening for next file download events
        // The eventSource will be closed when "all complete" is received
      }
      // Handle download skips
      else if (data.phase === "download skip" && data.progress === 100) {
        // Just update message but continue listening
      }
    } catch (err) {
      console.error("Error parsing download SSE:", err);
    }
  };

  eventSource.onerror = function(error) {
    console.error("Download SSE error:", error);
    eventSource.close();
    alert("An error occurred during download.");
  };
}

// -----------------------------
// Convert Data via /api/convert_data
// -----------------------------
function startConversion() {
  const progressElem = document.getElementById("firstProgressBar");
  const textElem = document.getElementById("progressText");
  const messageElem = document.getElementById("downloadMessage");

  const url = 'http://localhost:5000/api/convert_data';
  console.log("Starting conversion via:", url);
  const eventSource = new EventSource(url);

  eventSource.onmessage = function(event) {
    console.log("Conversion SSE:", event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.progress !== null) {
        progressElem.value = data.progress;
        textElem.textContent = data.progress + "%";
      }
      if (data.phase) {
        messageElem.textContent = data.phase + ": " + data.message;
      }
      // When conversion completes, send a flag to the backend and then hide overlay.
      if ((data.phase === "complete" || data.phase === "done") && data.progress === 100) {
        // Send a POST request to set the DATA_SETUP flag to true.
        fetch("http://localhost:5000/api/set_data_setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data_setup: true })
        })
            .then(response => response.json())
            .then(result => {
              console.log("DATA_SETUP updated:", result);
            })
            .catch(err => {
              console.error("Error updating DATA_SETUP:", err);
            });
        setTimeout(() => {
          document.getElementById("downloadOverlay").style.display = "none";
        }, 500);
        eventSource.close();
      }
    } catch (err) {
      console.error("Error parsing conversion SSE:", err);
    }
  };

  eventSource.onerror = function(error) {
    console.error("Conversion SSE error:", error);
    eventSource.close();
    alert("An error occurred during conversion.");
  };
}

// -----------------------------
// Start chain when user clicks the download button.
// -----------------------------
document.getElementById("startDownloadBtn").addEventListener("click", function() {
  // Reset progress display
  document.getElementById("firstProgressBar").value = 0;
  document.getElementById("progressText").textContent = "0%";
  document.getElementById("downloadMessage").textContent = "Starting downloads...";
  // Start the chain: download both files -> conversion.
  startDownload();
});

// -----------------------------
// Model-only download function
// -----------------------------
document.getElementById("downloadModelBtn").addEventListener("click", function() {
  // Reset progress display
  document.getElementById("firstProgressBar").value = 0;
  document.getElementById("progressText").textContent = "0%";
  document.getElementById("downloadMessage").textContent = "Starting model download...";

  const progressElem = document.getElementById("firstProgressBar");
  const textElem = document.getElementById("progressText");
  const messageElem = document.getElementById("downloadMessage");

  const url = 'http://localhost:5000/api/download_model';
  console.log("Starting model download via:", url);
  const eventSource = new EventSource(url);

  eventSource.onmessage = function(event) {
    console.log("Model Download SSE:", event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.progress !== null) {
        progressElem.value = data.progress;
        textElem.textContent = data.progress + "%";
      }
      if (data.phase) {
        messageElem.textContent = data.phase + ": " + data.message;
      }
      if ((data.phase === "download complete" || data.phase === "download skip") && data.progress === 100) {
        eventSource.close();
        // Refresh file status after download
        fetch('http://localhost:5000/api/check_data')
            .then(response => response.json())
            .then(result => {
              updateFileStatusUI(result.combined_exists, result.model_exists);

              // Check if we can now proceed with conversion (if both files exist)
              if (result.combined_exists && result.model_exists) {
                setTimeout(() => {
                  messageElem.textContent = "Model download complete. Ready for conversion.";
                  if (confirm("Model download complete. Start data conversion now?")) {
                    startConversion();
                  }
                }, 500);
              }
            });
      }
    } catch (err) {
      console.error("Error parsing model download SSE:", err);
    }
  };

  eventSource.onerror = function(error) {
    console.error("Model download SSE error:", error);
    eventSource.close();
    alert("An error occurred during model download.");
  };
});