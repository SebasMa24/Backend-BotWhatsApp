const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger');
const qrRoutes = require('./routes/qr_routes');
const sendRoutes = require('./routes/send_routes');

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

// Rutas
app.use('/api', qrRoutes);
app.use('/api', sendRoutes);

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = app;