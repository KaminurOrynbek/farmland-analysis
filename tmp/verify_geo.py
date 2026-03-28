import sys
import os
import json

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.geo_service import process_geojson_upload

def test_process():
    sample_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Test Field"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[71.39, 51.13], [71.44, 51.13], [71.44, 51.17], [71.39, 51.17], [71.39, 51.13]]]
                }
            }
        ]
    }
    
    try:
        metadata = process_geojson_upload(sample_geojson)
        print("Processing Successful!")
        print(f"BBOX: {metadata['bbox']}")
        print(f"CRS: {metadata['crs']}")
        print(f"Features: {metadata['features']}")
        print(f"Total Area (ha): {metadata['total_area_ha']}")
        print(f"Field Geometries: {metadata['field_geometries']}")
    except Exception as e:
        print(f"Processing Failed: {e}")

if __name__ == "__main__":
    test_process()
