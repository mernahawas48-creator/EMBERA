from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_context().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        op.execute(
            "ALTER TABLE observations ADD COLUMN location geometry(Point, 4326) "
            "GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED"
        )
        op.execute("CREATE INDEX ix_observations_location ON observations USING GIST (location)")


def downgrade():
    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TABLE observations DROP COLUMN location")
