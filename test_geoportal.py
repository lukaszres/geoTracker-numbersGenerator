import requests
from io import BytesIO
import zipfile

url = "https://opendata.geoportal.gov.pl/prg/adresy/26_swietokrzyskie.zip"
print(f"Downloading {url}...")
try:
    r = requests.get(url, stream=True)
    r.raise_for_status()
    z = zipfile.ZipFile(BytesIO(r.content))
    print(z.namelist())
except Exception as e:
    print(e)
