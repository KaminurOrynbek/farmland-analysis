"""satellite_images

Revision ID: 004_satellite_images
Revises: 003_field_access
Create Date: 2026-05-14 20:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_satellite_images'
down_revision = '003_field_access'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'satellite_images',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('field_id', sa.UUID(), nullable=False),
        sa.Column('platform', sa.Enum('SENTINEL_2', 'LANDSAT_8', name='platform_type', native_enum=False), nullable=False),
        sa.Column('acquisition_date', sa.Date(), nullable=True),
        sa.Column('acquisition_start_date', sa.Date(), nullable=True),
        sa.Column('acquisition_end_date', sa.Date(), nullable=True),
        sa.Column('cloud_cover_percentage', sa.Float(), nullable=True),
        sa.Column('resolution_meters', sa.Float(), nullable=True),
        sa.Column('gee_asset_id', sa.String(), nullable=True),
        sa.Column('download_url', sa.String(), nullable=True),
        sa.Column('checksum', sa.String(), nullable=True),
        sa.Column('bands', postgresql.JSONB(), nullable=True),
        sa.Column('bbox', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['field_id'], ['fields.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('satellite_images')
