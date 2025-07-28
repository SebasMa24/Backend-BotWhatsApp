const express = require('express');
const router = express.Router();
const { getQrStatus } = require('../controllers/qr_controller');

router.get('/qr', getQrStatus);

module.exports = router;