const express = require("express");

const { createOcorrenciasController } = require("./controllers/ocorrenciasController");
const { createClimaController } = require("./controllers/climaController");
const { createPrevisaoController } = require("./controllers/previsaoController");
const { createOcorrenciasService } = require("./services/ocorrenciasService");
const { createClimaService } = require("./services/climaService");
const { createPrevisaoService } = require("./services/previsaoService");

function createRoutes({ pool }) {
  const router = express.Router();

  const ocorrenciasService = createOcorrenciasService({ pool });
  const climaService = createClimaService();
  const previsaoService = createPrevisaoService();

  const ocorrenciasController = createOcorrenciasController({ ocorrenciasService });
  const climaController = createClimaController({ climaService });
  const previsaoController = createPrevisaoController({ previsaoService });

  router.get("/clima", climaController.getClima);
  router.get("/previsao", previsaoController.getPrevisao);
  router.get("/ocorrencias", ocorrenciasController.listOcorrencias);
  router.post("/ocorrencias", ocorrenciasController.createOcorrencia);

  return router;
}

module.exports = {
  createRoutes,
};