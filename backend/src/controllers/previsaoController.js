function createPrevisaoController({ previsaoService }) {
  async function getPrevisao(req, res) {
    try {
      const previsao = await previsaoService.getPrevisao();
      return res.json(previsao);
    } catch (error) {
      console.error("Erro ao obter previsao", error);
      return res.status(503).json({ error: "Falha ao obter previsao" });
    }
  }

  return {
    getPrevisao,
  };
}

module.exports = {
  createPrevisaoController,
};