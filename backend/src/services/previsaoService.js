const fs = require("fs/promises");
const path = require("path");

const DEFAULT_PREVISAO_PATH = path.resolve(
  __dirname,
  "../../../pipeline/data/processed/grid_combinado.json",
);

async function readJsonFile(filePath) {
  const rawData = await fs.readFile(filePath, "utf8");
  return JSON.parse(rawData);
}

function createPrevisaoService() {
  async function getPrevisao() {
    const configuredPath = process.env.PIPELINE_PREVISAO_PATH || DEFAULT_PREVISAO_PATH;
    const payload = await readJsonFile(configuredPath);

    return {
      fonte: "pipeline",
      caminho: configuredPath,
      atualizado_em: new Date().toISOString(),
      dados: payload,
    };
  }

  return {
    getPrevisao,
  };
}

module.exports = {
  createPrevisaoService,
};