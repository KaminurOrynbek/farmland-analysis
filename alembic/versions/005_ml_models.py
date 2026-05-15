"""ml_models

Revision ID: 005_ml_models
Revises: 004_satellite_images
Create Date: 2026-05-14 20:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_ml_models'
down_revision = '004_satellite_images'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ml_models',

        sa.Column('id', sa.UUID(), nullable=False),

        sa.Column('name', sa.String(), nullable=False),
        sa.Column('version', sa.String(), nullable=False),

        sa.Column('framework', sa.String(), nullable=True),

        sa.Column('metrics', postgresql.JSONB(), nullable=True),

        sa.Column('storage_url', sa.String(), nullable=True),

        sa.Column(
            'is_active',
            sa.Boolean(),
            server_default=sa.text('true'),
            nullable=False
        ),

        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),

        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('ml_models')