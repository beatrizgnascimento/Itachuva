const { loadForecastSummary, summaryToClimate } = require("./pipelineForecastRepository");

function createClimaService() {
  async function getClima() {
    const summary = await loadForecastSummary({
      envPathName: "PIPELINE_CLIMA_PATH",
    });

    return summaryToClimate(summary);
  }

  return {
    getClima,
  };
}

module.exports = {
  createClimaService,
};