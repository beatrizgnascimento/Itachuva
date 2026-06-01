const express = require("express");
const cors = require("cors");

const { createRoutes } = require("./routes");
const { createPool, ensureSchema } = require("./db");

function createApp() {
  const app = express();
  const pool = createPool();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
    }),
  );
  app.use(express.json());

  app.locals.pool = pool;

  app.use("/api", createRoutes({ pool }));

  ensureSchema(pool).catch((error) => {
    console.error("Falha ao preparar schema", error);
  });

  return app;
}

module.exports = {
  createApp,
};