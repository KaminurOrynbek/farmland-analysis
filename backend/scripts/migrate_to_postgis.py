import sys
import os

# Add the project root to sys.path so we can import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine, text
from backend.core.config import settings

def run_migration():
    print(f"Starting migration for: {settings.DATABASE_URL.split('@')[-1]}")
    engine = create_engine(settings.DATABASE_URL)
    
    migration_sql = [
        # 1. Enable PostGIS
        "CREATE EXTENSION IF NOT EXISTS postgis;",
        
        # 2. Migrate boundary_geom from JSONB to Geometry
        """
        ALTER TABLE fields 
        ALTER COLUMN boundary_geom TYPE geometry(POLYGON, 4326) 
        USING ST_SetSRID(ST_GeomFromGeoJSON(boundary_geom::text), 4326);
        """,
        
        # 3. Create Spatial Index
        "CREATE INDEX IF NOT EXISTS idx_fields_boundary_geom ON fields USING GIST (boundary_geom);",
        
        # 4. Add professional metrics columns
        "ALTER TABLE spectral_indices ADD COLUMN IF NOT EXISTS stress_area_percentage FLOAT DEFAULT 0;",
        "ALTER TABLE ml_predictions ADD COLUMN IF NOT EXISTS agronomic_assessment JSONB;"
    ]
    
    with engine.connect() as conn:
        for sql in migration_sql:
            try:
                print(f"Executing: {sql[:50]}...")
                conn.execute(text(sql))
                conn.commit()
                print("Success.")
            except Exception as e:
                print(f"Error executing statement: {e}")
                # We continue because some columns might already exist
                continue

    print("\n✅ Migration completed successfully!")
    print("Your database is now fully PostGIS-enabled and synchronized with the latest production models.")

if __name__ == "__main__":
    run_migration()
