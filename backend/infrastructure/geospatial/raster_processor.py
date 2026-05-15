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
        try:
            with rasterio.open(tif_path) as dataset:
                red = dataset.read(1).astype(float) / self.scale_factor
                nir = dataset.read(2).astype(float) / self.scale_factor

                blue = None
                if dataset.count >= 3:
                    blue = dataset.read(3).astype(float) / self.scale_factor

                valid_mask = (red > 0) & (nir > 0)

                if blue is not None:
                    valid_mask = valid_mask & (blue > 0)

                if not np.any(valid_mask):
                    return {
                        "ndvi_mean": 0.0,
                        "evi_mean": 0.0,
                        "ndvi_min": 0.0,
                        "ndvi_max": 0.0,
                        "stress_zones_count": 0
                    }

                red_valid = red[valid_mask]
                nir_valid = nir[valid_mask]

                ndvi = (nir_valid - red_valid) / (nir_valid + red_valid + 1e-8)

                if blue is not None:
                    blue_valid = blue[valid_mask]
                    evi = 2.5 * (nir_valid - red_valid) / (
                        nir_valid + 6 * red_valid - 7.5 * blue_valid + 1 + 1e-8
                    )
                    evi_mean = float(np.mean(evi))
                else:
                    evi_mean = None

                total_pixels = len(ndvi)
                stress_pixels = np.sum(ndvi < 0.3)
                stress_percentage = (stress_pixels / total_pixels * 100) if total_pixels > 0 else 0

                return {
                    "ndvi_mean": float(np.mean(ndvi)),
                    "evi_mean": evi_mean,
                    "ndvi_min": float(np.min(ndvi)),
                    "ndvi_max": float(np.max(ndvi)),
                    "stress_zones_count": int(stress_pixels),
                    "stress_area_percentage": round(float(stress_percentage), 2)
                }

        except Exception as e:
            print(f"RasterProcessor Error: {str(e)}")
            raise RuntimeError(f"Failed to calculate indices from {tif_path}: {str(e)}")
                    
