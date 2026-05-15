"""field_access

Revision ID: 003_field_access
Revises: 002_fields
Create Date: 2026-05-14 20:10:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_field_access'
down_revision = '002_fields'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'field_access',

        sa.Column('id', sa.UUID(), nullable=False),

        sa.Column(
            'field_id',
            sa.UUID(),
            nullable=False
        ),

        sa.Column(
            'user_id',
            sa.UUID(),
            nullable=False
        ),

        sa.Column(
            'access_role',
            sa.Enum(
                'OWNER',
                'EDITOR',
                'VIEWER',
                'CONSULTANT',
                name='field_access_role',
                native_enum=False
            ),
            nullable=False
        ),

        sa.Column(
            'granted_by',
            sa.UUID(),
            nullable=True
        ),

        sa.Column(
            'is_active',
            sa.Boolean(),
            server_default='true',
            nullable=False
        ),

        sa.Column(
            'granted_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),

        sa.Column(
            'revoked_at',
            sa.DateTime(timezone=True),
            nullable=True
        ),

        sa.Column(
            'revoked_by',
            sa.UUID(),
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

        sa.ForeignKeyConstraint(
            ['field_id'],
            ['fields.id']
        ),

        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id']
        ),

        sa.ForeignKeyConstraint(
            ['granted_by'],
            ['users.id']
        ),

        sa.ForeignKeyConstraint(
            ['revoked_by'],
            ['users.id']
        ),

        sa.PrimaryKeyConstraint('id'),

        sa.UniqueConstraint(
            'field_id',
            'user_id',
            name='uq_field_user_access'
        )
    )

    op.create_index(
        'ix_field_access_field_id',
        'field_access',
        ['field_id']
    )

    op.create_index(
        'ix_field_access_user_id',
        'field_access',
        ['user_id']
    )


def downgrade():
    op.drop_index(
        'ix_field_access_user_id',
        table_name='field_access'
    )

    op.drop_index(
        'ix_field_access_field_id',
        table_name='field_access'
    )

    op.drop_table('field_access')