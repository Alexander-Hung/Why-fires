import pandas as pd
import os
import glob
import json
import numpy as np
import time
import psutil
import pyarrow.parquet as pq
import threading
import boto3
from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS, cross_origin
from statsmodels.tsa.statespace.sarimax import SARIMAX
from tqdm.auto import tqdm



app = Flask(__name__, template_folder='public')
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# -------------------------------
# R2 / S3 Configuration (for download endpoint)
# -------------------------------
ACCOUNT_ID = "53ccada8fa16739b20397e6113693cd0"
BUCKET_NAME = "fires"
CLIENT_ACCESS_KEY = "4c3e3dee1bc5d8d5b9a9c94bc55e2c5c"
CLIENT_SECRET = "3569eae5164d74e09093731e1cf1ea9e5f7b7fa7936d5d76383d15cf35bb97fd"
CONNECTION_URL = f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com"
FILE_KEY = "combined.parquet"  # File key in R2 bucket
LOCAL_PARQUET = "./combined.parquet"  # Local Parquet file path

s3 = boto3.client(
    "s3",
    endpoint_url=CONNECTION_URL,
    aws_access_key_id=CLIENT_ACCESS_KEY,
    aws_secret_access_key=CLIENT_SECRET
)


# -------------------------------
# Conversion generator (using your note code)
# -------------------------------
def convert_parquet_to_csv_stream(parquet_file_path, output_base):
    """
    Reads the Parquet file in row groups and converts each group to CSV files
    (grouped by the 'relative_path' column). Yields SSE-formatted JSON progress updates.
    """
    os.makedirs(output_base, exist_ok=True)
    pf = pq.ParquetFile(parquet_file_path)
    num_row_groups = pf.num_row_groups
    yield f"data: {json.dumps({'progress': 0, 'phase': 'converting', 'message': f'Number of row groups: {num_row_groups}'})}\n\n"

    for rg in range(num_row_groups):
        cpu_usage = psutil.cpu_percent(interval=0.1)
        if cpu_usage > 25:
            yield f"data: {json.dumps({'progress': None, 'phase': 'throttling', 'message': f'High CPU usage: {cpu_usage}%, sleeping 0.5 sec'})}\n\n"
            time.sleep(0.5)
        table = pf.read_row_group(rg)
        df_chunk = table.to_pandas()
        for rel_path, group in df_chunk.groupby('relative_path'):
            output_file = os.path.join(output_base, rel_path)
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            group_clean = group.drop(columns=['year', 'country', 'source_file', 'relative_path'])
            if os.path.exists(output_file):
                group_clean.to_csv(output_file, mode='a', header=False, index=False)
            else:
                group_clean.to_csv(output_file, mode='w', header=True, index=False)
            yield f"data: {json.dumps({'progress': None, 'phase': 'converting', 'message': f'Written chunk to: {output_file}'})}\n\n"
        progress = int((rg + 1) / num_row_groups * 100)
        yield f"data: {json.dumps({'progress': progress, 'phase': 'converting', 'message': f'Processed row group {rg + 1} of {num_row_groups}'})}\n\n"
        mem_usage_gb = psutil.virtual_memory().used / (1024 ** 3)
        if mem_usage_gb > 8:
            yield f"data: {json.dumps({'progress': progress, 'phase': 'throttling', 'message': f'High memory usage: {mem_usage_gb:.2f}GB, sleeping 1 sec'})}\n\n"
            time.sleep(1)
    yield f"data: {json.dumps({'progress': 100, 'phase': 'done', 'message': 'Conversion complete'})}\n\n"

# -------------------------------
# API endpoint: Check Processed Data
# -------------------------------
@app.route('/api/check_processed', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
def check_processed():
    """
    Checks if the processed data folder (./data/processed) exists and contains CSV files.
    Returns {"processed_ok": true} if CSV data is available; otherwise, false.
    """
    processed_dir = os.path.join('data', 'processed')
    if os.path.isdir(processed_dir):
        csv_files = []
        for root, dirs, files in os.walk(processed_dir):
            csv_files.extend([f for f in files if f.endswith('.csv')])
        if csv_files:
            return jsonify({"processed_ok": True})
    return jsonify({"processed_ok": False})


# -------------------------------
# API endpoint: Download Data from R2
# -------------------------------
@app.route('/api/download_data', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
def download_data():
    """
    Downloads the combined.parquet file from R2 if not already present.
    Streams progress updates as SSE messages.
    Query parameters:
      - drive_url: URL to download the Parquet file (default uses R2 settings)
      - parquet_file: Local filename (default: combined.parquet)
    """
    drive_url = request.args.get('drive_url', f"{CONNECTION_URL}/{BUCKET_NAME}/{FILE_KEY}")
    parquet_file = request.args.get('parquet_file', LOCAL_PARQUET)

    def generate():
        if os.path.exists(parquet_file):
            yield f"data: {json.dumps({'progress': 100, 'phase': 'download skip', 'message': 'combined.parquet already exists'})}\n\n"
            return

        yield f"data: {json.dumps({'progress': 0, 'phase': 'download', 'message': 'combined.parquet not found. Starting download.'})}\n\n"
        try:
            head = s3.head_object(Bucket=BUCKET_NAME, Key=FILE_KEY)
            total_length = head['ContentLength']
            progress_obj = {"transferred": 0, "total": total_length}
            download_error = [None]

            class ProgressPercentage:
                def __init__(self, progress):
                    self._progress = progress

                def __call__(self, bytes_amount):
                    self._progress["transferred"] += bytes_amount

            callback = ProgressPercentage(progress_obj)
            import threading
            def download():
                try:
                    s3.download_file(BUCKET_NAME, FILE_KEY, parquet_file, Callback=callback)
                except Exception as e:
                    download_error[0] = str(e)

            download_thread = threading.Thread(target=download)
            download_thread.start()
            while download_thread.is_alive():
                current_progress = int((progress_obj["transferred"] / progress_obj["total"]) * 100)
                yield f"data: {json.dumps({'progress': current_progress, 'phase': 'download', 'message': 'Downloading combined.parquet'})}\n\n"
                time.sleep(0.5)
            download_thread.join()
            if download_error[0]:
                yield f"data: {json.dumps({'progress': None, 'phase': 'error', 'message': 'Download error: ' + download_error[0]})}\n\n"
                return
            yield f"data: {json.dumps({'progress': 100, 'phase': 'download complete', 'message': 'Download complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'progress': None, 'phase': 'error', 'message': 'Download error: ' + str(e)})}\n\n"
            return

    return Response(generate(), mimetype='text/event-stream')

# -------------------------------
# API endpoint: Convert Data (Parquet -> CSV)
# -------------------------------
@app.route('/api/convert_data', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
def convert_data():
    """
    Converts the combined.parquet file into CSV files (using convert_parquet_to_csv_stream)
    if the processed folder (./data/processed) is missing or empty.
    Query parameters:
      - parquet_file: Local filename (default: combined.parquet)
      - output_dir: Directory for CSV output (default: data/modis)
    Streams progress updates as SSE messages.
    """
    parquet_file = request.args.get('parquet_file', LOCAL_PARQUET)
    output_dir = request.args.get('output_dir', os.path.join('data', 'modis'))

    def generate():
        # If processed data exists, no conversion is needed.
        if os.path.isdir(output_dir):
            csv_files = []
            for root, dirs, files in os.walk(output_dir):
                csv_files.extend([f for f in files if f.endswith('.csv')])
            if csv_files:
                yield f"data: {json.dumps({'progress': 100, 'phase': 'complete', 'message': 'Processed data already exists. No conversion needed.'})}\n\n"
                return

        # Otherwise, run conversion.
        yield f"data: {json.dumps({'progress': 0, 'phase': 'conversion', 'message': 'Starting conversion to CSV'})}\n\n"
        yield from convert_parquet_to_csv_stream(parquet_file, output_dir)

    return Response(generate(), mimetype='text/event-stream')

# ---------------------------------------------------
# New generator function for converting Parquet to CSV
# ---------------------------------------------------
def forecast_fire_occurrence_stream(country_name, base_dir, map_key, country_abbrev, days, start_date, periods):
    """
    Generator that performs the forecasting in stages and yields progress updates
    as SSE messages. At the end, it yields the final result.

    The total progress is computed over two phases:
      - Loading historical data: one iteration per year (2001-2024).
      - Forecasting: one iteration per forecast day.
    """
    # Define phases
    years = list(range(2001, 2025))
    total_years = len(years)
    total_steps = total_years + periods  # total steps for progress
    current_step = 0
    all_dfs = []

    # Phase 1: Load historical data
    for year in tqdm(years, desc="Loading data"):
        file_name = f"modis_{year}_{country_name.replace(' ', '_')}.csv"
        file_path = os.path.join(base_dir, str(year), file_name)
        if os.path.exists(file_path):
            df_year = pd.read_csv(file_path)
            all_dfs.append(df_year)
        else:
            print(f"File not found: {file_path}")
        current_step += 1
        progress = int(current_step / total_steps * 100)
        yield f"data: {json.dumps({'progress': progress, 'phase': 'loading'})}\n\n"

    df_historical = pd.concat(all_dfs, ignore_index=True) if all_dfs else pd.DataFrame()
    if not df_historical.empty and 'type' in df_historical.columns:
        df_historical = df_historical.drop('type', axis=1)

    # Load recent data from NASA FIRMS API
    url = f"https://firms.modaps.eosdis.nasa.gov/api/country/csv/{map_key}/MODIS_NRT/{country_abbrev}/{days}"
    df_recent = pd.read_csv(url)
    if 'country_id' in df_recent.columns:
        df_recent = df_recent.drop('country_id', axis=1)

    # Convert dates
    df_historical['acq_date'] = pd.to_datetime(df_historical['acq_date'])
    df_recent['acq_date'] = pd.to_datetime(df_recent['acq_date'])

    # Aggregate data by day (summing the 'frp' values)
    df_historical_agg = df_historical.groupby('acq_date')['frp'].sum().reset_index()
    df_historical_agg.set_index('acq_date', inplace=True)
    df_historical_agg = df_historical_agg.resample('D').sum().fillna(0)

    # Fit SARIMA model on historical data
    sarima_model = SARIMAX(df_historical_agg['frp'],
                           order=(1, 1, 1),
                           seasonal_order=(1, 1, 1, 12),
                           enforce_stationarity=False,
                           enforce_invertibility=False)
    sarima_result = sarima_model.fit()

    # Compute daily thresholds (90th percentile of frp for each day-of-year)
    daily_thresholds = df_historical_agg.groupby(df_historical_agg.index.dayofyear)['frp'].quantile(0.90)

    def frp_to_probability(frp, date):
        day_of_year = date.dayofyear
        threshold = daily_thresholds.get(day_of_year, daily_thresholds.mean())
        return 0 if threshold == 0 else np.clip(frp / threshold, 0, 1) * 100

    # Phase 2: Forecasting
    future_dates = pd.date_range(start=start_date, periods=periods, freq='D')
    future_forecast_results = sarima_result.get_forecast(steps=len(future_dates))
    future_forecast_df = future_forecast_results.summary_frame()
    future_forecast_df.index = future_dates

    probabilities = []
    for frp, date in zip(future_forecast_df['mean'], future_forecast_df.index):
        probabilities.append(frp_to_probability(frp, date))
        current_step += 1
        progress = int(current_step / total_steps * 100)
        yield f"data: {json.dumps({'progress': progress, 'phase': 'forecasting'})}\n\n"

    future_forecast_df['fire_probability'] = probabilities

    # Compute annual fire counts from historical data
    df_historical['year'] = df_historical['acq_date'].dt.year
    annual_fires = df_historical.groupby('year').size().rename('annual_fires')

    # Prepare final forecast results
    forecast_result = []
    for date, prob in future_forecast_df['fire_probability'].items():
        forecast_result.append({
            "date": date.strftime("%Y-%m-%d"),
            "fire_probability": prob
        })
    annual_fire_counts = annual_fires.to_dict()

    final_result = {
        "progress": 100,
        "annual_fire_counts": annual_fire_counts,
        "probabilities": forecast_result
    }
    # Send final result
    yield f"data: {json.dumps(final_result)}\n\n"

# ---------------------------------------------------
# New generator function for converting Parquet to CSV
# ---------------------------------------------------
@app.route('/api/forecast_stream', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
def forecast_stream():
    """
    Expects query parameters like:
      country_name=Australia
      map_key=your_map_key
      days=10
      start_date=2025-02-06
      periods=10

    The backend looks up the country abbreviation from data/countries_code.csv using the full country name.
    It then starts the forecasting process and streams progress updates (and finally the forecast results)
    using SSE (Server-Sent Events).
    """
    country_name = request.args.get('country_name')
    map_key = request.args.get('map_key')
    days = request.args.get('days')
    start_date = request.args.get('start_date')
    periods = request.args.get('periods')

    # Validate parameters
    if not country_name:
        return jsonify({"error": "Missing country name"}), 400

    # Look up the country abbreviation using the provided country name.
    codes_file = os.path.join('data', 'countries_code.csv')
    if not os.path.exists(codes_file):
        return jsonify({"error": "Countries code file not found"}), 500

    df_codes = pd.read_csv(codes_file, delimiter=',', quotechar='"', on_bad_lines='skip')
    row = df_codes[df_codes['Country name'] == country_name]
    if row.empty:
        return jsonify({"error": "Invalid country name"}), 400

    country_abbrev = row.iloc[0]['Abbreviation']
    base_dir = os.path.join('data', 'modis')  # adjust as needed

    def generate():
        for message in forecast_fire_occurrence_stream(
                country_name, base_dir, map_key, country_abbrev, days, start_date, int(periods)
            ):
            yield message

    return Response(generate(), mimetype='text/event-stream')

# ---------------------------------------------------
# API to get all data for a selected year and country
# ---------------------------------------------------
@app.route('/api/data', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
def get_data():
    year = request.args.get('year')
    country = request.args.get('country')
    country = country.replace('_', ' ')
    file_path = f'./data/processed/{year}/{country}.csv'

    if not os.path.isfile(file_path):
        return jsonify({'error': 'Data not found'}), 404

    df = pd.read_csv(file_path, usecols=['latitude', 'longitude', 'brightness', 'acq_date', 'acq_time', 'daynight', 'type'])
    return jsonify(df.to_dict(orient='records'))

# ---------------------------------------------------
# API to get details of a specific data point
# ---------------------------------------------------
@app.route('/api/detail', methods=['POST'])
@cross_origin(origins='http://localhost:3000')
def get_detail():
    data = request.get_json()
    file_path = f'./data/modis/{data["year"]}/{data["country"]}.csv'

    if not os.path.isfile(file_path):
        return 'error'

    df = pd.read_csv(file_path)

    detail = df[(df['latitude'].astype(str) == data['latitude']) &
                (df['longitude'].astype(str) == data['longitude']) &
                (df['acq_date'] == data['acq_date']) &
                (df['acq_time'].astype(str) == data['acq_time'])]

    return jsonify(detail.to_dict(orient='records'))

# ---------------------------------------------------
# New generator function for converting Parquet to CSV
# ---------------------------------------------------
@app.route('/api/countries', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
def get_countries():
    year = request.args.get('year')
    folder_path = f'./data/processed/{year}/'

    if not os.path.exists(folder_path):
        return jsonify({'error': 'Year not found'}), 404

    # Get all CSV files in data/processed/{year}
    csv_files = glob.glob(os.path.join(folder_path, '*.csv'))

    # Use the filename (without the .csv extension) as the country name
    countries = [os.path.splitext(os.path.basename(file))[0] for file in csv_files]

    # Return a JSON response with the year and list of countries
    return jsonify({'year': year, 'countries': countries})

# ---------------------------------------------------
# New generator function for converting Parquet to CSV
# ---------------------------------------------------
@app.route('/api/countriesMeta', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
def get_countries_meta():
    """
    Reads data/countries.json and returns it as JSON.
    """
    file_path = './data/countires.json'
    if not os.path.exists(file_path):
        return jsonify({"error": "countries.json not found"}), 404

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return jsonify(data)

# ---------------------------------------------------
# Home page simulation
# ---------------------------------------------------
@app.route('/')
@cross_origin(origins='http://localhost:3000')
def index():
    return render_template('index.html')



if __name__ == '__main__':
    os.makedirs(os.path.join('data', 'modis'), exist_ok=True)
    os.makedirs(os.path.join('data', 'processed'), exist_ok=True)
    app.run(debug=True)
