from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from backend.infrastructure.database.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="Farmer")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    fields = relationship("Field", back_populates="owner")

class Field(Base):
    __tablename__ = "fields"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    boundary_geometry = Column(JSON, nullable=False) # Storing GeoJSON dict
    area_ha = Column(Float)
    location_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="fields")
    satellite_images = relationship("SatelliteImage", back_populates="field")
    analyses = relationship("Analysis", back_populates="field")

class SatelliteImage(Base):
    __tablename__ = "satellite_images"

    id = Column(String, primary_key=True, default=generate_uuid)
    field_id = Column(String, ForeignKey("fields.id"))
    platform = Column(String, default="Sentinel-2")
    acquisition_start_date = Column(Date, nullable=False)
    acquisition_end_date = Column(Date, nullable=False)
    cloud_cover_percentage = Column(Float)
    gee_asset_id = Column(String)
    download_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    field = relationship("Field", back_populates="satellite_images")
    analyses = relationship("Analysis", back_populates="satellite_image")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    field_id = Column(String, ForeignKey("fields.id"))
    satellite_image_id = Column(String, ForeignKey("satellite_images.id"), nullable=True)
    analysis_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Pending") # Pending, Processing, Completed, Failed
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    field = relationship("Field", back_populates="analyses")
    satellite_image = relationship("SatelliteImage", back_populates="analyses")
    spectral_indices = relationship("SpectralIndices", back_populates="analysis", uselist=False)
    ml_prediction = relationship("MLPrediction", back_populates="analysis", uselist=False)

class SpectralIndices(Base):
    __tablename__ = "spectral_indices"

    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"))
    ndvi_mean = Column(Float, nullable=True)
    evi_mean = Column(Float, nullable=True)
    ndvi_min = Column(Float, nullable=True)
    ndvi_max = Column(Float, nullable=True)
    stress_zones_detected = Column(Integer, default=0)

    analysis = relationship("Analysis", back_populates="spectral_indices")

class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"))
    crop_type_prediction = Column(String)
    confidence_score = Column(Float)
    vegetation_health_index = Column(Integer)
    risk_level = Column(String)
    model_version = Column(String, default="ResNet-50-EuroSAT-v1")

    analysis = relationship("Analysis", back_populates="ml_prediction")
