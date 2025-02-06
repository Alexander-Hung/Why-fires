from flask import Flask, render_template, request, jsonify, Response
import pandas as pd
import os
import glob
from flask_cors import CORS, cross_origin
import json
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from tqdm.auto import tqdm

app = Flask(__name__, template_folder='public')
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})


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

# Home page simulation
@app.route('/')
@cross_origin(origins='http://localhost:3000')
def index():
    return render_template('index.html')


# API to get all data for a selected year and country
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


# API to get details of a specific data point
@app.route('/api/detail', methods=['POST'])
@cross_origin(origins='http://localhost:3000')
def get_detail():
    data = request.get_json()
    file_path = f'./data/modis/{data["year"]}/modis_{data["year"]}_{data["country"]}.csv'

    if not os.path.isfile(file_path):
        return 'error'

    df = pd.read_csv(file_path)

    detail = df[(df['latitude'].astype(str) == data['latitude']) &
                (df['longitude'].astype(str) == data['longitude']) &
                (df['acq_date'] == data['acq_date']) &
                (df['acq_time'].astype(str) == data['acq_time'])]

    return jsonify(detail.to_dict(orient='records'))


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


if __name__ == '__main__':
    app.run(debug=True)
