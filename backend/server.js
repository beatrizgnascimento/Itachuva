const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  }),
);
app.use(express.json());

const pool = new Pool({
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

let postgisEnabled = false;

async function ensureSchema() {
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
        descricao TEXT,
        origem TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        ${postgisEnabled ? "geom GEOGRAPHY(Point, 4326)," : ""}
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await client.query(baseTable);

    if (postgisEnabled) {
      await client.query(
        "CREATE INDEX IF NOT EXISTS ocorrencias_geom_idx ON ocorrencias USING GIST (geom)",
      );
    }
  } finally {
    client.release();
  }
}

ensureSchema().catch((error) => {
  console.error("Falha ao preparar schema", error);
});

app.get("/api/clima", (req, res) => {
  res.json({
    cidade: "Itajuba",
    temperatura_c: 24,
    chuva_mm: 65.2,
    umidade: 80,
    atualizado_em: new Date().toISOString(),
  });
});

app.post("/api/ocorrencias", async (req, res) => {
  const { nivel, descricao, origem, latitude, longitude } = req.body || {};

  if (!nivel || Number.isNaN(Number(nivel))) {
    return res.status(400).json({ error: "Nivel invalido" });
  }

  const lat = latitude ? Number(latitude) : null;
  const lon = longitude ? Number(longitude) : null;

  try {
    const query = postgisEnabled
      ? `
        INSERT INTO ocorrencias (nivel, descricao, origem, latitude, longitude, geom)
        VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 IS NOT NULL AND $5 IS NOT NULL THEN ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography ELSE NULL END)
        RETURNING *
      `
      : `
        INSERT INTO ocorrencias (nivel, descricao, origem, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

    const values = [nivel, descricao || null, origem || "frontend", lat, lon];
    const result = await pool.query(query, values);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao salvar ocorrencia", error);
    return res.status(500).json({ error: "Falha ao salvar ocorrencia" });
  }
});

app.get("/api/ocorrencias", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nivel, descricao, origem, latitude, longitude, created_at FROM ocorrencias ORDER BY created_at DESC",
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar ocorrencias", error);
    return res.status(500).json({ error: "Falha ao listar ocorrencias" });
  }
});

app.listen(port, () => {
  console.log(`Backend ativo na porta ${port}`);
});
