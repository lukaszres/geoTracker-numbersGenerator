import os
import sys
import csv
import urllib.request

try:
    import osmium
except ImportError:
    print("Błąd: Biblioteka 'osmium' nie jest zainstalowana. Użyj: pip install osmium")
    sys.exit(1)

# Geofabrik udostępnia codzienne zrzuty bazy OpenStreetMap w formacie PBF.
# Jest to doskonała i bardzo stabilna alternatywa dla API Overpass - pobieramy plik 
# raz na dysk i przetwarzamy go lokalnie, co omija wszelkie limity zapytań (rate limits), 
# błędy 406 Not Acceptable i zabezpieczenia serwerów.
GEOFABRIK_URL_TEMPLATE = "https://download.geofabrik.de/europe/poland/{voivodeship}-latest.osm.pbf"

# Nazwy województw muszą odpowiadać tym w URL Geofabrik (bez polskich znaków)
VOIVODESHIPS = [
    "dolnoslaskie", "kujawsko-pomorskie", "lubelskie", "lubuskie",
    "lodzkie", "malopolskie", "mazowieckie", "opolskie",
    "podkarpackie", "podlaskie", "pomorskie", "slaskie",
    "swietokrzyskie", "warminsko-mazurskie", "wielkopolskie", "zachodniopomorskie"
]
COUNTRY_CODE = "pl"
BASE_DIR = "addresses"

class AddressHandler(osmium.SimpleHandler):
    def __init__(self, writer):
        super(AddressHandler, self).__init__()
        self.writer = writer
        self.count = 0

    def process_tags(self, tags, lat, lon):
        housenumber = tags.get('addr:housenumber')
        if housenumber:
            street = tags.get('addr:street', '')
            city = tags.get('addr:city', '')
            self.writer.writerow([lat, lon, housenumber, street, city])
            self.count += 1

    def node(self, n):
        # Sprawdzamy pojedyncze węzły (adresy naniesione jako punkty)
        if 'addr:housenumber' in n.tags:
            self.process_tags(n.tags, n.location.lat, n.location.lon)

    def way(self, w):
        # Sprawdzamy budynki (obszary, które również mogą mieć adresy)
        if 'addr:housenumber' in w.tags:
            try:
                # Pobieramy pierwszą współrzędną węzła obrysu budynku
                n = w.nodes[0]
                self.process_tags(w.tags, n.location.lat, n.location.lon)
            except osmium.InvalidLocationError:
                pass

def process_voivodeship(voivodeship, country_code):
    url = GEOFABRIK_URL_TEMPLATE.format(voivodeship=voivodeship)
    pbf_filename = f"{voivodeship}-latest.osm.pbf"
    
    print(f"Pobieranie paczki danych (PBF) dla województwa: {voivodeship}...")
    print(f"URL: {url}")
    try:
        # Pobieranie strumieniowe bez nagłówków, serwer Geofabrik pozwala na prosty dostęp
        urllib.request.urlretrieve(url, pbf_filename)
        print("Pobieranie pliku PBF zakończone.")
    except Exception as e:
        print(f"Błąd podczas pobierania pliku PBF: {e}")
        return

    output_dir = f"{BASE_DIR}/{country_code}"
    os.makedirs(output_dir, exist_ok=True)
    csv_filename = f"{output_dir}/{voivodeship}.csv"
    
    print(f"Przetwarzanie danych lokalnie i zapisywanie do {csv_filename}...")
    
    with open(csv_filename, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['lat', 'lon', 'housenumber', 'street', 'city'])
        
        handler = AddressHandler(writer)
        # Używamy locations=True, aby osmium w pamięci powiązało obrysy budynków 
        # (ways) z ich współrzędnymi geograficznymi. 
        handler.apply_file(pbf_filename, locations=True)
        
        print(f"Pomyślnie zapisano {handler.count} adresów.")
        
    # Usuwamy plik źródłowy PBF, aby zwolnić miejsce (szczególnie przydatne w GitHub Actions)
    if os.path.exists(pbf_filename):
        os.remove(pbf_filename)
        print("Usunięto tymczasowy plik PBF.")

if __name__ == "__main__":
    for v in VOIVODESHIPS:
        process_voivodeship(v, COUNTRY_CODE)
