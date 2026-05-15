"""analyses

Revision ID: 006_analyses
Revises: 005_ml_models
Create Date: 2026-05-14 20:25:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_analyses'
down_revision = '005_ml_models'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'analyses',

        sa.Column('id', sa.UUID(), nullable=False),

        sa.Column('field_id', sa.UUID(), nullable=False),
        sa.Column('model_id', sa.UUID(), nullable=True),

        sa.Column(
            'analysis_type',
            sa.Enum(
                'CROP_CLASSIFICATION',
                'HEALTH_ANALYSIS',
                'STRESS_DETECTION',
                'SOIL_ANALYSIS',
                'YIELD_PREDICTION',
                name='analysis_type',
                native_enum=False
            ),
            nullable=False
        ),

        sa.Column(
            'status',
            sa.Enum(
                'PENDING',
                'PROCESSING',
                'COMPLETED',
                'FAILED',
                'CANCELLED',
                name='analysis_status',
                native_enum=False
            ),
            nullable=False
        ),

        sa.Column('celery_task_id', sa.String(), nullable=True),

        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),

        sa.Column('processing_time_ms', sa.Integer(), nullable=True),

        sa.Column(
            'retry_count',
            sa.Integer(),
            server_default=sa.text('0'),
            nullable=False
        ),

        sa.Column('error_message', sa.String(), nullable=True),

        sa.Column('analysis_results', postgresql.JSONB(), nullable=True),

        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),

        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),

        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        sa.ForeignKeyConstraint(['field_id'], ['fields.id']),
        sa.ForeignKeyConstraint(['model_id'], ['ml_models.id']),

        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'analysis_images',

        sa.Column('id', sa.UUID(), nullable=False),

        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('satellite_image_id', sa.UUID(), nullable=False),

        sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id']),
        sa.ForeignKeyConstraint(['satellite_image_id'], ['satellite_images.id']),

        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('analysis_images')
    op.drop_table('analyses')