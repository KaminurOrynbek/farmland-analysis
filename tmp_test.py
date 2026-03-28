import requests
import json

try:
    url = "http://127.0.0.1:8000/api/geo/fields"
    payload = {
        "name": "test_field",
        "geometry": {"type": "Polygon", "coordinates": [[[0,0], [1,0], [1,1], [0,0]]]},
        "area_ha": 0.0
    }
    response = requests.post(url, json=payload)
    
    with open("debug_error.txt", "w", encoding="utf-8") as f:
        f.write(f"Status: {response.status_code}\n")
        f.write(response.text)
        
except Exception as e:
    with open("debug_error.txt", "w", encoding="utf-8") as f:
        f.write(f"Failed to connect: {e}")
