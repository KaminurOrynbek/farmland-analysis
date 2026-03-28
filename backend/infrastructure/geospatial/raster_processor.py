import rasterio
import numpy as np
import warnings

# Suppress warnings for clipped temporary TIFFs without formal CRS bounds if present
warnings.filterwarnings("ignore", category=rasterio.errors.NotGeoreferencedWarning)

class RasterProcessor:
    def __init__(self):
        # Sentinel-2 L2A optical sensors scale reflectance by 10,000
        self.scale_factor = 10000.0

    def calculate_spectral_indices(self, tif_path: str) -> dict:
        """
        Reads a local GeoTIFF containing GEE clipped bands (B4, B8),
        applies the 10000.0 scale factor, and computes true NDVI.
        """
        try:
            with rasterio.open(tif_path) as dataset:
                # GEE exports B4 (Red) as Band 1, B8 (NIR) as Band 2
                red = dataset.read(1).astype(float)
                nir = dataset.read(2).astype(float)
                
                # Apply scaling factor for true surface reflectance
                red = red / self.scale_factor
                nir = nir / self.scale_factor
                
                # Avoid invalid arithmetic on missing data
                valid_mask = (red > 0) & (nir > 0)
                
                if not np.any(valid_mask):
                    return {"ndvi_mean": 0.0, "stress_zones_count": 0}
                
                red_valid = red[valid_mask]
                nir_valid = nir[valid_mask]
                
                # Compute true NDVI: (NIR - RED) / (NIR + RED)
                ndvi = (nir_valid - red_valid) / (nir_valid + red_valid)
                
                # Pixels < 0.3 generally indicate stressed crop or bare soil
                stress_pixels = np.sum(ndvi < 0.3)
                
                return {
                    "ndvi_mean": float(np.mean(ndvi)),
                    "stress_zones_count": int(stress_pixels)
                }
                
        except Exception as e:
            print(f"RasterProcessor Error: {str(e)}")
            raise RuntimeError(f"Failed to calculate indices from {tif_path}: {str(e)}")
