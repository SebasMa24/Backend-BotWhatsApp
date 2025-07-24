const express = require('express');
const path = require('path');
const cors = require('cors');
const { getQR, isClientReady } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/qr', (req, res) => {
  const ready = isClientReady();
  const qr = getQR();

  if (ready) {
    res.json({ status: 'ready' });
  } else if (qr) {
    res.json({ status: 'waiting', qr });
  } else {
    res.status(404).json({ status: 'loading', error: 'QR aún no disponible' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});