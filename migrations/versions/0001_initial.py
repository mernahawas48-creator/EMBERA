from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "observations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("fingerprint", sa.String(64), nullable=False, unique=True),
        sa.Column("day", sa.Date, nullable=False),
        sa.Column("utc", sa.String(17), nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("x", sa.Integer, nullable=False),
        sa.Column("y", sa.Integer, nullable=False),
        sa.Column("sensor", sa.String(5), nullable=False),
        sa.Column("platform", sa.String(16), nullable=False),
        sa.Column("source", sa.String(255), nullable=False),
        sa.Column("raw", sa.JSON, nullable=False),
    )
    op.create_index("ix_observations_day_lat_lon", "observations", ["day", "latitude", "longitude"])
    op.create_table(
        "coverage",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("region", sa.String(32), nullable=False),
        sa.Column("platform", sa.String(16), nullable=False),
        sa.Column("start", sa.Date, nullable=False),
        sa.Column("end", sa.Date, nullable=False),
        sa.Column("source", sa.String(255), nullable=False),
        sa.UniqueConstraint("region", "platform", "start", "end", "source"),
    )


def downgrade():
    op.drop_table("coverage")
    op.drop_table("observations")
