import requests
import csv
import os
import sys

# Używamy API Overpass (OpenStreetMap) do pobierania prawdziwych danych adresowych.
# API to jest darmowe i pozwala na zapytania o konkretne obszary, takie jak województwa.
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Wybrano "świętokrzyskie" jako przykład (najmniejsze województwo, działa szybko),
# ale możesz zmienić lub dodać "mazowieckie", "małopolskie", itp.
VOIVODESHIPS = ["świętokrzyskie"] 
COUNTRY_CODE = "pl"

def fetch_addresses(voivodeship):
    print(f"Pobieranie danych dla województwa: {voivodeship}...")
    
    # Zapytanie Overpass QL
    # Pobiera wszystkie węzły (nodes), drogi (ways) i relacje (relations) 
    # z tagiem addr:housenumber w podanym obszarze (województwie)
    overpass_query = f"""
    [out:json][timeout:900];
    area["name"="{voivodeship}"]["admin_level"="4"]->.searchArea;
    nwr["addr:housenumber"](area.searchArea);
    out center;
    """
    
    try:
        response = requests.post(OVERPASS_URL, data={'data': overpass_query})
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Błąd podczas pobierania danych: {e}")
        sys.exit(1)

def process_and_save(data, voivodeship, country_code):
    os.makedirs(country_code, exist_ok=True)
    filename = f"{country_code}/{voivodeship}.csv"
    
    print(f"Zapisywanie danych do pliku {filename}...")
    
    with open(filename, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['lat', 'lon', 'housenumber', 'street', 'city'])
        
        elements = data.get('elements', [])
        count = 0
        
        for element in elements:
            tags = element.get('tags', {})
            housenumber = tags.get('addr:housenumber', '')
            street = tags.get('addr:street', '')
            city = tags.get('addr:city', '')
            
            # W zależności od typu elementu (node, way, relation), koordynaty są w różnym miejscu
            if element['type'] == 'node':
                lat = element.get('lat')
                lon = element.get('lon')
            else:
                center = element.get('center', {})
                lat = center.get('lat')
                lon = center.get('lon')
                
            if lat and lon and housenumber:
                writer.writerow([lat, lon, housenumber, street, city])
                count += 1
                
        print(f"Zapisano {count} adresów.")

if __name__ == "__main__":
    for v in VOIVODESHIPS:
        data = fetch_addresses(v)
        process_and_save(data, v, COUNTRY_CODE)
