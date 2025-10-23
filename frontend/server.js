const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración del backend (ajustar según tu configuración)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Función para verificar si el backend está disponible
async function checkBackendHealth() {
  try {
    await axios.get(`${BACKEND_URL}/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Rutas API para comunicación con el backend
app.post('/api/send-code', async (req, res) => {
  try {
    const { phone, name, institution, contactPhone } = req.body;
    
    // Verificar si el backend está disponible
    const backendAvailable = await checkBackendHealth();
    
    if (!backendAvailable) {
      console.log('Backend no disponible, simulando envío de código...');
      // Simular respuesta exitosa para desarrollo
      return res.json({
        success: true,
        message: 'Código enviado exitosamente (modo desarrollo)',
        code: '12345' // Código fijo para pruebas
      });
    }
    
    const response = await axios.post(`${BACKEND_URL}/api/send-code`, {
      phone,
      name,
      institution,
      contactPhone
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error sending code:', error.message);
    
    // Si es error de conexión, simular respuesta
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('Backend no disponible, simulando envío de código...');
      return res.json({
        success: true,
        message: 'Código enviado exitosamente (modo desarrollo)',
        code: '12345' // Código fijo para pruebas
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Error al enviar código',
      details: error.message 
    });
  }
});

app.post('/api/verify-code', async (req, res) => {
  try {
    const { phone, code, password } = req.body;
    
    // Verificar si el backend está disponible
    const backendAvailable = await checkBackendHealth();
    
    if (!backendAvailable) {
      console.log('Backend no disponible, simulando verificación...');
      // Simular verificación exitosa para desarrollo
      if (code === '12345') {
        return res.json({
          success: true,
          message: 'Código verificado exitosamente (modo desarrollo)',
          user: {
            name: req.body.name || 'Usuario de Prueba',
            phone: phone
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Código incorrecto'
        });
      }
    }
    
    const response = await axios.post(`${BACKEND_URL}/api/verify-code`, {
      phone,
      code,
      password
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error verifying code:', error.message);
    
    // Si es error de conexión, simular respuesta
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('Backend no disponible, simulando verificación...');
      if (code === '12345') {
        return res.json({
          success: true,
          message: 'Código verificado exitosamente (modo desarrollo)',
          user: {
            name: req.body.name || 'Usuario de Prueba',
            phone: phone
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Código incorrecto'
        });
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Error al verificar código',
      details: error.message 
    });
  }
});

// Ruta de estado del servidor
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor frontend funcionando correctamente',
    timestamp: new Date().toISOString(),
    backend_url: BACKEND_URL
  });
});

// Servir la aplicación SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor frontend ejecutándose en http://localhost:${PORT}`);
  console.log(`📡 Backend configurado en: ${BACKEND_URL}`);
  console.log(`📊 Estado del servidor: http://localhost:${PORT}/api/status`);
});
