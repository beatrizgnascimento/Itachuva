function createClimaController({ climaService }) {
  async function getClima(req, res) {
    try {
      const clima = await climaService.getClima();
      return res.json(clima);
    } catch (error) {
      console.error("Erro ao obter clima", error);
      return res.status(503).json({ error: "Falha ao obter clima" });
    }
  }

  return {
    getClima,
  };
}

module.exports = {
  createClimaController,
};