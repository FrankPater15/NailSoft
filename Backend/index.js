require('dotenv').config();

// Sin estas variables el servidor no puede funcionar de forma segura
const faltantes = ['MONGODB_CNN', 'JWT_SECRET'].filter((nombre) => !process.env[nombre]);
if (faltantes.length) {
    console.error(`Faltan variables de entorno: ${faltantes.join(', ')}. Revisa Backend/.env (ver .env.example).`);
    process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET debe tener al menos 32 caracteres aleatorios.');
    process.exit(1);
}

const Server = require('./modules/server')

const server = new Server()

server.listen()
