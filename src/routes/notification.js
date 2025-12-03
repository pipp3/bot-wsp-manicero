import express from 'express';
import { sendMessage } from '../services/messageService.js';

const router = express.Router();

router.post('/api/notificar-pedido', async (req, res) => {
    const { id_pedido, estado, telefono } = req.body;

    if (!id_pedido || !estado || !telefono) {
        console.error('❌ Faltan datos para notificación:', req.body);
        return res.status(400).json({ error: 'Faltan datos requeridos (id_pedido, estado, telefono)' });
    }

    try {
        const mensaje = `🔔 *Actualización de Pedido* 🔔\n\nTu pedido *#${id_pedido}* ha cambiado de estado a: *${estado.toUpperCase()}*.\n\nGracias por tu preferencia! 🥜`;
        await sendMessage(telefono, mensaje);
        console.log(`✅ Notificación enviada a ${telefono} para pedido #${id_pedido}`);
        res.status(200).json({ success: true, message: 'Notificación enviada' });
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        res.status(500).json({ error: 'Error interno al enviar notificación' });
    }
});

export default router;
