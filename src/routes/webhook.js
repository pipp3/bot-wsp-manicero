import express from 'express';
import { verificarWebhook, recibirMensaje } from '../controllers/webhookController.js';

const router = express.Router();

// 🔹 Ruta para verificación del webhook (GET)
router.get('/webhook', verificarWebhook);

// 🔹 Ruta para recepción de mensajes (POST)
router.post('/webhook', recibirMensaje);

export default router;