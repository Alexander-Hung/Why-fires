import pandas as pd
import os
import json
import numpy as np
import time
import psutil
import pyarrow.parquet as pq
import pyarrow as pa
import threading
import boto3
import zipfile, io, joblib
from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
load_dotenv()


app = Flask(__name__, template_folder='public')
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

CPU_THRESHOLD = float(os.getenv("CPU_THRESHOLD", "25"))
MEMORY_THRESHOLD_GB = float(os.getenv("MEMORY_THRESHOLD_GB", "8"))

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

# -------------------------------
# Endpoint: Prediction
# -------------------------------
@app.route('/api/predict', methods=['POST'])
@cross_origin(origins='http://localhost:3000')
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
@cross_origin(origins='http://localhost:3000')
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
@cross_origin(origins='http://localhost:3000')
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
@cross_origin(origins='http://localhost:3000')
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
@cross_origin(origins='http://localhost:3000')
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
@cross_origin(origins='http://localhost:3000')
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
@cross_origin(origins='http://localhost:3000')
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
@cross_origin(origins='http://localhost:3000')
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

# ---------------------------------------------------
# Endpoint: Get available countries by year
# ---------------------------------------------------
@app.route('/api/countries', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
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
# Endpoint: Get basic data point
# ---------------------------------------------------
@app.route('/api/data', methods=['GET'])
@cross_origin(origins='http://localhost:3000')
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

    # If you don’t want to return the country in the final JSON, drop it
    # df_filtered = df_filtered.drop(columns='country')

    # Convert to list of records (JSON) and return
    return jsonify(df_filtered.to_dict(orient='records'))

# ---------------------------------------------------
# Endpoint: Return details from input data point
# ---------------------------------------------------
@app.route('/api/detail', methods=['POST'])
@cross_origin(origins='http://localhost:3000')
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
    needed_cols = ['latitude', 'longitude', 'acq_date', 'acq_time', 'daynight', 'country', 'type', 'brightness']

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
# Endpoint: API Testing
# ---------------------------------------------------
@app.route('/')
@cross_origin(origins='http://localhost:3000')
def index():
    return render_template('index.html')

@app.route("/prediction")
@cross_origin(origins='http://localhost:3000')
def prediction():
    return render_template("prediction.html")


if __name__ == '__main__':
    os.makedirs(os.path.join('data', 'modis'), exist_ok=True)
    app.run(debug=True)
