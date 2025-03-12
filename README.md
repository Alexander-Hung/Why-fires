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

Run ```setup.sh```
     
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

2. Make sure your local `data/` folder has the correct structure and CSV files for historical data.
[Google Drive](https://drive.google.com/drive/folders/1AX0BtHdwVMQTwrJsA9uQmDjFmcP5Xzgw?usp=sharing)
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

- ```GET /api/data?year=XXXX&country=COUNTRY_NAME```
  - Returns JSON of fire points (latitude, longitude, brightness, etc.) for a specific year and country.
- ```POST /api/detail```
  - Returns detail about a specific data point (match by lat/lon/date/time).
- ```GET /api/countries?year=XXXX```
  - Lists all available countries for the given year (based on CSV files in data/processed/{year}/).
- ```GET /api/countriesMeta```
  - Returns metadata (countries.json) used for zoom/center in the map.
- ```GET /api/forecast_stream?country_name=...&map_key=...&days=...&start_date=...&periods=...```
  - SSE endpoint that streams forecasting progress and final prediction results.
 
## License

---

---

## Questions / More Info
If you have any additional questions about environment variables, the data layout, or how to integrate the Node.js portion, feel free to let me know what else you need. Enjoy building your wildfire forecasting project!

