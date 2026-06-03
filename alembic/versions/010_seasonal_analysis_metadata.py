"""Add seasonal field and analysis metadata

Revision ID: 010_seasonal_analysis_metadata
Revises: e6f84edec125
Create Date: 2026-06-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "010_seasonal_analysis_metadata"
down_revision = "e6f84edec125"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("fields", sa.Column("crop_type", sa.String(), nullable=True))
    op.add_column("fields", sa.Column("planting_date", sa.Date(), nullable=True))
    op.add_column("fields", sa.Column("season_year", sa.Integer(), nullable=True))

    op.add_column("analyses", sa.Column("season_year", sa.Integer(), nullable=True))
    op.add_column("analyses", sa.Column("requested_start_date", sa.Date(), nullable=True))
    op.add_column("analyses", sa.Column("requested_end_date", sa.Date(), nullable=True))
    op.add_column("analyses", sa.Column("satellite_acquisition_date", sa.Date(), nullable=True))
    op.add_column("analyses", sa.Column("satellite_source", sa.String(), nullable=True))
    op.add_column("analyses", sa.Column("cloud_coverage", sa.Float(), nullable=True))
    op.add_column("analyses", sa.Column("quality_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.execute(
        """
        UPDATE analyses
        SET season_year = EXTRACT(YEAR FROM created_at)
        WHERE season_year IS NULL
        """
    )


def downgrade():
    op.drop_column("analyses", "quality_flags")
    op.drop_column("analyses", "cloud_coverage")
    op.drop_column("analyses", "satellite_source")
    op.drop_column("analyses", "satellite_acquisition_date")
    op.drop_column("analyses", "requested_end_date")
    op.drop_column("analyses", "requested_start_date")
    op.drop_column("analyses", "season_year")

    op.drop_column("fields", "season_year")
    op.drop_column("fields", "planting_date")
    op.drop_column("fields", "crop_type")
