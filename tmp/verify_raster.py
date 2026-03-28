import sys
import os

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_imports():
    try:
        from backend.services.raster_service import raster_service
        from backend.services.analysis_service import run_analysis
        print("Foundation Imports: SUCCESS")
        
        # Check if helper methods exist
        methods = ["load_raster_metadata", "load_raster", "clip_raster_by_geometry"]
        for m in methods:
            if hasattr(raster_service, m):
                print(f"RasterService.{m}: OK")
            else:
                print(f"RasterService.{m}: MISSING")
                
    except Exception as e:
        print(f"Foundation Imports: FAILED - {e}")

if __name__ == "__main__":
    test_imports()
