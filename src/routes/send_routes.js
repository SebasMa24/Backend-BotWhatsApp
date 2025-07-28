const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { sendMessages } = require('../controllers/send_controller');

router.post('/send', upload.single('excel'), sendMessages);

module.exports = router;