"""users

Revision ID: 001_users
Revises:
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "001_users"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():

    op.create_table(
        "users",

        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False
        ),

        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False
        ),

        sa.Column(
            "password_hash",
            sa.String(length=255),
            nullable=False
        ),

        sa.Column(
            "full_name",
            sa.String(length=255),
            nullable=False
        ),

        # хранится как обычная строка
        sa.Column(
            "role",
            sa.String(length=32),
            nullable=False
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False
        ),

        sa.Column(
            "email_verified",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False
        ),

        sa.Column(
            "last_login_at",
            sa.DateTime(timezone=True)
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),

        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True)
        ),

        sa.UniqueConstraint("email")
    )

    op.create_index(
        "ix_users_email",
        "users",
        ["email"],
        unique=True
    )


def downgrade():

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")