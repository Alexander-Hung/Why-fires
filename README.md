# Wildfire Forecasting (Why-Fires)

A full-stack application that uses NASA FIRMS MODIS data and GADM boundary data to visualize and forecast wildfire occurrences across different countries. This project leverages:
- **Flask** (Python) for the backend
- **Node.js** / plain JS (and Plotly on the client) for the frontend
- **Statsmodels** SARIMA for time series forecasting
- **Pandas**, **Numpy** for data manipulation

## Table of Contents
1. [Features](#features)
2. [Data Sources](#data-sources)
3. [Requirements](#requirements)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
8. [API](#api)
9. [License](#license)

---

## Features
- **Historical Data Visualization**: Aggregated MODIS active fire data rendered on an interactive 2D map with Plotly.
- **Filtering**: Filter by year, month, exact date, and day/night or type of fire.
- **ML/Forecast**: Predict daily fire probability for a specified number of days using a SARIMA model. Progress is streamed to the frontend via Server-Sent Events (SSE).
- **Detail View**: Click a point on the map to see more info (e.g., brightness, satellite, etc.).

---

## Data Sources
1. **FIRMS NASA**: Real-time or recent hotspot/fires data from [NASA’s FIRMS](https://firms.modaps.eosdis.nasa.gov/).
2. **MODIS**: Historical active fire data for various years (2001 onward).
3. **GADM**: For country boundaries or metadata (optional if needed).
4. **Countries Metadata**: The project references a `countries_code.csv` and `countries.json` for country abbreviations and lat/lon bounding boxes.

---

## Requirements
- **Python 3.8+** (recommended)
- [Node.js](https://nodejs.org/) (for frontend dev, if you’re bundling or running a separate dev server)
- See [requirements.txt](./backend/requirements.txt) for Python libraries.

---

## Installation

1. **Clone this repository**:
    ```bash
    git clone https://github.com/your-username/why-fires.git
    cd why-fires
    ```

2. **Create and activate a virtual environment** (recommended):
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
    On Windows:
    ```cmd
    python -m venv venv
    venv\Scripts\activate
    ```

3. **Install dependencies**:

Run ```setup(Linux Mac).sh``` or ```setup(Windows).bat```
     
OR
   
    cd backend
    pip install -r requirements.txt
    
    cd frontend
    npm install

---

## Configuration

1. Copy the example `.env` from the repository (or create a new one) and set your secrets:
    ```bash
    cp .env.example .env
    ```
    Then fill in:
    ```
    FLASK_ENV=development
    NASA_FIRMS_API_KEY=YourNasaKey
    MAPBOX_ACCESS_TOKEN=YourMapboxToken
    ```

2. Do not edit or delete any files in data folder
---

## Usage

Run ```run(Linux Mac).sh``` or ```run(Windows).bat```

OR

```
cd backend
python app.py

cd frontend
node app.js
```
---

## Api
backend site for testing: http://localhost:5000/

### 1. `/api/forecast_stream` (GET)
**Description:**  
This endpoint performs fire occurrence forecasting for a given country using historical MODIS data and recent FIRMS data. It streams progress updates using **Server-Sent Events (SSE)**.

#### Query Parameters  
| Parameter      | Type   | Description |
|---------------|--------|-------------|
| `country_name` | string | Name of the country (e.g., "Australia") |
| `map_key`      | string | API key for accessing FIRMS data |
| `days`         | int    | Number of recent days to consider for forecasting |
| `start_date`   | string | Start date for the forecast (YYYY-MM-DD) |
| `periods`      | int    | Number of days to forecast |

#### Response  
- **Streams progress updates** in the form of JSON objects:
  - `progress`: Progress percentage (0-100)
  - `phase`: `"loading"` (data loading) or `"forecasting"` (model prediction)
  - `message`: Current status message
- **Final response includes:**
  - `annual_fire_counts`: Historical fire counts per year
  - `probabilities`: List of predicted fire probabilities per forecast day

---

### 2. `/api/convert_parquet` (GET)
**Description:**  
Converts a large **Parquet** file back into individual **CSV** files while **throttling CPU and memory usage**. Streams progress updates using **Server-Sent Events (SSE)**.

#### Query Parameters (Optional)  
| Parameter       | Type   | Default Value      | Description |
|---------------|--------|------------------|-------------|
| `parquet_file` | string | `combined.parquet` | Path to the Parquet file to be converted |
| `output_dir`   | string | `recovered_csv` | Output directory for recovered CSV files |

#### Response  
- **Streams JSON progress updates**:
  - `progress`: Percentage (0-100)
  - `phase`: `"starting"`, `"converting"`, `"waiting for CPU"`, `"waiting for memory"`, `"done"`
  - `message`: Status message (e.g., "Processed row group 3 of 10")
- **Final response**: `"Conversion complete"`

---

### 3. `/api/data` (GET)
**Description:**  
Retrieves all fire occurrence data for a selected **year** and **country**.

#### Query Parameters  
| Parameter  | Type   | Description |
|-----------|--------|-------------|
| `year`    | int    | The year for which data is requested |
| `country` | string | Country name (e.g., "Australia") |

#### Response  
- JSON list of fire records, each containing:
  - `latitude`
  - `longitude`
  - `brightness`
  - `acq_date`
  - `acq_time`
  - `daynight`
  - `type`
- **Error:** `{ "error": "Data not found" }` (if no data available)

---

### 4. `/api/detail` (POST)
**Description:**  
Retrieves detailed fire occurrence information for a **specific data point**.

#### Request Body (JSON)  
```json
{
  "year": "2024",
  "country": "Australia",
  "latitude": "-25.2744",
  "longitude": "133.7751",
  "acq_date": "2024-01-15",
  "acq_time": "1230"
}
```

#### Response  
- JSON list of matching fire records  
- **Error:** `"error"` if no match found

---

### 5. `/api/countries` (GET)
**Description:**  
Retrieves a list of **available countries** for a given **year**.

#### Query Parameters  
| Parameter | Type | Description |
|----------|------|-------------|
| `year`   | int  | The year for which countries should be listed |

#### Response  
```json
{
  "year": "2024",
  "countries": ["Australia", "Brazil", "USA"]
}
```
- **Error:** `{ "error": "Year not found" }` (if no data exists for that year)

---

### 6. `/api/countriesMeta` (GET)
**Description:**  
Returns metadata information about countries from `countries.json`.

#### Response  
- JSON data loaded from `countries.json`  
- **Error:** `{ "error": "countries.json not found" }`

---

### 7. `/` (Home Page)
**Description:**  
Serves the **frontend UI** from `index.html`. Used for rendering the website.

---

### How to Use the API

#### Real-time progress tracking (SSE-based requests):
Use `/api/forecast_stream` or `/api/convert_parquet`.
Example (JavaScript for SSE):
```js
const eventSource = new EventSource("http://localhost:5000/api/convert_parquet");
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Progress:", data.progress, "%");
};
```

#### Retrieving historical data:
- `/api/data?year=2024&country=Australia`

#### Retrieving country metadata:
- `/api/countriesMeta`

## License

---

---

## Questions / More Info
If you have any additional questions about environment variables, the data layout, or how to integrate the Node.js portion, feel free to let me know what else you need. Enjoy building your wildfire forecasting project!

