import { detectarProducto } from './mistralService.js';
import { buscarProductoPorNombre } from './staticDataService.js';

/**
 * Procesa la búsqueda de un producto usando Mistral para detectar el nombre
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Promise<Object|null>} - Información del producto o null si no se encuentra
 */
export async function buscarProductoConMistral(mensaje) {
  try {
    // 1. Usar Mistral para detectar el nombre del producto
    const nombreProducto = await detectarProducto(mensaje);
    
    if (!nombreProducto) {
      console.log('ℹ️ No se detectó ningún producto en el mensaje');
      return null;
    }
    
    console.log(`🔍 Buscando producto: "${nombreProducto}"`);
    
    // 2. Buscar en la base de datos (JSON)
    const productoInfo = buscarProductoPorNombre(nombreProducto);
    
    if (!productoInfo) {
      console.log(`⚠️ Producto "${nombreProducto}" no encontrado en la base de datos`);
      return {
        encontrado: false,
        nombreBuscado: nombreProducto
      };
    }
    
    console.log(`✅ Producto encontrado:`, productoInfo);
    
    return {
      encontrado: true,
      ...productoInfo
    };
    
  } catch (error) {
    console.error('❌ Error en buscarProductoConMistral:', error.message);
    return null;
  }
}

/**
 * Formatea la respuesta del producto para enviar al usuario
 * @param {Object} productoInfo - Información del producto
 * @returns {string} - Mensaje formateado
 */
export function formatearRespuestaProducto(productoInfo) {
  if (!productoInfo) {
    return '❌ No pude identificar el producto que buscas. ¿Podrías ser más específico?';
  }
  
  if (!productoInfo.encontrado) {
    return `❌ Lo siento, no encontré información sobre "${productoInfo.nombreBuscado}" en nuestro catálogo.

¿Te gustaría consultar por otro producto?`;
  }
  
  const stockMensaje = productoInfo.hay_stock 
    ? '✅ *Disponible en stock*' 
    : '❌ *Sin stock actualmente*';
  
  return `🛍️ *${productoInfo.nombre}*

💰 *Precio:* $${productoInfo.precio_minorista.toLocaleString('es-CL')}
${stockMensaje}

¿Deseas hacer un pedido o consultar por otro producto?`;
}
