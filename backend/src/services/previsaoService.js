const {
  loadForecastSummary,
  summaryToGeoJson,
} = require("./pipelineForecastRepository");

function createPrevisaoService() {
  async function getPrevisao() {
    const summary = await loadForecastSummary({
      envPathName: "PIPELINE_PREVISAO_PATH",
    });

    return summaryToGeoJson(summary);
  }

  return {
    getPrevisao,
  };
}

module.exports = {
  createPrevisaoService,
};