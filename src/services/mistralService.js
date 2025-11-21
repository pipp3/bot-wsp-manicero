import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({ apiKey: apiKey });

/**
 * Detecta el nombre del producto que el usuario está buscando
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Promise<string|null>} - El nombre del producto detectado o null
 */
export async function detectarProducto(mensaje) {
  try {
    const prompt = `Eres un asistente que ayuda a identificar productos de frutos secos en consultas de clientes.

Los productos disponibles son:
- Maní con sal
- Almendras
- Mani Mix Salado

Analiza el siguiente mensaje del cliente y extrae ÚNICAMENTE el nombre exacto del producto que está buscando.
Si el cliente menciona alguno de estos productos (aunque lo escriba de forma diferente o con errores), devuelve el nombre EXACTO del producto de la lista anterior.
Si no menciona ningún producto específico, devuelve "null".

Mensaje del cliente: "${mensaje}"

Responde SOLO con el nombre exacto del producto de la lista (sin comillas, sin puntos, sin explicaciones) o "null".`;

    const chatResponse = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      maxTokens: 50
    });

    const respuesta = chatResponse.choices[0].message.content.trim();
    
    console.log(`🤖 Mistral detectó producto: "${respuesta}" del mensaje: "${mensaje}"`);
    
    // Si la respuesta es "null", retornar null
    if (respuesta.toLowerCase() === 'null') {
      return null;
    }
    
    return respuesta;
    
  } catch (error) {
    console.error('❌ Error en detectarProducto:', error.message);
    return null;
  }
}
