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
  const url = `http://localhost:5000/api/countries?year=${year}`;

  //console.log('Fetching countries from:', url);

  fetch(url)
      .then(response => response.json())
      .then(data => {
        //console.log('Countries fetched:', data);

        const countrySelect = document.getElementById('countryFilter');
        countrySelect.innerHTML = '<option value="">Select Country</option>';

        if (data.countries && data.countries.length > 0) {
          data.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
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
  const satellite = record.satellite || 'unknown';
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
    <i style="color: darkgray;">Taken by Satellite ${satellite}</i>
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
const sidebar = document.querySelector('.sidebar');
const sidebarFooter = document.querySelector('.sidebar-footer');

toggleBtn.addEventListener('click', () => {
  toggleBtn.classList.toggle('is-closed');
  sidebar.classList.toggle('is-closed');
  sidebarFooter.classList.toggle('is-closed');
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

// Start the forecast streaming by creating an EventSource connection.
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
        // Update progress bar
        document.getElementById("progressBar").value = data.progress;
        document.getElementById("progressDisplay").textContent = `${data.progress}%`;
        document.getElementById("phaseDisplay").textContent = `${data.phase}: `;
      }
      // When final results are sent, they include annual_fire_counts and probabilities.
      if (data.progress === 100 && data.annual_fire_counts && data.probabilities) {
        displayForecastResults(data);
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

// Update the UI with final forecast results.
function displayForecastResults(result) {
  // Update the annual fire counts display.
  const annualCountsContainer = document.getElementById("annualCounts");
  annualCountsContainer.innerHTML = ""; // Clear previous content.
  for (const [year, count] of Object.entries(result.annual_fire_counts)) {
    const p = document.createElement("p");
    p.textContent = `Year ${year}: ${count} fires`;
    annualCountsContainer.appendChild(p);
  }

  // Update the forecast probabilities display.
  const forecastContainer = document.getElementById("forecastContainer");
  forecastContainer.innerHTML = ""; // Clear previous content.
  result.probabilities.forEach(item => {
    const p = document.createElement("p");
    p.textContent = `${item.date}: ${item.fire_probability.toFixed(2)}% probability`;
    forecastContainer.appendChild(p);
  });
}

// Attach a click listener to the forecast button.
document.getElementById("forecastButton").addEventListener("click", function() {
  // Gather inputs from the UI.
  const country_name = document.getElementById("countryFilter").value;
  const map_key = document.getElementById("mapKeyInput").value;
  const days = document.getElementById("daysInput").value;
  const periods = document.getElementById("periodsInput").value;
  const start_date = document.getElementById("startDateInput").value;

  // Build the payload.
  const payload = { country_name, map_key, days, start_date, periods };

  // Clear previous results and reset the progress bar.
  document.getElementById("progressBar").value = 0;
  document.getElementById("annualCounts").innerHTML = "";
  document.getElementById("forecastContainer").innerHTML = "";

  // Start the SSE connection to stream progress and results.
  startForecastStream(payload);
});

/**************************************************/
