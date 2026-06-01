const fs = require("fs/promises");
const path = require("path");

const DEFAULT_FORECAST_PATH = path.resolve(
  __dirname,
  "../../../pipeline/data/processed/grid_combinado.json",
);

const RISK_ORDER = {
  baixo: 1,
  medio: 2,
  alto: 3,
};

async function readJson(filePath) {
  const rawData = await fs.readFile(filePath, "utf8");
  return JSON.parse(rawData);
}

function getForecastPath(envPathName) {
  return process.env[envPathName] || DEFAULT_FORECAST_PATH;
}

function validateForecastSummary(summary) {
  if (!summary || typeof summary !== "object") {
    throw new Error("Resumo de previsao invalido");
  }

  if (!Array.isArray(summary.cells) || summary.cells.length === 0) {
    throw new Error("Resumo de previsao sem celulas");
  }

  summary.cells.forEach((cell, index) => {
    if (!cell || typeof cell !== "object") {
      throw new Error(`Celula invalida em ${index}`);
    }

    if (!cell.id || typeof cell.id !== "string") {
      throw new Error(`Celula sem id em ${index}`);
    }

    if (!Array.isArray(cell.polygon) || cell.polygon.length < 4) {
      throw new Error(`Celula sem poligono valido em ${cell.id}`);
    }

    if (!cell.metrics || typeof cell.metrics !== "object") {
      throw new Error(`Celula sem metricas em ${cell.id}`);
    }
  });

  return summary;
}

async function loadForecastSummary({ envPathName }) {
  const forecastPath = getForecastPath(envPathName);
  const summary = await readJson(forecastPath);

  return validateForecastSummary(summary);
}

function toGeoJsonPolygon(cell) {
  return [cell.polygon.map(([longitude, latitude]) => [longitude, latitude])];
}

function summaryToGeoJson(summary) {
  validateForecastSummary(summary);

  return {
    type: "FeatureCollection",
    features: summary.cells.map((cell) => ({
      type: "Feature",
      properties: {
        id: cell.id,
        chuva_mm: cell.metrics.chuva_mm,
        temperatura: cell.metrics.temperatura,
        umidade: cell.metrics.umidade,
        grau_risco: cell.metrics.grau_risco,
      },
      geometry: {
        type: "Polygon",
        coordinates: toGeoJsonPolygon(cell),
      },
    })),
  };
}

function summarizeAverage(cells, metricName) {
  if (!cells.length) {
    return null;
  }

  const total = cells.reduce((sum, cell) => sum + Number(cell.metrics?.[metricName] || 0), 0);
  return Number((total / cells.length).toFixed(1));
}

function summarizeRisk(cells) {
  return cells
    .map((cell) => cell.metrics?.grau_risco)
    .filter(Boolean)
    .sort((left, right) => (RISK_ORDER[right] || 0) - (RISK_ORDER[left] || 0))[0] || "baixo";
}

function summaryToClimate(summary) {
  validateForecastSummary(summary);

  const cells = summary.cells;

  return {
    cidade: summary.region?.name || "Itajuba-MG",
    temperatura_c: summarizeAverage(cells, "temperatura"),
    chuva_mm: summarizeAverage(cells, "chuva_mm"),
    umidade: summarizeAverage(cells, "umidade"),
    grau_risco: summarizeRisk(cells),
    atualizado_em: summary.generated_at || new Date().toISOString(),
  };
}

module.exports = {
  loadForecastSummary,
  summaryToGeoJson,
  summaryToClimate,
  validateForecastSummary,
};