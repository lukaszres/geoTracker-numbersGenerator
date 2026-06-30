/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Copy, FileCode, Check, Github, Map, TerminalSquare } from 'lucide-react';

export default function App() {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);

  const pythonScript = `import os
import sys
import csv
import urllib.request

try:
    import osmium
except ImportError:
    print("Błąd: Biblioteka 'osmium' nie jest zainstalowana. Użyj: pip install osmium")
    sys.exit(1)

# Geofabrik udostępnia codzienne zrzuty bazy OpenStreetMap w formacie PBF.
# Jest to doskonała i stabilna alternatywa dla API Overpass - pobieramy plik 
# raz na dysk i przetwarzamy lokalnie, co omija wszelkie limity zapytań (rate limits), 
# błędy 406 Not Acceptable i zabezpieczenia serwerów.
GEOFABRIK_URL_TEMPLATE = "https://download.geofabrik.de/europe/poland/{voivodeship}-latest.osm.pbf"

# Nazwy województw bez polskich znaków (zgodnie z URL Geofabrik)
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
        if 'addr:housenumber' in n.tags:
            self.process_tags(n.tags, n.location.lat, n.location.lon)

    def way(self, w):
        if 'addr:housenumber' in w.tags:
            try:
                # Bierzemy pierwszą współrzędną węzła obrysu budynku
                n = w.nodes[0]
                self.process_tags(w.tags, n.location.lat, n.location.lon)
            except osmium.InvalidLocationError:
                pass

def process_voivodeship(voivodeship, country_code):
    url = GEOFABRIK_URL_TEMPLATE.format(voivodeship=voivodeship)
    pbf_filename = f"{voivodeship}-latest.osm.pbf"
    
    print(f"Pobieranie paczki danych (PBF) dla województwa: {voivodeship}...")
    try:
        urllib.request.urlretrieve(url, pbf_filename)
        print("Pobieranie zakończone.")
    except Exception as e:
        print(f"Błąd podczas pobierania pliku: {e}")
        return

    output_dir = f"{BASE_DIR}/{country_code}"
    os.makedirs(output_dir, exist_ok=True)
    csv_filename = f"{output_dir}/{voivodeship}.csv"
    
    print(f"Przetwarzanie danych lokalnie i zapisywanie do {csv_filename}...")
    with open(csv_filename, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['lat', 'lon', 'housenumber', 'street', 'city'])
        
        handler = AddressHandler(writer)
        handler.apply_file(pbf_filename, locations=True)
        print(f"Zapisano {handler.count} adresów.")
        
    if os.path.exists(pbf_filename):
        os.remove(pbf_filename)

if __name__ == "__main__":
    for v in VOIVODESHIPS:
        process_voivodeship(v, COUNTRY_CODE)`;

  const workflowScript = `name: Aktualizacja Danych Adresowych

on:
  schedule:
    - cron: '0 2 1 * *' # 1-go dnia każdego miesiąca o 02:00 UTC
  workflow_dispatch:

jobs:
  update-csv:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Pobranie repozytorium
        uses: actions/checkout@v4

      - name: Konfiguracja Pythona
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Instalacja zależności
        run: pip install osmium

      - name: Pobranie i aktualizacja danych
        run: python fetch_addresses.py

      - name: Zapisanie zmian w repozytorium (Commit & Push)
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add addresses/pl/*.csv
          git commit -m "Automatyczna aktualizacja danych (CSV)" || exit 0
          git push`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-xl text-blue-600 mb-2">
            <Map className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Generator Adresów (Python + GitHub Actions)
          </h1>
          <p className="text-lg text-gray-600">
            Zaprojektowałem rozwiązanie korzystające z prawdziwych danych <strong>OpenStreetMap (Overpass API)</strong>.
            Poniżej znajduje się gotowy skrypt w języku Python oraz konfiguracja GitHub Actions.
          </p>
        </header>

        <div className="grid gap-8">
          {/* Python Script Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-gray-400" />
                <h2 className="font-medium">1. Skrypt Python (fetch_addresses.py)</h2>
              </div>
              <button
                onClick={() => copyToClipboard(pythonScript, setCopiedScript)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copiedScript ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                Kopiuj
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm font-mono text-gray-800">
                <code>{pythonScript}</code>
              </pre>
            </div>
          </section>

          {/* GitHub Actions Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-gray-400" />
                <h2 className="font-medium">2. Konfiguracja Akcji (.github/workflows/update_data.yml)</h2>
              </div>
              <button
                onClick={() => copyToClipboard(workflowScript, setCopiedWorkflow)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copiedWorkflow ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                Kopiuj
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm font-mono text-gray-800">
                <code>{workflowScript}</code>
              </pre>
            </div>
          </section>

          {/* Instructions */}
          <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-lg font-medium text-blue-900 mb-4">
              <TerminalSquare className="w-5 h-5" />
              Instrukcja wdrożenia do repozytorium
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-blue-800">
              <li>Stwórz nowe repozytorium na GitHubie lub użyj istniejącego.</li>
              <li>Dodaj plik <code className="bg-white px-1.5 py-0.5 rounded text-sm font-mono border border-blue-200">fetch_addresses.py</code> do głównego folderu.</li>
              <li>Utwórz folder <code className="bg-white px-1.5 py-0.5 rounded text-sm font-mono border border-blue-200">.github/workflows/</code> i dodaj tam plik <code className="bg-white px-1.5 py-0.5 rounded text-sm font-mono border border-blue-200">update_data.yml</code>.</li>
              <li>Przejdź do zakładki <strong>Actions</strong> w swoim repozytorium GitHub.</li>
              <li>Wybierz akcję "Aktualizacja Danych Adresowych" i kliknij <strong>Run workflow</strong> aby przetestować ją od razu (lub poczekaj do pierwszego dnia miesiąca).</li>
              <li>Po zakończeniu akcji, w Twoim repozytorium pojawi się folder <code className="bg-white px-1.5 py-0.5 rounded text-sm font-mono border border-blue-200">addresses/pl/</code> ze zaktualizowanym plikiem CSV!</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
