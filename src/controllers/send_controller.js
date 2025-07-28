const { client, isClientReady } = require('../bot/client');
const { MessageMedia } = require('whatsapp-web.js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function descargarArchivo(url) {
  const extension = path.extname(url).split('.').pop() || 'bin';
  const nombreArchivo = `${uuidv4()}.${extension}`;
  const carpetaTemp = path.join(__dirname, '../temp');
  const rutaArchivo = path.join(carpetaTemp, nombreArchivo);

  if (!fs.existsSync(carpetaTemp)) {
    fs.mkdirSync(carpetaTemp, { recursive: true });
  }

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Referer': 'https://file-examples.com/'
    }
  });

  const writer = fs.createWriteStream(rutaArchivo);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', () => resolve(rutaArchivo));
    writer.on('error', reject);
  });
}

const sendMessages = async (req, res) => {
  if (!isClientReady()) {
    return res.status(503).json({ error: 'El cliente de WhatsApp no está listo.' });
  }

  const mediaUrl = req.body.mediaUrl || '';
  const plantilla = req.body.mensajePlantilla || '';

  if (!req.file) {
    return res.status(400).json({ error: 'Falta el archivo Excel.' });
  }

  if (!plantilla || !plantilla.includes('{Nombre}')) {
    return res.status(400).json({
      error: 'Debe incluir una plantilla de mensaje válida con al menos {Nombre}.'
    });
  }

  const resultados = [];
  let media = null;
  let rutaMediaDescargada = '';

  try {
    console.log('Archivo recibido:', req.file.originalname);
    console.log('Plantilla:', plantilla);
    console.log('Media URL:', mediaUrl);

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel no contiene datos válidos.' });
    }

    // ✅ Descargar media desde URL al sistema de archivos
    if (mediaUrl) {
      try {
        rutaMediaDescargada = await descargarArchivo(mediaUrl);

        // Verificar tamaño antes de intentar enviar (máximo 16MB)
        const stats = fs.statSync(rutaMediaDescargada);
        if (stats.size > 16 * 1024 * 1024) {
          throw new Error('El archivo multimedia supera el límite de 16MB para WhatsApp.');
        }

        media = MessageMedia.fromFilePath(rutaMediaDescargada);
        console.log('✅ Media descargada y cargada desde archivo local.');
      } catch (err) {
        console.warn('⚠️ No se pudo obtener el media:', err.message);
      }
    }

    for (const row of data) {
      const nombre = row.Nombre?.toString().trim() || '';
      const celular = String(row.Celular || '').replace(/\D/g, '').trim();
      const prefijo = (row.Prefijo || row.Genero || '').toString().trim();

      if (!nombre || !celular || celular.length < 10) {
        resultados.push({
          to: celular || 'N/A',
          status: '❌ Datos incompletos o número inválido'
        });
        continue;
      }

      let mensajePersonalizado = plantilla;
      for (const key in row) {
        const valor = row[key]?.toString().trim() || '';
        const regex = new RegExp(`{${key}}`, 'g');
        mensajePersonalizado = mensajePersonalizado.replace(regex, valor);
      }

      const number = celular.includes('@c.us') ? celular : `${celular}@c.us`;

      try {
        await client.sendMessage(number, mensajePersonalizado);

        if (media) {
          await delay(1000);
          await client.sendMessage(number, media);
        }

        resultados.push({ to: celular, status: '✅ Enviado con éxito' });
      } catch (innerErr) {
        resultados.push({
          to: celular,
          status: `❌ Error al enviar: ${innerErr.message}`
        });
      }

      await delay(1200);
    }

  } catch (err) {
    console.error('❌ Error procesando el Excel:', err);
    return res.status(500).json({
      error: 'Error al procesar el archivo',
      details: err.message
    });
  } finally {
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn('⚠️ No se pudo eliminar el archivo temporal:', e.message);
    }
    /*
    if (rutaMediaDescargada && fs.existsSync(rutaMediaDescargada)) {
      try {
        fs.unlinkSync(rutaMediaDescargada);
      } catch (e) {
        console.warn('⚠️ No se pudo eliminar el archivo media descargado:', e.message);
      }
    }*/
  }

  res.json({ success: true, results: resultados });
};

module.exports = { sendMessages };
