import sys
import csv

try:
    import osmium
except ImportError:
    print("Please install osmium: pip install osmium")
    sys.exit(1)

class AddressHandler(osmium.SimpleHandler):
    def __init__(self):
        super(AddressHandler, self).__init__()
        self.addresses = []

    def node(self, n):
        if 'addr:housenumber' in n.tags:
            self.addresses.append([
                n.location.lat, 
                n.location.lon, 
                n.tags.get('addr:housenumber', ''), 
                n.tags.get('addr:street', ''), 
                n.tags.get('addr:city', '')
            ])

    def way(self, w):
        if 'addr:housenumber' in w.tags:
            try:
                # We need locations to be cached to access w.nodes[0].location
                n = w.nodes[0]
                self.addresses.append([
                    n.location.lat, 
                    n.location.lon, 
                    w.tags.get('addr:housenumber', ''), 
                    w.tags.get('addr:street', ''), 
                    w.tags.get('addr:city', '')
                ])
            except osmium.InvalidLocationError:
                pass

print("OSMIUM TEST SUCCESS")
