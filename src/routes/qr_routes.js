const express = require('express');
const router = express.Router();
const { getQrStatus } = require('../controllers/qr_controller');

/**
 * @swagger
 * /api/qr:
 *   get:
 *     summary: Obtener estado del cliente de WhatsApp y el código QR.
 *     description: Retorna si el cliente de WhatsApp está listo o si está esperando que se escanee el código QR. En caso de estar esperando, devuelve el QR en base64.
 *     tags:
 *       - WhatsApp Bot
 *     responses:
 *       200:
 *         description: Estado actual del cliente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ready"
 *                   description: Estado puede ser "ready", "waiting" o "loading".
 *                 qr:
 *                   type: string
 *                   description: Imagen QR codificada en base64. Solo presente si el estado es "waiting".
 *       404:
 *         description: El QR aún no está disponible (cliente iniciando).
 */
router.get('/qr', getQrStatus);

module.exports = router;