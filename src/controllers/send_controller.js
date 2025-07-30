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
      'Accept': '*/*'
    }
  });

  const writer = fs.createWriteStream(rutaArchivo);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', () => resolve(rutaArchivo));
    writer.on('error', reject);
  });
}

function esVideo(path) {
  return /\.(mp4|mov|avi|mkv|webm)$/i.test(path);
}

const sendMessages = async (req, res) => {
  console.log('🔄 Iniciando envío de mensajes...');

  if (!isClientReady()) {
    console.warn('🚫 Cliente de WhatsApp no está listo');
    return res.status(503).json({ error: 'El cliente de WhatsApp no está listo.' });
  }

  const mediaUrl = req.body.mediaUrl || '';
  const plantilla = req.body.mensajePlantilla || '';

  if (!req.file) {
    console.warn('🚫 No se recibió archivo Excel');
    return res.status(400).json({ error: 'Falta el archivo Excel.' });
  }

  if (!plantilla || !plantilla.toLowerCase().includes('{nombre}')) {
    console.warn('🚫 Plantilla no contiene marcador {Nombre}');
    return res.status(400).json({
      error: 'Debe incluir una plantilla de mensaje válida con al menos {Nombre}.'
    });
  }

  const resultados = [];
  let media = null;
  let rutaMediaDescargada = '';

  try {
    console.log('✅ Archivo recibido:', req.file.originalname);
    console.log('📝 Plantilla:', plantilla);
    console.log('🌐 Media URL:', mediaUrl);

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('🚫 Excel vacío o no válido');
      return res.status(400).json({ error: 'El archivo Excel no contiene datos válidos.' });
    }

    let esArchivoVideo = false;

    if (mediaUrl) {
      try {
        console.log('⬇️ Descargando media desde URL...');
        rutaMediaDescargada = await descargarArchivo(mediaUrl);
        console.log('📁 Media guardado en:', rutaMediaDescargada);

        const stats = fs.statSync(rutaMediaDescargada);
        console.log('📏 Tamaño del archivo media:', stats.size, 'bytes');

        if (stats.size > 16 * 1024 * 1024) {
          throw new Error('El archivo multimedia supera el límite de 16MB para WhatsApp.');
        }

        esArchivoVideo = esVideo(rutaMediaDescargada);
        media = MessageMedia.fromFilePath(rutaMediaDescargada);
        console.log('✅ Media cargada en objeto MessageMedia');

      } catch (err) {
        console.warn('⚠️ No se pudo obtener el media:', err.message);
      }
    }

    for (const [index, row] of data.entries()) {
      console.log(`📨 Procesando fila ${index + 1}:`, row);

      const nombre = row.Nombre?.toString().trim() || '';
      const celular = String(row.Celular || '').replace(/\D/g, '').trim();
      const prefijo = (row.Prefijo || row.Genero || '').toString().trim();

      let mensajePersonalizado = plantilla;

      const valoresNormalizados = {};
      for (const key in row) {
        valoresNormalizados[key.toLowerCase()] = row[key]?.toString().trim() || '';
      }

      mensajePersonalizado = mensajePersonalizado.replace(/{(.*?)}/g, (_, variable) => {
        const valor = valoresNormalizados[variable.toLowerCase()];
        return valor !== undefined ? valor : `{${variable}}`;
      });

      const number = celular.includes('@c.us') ? celular : `${celular}@c.us`;
      console.log(`📱 Enviando a ${number} -> Mensaje:`, mensajePersonalizado);

      try {
        await client.sendMessage(number, mensajePersonalizado);
        console.log(`✅ Mensaje enviado a ${number}`);

        if (media) {
          await delay(1000);
          console.log(`📎 Enviando media a ${number} (${esArchivoVideo ? 'video/documento' : 'imagen'})`);
          if (esArchivoVideo) {
            await client.sendMessage(number, media, { sendMediaAsDocument: true });
          } else {
            await client.sendMessage(number, media);
          }
          console.log(`✅ Media enviada a ${number}`);
        }

        resultados.push({ to: celular, status: '✅ Enviado con éxito' });

      } catch (innerErr) {
        console.error(`❌ Error al enviar a ${celular}:`, innerErr.message);
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
      console.log('🗑️ Archivo Excel temporal eliminado');
    } catch (e) {
      console.warn('⚠️ No se pudo eliminar el archivo temporal:', e.message);
    }

    if (rutaMediaDescargada && fs.existsSync(rutaMediaDescargada)) {
      try {
        fs.unlinkSync(rutaMediaDescargada);
        console.log('🗑️ Media descargada eliminada');
      } catch (e) {
        console.warn('⚠️ No se pudo eliminar el archivo media descargado:', e.message);
      }
    }
  }

  console.log('✅ Proceso de envío finalizado');
  res.json({ success: true, results: resultados });
};

module.exports = { sendMessages };
