"""fields

Revision ID: 002_fields
Revises: 001_users
Create Date: 2026-05-14 20:05:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_fields'
down_revision = '001_users'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'fields',

        sa.Column('id', sa.UUID(), nullable=False),

        sa.Column(
            'owner_id',
            sa.UUID(),
            nullable=False
        ),

        sa.Column(
            'name',
            sa.String(),
            nullable=False
        ),

        sa.Column(
            'boundary_geom',
            postgresql.JSONB(),
            nullable=True
        ),

        sa.Column(
            'area_ha',
            sa.Numeric(10, 2),
            nullable=True
        ),

        sa.Column(
            'location_name',
            sa.String(),
            nullable=True
        ),

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

        sa.Column(
            'deleted_at',
            sa.DateTime(timezone=True),
            nullable=True
        ),

        sa.ForeignKeyConstraint(
            ['owner_id'],
            ['users.id']
        ),

        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        'ix_fields_owner_id',
        'fields',
        ['owner_id']
    )


def downgrade():
    op.drop_index('ix_fields_owner_id', table_name='fields')
    op.drop_table('fields')