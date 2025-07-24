const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.toDataURL(qr, (err, url) => {
        console.log('Escanea este QR abriendo esta URL en el navegador:');
        console.log(url);
    });
});

client.initialize();