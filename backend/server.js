const { createApp } = require("./src/app");

require("dotenv").config();

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`Backend ativo na porta ${port}`);
});
