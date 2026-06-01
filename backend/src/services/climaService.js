const fs = require("fs/promises");
const path = require("path");

const DEFAULT_CLIMATE_PATH = path.resolve(
  __dirname,
  "../../../pipeline/data/processed/grid_combinado.json",
);

function createClimaService() {
  async function getClima() {
    const climatePath = process.env.PIPELINE_CLIMATE_PATH || DEFAULT_CLIMATE_PATH;

    try {
      const rawData = await fs.readFile(climatePath, "utf8");
      const data = JSON.parse(rawData);

      return {
        fonte: "pipeline",
        caminho: climatePath,
        atualizado_em: new Date().toISOString(),
        dados: data,
      };
    } catch (error) {
      throw new Error(`Clima indisponivel em ${climatePath}`);
    }
  }

  return {
    getClima,
  };
}

module.exports = {
  createClimaService,
};