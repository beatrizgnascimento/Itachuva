const { Pool } = require("pg");

let postgisEnabled = false;

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    ssl:
      process.env.PGSSLMODE === "require"
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

async function ensureSchema(pool) {
  const client = await pool.connect();

  try {
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
      postgisEnabled = true;
    } catch (error) {
      console.warn("PostGIS indisponivel, seguindo sem geometrias", error);
      postgisEnabled = false;
    }

    const baseTable = `
      CREATE TABLE IF NOT EXISTS ocorrencias (
        id SERIAL PRIMARY KEY,
        nivel SMALLINT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'alagamento',
        descricao TEXT,
        origem TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        ${postgisEnabled ? "geom GEOGRAPHY(Point, 4326)," : ""}
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await client.query(baseTable);

    await client.query("ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'alagamento'");

    if (postgisEnabled) {
      await client.query(
        "CREATE INDEX IF NOT EXISTS ocorrencias_geom_idx ON ocorrencias USING GIST (geom)",
      );
    }
  } finally {
    client.release();
  }
}

function getPostgisEnabled() {
  return postgisEnabled;
}

module.exports = {
  createPool,
  ensureSchema,
  getPostgisEnabled,
};