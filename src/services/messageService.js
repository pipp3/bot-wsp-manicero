import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const META_API_URL = "https://graph.facebook.com/v22.0";
const { PHONE_NUMBER_ID, META_TOKEN } = process.env;

const headers = {
  Authorization: `Bearer ${META_TOKEN}`,
  "Content-Type": "application/json",
};

// Enviar mensaje de texto normal
export async function sendMessage(to, text) {
  try {
    await axios.post(
      `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      { headers }
    );
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error.response?.data || error.message);
  }
}

// Enviar mensaje usando plantilla aprobada por Meta
export async function sendTemplate(to, templateName, lang = "es") {
  try {
    await axios.post(
      `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: lang },
        },
      },
      { headers }
    );
  } catch (error) {
    console.error("❌ Error enviando template:", error.response?.data || error.message);
  }
}
