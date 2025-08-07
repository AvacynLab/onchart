"""create ticks, candles, news, sentiment tables

Revision ID: 0001_create_tables
Revises: 
Create Date: 2025-08-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_create_tables"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "ticks",
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("ts", sa.Float(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("volume", sa.Float(), nullable=False),
    )
    op.execute("CREATE INDEX idx_ticks_symbol_ts ON ticks(symbol, ts DESC)")

    op.create_table(
        "candles",
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("interval", sa.String(), nullable=False),
        sa.Column("ts", sa.Float(), nullable=False),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Float(), nullable=False),
    )
    op.execute("CREATE INDEX idx_candles_symbol_ts ON candles(symbol, ts DESC)")

    op.create_table(
        "news",
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.String(), nullable=False),
        sa.Column("ts", sa.Integer(), nullable=False),
        sa.Column("link", sa.String(), nullable=True, unique=True),
    )
    op.execute("CREATE INDEX idx_news_ts ON news(ts DESC)")

    op.create_table(
        "sentiment",
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("text", sa.String(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("subjectivity", sa.Float(), nullable=False),
        sa.Column("ts", sa.Integer(), nullable=False),
    )
    op.execute("CREATE INDEX idx_sentiment_symbol_ts ON sentiment(symbol, ts DESC)")

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_sentiment_symbol_ts")
    op.drop_table("sentiment")
    op.execute("DROP INDEX IF EXISTS idx_news_ts")
    op.drop_table("news")
    op.execute("DROP INDEX IF EXISTS idx_candles_symbol_ts")
    op.drop_table("candles")
    op.execute("DROP INDEX IF EXISTS idx_ticks_symbol_ts")
    op.drop_table("ticks")
