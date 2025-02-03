/**************************************************/
/*                WHY-FIRES.JS (Updated)          */
/**************************************************/

let mousePosition = { x: 0, y: 0 };

const typeMapping = {
  '0': 'Presumed Vegetation Fire',
  '1': 'Active Volcano',
  '2': 'Other Static Land Source',
  '3': 'Offshore'
};

const dayNightMapping = {
  'D': 'Daytime Fire',
  'N': 'Nighttime Fire'
};

const dayNightStyle = {
  'D': 'light',
  'N': 'dark'
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

// Example center/zoom for countries
const countriesCenterZoom = {
  'United_States': { center: { lat: 37.0902, lon: -95.7129 }, zoom: 4 },
  // Add more if needed, ensuring the country key matches your underscore usage
};

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

  console.log('Fetching countries from:', url);

  fetch(url)
      .then(response => response.json())
      .then(data => {
        console.log('Countries fetched:', data);

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
    return;
  }

  // Transform country: spaces -> underscores
  const country = rawCountry.replace(/\s/g, '_');

  const url = `http://localhost:5000/api/data?year=${year}&country=${encodeURIComponent(country)}`;

  console.log('Fetching data from:', url);

  fetch(url)
      .then(response => response.json())
      .then(data => {
        console.log('Data fetched:', data);

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
      if (typePVF && d.type === '0') return true;
      if (typeOSLS && d.type === '2') return true;
      if (typeO && d.type === '3') return true;
      if (typeAV && d.type === '1') return true;
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

  console.log('Filtered data:', filteredData);

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
  if (month === "0") {
    minDate = `${year}-01-01`;
    maxDate = `${year}-12-31`;
  } else {
    const daysInMonth = new Date(year, month, 0).getDate();
    minDate = `${year}-${String(month).padStart(2, '0')}-01`;
    maxDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    document.getElementById('monthDisplay').textContent = monthText[month];
  }

  const dateFilterEl = document.getElementById('dateFilter');
  dateFilterEl.setAttribute('min', minDate);
  dateFilterEl.setAttribute('max', maxDate);
}

/**************************************************/
/*                CREATE MAP (2D)                 */
/**************************************************/
function create2DMap(data) {
  if (!data || data.length === 0) {
    clearMap();
    return;
  }

  const container = document.getElementById('map2D');
  container.style.display = 'block';

  let minBrightness = Infinity;
  let maxBrightness = -Infinity;

  data.forEach(d => {
    if (d.bright_t31 !== undefined) {
      const val = Number(d.bright_t31);
      if (val < minBrightness) minBrightness = val;
      if (val > maxBrightness) maxBrightness = val;
    }
  });

  if (minBrightness === Infinity || maxBrightness === -Infinity) {
    minBrightness = 0;
    maxBrightness = 100;
  }

  const colors = data.map(d => brightnessToColor(d.bright_t31, minBrightness, maxBrightness));
  updateColorRangeBar(minBrightness, maxBrightness);

  const rawCountry = document.getElementById('countryFilter').value;
  const country = rawCountry.replace(/\s/g, '_'); // keep consistent
  let centerZoom = countriesCenterZoom[country] || { center: { lat: 20, lon: 0 }, zoom: 2 };

  let trace = [
    {
      type: 'scattermapbox',
      mode: 'markers',
      lat: data.map(d => d.latitude),
      lon: data.map(d => d.longitude),
      text: data.map(d => `Lat: ${d.latitude}, Lon: ${d.longitude}`),
      hoverinfo: 'text',
      // customdata will be used in the click event
      customdata: data.map(d => ({
        latitude: d.latitude,
        longitude: d.longitude,
        acq_date: d.acq_date,
        acq_time: d.acq_time
      })),
      marker: {
        color: colors,
        size: 12,
        opacity: 0.8
      },
      showlegend: false
    }
  ];

  let layout = {
    autosize: true,
    mapbox: {
      style: 'carto-positron',
      center: centerZoom.center,
      zoom: centerZoom.zoom
    },
    margin: { l: 0, r: 0, b: 0, t: 0, pad: 0 },
    paper_bgcolor: '#191A1A',
    plot_bgcolor: '#191A1A'
  };

  let config = {
    responsive: true,
    displayModeBar: false,
    // Put your own or a valid Mapbox access token here
    mapboxAccessToken: 'YOUR_MAPBOX_ACCESS_TOKEN'
  };

  Plotly.newPlot('map2D', trace, layout, config);

  const map2D = document.getElementById('map2D');
  map2D.on('plotly_click', handleMapClick);

  openDetailContainer("Select a point to learn more about the wildfire.");
}

/**************************************************/
/*          CONVERT BRIGHTNESS TO COLOR           */
/**************************************************/
function brightnessToColor(value, minVal, maxVal) {
  if (value === undefined) {
    return 'gray';
  }
  const numericVal = Number(value);
  const ratio = (numericVal - minVal) / (maxVal - minVal + 0.00001);
  const hue = (1 - ratio) * 240;
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
    <div>
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

  console.log('Detail request body:', bodyData);

  fetch('http://localhost:5000/api/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData)
  })
      .then(response => response.json())
      .then(detail => {
        console.log('Detail fetched:', detail);

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
  const bright = record.bright_t31 || 'N/A';
  const satellite = record.satellite || 'unknown';
  const daynight = record.daynight ? dayNightMapping[record.daynight] : 'unknown';
  const typeDesc = record.type ? (typeMapping[record.type] || 'Unknown') : 'Unknown';

  // If your data already has "HHMM" format, you can transform it if you want
  const formattedTime = formatTime(time);

  return `
    <div>
      <b style="font-size: 24px;">Details</b>
    </div>
    <br />
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
      <b>Brightness:</b> ${bright} K <br />
      <b>Type:</b> ${typeDesc}
    </div>
    <br />
    <i style="color: darkgray;">Taken by Satellite ${satellite}</i>
  `;
}

/**************************************************/
/*                 HELPER FUNCTIONS               */
/**************************************************/
function formatTime(timeStr) {
  if (typeof timeStr === 'string' && timeStr) {
    // e.g. '1305' -> '13:05'
    return timeStr.padStart(4, '0').replace(/^(..)(..)$/, '$1:$2');
  } else {
    return 'Time not available';
  }
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

const showNumInput = document.getElementById("showNumDataInput");
if (showNumInput) {
  showNumInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("showNumDataButton").click();
    }
  });
}
/**************************************************/
