const { Schema, model } = require("mongoose");

const UsuarioSchema = Schema({
  nombre: {
    type: String,
    required: [true, "El nombre es obligatorio"],
  },
  apellido: {
    // Nuevo campo agregado
    type: String,
    required: [true, "El apellido es obligatorio"],
  },
  email: {
    type: String,
    required: [true, "El email es obligatorio"], // Cambiar mensaje de error para el email
    unique: true, // Asegurar que el email sea único
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Por favor, ingrese un email válido"], // Validación de formato de email
  },
  celular: {
    // Nuevo campo agregado
    type: String,
    required: [true, "El celular es obligatorio"],
    match: [/^[0-9]{10}$/, "Por favor, ingrese un número de celular válido"], // Validación de formato de celular (10 dígitos)
  },
  password: {
    type: String,
    required: [true, "La contraseña es obligatoria"], // Cambiar mensaje de error para el password
    minlength: [7, "La contraseña debe tener al menos 7 caracteres"], // Cambiar el mínimo de 3 a 7
    maxlength: [60, "La contraseña no puede superar los 60 caracteres"],
  },
  rol: {
    type: Schema.Types.ObjectId,
    ref: "Rol",
    required: [true, "El rol es obligatorio"],
    index: true,
  },
  estado: {
    type: Boolean,
    default: true,
    required: [true, "El estado es obligatorio"],
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  resetPasswordAttempts: { type: Number, default: 0 }, // Intentos fallidos del código actual
  // Los tokens emitidos antes de esta fecha dejan de ser válidos (se actualiza al cambiar la contraseña)
  passwordChangedAt: Date,
});

// Marca el cambio de contraseña para invalidar las sesiones abiertas
UsuarioSchema.pre("save", function (next) {
  if (this.isModified("password") && !this.isNew) this.passwordChangedAt = new Date();
  next();
});

UsuarioSchema.pre("findOneAndUpdate", function (next) {
  const cambios = this.getUpdate() || {};
  if (cambios.password || cambios.$set?.password) this.set({ passwordChangedAt: new Date() });
  next();
});

module.exports = model("Usuario", UsuarioSchema);
