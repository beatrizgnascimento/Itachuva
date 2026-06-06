const { getPostgisEnabled } = require("../db");

function createOcorrenciasService({ pool }) {
  async function createOcorrencia(payload) {
    const postgisEnabled = getPostgisEnabled();

    const query = postgisEnabled
      ? `
        INSERT INTO ocorrencias (nivel, tipo, descricao, origem, latitude, longitude, geom)
        VALUES ($1, $2, $3, $4, $5::float, $6::float, CASE WHEN $5 IS NOT NULL AND $6 IS NOT NULL THEN ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography ELSE NULL END)
        RETURNING id, nivel, tipo, descricao, origem, latitude, longitude, created_at
      `
      : `
        INSERT INTO ocorrencias (nivel, tipo, descricao, origem, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5::float, $6::float)
        RETURNING id, nivel, tipo, descricao, origem, latitude, longitude, created_at
      `;

    const values = [
      payload.nivel,
      payload.tipo,
      payload.descricao || "",
      payload.origem,
      String(payload.latitude),
      String(payload.longitude),
    ];

    console.log("Executing query:", query);
    console.log("With values:", values);

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async function listOcorrencias({ limit = 100 } = {}) {
    const result = await pool.query(
      "SELECT id, nivel, tipo, descricao, origem, latitude, longitude, created_at FROM ocorrencias ORDER BY created_at DESC LIMIT $1",
      [limit],
    );

    return result.rows;
  }

  return {
    createOcorrencia,
    listOcorrencias,
  };
}

module.exports = {
  createOcorrenciasService,
};