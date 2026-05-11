import os
import ee
from fastapi import HTTPException
from backend.core.config import settings

class GEEClient:
    def __init__(self, credentials_path: str = None):
        """
        Initializes Google Earth Engine with the provided service account JSON.
        """
        self.credentials_path = credentials_path or settings.EE_CREDENTIALS_PATH
        self._authenticate()

    def _authenticate(self):
        try:
            if not self.credentials_path or not os.path.exists(self.credentials_path):
                print(f"WARNING: GEE JSON not found at {self.credentials_path}. Remote sensing will fail.")
                return

            credentials = ee.ServiceAccountCredentials(settings.EE_SERVICE_ACCOUNT, self.credentials_path)
            ee.Initialize(credentials)
            print("GEE Initialized with Service Account.")
        except Exception as e:
            print(f"ERROR: Failed to authenticate with Earth Engine. {str(e)}")

    def get_median_composite_url(self, geometry_dict: dict, start_date: str, end_date: str) -> str:
        """
        Requests Sentinel-2 Level-2A median composite for a geometry array.
        Returns a temporary download URL for the GeoTIFF containing bands B4, B8.
        """
        try:
            # Parse GeoJSON into Earth Engine Feature
            coords = geometry_dict["coordinates"]
            roi = ee.Geometry.Polygon(coords)

            # Define Sentinel-2 Harmonized Collection
            collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                          .filterBounds(roi)
                          .filterDate(start_date, end_date)
                          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

            if collection.size().getInfo() == 0:
                raise ValueError("No cloud-free Sentinel-2 imagery found for the specified dates and region.")

            # Create median composite and select Red (B4) and NIR (B8) 
            # Blue (B2) for RGB fallback and Green (B3) for potential vegetation indices
            composite = collection.median().select(['B4', 'B8', 'B2', 'B3']).clip(roi)

            # Generate Download URL
            download_url = composite.getDownloadURL({
                'scale': 10,  # 10m resolution for Sentinel-2
                'crs': 'EPSG:4326',
                'format': 'GEO_TIFF'
            })
            
            return download_url
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"GEE Fetch Error: {str(e)}")
