const { Schema, model } = require("mongoose");

const ClienteSchema = Schema({
  nombrecliente: {
    type: String,
    required: true,
  },
  apellidocliente: {
    // Nuevo campo agregado
    type: String,
    required: true,
  },
  correocliente: {
    type: String,
    required: true,
    unique: true, // Asegura que no haya duplicados de correo de cliente
    lowercase: true,
    trim: true,
  },
  usuario: {
    // Cuenta con la que el cliente inicia sesión (opcional: puede existir sin cuenta)
    type: Schema.Types.ObjectId,
    ref: "Usuario",
  },
  celularcliente: {
    type: String,
    required: true,
    unique: true,
  },
  estadocliente: {
    type: Boolean,
    default: true,
    required: [true, "El estado es obligatorio"],
  },
});

// Un usuario corresponde a lo sumo a un cliente
ClienteSchema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { usuario: { $type: "objectId" } } });

module.exports = model("Cliente", ClienteSchema);
