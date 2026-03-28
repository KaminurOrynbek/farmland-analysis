import rasterio
from rasterio.mask import mask
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

class RasterService:
    def load_raster_metadata(self, raster_path: str) -> Dict[str, Any]:
        """
        Load basic metadata from a raster file.
        """
        try:
            with rasterio.open(raster_path) as src:
                return {
                    "crs": str(src.crs),
                    "transform": [float(x) for x in src.transform],
                    "width": src.width,
                    "height": src.height,
                    "bounds": [float(x) for x in src.bounds],
                    "count": src.count,
                    "driver": src.driver
                }
        except Exception as e:
            raise ValueError(f"Failed to load raster metadata: {str(e)}")

    def load_raster(self, raster_path: str, bands: Optional[List[int]] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Read specific bands from a raster file.
        """
        try:
            with rasterio.open(raster_path) as src:
                if bands is None:
                    bands = list(range(1, src.count + 1))
                data = src.read(bands)
                meta = src.meta.copy()
                return data, meta
        except Exception as e:
            raise ValueError(f"Failed to load raster data: {str(e)}")

    def clip_raster_by_geometry(self, raster_path: str, geometry: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Clip a raster file by a single feature geometry (e.g., a Polygon).
        """
        try:
            with rasterio.open(raster_path) as src:
                # rasterio.mask.mask expects a list of GeoJSON geometries
                out_image, out_transform = mask(src, [geometry], crop=True)
                out_meta = src.meta.copy()
                out_meta.update({
                    "driver": "GTiff",
                    "height": out_image.shape[1],
                    "width": out_image.shape[2],
                    "transform": out_transform
                })
                return out_image, out_meta
        except Exception as e:
            raise ValueError(f"Raster clipping failed: {str(e)}")

    def extract_field_tile(self, satellite_tile_path: str, field_geometry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Workflow helper: clips a field polygon from a satellite tile and prepares it for analysis.
        """
        # Placeholder logic for raster-based spectral index preparation
        data, metadata = self.clip_raster_by_geometry(satellite_tile_path, field_geometry)
        return {
            "clipped_data_shape": data.shape,
            "crs": str(metadata["crs"]),
            "status": "clipped"
        }

    def summarize_raster_bounds(self, raster_path: str) -> List[float]:
        """
        Utility to return raster bounding box.
        """
        with rasterio.open(raster_path) as src:
            b = src.bounds
            return [float(b.left), float(b.bottom), float(b.right), float(b.top)]

raster_service = RasterService()
