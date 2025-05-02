
#### ✅ **Check Data Availability**
`GET /api/check_data`
- Verifies existence of required datasets (`combined.parquet`, CSV files in `data/modis`).

#### ⬇️ **Download Data**
`GET /api/download_data`
- Downloads `combined.parquet` from Cloudflare R2 if not already available locally.
- Streams progress updates via SSE.

#### 🔄 **Convert Parquet to CSV**
`GET /api/convert_data`
- Converts Parquet files to CSV in the `data/modis` directory.
- Streams real-time conversion progress via SSE.

#### 📈 **Forecast Fire Occurrences**
`GET /api/forecast_stream?country_name=...&map_key=...&days=...&start_date=...&periods=...`
- Forecasts wildfire occurrences using SARIMA based on historical MODIS data.
- Streams progress and results via SSE.

#### 📊 **Get Data for Specific Year and Country**
`GET /api/data?year=...&country=...`
- Retrieves wildfire incident details (latitude, longitude, brightness, date, time, etc.) for the specified year and country.

#### 🔎 **Get Detailed Data Point**
`POST /api/detail`
- Provides detailed information about a specific wildfire event, given year, country, latitude, longitude, acquisition date, and time.

#### 🌍 **List Available Countries**
`GET /api/countries?year=...`
- Lists all countries available for a specific year based on stored CSV files.

#### 🌐 **Countries Metadata**
`GET /api/countriesMeta`
- Returns metadata from `countries.json`.
