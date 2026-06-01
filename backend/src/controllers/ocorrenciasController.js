function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeText(value, fallback = null) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function createOcorrenciasController({ ocorrenciasService }) {
  async function createOcorrencia(req, res) {
    const nivel = normalizeNumber(req.body?.nivel);
    const tipo = normalizeText(req.body?.tipo, "alagamento");
    const descricao = normalizeText(req.body?.descricao);
    const origem = normalizeText(req.body?.origem, "frontend");
    const latitude = normalizeNumber(req.body?.latitude);
    const longitude = normalizeNumber(req.body?.longitude);

    if (!nivel || nivel < 1 || nivel > 5) {
      return res.status(400).json({ error: "Nivel invalido" });
    }

    if (!tipo) {
      return res.status(400).json({ error: "Tipo invalido" });
    }

    try {
      const created = await ocorrenciasService.createOcorrencia({
        nivel,
        tipo,
        descricao,
        origem,
        latitude,
        longitude,
      });

      return res.status(201).json(created);
    } catch (error) {
      console.error("Erro ao salvar ocorrencia", error);
      return res.status(500).json({ error: "Falha ao salvar ocorrencia" });
    }
  }

  async function listOcorrencias(req, res) {
    const limit = normalizeNumber(req.query?.limit);

    try {
      const data = await ocorrenciasService.listOcorrencias({
        limit: limit && limit > 0 ? Math.min(limit, 200) : 100,
      });

      return res.json(data);
    } catch (error) {
      console.error("Erro ao listar ocorrencias", error);
      return res.status(500).json({ error: "Falha ao listar ocorrencias" });
    }
  }

  return {
    createOcorrencia,
    listOcorrencias,
  };
}

module.exports = {
  createOcorrenciasController,
};