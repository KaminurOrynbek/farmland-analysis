import geopandas as gpd
import pandas as pd
from shapely.geometry import shape
from typing import List, Dict, Any, Tuple, Optional

def load_geojson_geodataframe(data: Dict[str, Any]) -> gpd.GeoDataFrame:
    """
    Load GeoJSON dictionary into a GeoPandas GeoDataFrame.
    """
    if data.get("type") == "Feature":
        gdf = gpd.GeoDataFrame.from_features([data])
    else:
        gdf = gpd.GeoDataFrame.from_features(data.get("features", []))
    
    if gdf.empty:
        raise ValueError("No valid features found in GeoJSON")
        
    if gdf.crs is None:
        gdf.set_crs(epsg=4326, inplace=True)
        
    return gdf

def validate_geometries(gdf: gpd.GeoDataFrame) -> bool:
    """
    Validate that all geometries in the GeoDataFrame are valid.
    """
    if not all(gdf.is_valid):
        # We could also gdf.make_valid() here if needed
        return False
    return True

def compute_bbox(gdf: gpd.GeoDataFrame) -> List[float]:
    """
    Compute the total bounding box for the entire GeoDataFrame.
    """
    bounds = gdf.total_bounds
    return [float(bounds[0]), float(bounds[1]), float(bounds[2]), float(bounds[3])]

def compute_area_metrics(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Compute area for each feature in m2 and ha using a projected CRS.
    """
    # Use EPSG:3857 for equal-area calculations in this prototype
    gdf_projected = gdf.to_crs(epsg=3857)
    gdf['area_m2'] = gdf_projected.geometry.area
    gdf['area_ha'] = gdf['area_m2'] / 10000.0
    return gdf

def extract_feature_geometries(gdf: gpd.GeoDataFrame) -> List[Dict[str, Any]]:
    """
    Extract structured geometry metadata for each feature.
    """
    field_geometries = []
    for i, row in gdf.iterrows():
        geom = row.geometry
        bounds = geom.bounds # (minx, miny, maxx, maxy)
        centroid = geom.centroid
        
        field_geometries.append({
            "feature_index": int(i),
            "geometry_type": str(geom.geom_type),
            "bounds": [float(bounds[0]), float(bounds[1]), float(bounds[2]), float(bounds[3])],
            "centroid": [float(centroid.x), float(centroid.y)],
            "area_m2": round(float(row['area_m2']), 2),
            "area_ha": round(float(row['area_ha']), 4)
        })
    return field_geometries

def build_field_metadata(gdf: gpd.GeoDataFrame) -> Dict[str, Any]:
    """
    Assemble the final structured geospatial metadata object.
    """
    # Ensure area metrics are computed
    gdf = compute_area_metrics(gdf)
    
    bbox = compute_bbox(gdf)
    field_geometries = extract_feature_geometries(gdf)
    
    return {
        "features": len(gdf),
        "total_area_m2": round(float(gdf['area_m2'].sum()), 2),
        "total_area_ha": round(float(gdf['area_ha'].sum()), 4),
        "bbox": bbox,
        "crs": str(gdf.crs),
        "field_geometries": field_geometries
    }

def process_geojson_upload(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Standard entry point for processing uploaded GeoJSON.
    Uses modular helpers to build analysis-ready metadata.
    """
    gdf = load_geojson_geodataframe(data)
    
    if not validate_geometries(gdf):
        # Optional: gdf.geometry = gdf.make_valid() 
        pass
        
    metadata = build_field_metadata(gdf)
    return metadata

def get_field_boundaries():
    # Placeholder for field boundaries data
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"id": "field_01", "name": "Field A", "crop": "Wheat", "health": "Good"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[71.39, 51.13], [71.44, 51.13], [71.44, 51.17], [71.39, 51.17], [71.39, 51.13]]]
                }
            }
        ]
    }
