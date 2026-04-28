const dotenv = require("dotenv");
const app = require("./app");
const initDb = require("./config/initDb");

dotenv.config();

const PORT = process.env.PORT || 3000;
const dbType = (process.env.DATABASE_TYPE || "postgres").toLowerCase();

const startServer = async () => {
  if (["postgres", "postgresql", "pg"].includes(dbType)) {
    await initDb();
  } else if (["mongodb", "mongo"].includes(dbType)) {
    const initMongo = require("./config/mongoInit");
    await initMongo();
  } else {
    throw new Error(`Base de datos desconocida: ${dbType}`);
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("No se pudo inicializar la base de datos:", error);
  process.exit(1);
});
