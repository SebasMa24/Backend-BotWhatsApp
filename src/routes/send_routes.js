const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { sendMessages,disconnectClient } = require('../controllers/send_controller');


/**
 * @swagger
 * /api/send:
 *   post:
 *     summary: Enviar mensajes personalizados por WhatsApp desde un archivo Excel.
 *     description: Envía mensajes a una lista de contactos especificada en un archivo Excel. Puede incluir un mensaje personalizado y un archivo multimedia (imagen o video) mediante una URL.
 *     tags:
 *       - WhatsApp Bot
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               mensajePlantilla:
 *                 type: string
 *                 example: Hola {Nombre}, tu pedido de {Producto} está listo.
 *               mediaUrl:
 *                 type: string
 *                 example: https://i.imgur.com/imagen.jpg
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "Archivo Excel (.xlsx) con las columnas: Nombre, Celular, Producto, etc."
 *     responses:
 *       200:
 *         description: Mensajes enviados correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       to:
 *                         type: string
 *                         example: "573138600528"
 *                       status:
 *                         type: string
 *                         example: "✅ Enviado con éxito"
 *       400:
 *         description: Petición mal formada (plantilla inválida o archivo vacío).
 *       500:
 *         description: Error interno del servidor al procesar el archivo.
 */
router.post('/send', upload.fields([
  { name: 'excel', maxCount: 1 },
  { name: 'mediaFile', maxCount: 1 }
]), sendMessages);

router.get('/disconnect', disconnectClient);

module.exports = router;