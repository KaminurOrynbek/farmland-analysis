from datetime import date
from typing import List, Dict, Any, Optional

from backend.services.season_service import resolve_monitoring_window

class SatelliteService:
    DATASETS = {
        "sentinel2": {
            "label": "Sentinel-2",
            "resolution": "10m"
        },
        "landsat": {
            "label": "Landsat 8-9",
            "resolution": "30m"
        }
    }

    def fetch_satellite_metadata(
        self,
        dataset: str,
        bbox: List[float],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        season_year: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Returns transparent satellite request metadata for the selected monitoring window.
        """
        dataset_key = dataset.lower() if dataset and dataset.lower() in self.DATASETS else "sentinel2"
        dataset_meta = self.DATASETS[dataset_key]
        requested_start, requested_end, resolved_season = resolve_monitoring_window(
            season_year=season_year,
            start_date=start_date,
            end_date=end_date
        )

        return {
            "dataset": dataset_key,
            "satellite_source": dataset_meta["label"],
            "acquisition_date": None,
            "start_date": requested_start.isoformat(),
            "end_date": requested_end.isoformat(),
            "season_year": resolved_season,
            "resolution": dataset_meta["resolution"],
            "bbox": bbox,
            "cloud_coverage": None,
            "quality_flags": None,
            "status": "metadata_ready"
        }

satellite_service = SatelliteService()
