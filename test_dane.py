import requests

url = "https://api.dane.gov.pl/1.4/datasets/1886/resources"
print(f"Fetching {url}")
r = requests.get(url)
for res in r.json()['data']:
    print(res['attributes']['title'], res['attributes']['file_url'])
