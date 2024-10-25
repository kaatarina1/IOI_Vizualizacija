import pandas as pd
import requests
import time
import os


# Function to get latitude and longitude using OpenStreetMap's Nominatim API
def get_lat_long(post_name, postal_code):
    # split post_name to get only the name of the city
    post_name = post_name.split(' ')[0]
    url = 'https://api.geoapify.com/v1/geocode/search'
    params = {
        'text': f'{postal_code} {post_name} Slovenia',
        'apiKey': 'a014786f60c045bfbf3500db7892e258'
    }
    response = requests.get(url, params=params)
    print(f"Requesting...: {response.status_code}")
    data = response.json() # Parse the JSON response
    # Extract latitude and longitude if found
    if len(data['features']) > 0:
        latitude = data['features'][0]['properties']['lat']
        longitude = data['features'][0]['properties']['lon']
        return latitude, longitude
    else:
        return None, None

# Function to process the data and add lat/long to a DataFrame
def process_post_offices(post_office_df):
    results = pd.DataFrame(columns=['postalCode', 'place', 'specialOffice', 'latitude', 'longitude'])

    for index, row in post_office_df.iterrows():
        postal_code = row['postal_code']
        post_name = row['post_name']
        special_office = row['special_office']
        latitude, longitude = get_lat_long(post_name, special_office)
        
        # Append result
        results = results.append({
            'postal_code': postal_code,
            'post_name': post_name,
            'specialOffice': special_office,
            'latitude': latitude,
            'longitude': longitude
        }, ignore_index=True)

        # Pause to avoid overwhelming the API
        time.sleep(1)

    return results

def main():
    # Pot do trenutnega direktorija
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Pot do direktorija, ki vsebuje vse slike
    file_path = os.path.join(current_dir, 'poste.csv') # Ime mape, kjer so shranjene png slike
    # Load the CSV file with postal codes and post names
    df = pd.read_csv(file_path, sep=';')

    print(f"Loaded {len(df)} post offices from {df.columns} rows.")

    # Assuming the CSV has columns 'postal_code', 'post_name', and 'special_office'
    # Separate regular and special post offices
    # regular_post_offices = df[df['special_office'].isna()]  # Regular offices
    special_post_offices = df[df['special_office'].notna()]  # Special offices

    # Process regular post offices
    # print("Processing regular post offices...")
    # regular_offices_with_latlong = process_post_offices(regular_post_offices)

    # Process special post offices
    print("Processing special post offices...")
    special_offices_with_latlong = process_post_offices(special_post_offices)

    # Save the results to separate CSV files
    # regular_offices_file = 'regular_post_offices_with_latlong.csv'
    special_offices_file = 'special_post_offices_with_latlong.csv'

    # regular_offices_with_latlong.to_csv(regular_offices_file, index=False)
    special_offices_with_latlong.to_csv(special_offices_file, index=False)

    # print(f"Regular post offices saved to {regular_offices_file}")
    print(f"Special post offices saved to {special_offices_file}")

if __name__ == '__main__':
    main()
