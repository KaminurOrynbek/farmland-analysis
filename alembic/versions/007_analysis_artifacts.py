"""analysis_artifacts

Revision ID: 007_analysis_artifacts
Revises: 006_analyses
Create Date: 2026-05-14 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_analysis_artifacts'
down_revision = '006_analyses'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'analysis_artifacts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('artifact_type', sa.Enum('NDVI_MAP', 'EVI_MAP', 'HEATMAP', 'SEGMENTATION_MASK', 'GEOTIFF', 'PDF_REPORT', 'RAW_EXPORT', name='artifact_type', native_enum=False), nullable=False),
        sa.Column('storage_url', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('file_size_mb', sa.Float(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('analysis_artifacts')
