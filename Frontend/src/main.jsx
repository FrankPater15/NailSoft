import React from 'react'
import ReactDOM from 'react-dom/client'
import './util/authRequests'
import App from './App'
// main.tsx o main.jsx
import './tailwind.css';

import { AuthProvider } from './context/AuthContext' // asegúrate que exista

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
