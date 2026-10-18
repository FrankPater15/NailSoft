// URL del backend. Se cambia al compilar, por ejemplo:
//   flutter run --dart-define=API_URL=http://10.0.2.2:3000   (emulador de Android)
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3000',
);
