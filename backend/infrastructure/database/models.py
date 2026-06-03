import enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Float, Numeric, Date, Enum as SQLEnum, Table, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from datetime import datetime
import uuid

from backend.infrastructure.database.database import Base

# =========================
# ENUMS
# =========================

class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    FARMER = "FARMER"
    AGRONOMIST = "AGRONOMIST"

class FieldAccessRole(enum.Enum):
    OWNER = "OWNER"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"

class PlatformType(enum.Enum):
    SENTINEL_2 = "SENTINEL_2"
    LANDSAT_8 = "LANDSAT_8"

class AnalysisStatus(enum.Enum):
    PENDING = "PENDING"
    INGESTING = "INGESTING"
    PROCESSING = "PROCESSING"
    DONE = "DONE"
    FAILED = "FAILED"

class AnalysisType(enum.Enum):
    CROP_CLASSIFICATION = "CROP_CLASSIFICATION"
    HEALTH_ANALYSIS = "HEALTH_ANALYSIS"
    STRESS_DETECTION = "STRESS_DETECTION"
    SOIL_ANALYSIS = "SOIL_ANALYSIS"
    YIELD_PREDICTION = "YIELD_PREDICTION"

class ArtifactType(enum.Enum):
    NDVI_MAP = "NDVI_MAP"
    EVI_MAP = "EVI_MAP"
    HEATMAP = "HEATMAP"
    SEGMENTATION_MASK = "SEGMENTATION_MASK"
    GEOTIFF = "GEOTIFF"
    PDF_REPORT = "PDF_REPORT"
    RAW_EXPORT = "RAW_EXPORT"

# =========================
# USERS
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole, native_enum=False), nullable=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    owned_fields = relationship("Field", back_populates="owner")
    access_rights = relationship("FieldAccess", back_populates="user", foreign_keys="FieldAccess.user_id")

# =========================
# FIELDS
# =========================

class Field(Base):
    __tablename__ = "fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    boundary_geom = Column(Geometry(geometry_type='POLYGON', srid=4326), comment='PostGIS POLYGON WGS84')
    area_ha = Column(Numeric, comment='Auto-calculated from geometry')
    location_name = Column(String)
    crop_type = Column(String)
    planting_date = Column(Date)
    season_year = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    owner = relationship("User", back_populates="owned_fields")
    access_control = relationship("FieldAccess", back_populates="field")
    satellite_images = relationship("SatelliteImage", back_populates="field")
    analyses = relationship("Analysis", back_populates="field")

# =========================
# FIELD ACCESS CONTROL
# =========================

class FieldAccess(Base):
    __tablename__ = "field_access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = Column(UUID(as_uuid=True), ForeignKey("fields.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    access_role = Column(SQLEnum(FieldAccessRole, native_enum=False), nullable=False)
    granted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_active = Column(Boolean, default=True, nullable=False)
    granted_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime(timezone=True))
    revoked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint('field_id', 'user_id', name='uq_field_user_access'),)

    field = relationship("Field", back_populates="access_control")
    user = relationship("User", back_populates="access_rights", foreign_keys=[user_id])

# =========================
# SATELLITE IMAGES
# =========================

class SatelliteImage(Base):
    __tablename__ = "satellite_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = Column(UUID(as_uuid=True), ForeignKey("fields.id"), nullable=False)
    platform = Column(SQLEnum(PlatformType, native_enum=False), nullable=False)
    acquisition_date = Column(Date)
    acquisition_start_date = Column(Date)
    acquisition_end_date = Column(Date)
    cloud_cover_percentage = Column(Float, comment='0-100')
    resolution_meters = Column(Float)
    gee_asset_id = Column(String)
    download_url = Column(String, comment='GEO/S3/MinIO path')
    checksum = Column(String, comment='Deduplication hash')
    bands = Column(JSONB, comment='Available spectral bands')
    bbox = Column(JSONB, comment='GeoJSON POLYGON')
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    field = relationship("Field", back_populates="satellite_images")
    analyses = relationship("Analysis", secondary="analysis_images", back_populates="satellite_images")

# =========================
# ML MODELS REGISTRY
# =========================

class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    framework = Column(String, comment='PyTorch, TensorFlow, etc')
    metrics = Column(JSONB, comment='Accuracy, F1, IoU, etc')
    storage_url = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    analyses = relationship("Analysis", back_populates="model")

# =========================
# ANALYSES
# =========================

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = Column(UUID(as_uuid=True), ForeignKey("fields.id"), nullable=False)
    model_id = Column(UUID(as_uuid=True), ForeignKey("ml_models.id"))
    analysis_type = Column(SQLEnum(AnalysisType, native_enum=False), nullable=False)
    status = Column(SQLEnum(AnalysisStatus, native_enum=False), nullable=False)
    celery_task_id = Column(String, comment='Celery async task ID')
    progress_percent = Column(Integer, default=0)
    current_stage = Column(String, default="Pending")
    season_year = Column(Integer)
    requested_start_date = Column(Date)
    requested_end_date = Column(Date)
    satellite_acquisition_date = Column(Date)
    satellite_source = Column(String)
    cloud_coverage = Column(Float)
    quality_flags = Column(JSONB)
    input_key = Column(String, comment='S3 key for raw imagery')
    result_key = Column(String, comment='S3 key for processed results map')
    event_log = Column(JSONB, default=list, comment='List of events {timestamp, stage, progress}')
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    processing_time_ms = Column(Integer)
    retry_count = Column(Integer, default=0)
    error_message = Column(String)
    analysis_results = Column(JSONB, comment='Predictions, indices, zones, metadata')
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    field = relationship("Field", back_populates="analyses")
    model = relationship("MLModel", back_populates="analyses")
    satellite_images = relationship("SatelliteImage", secondary="analysis_images", back_populates="analyses")
    artifacts = relationship("AnalysisArtifact", back_populates="analysis")

    # One-to-one relationships for results
    spectral_indices = relationship("SpectralIndices", uselist=False, back_populates="analysis")
    ml_prediction = relationship("MLPrediction", uselist=False, back_populates="analysis")

# =========================
# ANALYSIS ↔ IMAGES
# MANY-TO-MANY RELATION
# =========================

class AnalysisImage(Base):
    __tablename__ = "analysis_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=False)
    satellite_image_id = Column(UUID(as_uuid=True), ForeignKey("satellite_images.id"), nullable=False)

# =========================
# ANALYSIS ARTIFACTS
# =========================

class AnalysisArtifact(Base):
    __tablename__ = "analysis_artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=False)
    artifact_type = Column(SQLEnum(ArtifactType, native_enum=False), nullable=False)
    storage_url = Column(String, nullable=False)
    mime_type = Column(String)
    file_size_mb = Column(Float)
    metadata_json = Column(JSONB, name="metadata")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    analysis = relationship("Analysis", back_populates="artifacts")


# =========================
# AUDIT LOGS
# =========================

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    entity_type = Column(String, nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String, nullable=False)
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    metadata_json = Column(JSONB, name="metadata", comment="Additional context for the action")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user = relationship("User")

# New model for Expert/User comments on fields
class FieldComment(Base):
    __tablename__ = "field_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = Column(UUID(as_uuid=True), ForeignKey("fields.id"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    comment = Column(String, nullable=False)
    markers = Column(JSONB, comment="Array of {point: {lat, lng}, type, label}")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    field = relationship("Field", backref="comments")
    author = relationship("User")

# New model for spectral indices results
class SpectralIndices(Base):
    __tablename__ = "spectral_indices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=False, unique=True)
    ndvi_mean = Column(Float)
    evi_mean = Column(Float)
    ndvi_min = Column(Float)
    ndvi_max = Column(Float)
    stress_zones_detected = Column(Integer)
    stress_area_percentage = Column(Float)

    analysis = relationship("Analysis", back_populates="spectral_indices")

# New model for ML prediction results
class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=False, unique=True)
    crop_type_prediction = Column(String)
    confidence_score = Column(Float)
    vegetation_health_index = Column(Float)
    risk_level = Column(String)
    agronomic_assessment = Column(JSONB)

    analysis = relationship("Analysis", back_populates="ml_prediction")







