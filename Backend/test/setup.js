// Entorno de pruebas: base de datos propia y secreto fijo, para no tocar los datos de desarrollo
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-con-mas-de-32-caracteres';
process.env.MONGODB_CNN = process.env.MONGODB_CNN_TEST || 'mongodb://127.0.0.1:27017/NailsSoft_test';
