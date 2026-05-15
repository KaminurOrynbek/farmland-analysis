"""results

Revision ID: 009_results
Revises: 008_audit_logs
Create Date: 2026-05-14 20:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009_results'
down_revision = '008_audit_logs'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'spectral_indices',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('ndvi_mean', sa.Float(), nullable=True),
        sa.Column('evi_mean', sa.Float(), nullable=True),
        sa.Column('ndvi_min', sa.Float(), nullable=True),
        sa.Column('ndvi_max', sa.Float(), nullable=True),
        sa.Column('stress_zones_detected', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('analysis_id')
    )
    op.create_table(
        'ml_predictions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('crop_type_prediction', sa.String(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('vegetation_health_index', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('analysis_id')
    )

def downgrade():
    op.drop_table('ml_predictions')
    op.drop_table('spectral_indices')
