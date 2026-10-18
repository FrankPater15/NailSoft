const { Schema, model } = require("mongoose");

const InsumoSchema = new Schema({
  nombreInsumo: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  precio: {
    type: Number,
    required: true,
    min: 0,
  },
  estado: {
    type: Boolean,
    default: true,
  },
  bajas: [
    {
      // Relación con BajaProducto
      type: Schema.Types.ObjectId,
      ref: "BajaProducto",
    },
  ],
});

module.exports = model("Insumo", InsumoSchema);
