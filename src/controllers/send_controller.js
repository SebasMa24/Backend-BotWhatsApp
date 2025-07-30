const { client, isClientReady } = require('../bot/client');
const { MessageMedia } = require('whatsapp-web.js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuración
const CONFIG = {
  DELAY_BETWEEN_MESSAGES: 1200,
  DELAY_BEFORE_MEDIA: 1000,
  MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB
  TEMP_FOLDER: path.join(__dirname, '../temp'),
  VIDEO_EXTENSIONS: ['mp4', 'mov', 'avi', 'mkv', 'webm']
};

// Utilitarios
const FileUtils = {
  createTempDirectory: () => {
    if (!fs.existsSync(CONFIG.TEMP_FOLDER)) {
      fs.mkdirSync(CONFIG.TEMP_FOLDER, { recursive: true });
    }
  },

  deleteFile: (filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo eliminar archivo temporal ${filePath}:`, error.message);
    }
  },

  isVideo: (filePath) => {
    const extension = path.extname(filePath).toLowerCase().slice(1);
    return CONFIG.VIDEO_EXTENSIONS.includes(extension);
  },

  validateFileSize: (filePath) => {
    const stats = fs.statSync(filePath);
    if (stats.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(`El archivo supera el límite de ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB para WhatsApp.`);
    }
  }
};

const NetworkUtils = {
  downloadFile: async (url) => {
    const extension = path.extname(url).split('.').pop() || 'bin';
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(CONFIG.TEMP_FOLDER, fileName);

    FileUtils.createTempDirectory();

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      }
    });

    const writer = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  }
};

const MessageUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  normalizeTemplateVariables: (row) => {
    const normalized = {};
    for (const key in row) {
      normalized[key.toLowerCase()] = row[key]?.toString().trim() || '';
    }
    return normalized;
  },

  replaceTemplateVariables: (template, variables) => {
    return template.replace(/{(.*?)}/g, (_, variable) => {
      const value = variables[variable.toLowerCase()];
      return value !== undefined ? value : `{${variable}}`;
    });
  },

  formatPhoneNumber: (phone) => {
    const cleaned = String(phone || '').replace(/\D/g, '').trim();
    return cleaned.includes('@c.us') ? cleaned : `${cleaned}@c.us`;
  }
};

// Procesamiento de archivos
const FileProcessor = {
  processExcelFile: (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet);
  },

  processUploadedMedia: (uploadedFile) => {
    try {
      console.log('📎 Procesando archivo multimedia subido:', uploadedFile.originalname);

      const mime = uploadedFile.mimetype;
      const extension = mime.split('/')[1] || 'bin';
      const fileName = `${uuidv4()}.${extension}`;
      const filePath = path.join(CONFIG.TEMP_FOLDER, fileName);

      FileUtils.createTempDirectory();
      fs.copyFileSync(uploadedFile.path, filePath);
      FileUtils.validateFileSize(filePath);

      return {
        path: filePath,
        media: MessageMedia.fromFilePath(filePath),
        isVideo: FileUtils.isVideo(filePath)
      };
    } catch (error) {
      console.error('⚠️ Error al procesar media subido:', error.message);
      throw error;
    }
  },

  processMediaUrl: async (url) => {
    try {
      console.log('⬇️ Descargando media desde URL:', url);
      const filePath = await NetworkUtils.downloadFile(url);
      FileUtils.validateFileSize(filePath);

      return {
        path: filePath,
        media: MessageMedia.fromFilePath(filePath),
        isVideo: FileUtils.isVideo(filePath)
      };
    } catch (error) {
      console.error('⚠️ Error al descargar media desde URL:', error.message);
      throw error;
    }
  }
};

const sendMessages = async (req, res) => {
  console.log('🔄 Iniciando envío de mensajes...');

  // Lista de archivos temporales a eliminar
  const tempFilesToDelete = [];

  try {
    if (!isClientReady()) {
      console.warn('🚫 Cliente de WhatsApp no está listo');
      return res.status(503).json({ error: 'El cliente de WhatsApp no está listo.' });
    }

    const { mediaUrl, mensajePlantilla: template } = req.body;
    const excelFile = req.files?.excel?.[0];
    const uploadedMedia = req.files?.mediaFile?.[0];

    
    tempFilesToDelete.push(excelFile.path);
    if (uploadedMedia) tempFilesToDelete.push(uploadedMedia.path);

    // Validación: Solo un medio permitido (URL o archivo subido)
    if (mediaUrl && uploadedMedia) {
      console.warn('🚫 Se recibieron ambos: mediaUrl y archivo multimedia');
      return res.status(400).json({ 
        error: 'Solo se permite un medio a la vez: URL o archivo subido, no ambos.' 
      });
    }

    // Validaciones adicionales
    if (!excelFile) {
      console.warn('🚫 No se recibió archivo Excel');
      return res.status(400).json({ error: 'Falta el archivo Excel.' });
    }

    if (!template || !/{\s*nombre\s*}/i.test(template)) {
      console.warn('🚫 Plantilla no contiene marcador {Nombre}');
      return res.status(400).json({
        error: 'Debe incluir una plantilla de mensaje válida con al menos {Nombre}.'
      });
    }

    console.log('✅ Archivo recibido:', excelFile.originalname);
    console.log('📝 Plantilla:', template);
    console.log('🌐 Media URL:', mediaUrl);
    console.log('📎 Archivo multimedia subido:', uploadedMedia?.originalname || 'Ninguno');

    // Procesar Excel
    const data = FileProcessor.processExcelFile(excelFile.path);
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('🚫 Excel vacío o no válido');
      return res.status(400).json({ error: 'El archivo Excel no contiene datos válidos.' });
    }

    // Procesar media
    let mediaInfo = null;
    if (uploadedMedia) {
      mediaInfo = FileProcessor.processUploadedMedia(uploadedMedia);
      tempFilesToDelete.push(mediaInfo.path);
      console.log('✅ Media local lista para enviar');
    } else if (mediaUrl) {
      mediaInfo = await FileProcessor.processMediaUrl(mediaUrl);
      tempFilesToDelete.push(mediaInfo.path);
      console.log('✅ Media descargada desde URL lista para enviar');
    }

    // Resto del código de envío de mensajes...
    const results = [];
    for (const [index, row] of data.entries()) {
      console.log(`📨 Procesando fila ${index + 1}:`, row);

      const phoneNumber = MessageUtils.formatPhoneNumber(row.Celular);
      const variables = MessageUtils.normalizeTemplateVariables(row);
      const message = MessageUtils.replaceTemplateVariables(template, variables);

      console.log(`📱 Enviando a ${phoneNumber} -> Mensaje:`, message);

      try {
        await client.sendMessage(phoneNumber, message);
        console.log(`✅ Mensaje enviado a ${phoneNumber}`);

        if (mediaInfo) {
          await MessageUtils.delay(CONFIG.DELAY_BEFORE_MEDIA);
          console.log(`📎 Enviando media a ${phoneNumber} (${mediaInfo.isVideo ? 'video/documento' : 'imagen'})`);
          
          const options = mediaInfo.isVideo ? { sendMediaAsDocument: true } : {};
          await client.sendMessage(phoneNumber, mediaInfo.media, options);
          
          console.log(`✅ Media enviada a ${phoneNumber}`);
        }

        results.push({ to: phoneNumber, status: '✅ Enviado con éxito' });
      } catch (error) {
        console.error(`❌ Error al enviar a ${phoneNumber}:`, error.message);
        results.push({
          to: phoneNumber,
          status: `❌ Error al enviar: ${error.message}`
        });
      }

      await MessageUtils.delay(CONFIG.DELAY_BETWEEN_MESSAGES);
    }

    console.log('✅ Proceso de envío finalizado');
    return res.json({ success: true, results });
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    return res.status(500).json({
      error: 'Error al procesar la solicitud',
      details: error.message
    });
  } finally {
    console.log(tempFilesToDelete);
    tempFilesToDelete.forEach(filePath => FileUtils.deleteFile(filePath));
  }
};

module.exports = { sendMessages };