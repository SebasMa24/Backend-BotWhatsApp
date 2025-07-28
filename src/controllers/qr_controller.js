const { getQR, isClientReady } = require('../bot/client');

const getQrStatus = (req, res) => {
  const ready = isClientReady();
  const qr = getQR();

  if (ready) {
    return res.json({ status: 'ready' });
  } else if (qr) {
    return res.json({ status: 'waiting', qr });
  } else {
    return res.status(404).json({ status: 'loading', error: 'QR aún no disponible' });
  }
};

module.exports = { getQrStatus };