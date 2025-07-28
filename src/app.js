const express = require('express');
const cors = require('cors');
const path = require('path');

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

module.exports = app;