import pandas as pd
import os

current_dir = os.path.dirname(__file__)
file_path = os.path.join(current_dir, 'data', 'regular_post_offices_with_latlong.csv')

def round_lat_long(csv_file_path, output_file_path):
    # Read the CSV file
    df = pd.read_csv(csv_file_path)

    # Round the 'latitude' and 'longitude' columns to 4 decimal places
    df['latitude'] = df['latitude'].round(4)
    df['longitude'] = df['longitude'].round(4)

    # Save the updated DataFrame to a new CSV file
    df.to_csv(output_file_path, index=False)
    print(f"Updated file saved to {output_file_path}")

# Define file paths
output_file = 'regular_post_offices.csv'  # Path to save the output CSV file

# Call the function to round the latitude and longitude
round_lat_long(file_path, output_file)
