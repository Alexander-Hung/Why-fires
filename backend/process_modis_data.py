import pandas as pd
import os
import glob

def process_modis_data(start_year, end_year):
    for year in range(start_year, end_year + 1):
        input_dir = f'./data/modis/{year}'
        output_dir = f'./data/processed/{year}'

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # List all CSV files in the input directory
        file_paths = glob.glob(f'{input_dir}/modis_{year}_*.csv')

        for file_path in file_paths:
            filename = os.path.basename(file_path)
            filename_no_ext, _ = os.path.splitext(filename)

            # Split by underscores
            parts = filename_no_ext.split('_')
            # Join everything after "modis" and the "year" to get the raw country with underscores
            country_raw = "_".join(parts[2:])
            # Replace underscores with spaces for the final output filename
            country = country_raw.replace("_", " ")

            # Read the CSV
            df = pd.read_csv(file_path)

            # Filter the columns of interest
            columns_of_interest = ['latitude', 'longitude', 'brightness', 'acq_date', 'acq_time', 'daynight', 'type']
            df = df[columns_of_interest]

            # Use the 'country' with spaces when saving the file
            output_file_path = f'{output_dir}/{country}.csv'
            df.to_csv(output_file_path, index=False)
            print(f'Processed and saved: {output_file_path}')


if __name__ == '__main__':
    max_year = 2024
    process_modis_data(2001, max_year)
