import { META_CONFIG, enviarMensaje } from '../config/meta.js';
import { procesarMensaje } from './flowController.js';

// 🔹 Verificación del webhook (GET)
export const verificarWebhook = (req, res) => {
  const verify_token = META_CONFIG.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === verify_token) {
    console.log("✅ Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  console.log("❌ Token de verificación incorrecto");
  return res.sendStatus(403);
};

// 🔹 Recepción de mensajes (POST)
export const recibirMensaje = async (req, res) => {
  const body = req.body;

  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const from = message.from; // número del cliente
      const text = message.text?.body || "";

      console.log(`📩 Mensaje de ${from}: ${text}`);

      try {
        // Procesar mensaje usando el flujo de bienvenida
        await procesarMensaje(from, text);
      } catch (error) {
        console.error("❌ Error procesando mensaje:", error);
        // Fallback: enviar mensaje de error genérico
        await enviarMensaje(from, "Lo siento, hubo un error procesando tu mensaje. Por favor intenta nuevamente.");
      }
    }

    return res.sendStatus(200);
  } else {
    console.log("❌ Objeto de webhook no válido");
    return res.sendStatus(404);
  }
};