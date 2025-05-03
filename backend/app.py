import pandas as pd
import os
import json
import numpy as np
import time
import glob
import psutil
import uuid
import pyarrow.parquet as pq
import pyarrow as pa
import threading
from werkzeug.exceptions import RequestTimeout
import boto3
import zipfile, io, joblib
from flask import Flask, render_template, request, jsonify, Response, session
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
load_dotenv()


app = Flask(__name__, template_folder='public')
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

CPU_THRESHOLD = float(os.getenv("CPU_THRESHOLD", "25"))
MEMORY_THRESHOLD_GB = float(os.getenv("MEMORY_THRESHOLD_GB", "8"))
DATA_FOLDER = "data/modis"  # Added this for consistency with analysis endpoints

# Global dict to track analysis progress for different sessions
analysis_progress = {}

# Flag to signal analysis to stop
should_stop_analysis = False

# -------------------------------
# Config: R2 / S3 Configuration
# -------------------------------
ACCOUNT_ID = "53ccada8fa16739b20397e6113693cd0"
BUCKET_NAME = "fires"
CLIENT_ACCESS_KEY = "4c3e3dee1bc5d8d5b9a9c94bc55e2c5c"
CLIENT_SECRET = "3569eae5164d74e09093731e1cf1ea9e5f7b7fa7936d5d76383d15cf35bb97fd"
CONNECTION_URL = f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com"
FILE_KEY_1 = "combined.parquet"
FILE_KEY_2 = "predict_package.model"
LOCAL_PARQUET = "./combined.parquet"
LOCAL_MODEL = "./predict_package.model"

s3 = boto3.client(
    "s3",
    endpoint_url=CONNECTION_URL,
    aws_access_key_id=CLIENT_ACCESS_KEY,
    aws_secret_access_key=CLIENT_SECRET
)

# -------------------------------
# Config: Prediction
# -------------------------------
PACKAGE_PATH = "predict_package.model"

# -------------------------------
# Function: Prediction
# -------------------------------
def predict_from_package(country: str, start_date: str, package_path: str = PACKAGE_PATH) -> dict:
    # 1) Load meta, model, and processed data from the single .model (zip)
    with zipfile.ZipFile(package_path, 'r') as zf:
        # metadata
        with zf.open(f"{country}_meta.json") as mf:
            meta = json.load(io.TextIOWrapper(mf, encoding='utf-8'))
        # model
        with zf.open(f"{country}.joblib") as modf:
            model = joblib.load(modf)
        # processed parquet
        buf = io.BytesIO(zf.read(f"{country}_processed.parquet"))
        table = pq.read_table(buf)
        proc = table.to_pandas()

    # 2) Prediction logic (same as before)
    proc["acq_date"] = pd.to_datetime(proc["acq_date"])
    sd = pd.to_datetime(start_date)
    results = []

    for area in meta["areas"]:
        subset = proc[proc.area == area]
        anchor = min(proc.acq_date.max(), sd)
        last = subset[subset.acq_date == anchor]
        if last.empty:
            continue
        base = last.iloc[-1]

        rows = []
        for day in range(7):
            d = sd + timedelta(days=day)
            row = {}
            for feat in meta["features"]:
                if feat == "area_code":
                    row["area_code"] = meta["area_map"].get(area, -1)
                else:
                    row[feat] = base.get(feat, 0)
            # cyclical date features
            doy = d.timetuple().tm_yday
            m = d.month
            row.update({
                "day_of_year": doy,
                "day_sin": np.sin(2 * np.pi * doy / 365.25),
                "day_cos": np.cos(2 * np.pi * doy / 365.25),
                "month": m,
                "month_sin": np.sin(2 * np.pi * m / 12),
                "month_cos": np.cos(2 * np.pi * m / 12),
            })
            rows.append(row)

        df_in = pd.DataFrame(rows)
        preds = model.predict(df_in[meta["features"]])
        weekly_prob = 1 - np.prod(1 - preds)
        results.append({
            "area": area,
            "fire_risk_percent": round(weekly_prob * 100, 2)
        })

    country_pct = round(np.mean([r["fire_risk_percent"] for r in results]), 2)

    return {
        "country": country,
        "country_area_percentage": country_pct,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "prediction_period": {
            "start": sd.isoformat(),
            "end": (sd + timedelta(days=6)).isoformat()
        },
        "predictions": sorted(results, key=lambda x: -x["fire_risk_percent"])
    }

# -------------------------------
# Function: Conversion generator
# -------------------------------
def split_parquet_by_year_stream(parquet_file_path, output_base):
    """
    Reads the entire Parquet file into a single DataFrame, groups by 'year',
    and writes each subset to a separate {year}.parquet.
    Yields SSE-style messages to track progress.
    """
    os.makedirs(output_base, exist_ok=True)

    # Start reading
    yield f"data: {json.dumps({'progress': 0, 'phase': 'reading', 'message': f'Start reading {parquet_file_path}'})}\n\n"

    df = pd.read_parquet(parquet_file_path)

    yield f"data: {json.dumps({'progress': None, 'phase': 'reading', 'message': 'Finished reading Parquet into DataFrame'})}\n\n"

    # Group by 'year' column
    years = df['year'].unique()
    total_years = len(years)
    yield f"data: {json.dumps({'progress': 0, 'phase': 'grouping', 'message': f'Found {total_years} unique years'})}\n\n"

    # Iterate over each unique year and write the subset
    for i, year_val in enumerate(sorted(years)):
        cpu_usage = psutil.cpu_percent(interval=0.1)
        if cpu_usage > CPU_THRESHOLD:
            yield f"data: {json.dumps({'progress': None, 'phase': 'throttling', 'message': f'High CPU usage: {cpu_usage}%, sleeping 0.5 sec'})}\n\n"
            time.sleep(0.5)

        # Filter rows for this year
        group_df = df[df['year'] == year_val]

        # Convert to PyArrow Table
        table = pa.Table.from_pandas(group_df)

        out_file = f"{year_val}.parquet"
        out_path = os.path.join(output_base, out_file)

        # Write each subset to its own Parquet
        pq.write_table(table, out_path, compression="snappy")

        # SSE progress update
        progress_percent = int((i + 1) / total_years * 100)
        yield f"data: {json.dumps({'progress': progress_percent, 'phase': 'splitting', 'message': f'Wrote {out_path}'})}\n\n"

        mem_usage_gb = psutil.virtual_memory().used / (1024 ** 3)
        if mem_usage_gb > MEMORY_THRESHOLD_GB:
            yield f"data: {json.dumps({'progress': progress_percent, 'phase': 'throttling', 'message': f'High memory usage: {mem_usage_gb:.2f}GB, sleeping 1 sec'})}\n\n"
            time.sleep(1)

    # Done
    yield f"data: {json.dumps({'progress': 100, 'phase': 'done', 'message': 'Split by year complete'})}\n\n"


# ------------------------------
# Analysis Functions
# ------------------------------
def progress_update(value, session_id=None):
    """
    Update the progress tracker for a specific session
    """
    global analysis_progress

    # Use a default session ID if none provided
    if session_id is None:
        session_id = 'default'

    # Store the progress value
    if session_id not in analysis_progress:
        analysis_progress[session_id] = {"value": 0, "last_update": time.time()}

    analysis_progress[session_id]["value"] = value
    analysis_progress[session_id]["last_update"] = time.time()

    print(f"Progress updated for session {session_id}: {value}%")  # Debug output

def apply_filters(df, filters):
    """Apply the provided filters to the DataFrame"""
    # Filter by countries if specified
    countries = filters.get('countries', [])
    if countries:
        df = df[df['country'].isin(countries)]

    # Filter by date range if specified
    date_range = filters.get('dateRange', {})
    start_date = date_range.get('start')
    end_date = date_range.get('end')

    if start_date:
        df = df[df['acq_date'] >= start_date]
    if end_date:
        df = df[df['acq_date'] <= end_date]

    # Filter by confidence level if specified
    confidence_range = filters.get('confidenceRange', {})
    min_confidence = confidence_range.get('min')
    max_confidence = confidence_range.get('max')

    if min_confidence is not None:
        df = df[df['confidence'] >= min_confidence]
    if max_confidence is not None:
        df = df[df['confidence'] <= max_confidence]

    # Filter by day/night if specified
    daynight = filters.get('daynight')
    if daynight:
        df = df[df['daynight'] == daynight]

    # Filter by fire type if specified
    fire_type = filters.get('type')
    if fire_type is not None:  # Use 'is not None' because fire_type could be 0
        df = df[df['type'] == fire_type]

    return df


def generate_analysis(df):
    """Generate analysis results from the filtered data"""
    # Create a copy to avoid SettingWithCopyWarning
    df_analysis = df.copy()

    # Get list of countries and check if only one is selected
    unique_countries = df_analysis['country'].unique().tolist()
    single_country_selected = len(unique_countries) == 1
    selected_country = unique_countries[0] if single_country_selected else ""

    print(f"Countries in data: {unique_countries}")
    print(f"Single country selected: {single_country_selected}, Country: {selected_country}")

    # Check if 'area' column exists
    has_area_column = 'area' in df_analysis.columns
    print(f"Has 'area' column: {has_area_column}")

    # Only create a placeholder if the 'area' column doesn't exist
    if not has_area_column:
        print("'area' column not found in data, adding placeholder")
        # Create areas based on latitude/longitude grid (simplified for demonstration)
        if 'latitude' in df_analysis.columns and 'longitude' in df_analysis.columns:
            # Round coordinates to create area "buckets"
            df_analysis['area'] = df_analysis.apply(
                lambda row: f"Region {round(row['latitude'], 1)}/{round(row['longitude'], 1)}",
                axis=1
            )
        else:
            # Fallback if no coordinates
            df_analysis['area'] = "Unknown Area"
    else:
        # If 'area' column exists but has null values, replace nulls with "Unknown Area"
        if df_analysis['area'].isnull().any():
            print("Replacing null area values with 'Unknown Area'")
            df_analysis['area'] = df_analysis['area'].fillna("Unknown Area")

        # Check the first few areas to see what's in the data
        print("Sample area values:", df_analysis['area'].head(5).tolist())

    # Convert acq_date to datetime if it's not already
    if not pd.api.types.is_datetime64_any_dtype(df_analysis['acq_date']):
        df_analysis['acq_date'] = pd.to_datetime(df_analysis['acq_date'])

    # Create month and day fields for temporal analysis
    df_analysis['month'] = df_analysis['acq_date'].dt.month
    df_analysis['day'] = df_analysis['acq_date'].dt.day

    # Basic statistics
    stats = {
        "total_fires": len(df_analysis),
        "avg_brightness": float(df_analysis['brightness'].mean()),
        "avg_confidence": float(df_analysis['confidence'].mean()),
        "avg_frp": float(df_analysis['frp'].mean()),
        "day_fires": int(df_analysis[df_analysis['daynight'] == 'D'].shape[0]),
        "night_fires": int(df_analysis[df_analysis['daynight'] == 'N'].shape[0])
    }

    # Time series data by month
    monthly_data = df_analysis.groupby('month').size().reset_index(name='count')
    monthly_data = monthly_data.to_dict(orient='records')

    # Country-wise data
    country_data = df_analysis.groupby('country').size().reset_index(name='count')
    country_data = country_data.sort_values('count', ascending=False).head(10)
    country_data = country_data.to_dict(orient='records')

    # Area-wise data (if single country selected)
    area_data = []
    if single_country_selected:
        # Group by area
        area_data = df_analysis.groupby('area').size().reset_index(name='count')
        area_data = area_data.sort_values('count', ascending=False).head(10)
        area_data = area_data.to_dict(orient='records')
        print(f"Area data for {selected_country} (count: {len(area_data)}):", area_data)

    # FRP distribution by confidence
    frp_confidence = df_analysis.groupby('confidence')['frp'].mean().reset_index()
    frp_confidence = frp_confidence.to_dict(orient='records')

    # Day vs Night comparison by month
    day_night_monthly = df_analysis.groupby(['month', 'daynight']).size().reset_index(name='count')
    day_night_monthly = day_night_monthly.to_dict(orient='records')

    # Year over year comparison if multiple years
    year_data = df_analysis.groupby('year').size().reset_index(name='count')
    year_data = year_data.to_dict(orient='records')

    # Selection info
    selection_info = {
        "single_country_selected": single_country_selected,
        "selected_country": selected_country,
        "has_area_data": len(area_data) > 0
    }

    data = {
        "monthly": monthly_data,
        "country": country_data,
        "area": area_data,
        "frp_confidence": frp_confidence,
        "day_night_monthly": day_night_monthly,
        "yearly": year_data,
        "selection_info": selection_info
    }

    return {"data": data, "stats": stats}










# -------------------------------
# Endpoint: Prediction
# -------------------------------
@app.route('/api/predict', methods=['POST'])
def predict_route():
    payload = request.get_json(force=True)
    country = payload.get('country')
    start_date = payload.get('start_date')
    country = country.lower()
    if not country or not start_date:
        return jsonify({'error': 'country and start_date required'}), 400
    try:
        result = predict_from_package(country, start_date)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------
# Endpoint: Check Data
# -------------------------------
@app.route('/api/check_data', methods=['GET'])
def check_data():
    """
    Checks if:
      - combined.parquet exists
      - predict_package.model exists
      - the CSV folder (data/modis) exists and contains files
    Returns a JSON object with the status of each.
    """
    combined_exists = os.path.exists(LOCAL_PARQUET)
    model_exists = os.path.exists(LOCAL_MODEL)

    # Check for modis data files
    if os.path.isdir("./data/modis"):
        if not os.listdir("./data/modis"):
            print("False")
            modis_exists = False
        else:
            print("True")
            modis_exists = True
    else:
        print("False")
        modis_exists = False

    if os.path.isdir("./data/modis"):
        parquet_files = []
        for root, dirs, files in os.walk("./data/modis"):
            parquet_files.extend([f for f in files if f.endswith('.parquet')])
        modis_exists = bool(parquet_files)

    return jsonify({
        "combined_exists": combined_exists,
        "model_exists": model_exists,
        "modis_exists": modis_exists
    })

# -------------------------------
# Endpoint: Data Setup
# -------------------------------
@app.route('/api/data_setup', methods=['GET'])
def data_setup():
    """
    Reads a file called DATA_SETUP (expected to contain "True" or "False").
    Returns {"data_setup": true} if its content is "True" (case-insensitive); otherwise, false.
    If the file is missing, we assume it's not been set up (False).
    """
    try:
        with open("DATA_SETUP", "r") as f:
            content = f.read().strip().lower()
            if content == "true":
                return jsonify({"data_setup": True})
            else:
                return jsonify({"data_setup": False})
    except Exception as e:
        # If the file does not exist or cannot be read, assume not set up.
        return jsonify({"data_setup": False})

# -------------------------------
# Endpoint: Set Data Setup
# -------------------------------
@app.route('/api/set_data_setup', methods=['POST'])
def set_data_setup():
    """
    Receives a JSON payload like {"data_setup": true} and writes "True" or "False" to the DATA_SETUP file.
    """
    try:
        data = request.get_json()
        flag = data.get("data_setup", False)
        with open("DATA_SETUP", "w") as f:
            f.write("True" if flag else "False")
        return jsonify({"success": True, "data_setup": flag})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# -------------------------------
# Endpoint: Download Combined Parquet
# -------------------------------
@app.route('/api/download_data', methods=['GET'])
def download_data():
    """
    Downloads the combined.parquet file from R2 if not already present.
    Streams progress updates as SSE messages.
    Query parameters:
      - drive_url: URL to download the file (default constructed from R2 settings)
      - parquet_file: Local filename (default: combined.parquet)
    """
    drive_url = request.args.get('drive_url', f"{CONNECTION_URL}/{BUCKET_NAME}/{FILE_KEY_1}")
    parquet_file = request.args.get('parquet_file', LOCAL_PARQUET)

    def generate():
        if os.path.exists(parquet_file):
            yield f"data: {json.dumps({'progress': 100, 'phase': 'download skip', 'message': 'combined.parquet already exists'})}\n\n"
            return

        yield f"data: {json.dumps({'progress': 0, 'phase': 'download', 'message': 'combined.parquet not found. Starting download.'})}\n\n"
        try:
            head = s3.head_object(Bucket=BUCKET_NAME, Key=FILE_KEY_1)
            total_length = head['ContentLength']
            progress_obj = {"transferred": 0, "total": total_length}
            download_error = [None]

            class ProgressPercentage:
                def __init__(self, progress):
                    self._progress = progress

                def __call__(self, bytes_amount):
                    self._progress["transferred"] += bytes_amount

            callback = ProgressPercentage(progress_obj)

            def download():
                try:
                    s3.download_file(BUCKET_NAME, FILE_KEY_1, parquet_file, Callback=callback)
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
# Endpoint: Download Model
# -------------------------------
@app.route('/api/download_model', methods=['GET'])
def download_model():
    """
    Downloads the predict_package.model file from R2 if not already present.
    Streams progress updates as SSE messages.
    """

    def generate():
        if os.path.exists(LOCAL_MODEL):
            yield f"data: {json.dumps({'progress': 100, 'phase': 'download skip', 'message': 'predict_package.model already exists'})}\n\n"
            return

        yield f"data: {json.dumps({'progress': 0, 'phase': 'download', 'message': 'predict_package.model not found. Starting download.'})}\n\n"
        try:
            head = s3.head_object(Bucket=BUCKET_NAME, Key=FILE_KEY_2)
            total_length = head['ContentLength']
            progress_obj = {"transferred": 0, "total": total_length}
            download_error = [None]

            class ProgressPercentage:
                def __init__(self, progress):
                    self._progress = progress

                def __call__(self, bytes_amount):
                    self._progress["transferred"] += bytes_amount

            callback = ProgressPercentage(progress_obj)

            def download():
                try:
                    s3.download_file(BUCKET_NAME, FILE_KEY_2, LOCAL_MODEL, Callback=callback)
                except Exception as e:
                    download_error[0] = str(e)

            download_thread = threading.Thread(target=download)
            download_thread.start()
            while download_thread.is_alive():
                current_progress = int((progress_obj["transferred"] / progress_obj["total"]) * 100)
                yield f"data: {json.dumps({'progress': current_progress, 'phase': 'download', 'message': 'Downloading predict_package.model'})}\n\n"
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
# Endpoint: Download Both Files
# -------------------------------
@app.route('/api/download_all', methods=['GET'])
def download_all():
    """
    Downloads both combined.parquet and predict_package.model files from R2 if not already present.
    Streams progress updates as SSE messages for both files sequentially.
    """

    def generate():
        # Check and download the parquet file first
        if os.path.exists(LOCAL_PARQUET):
            yield f"data: {json.dumps({'progress': 100, 'phase': 'download skip', 'message': 'combined.parquet already exists'})}\n\n"
        else:
            yield f"data: {json.dumps({'progress': 0, 'phase': 'download parquet', 'message': 'combined.parquet not found. Starting download.'})}\n\n"
            try:
                head = s3.head_object(Bucket=BUCKET_NAME, Key=FILE_KEY_1)
                total_length = head['ContentLength']
                progress_obj = {"transferred": 0, "total": total_length}
                download_error = [None]

                class ProgressPercentage:
                    def __init__(self, progress):
                        self._progress = progress

                    def __call__(self, bytes_amount):
                        self._progress["transferred"] += bytes_amount

                callback = ProgressPercentage(progress_obj)

                def download():
                    try:
                        s3.download_file(BUCKET_NAME, FILE_KEY_1, LOCAL_PARQUET, Callback=callback)
                    except Exception as e:
                        download_error[0] = str(e)

                download_thread = threading.Thread(target=download)
                download_thread.start()
                while download_thread.is_alive():
                    current_progress = int((progress_obj["transferred"] / progress_obj["total"]) * 100)
                    yield f"data: {json.dumps({'progress': current_progress, 'phase': 'download parquet', 'message': 'Downloading combined.parquet'})}\n\n"
                    time.sleep(0.5)
                download_thread.join()
                if download_error[0]:
                    yield f"data: {json.dumps({'progress': None, 'phase': 'error', 'message': 'Download error for parquet: ' + download_error[0]})}\n\n"
                    return
                yield f"data: {json.dumps({'progress': 100, 'phase': 'download parquet complete', 'message': 'Parquet download complete'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'progress': None, 'phase': 'error', 'message': 'Download error for parquet: ' + str(e)})}\n\n"
                return

        # Now check and download the model file
        if os.path.exists(LOCAL_MODEL):
            yield f"data: {json.dumps({'progress': 100, 'phase': 'download skip', 'message': 'predict_package.model already exists'})}\n\n"
        else:
            yield f"data: {json.dumps({'progress': 0, 'phase': 'download model', 'message': 'predict_package.model not found. Starting download.'})}\n\n"
            try:
                head = s3.head_object(Bucket=BUCKET_NAME, Key=FILE_KEY_2)
                total_length = head['ContentLength']
                progress_obj = {"transferred": 0, "total": total_length}
                download_error = [None]

                class ProgressPercentage:
                    def __init__(self, progress):
                        self._progress = progress

                    def __call__(self, bytes_amount):
                        self._progress["transferred"] += bytes_amount

                callback = ProgressPercentage(progress_obj)

                def download():
                    try:
                        s3.download_file(BUCKET_NAME, FILE_KEY_2, LOCAL_MODEL, Callback=callback)
                    except Exception as e:
                        download_error[0] = str(e)

                download_thread = threading.Thread(target=download)
                download_thread.start()
                while download_thread.is_alive():
                    current_progress = int((progress_obj["transferred"] / progress_obj["total"]) * 100)
                    yield f"data: {json.dumps({'progress': current_progress, 'phase': 'download model', 'message': 'Downloading predict_package.model'})}\n\n"
                    time.sleep(0.5)
                download_thread.join()
                if download_error[0]:
                    yield f"data: {json.dumps({'progress': None, 'phase': 'error', 'message': 'Download error for model: ' + download_error[0]})}\n\n"
                    return
                yield f"data: {json.dumps({'progress': 100, 'phase': 'download model complete', 'message': 'Model download complete'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'progress': None, 'phase': 'error', 'message': 'Download error for model: ' + str(e)})}\n\n"
                return

        # All downloads complete
        yield f"data: {json.dumps({'progress': 100, 'phase': 'all complete', 'message': 'All downloads complete'})}\n\n"

    return Response(generate(), mimetype='text/event-stream')

# -------------------------------
# Endpoint: Convert Data (Parquet -> data/modis)
# -------------------------------
@app.route('/api/convert_data', methods=['GET'])
def convert_data():
    """
    Converts the combined.parquet file in the data/modis folder.
    Streams progress updates as SSE messages.
    Query parameters:
      - parquet_file: Local filename (default: combined.parquet)
      - output_dir: output folder (default: data/modis)
    """
    parquet_file = request.args.get('parquet_file', LOCAL_PARQUET)
    output_dir = request.args.get('output_dir', os.path.join('data', 'modis'))

    def generate():
        # If data/modis exists and is non-empty, no conversion needed.
        if os.path.isdir(output_dir) and os.listdir(output_dir):
            yield f"data: {json.dumps({'progress': 100, 'phase': 'complete', 'message': 'data/modis already exists. No conversion needed.'})}\n\n"
            return
        yield f"data: {json.dumps({'progress': 0, 'phase': 'conversion', 'message': 'Starting conversion to CSV in data/modis'})}\n\n"
        yield from split_parquet_by_year_stream(parquet_file, output_dir)

    return Response(generate(), mimetype='text/event-stream')

# -------------------------------
# Endpoint: Years
# -------------------------------
@app.route('/api/analyze/years', methods=['GET'])
def get_years():
    """Return available years from the data folder"""
    try:
        # List all parquet files in the data folder
        parquet_files = glob.glob(os.path.join(DATA_FOLDER, "*.parquet"))
        years = [os.path.splitext(os.path.basename(file))[0] for file in parquet_files]
        return jsonify({"success": True, "years": sorted(years)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---------------------------------------------------
# Endpoint: Get available countries by year
# ---------------------------------------------------
@app.route('/api/analyze/countries', methods=['GET'])
def get_analyze_countries():
    """Return all countries from the data"""
    try:
        years = request.args.getlist('year')

        # If specific years are provided, get countries from those years' data
        if years:
            countries = set()
            for year in years:
                file_path = os.path.join(DATA_FOLDER, f"{year}.parquet")
                if os.path.exists(file_path):
                    df = pd.read_parquet(file_path)
                    countries.update(df['country'].unique())

            countries = list(countries)
        else:
            # Otherwise, get all countries from all years
            countries = set()
            parquet_files = glob.glob(os.path.join(DATA_FOLDER, "*.parquet"))

            for file in parquet_files:
                df = pd.read_parquet(file)
                countries.update(df['country'].unique())

            countries = list(countries)

        return jsonify({"success": True, "countries": sorted(countries)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---------------------------------------------------
# Endpoint: Get available countries by year
# ---------------------------------------------------
@app.route('/api/countries', methods=['GET'])
def get_countries():
    year = request.args.get('year')
    # Path to the single Parquet file for this year
    parquet_path = f'./data/modis/{year}.parquet'

    # Verify the file actually exists
    if not os.path.exists(parquet_path):
        return jsonify({'error': f'Parquet file for year {year} not found'}), 404

    # Read just the 'country' column (assuming it exists)
    df = pd.read_parquet(parquet_path, columns=['country'])

    # Extract unique country names
    countries = df['country'].unique().tolist()

    # Return a JSON response with the year and list of countries
    return jsonify({'year': year, 'countries': countries})

# ---------------------------------------------------
# Endpoint: Get Map setup point for frontend
# ---------------------------------------------------
@app.route('/api/countriesMeta', methods=['GET'])
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
# Endpoint: Get basic data point
# ---------------------------------------------------
@app.route('/api/data', methods=['GET'])
def get_data():
    year = request.args.get('year')
    country = request.args.get('country')
    # Replace underscores with spaces to match your naming convention
    # country = country.replace('_', ' ')

    # Example path to the Parquet file for the given year
    parquet_path = f'./data/modis/{year}.parquet'

    # Check if the file exists
    if not os.path.isfile(parquet_path):
        return jsonify({'error': 'Data not found'}), 404

    # Read the Parquet file, including the 'country' column so we can filter
    cols_to_read = ['latitude', 'longitude', 'brightness', 'acq_date',
                    'acq_time', 'daynight', 'type', 'country']
    df = pd.read_parquet(parquet_path, columns=cols_to_read)

    # Filter for the requested country
    df_filtered = df[df['country'] == country]

    # If you don't want to return the country in the final JSON, drop it
    # df_filtered = df_filtered.drop(columns='country')

    # Convert to list of records (JSON) and return
    return jsonify(df_filtered.to_dict(orient='records'))

# ---------------------------------------------------
# Endpoint: Return details from input data point
# ---------------------------------------------------
@app.route('/api/detail', methods=['POST'])
def get_detail():
    data = request.get_json()

    year = data["year"]
    country = data["country"]
    lat_str = data["latitude"]    # as string
    lon_str = data["longitude"]   # as string
    acq_date = data["acq_date"]
    acq_time_str = data["acq_time"]

    # Construct the path to {year}.parquet
    parquet_path = f'./data/modis/{year}.parquet'

    if not os.path.isfile(parquet_path):
        return jsonify({'error': f'{parquet_path} not found'}), 404

    # Columns needed for final filtering
    needed_cols = ['latitude', 'longitude', 'acq_date', 'acq_time', 'daynight', 'country', 'type', 'brightness', 'area']

    # 1) Read only rows matching 'country' using filters (predicate pushdown)
    #    This significantly reduces how much data is loaded if row group stats are available.
    try:
        # 'filters' was added in PyArrow 0.15+; works best if your file's row groups are chunked by country
        table = pq.read_table(
            parquet_path,
            columns=needed_cols,
            filters=[('country', '=', country)]  # pushdown filter
        )
    except pa.lib.ArrowInvalid as e:
        # If there's some mismatch or older version that doesn't support filters well, fallback to read all
        # , columns=needed_cols
        table = pq.read_table(parquet_path)

    # Convert the filtered Arrow table to a Pandas DataFrame
    df_country = table.to_pandas()

    # 2) Now filter further by lat/long/date/time
    #    If your lat/lon are stored as floats, consider converting lat_str/lon_str to floats for numeric comparisons
    detail = df_country[
        (df_country['latitude'].astype(str) == lat_str) &
        (df_country['longitude'].astype(str) == lon_str) &
        (df_country['acq_date'] == acq_date) &
        (df_country['acq_time'].astype(str) == acq_time_str)
    ]

    return jsonify(detail.to_dict(orient='records'))

# ---------------------------------------------------
# New Endpoint: Analyze Data
# ---------------------------------------------------
@app.route('/api/progress/<session_id>', methods=['GET'])
def get_progress(session_id):
    """
    Server-Sent Events endpoint to stream progress updates to the client
    """

    def generate():
        global analysis_progress

        if session_id not in analysis_progress:
            analysis_progress[session_id] = {"value": 0, "last_update": time.time()}

        print(f"Progress connection established for session {session_id}")

        # Send initial progress
        data = json.dumps({"progress": analysis_progress[session_id]["value"]})
        yield f"data: {data}\n\n"

        last_value = analysis_progress[session_id]["value"]

        while True:
            # Check if progress has been updated
            if session_id in analysis_progress:
                current_value = analysis_progress[session_id]["value"]
                if current_value != last_value:
                    data = json.dumps({"progress": current_value})
                    yield f"data: {data}\n\n"
                    print(f"Sent progress update to client: {current_value}%")  # Debug output
                    last_value = current_value

                    # If progress is 100% or 0%, break the loop after a short delay
                    if current_value >= 100 or current_value == 0:
                        time.sleep(1)  # Give the client time to process
                        break

                # Check for stale connections (no updates for 60 seconds)
                if time.time() - analysis_progress[session_id]["last_update"] > 60:
                    print(f"Session {session_id} timed out")
                    break
            else:
                # Session no longer exists
                break

            time.sleep(0.5)  # Check every 500ms

        # Clean up
        if session_id in analysis_progress:
            del analysis_progress[session_id]

        print(f"Progress connection closed for session {session_id}")

    # Set response headers for SSE
    return Response(generate(), mimetype="text/event-stream")


@app.route('/api/analyze/stop', methods=['POST'])
def stop_analysis():
    """
    Stop the analysis process
    """
    global should_stop_analysis
    should_stop_analysis = True

    # Get session ID from request
    data = request.json
    session_id = data.get('session_id', 'default')

    # Reset progress to 0
    progress_update(0, session_id)

    return jsonify({
        'success': True,
        'message': 'Analysis stop signal sent'
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    """
    Start an asynchronous analysis job and return the session ID immediately
    """
    global should_stop_analysis
    should_stop_analysis = False  # Reset at the start

    # Generate a unique session ID for this analysis
    session_id = str(uuid.uuid4())

    try:
        filters = request.json
        print(f"Starting analysis for session {session_id}")

        # Initial progress
        progress_update(0, session_id)

        # Start a background thread to do the actual processing
        def background_processing():
            try:
                # Simulate first step of processing
                time.sleep(1)
                progress_update(25, session_id)

                # Check if we should stop
                if should_stop_analysis:
                    progress_update(0, session_id)  # Reset progress
                    return

                # Load data based on selected years
                years = filters.get('years', [])
                if not years:
                    # If no years selected, use all years
                    parquet_files = glob.glob(os.path.join(DATA_FOLDER, "*.parquet"))
                    years = [os.path.splitext(os.path.basename(file))[0] for file in parquet_files]

                # Initialize an empty DataFrame to store the combined data
                all_data = pd.DataFrame()

                # For each selected year, load and filter the data
                for i, year in enumerate(years):
                    # Check if we should stop
                    if should_stop_analysis:
                        progress_update(0, session_id)  # Reset progress
                        return

                    file_path = os.path.join(DATA_FOLDER, f"{year}.parquet")
                    if os.path.exists(file_path):
                        df = pd.read_parquet(file_path)

                        time.sleep(0.5)  # Simulate processing time
                        current_progress = 25 + (i + 1) * 50 // len(years)
                        progress_update(current_progress, session_id)

                        # Apply filters
                        df = apply_filters(df, filters)

                        # Append to the combined data
                        all_data = pd.concat([all_data, df])

                if all_data.empty:
                    progress_update(100, session_id)  # Set to complete
                    # No need to store results for empty data
                    return

                # Check if we should stop
                if should_stop_analysis:
                    progress_update(0, session_id)  # Reset progress
                    return

                # Sleep for another second to simulate processing
                time.sleep(1)
                progress_update(90, session_id)
                print(f"Analysis 90% complete for session {session_id}")

                # Generate statistics and analysis results
                results = generate_analysis(all_data)

                # Store results in a global dictionary
                # We need to store the results so they can be retrieved later
                global analysis_results_storage
                if not hasattr(app, 'analysis_results_storage'):
                    app.analysis_results_storage = {}

                app.analysis_results_storage[session_id] = {
                    "success": True,
                    "message": "Analysis completed successfully",
                    "data": results["data"],
                    "stats": results["stats"]
                }

                # Final processing
                progress_update(100, session_id)
                print(f"Analysis 100% complete for session {session_id}")

            except Exception as e:
                print(f"Error in background processing for session {session_id}: {str(e)}")
                import traceback
                traceback.print_exc()
                progress_update(0, session_id)  # Reset progress on error

        # Start the background thread
        thread = threading.Thread(target=background_processing)
        thread.daemon = True  # Daemon thread will be killed when the main process exits
        thread.start()

        # Return the session ID immediately so the client can start tracking progress
        return jsonify({
            "success": True,
            "message": "Analysis started. Use session_id to track progress and get results.",
            "session_id": session_id
        })

    except Exception as e:
        print(f"Error starting analysis for session {session_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        progress_update(0, session_id)  # Reset progress on error
        return jsonify({"success": False, "error": str(e), "session_id": session_id}), 500


# Add a new endpoint to retrieve analysis results
@app.route('/api/analysis_results/<session_id>', methods=['GET'])
def get_analysis_results(session_id):
    """
    Retrieve the results of a completed analysis
    """
    # Make sure the storage exists
    if not hasattr(app, 'analysis_results_storage'):
        app.analysis_results_storage = {}

    # Check if results are available for this session
    if session_id in app.analysis_results_storage:
        return jsonify(app.analysis_results_storage[session_id])
    else:
        return jsonify({
            "success": False,
            "message": "Results not found or analysis still in progress"
        }), 404

# ---------------------------------------------------
# Endpoint: API Testing
# ---------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route("/prediction")
def prediction():
    return render_template("prediction.html")


if __name__ == '__main__':
    os.makedirs(os.path.join('data', 'modis'), exist_ok=True)
    app.run(debug=True)