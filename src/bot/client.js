const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let latestQR = null;
let isReady = false;

const client = new Client({
  puppeteer: {
    args: [
      '--no-sandbox']
  }
});

client.on('qr', async (qr) => {
  latestQR = await qrcode.toDataURL(qr);
  isReady = false; // Se necesita escanear el QR de nuevo
  console.log('Nuevo QR generado');
});

client.on('ready', () => {
  console.log('✅ Cliente WhatsApp listo');
  latestQR = null; // Ya no se necesita el QR
  isReady = true;
});

client.initialize();

module.exports = {
  client,
  getQR: () => latestQR,
  isClientReady: () => isReady
};