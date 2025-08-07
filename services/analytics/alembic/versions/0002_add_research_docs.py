"""add research_docs table

Revision ID: 0002_add_research_docs
Revises: 0001_create_tables
Create Date: 2025-08-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_research_docs"
down_revision = "0001_create_tables"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "research_docs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("json", sa.Text(), nullable=False),
        sa.Column(
            "ts_created",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("(strftime('%s','now'))"),
        ),
    )


def downgrade() -> None:
    op.drop_table("research_docs")
