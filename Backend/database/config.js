const mongoose = require("mongoose");

const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CNN);
    console.log("Datos en Linea");
  } catch (error) {
    console.error("Error al conectarse a la base de datos:", error.message);
    process.exit(1);
  }
};

module.exports = {
  dbConnection,
};
