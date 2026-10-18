const { Schema, model } = require('mongoose');

const EmpleadoSchema = Schema({
    nombreempleado: {
        type: String,
        required: true
    },
    apellidoempleado: {
        type: String,
        required: true
    },
    correoempleado: {
        type: String,
        required: true,
        unique: true, // Asegura que no haya duplicados de correo de empleado
        lowercase: true,
        trim: true
    },
    usuario: { // Cuenta con la que el empleado inicia sesión (opcional)
        type: Schema.Types.ObjectId,
        ref: 'Usuario'
    },
    telefonoempleado: {
        type: String,
        required: true
    },
    estadoempleado: {
        type: Boolean,
        default: true,
        required: [true, 'El estado es obligatorio']
    }
});

// Un usuario corresponde a lo sumo a un empleado
EmpleadoSchema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { usuario: { $type: 'objectId' } } });

module.exports = model('Empleado', EmpleadoSchema);