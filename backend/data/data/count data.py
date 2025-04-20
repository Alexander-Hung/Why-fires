import os
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Change this to the directory containing your {year} subfolders
BASE_DIR = "modis"

# List all items in BASE_DIR (expecting subfolders named 2001, 2002, etc.)
for year_folder in sorted(os.listdir(BASE_DIR)):
    # Construct the full path to the year folder
    year_path = os.path.join(BASE_DIR, year_folder)

    # Skip if it's not actually a directory (just a safety check)
    if not os.path.isdir(year_path):
        continue

    # Gather all CSV files inside this year folder
    csv_files = [f for f in os.listdir(year_path) if f.endswith(".csv")]
    if not csv_files:
        print(f"No CSV files found in {year_path}, skipping.")
        continue

    # We'll collect one DataFrame per CSV, then concatenate them
    dfs = []

    for csv_file in csv_files:
        # Full path to the CSV file
        csv_path = os.path.join(year_path, csv_file)

        # Read into a pandas DataFrame
        df = pd.read_csv(csv_path)

        # Extract the country name from the filename, e.g. "USA" from "USA.csv"
        country_name = os.path.splitext(csv_file)[0]

        # Add 'country' column to keep track of each row's country
        df["country"] = country_name

        # (Optional) also keep a 'year' column if you want it in the final Parquet
        df["year"] = year_folder

        dfs.append(df)

    # Concatenate all country DataFrames for this year
    combined_df = pd.concat(dfs, ignore_index=True)

    # Convert pandas -> PyArrow table
    table = pa.Table.from_pandas(combined_df)

    # Define the output Parquet file name, e.g. "2001.parquet"
    parquet_filename = f"{year_folder}.parquet"
    parquet_filepath = os.path.join(BASE_DIR, parquet_filename)

    # Write the table with Brotli compression
    pq.write_table(
        table,
        parquet_filepath,
        compression="BROTLI"  # Use Brotli
    )

    print(f"Wrote Parquet for {year_folder} -> {parquet_filename}")
