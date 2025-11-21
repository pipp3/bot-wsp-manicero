import dotenv from 'dotenv';
import axios from 'axios';

// Cargar variables de entorno
dotenv.config();

// Configuración de Meta/WhatsApp
export const META_CONFIG = {
  VERIFY_TOKEN: process.env.VERIFY_TOKEN,
  ACCESS_TOKEN: process.env.ACCESS_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  API_VERSION: 'v22.0'
};

// Función para enviar mensajes a través de la API de WhatsApp
export async function enviarMensaje(numero, texto) {
  const url = `https://graph.facebook.com/${META_CONFIG.API_VERSION}/${META_CONFIG.PHONE_NUMBER_ID}/messages`;
  
  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: numero,
        text: { body: texto },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${META_CONFIG.ACCESS_TOKEN}`,
        },
      }
    );
    console.log(`✅ Mensaje enviado a ${numero}: ${texto}`);
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error.response?.data || error.message);
    throw error;
  }
}