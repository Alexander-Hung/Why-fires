from flask import Flask, render_template, request, jsonify
import pandas as pd
import os
import glob
from flask_cors import CORS, cross_origin

app = Flask(__name__, template_folder='public')
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

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



if __name__ == '__main__':
    app.run(debug=True)
