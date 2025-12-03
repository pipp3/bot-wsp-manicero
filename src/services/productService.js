import { extractProductSearchTerm, detectarProducto } from './mistralService.js';
import { buscarProductos } from './apiService.js';
import { buscarProductoPorNombre } from './staticDataService.js';
import {
  formatProductList,
  formatProductDetails,
  formatNoResults
} from './productFormatterService.js';

/**
 * Busca productos usando Mistral AI y la API del backend
 * Esta es la función principal para búsqueda de productos con la nueva arquitectura
 *
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Promise<Object>} - Objeto con resultados de búsqueda
 * @returns {boolean} .encontrado - Indica si se encontraron productos
 * @returns {string} .searchTerm - Término de búsqueda extraído
 * @returns {Array} .productos - Array de productos encontrados (puede estar vacío)
 * @returns {string} .mensajeFormateado - Mensaje formateado para enviar al usuario
 */
export async function buscarProductoConIA(mensaje) {
  try {
    console.log(`🔍 Iniciando búsqueda de producto con IA para: "${mensaje}"`);

    // 1. Usar Mistral para extraer el término de búsqueda
    const searchTerm = await extractProductSearchTerm(mensaje);

    if (!searchTerm) {
      console.log('ℹ️ No se detectó ningún producto en el mensaje');
      return {
        encontrado: false,
        searchTerm: null,
        productos: [],
        mensajeFormateado: null
      };
    }

    console.log(`✅ Término de búsqueda extraído: "${searchTerm}"`);

    // 2. Buscar productos en la API del backend
    const productos = await buscarProductos(searchTerm, 3);

    // 3. Formatear respuesta según resultados
    if (productos.length === 0) {
      console.log(`❌ No se encontraron productos para: "${searchTerm}"`);
      return {
        encontrado: false,
        searchTerm,
        productos: [],
        mensajeFormateado: formatNoResults(searchTerm)
      };
    }

    console.log(`✅ Se encontraron ${productos.length} producto(s)`);

    // 4. Formatear mensaje según cantidad de resultados
    let mensajeFormateado;
    if (productos.length === 1) {
      mensajeFormateado = formatProductDetails(productos[0]);
    } else {
      mensajeFormateado = formatProductList(productos, searchTerm);
    }

    return {
      encontrado: true,
      searchTerm,
      productos,
      mensajeFormateado
    };

  } catch (error) {
    console.error('❌ Error en buscarProductoConIA:', error.message);

    // En caso de error, intentar fallback con JSON local
    console.log('⚠️ Intentando fallback con datos locales...');
    return await buscarProductoConMistralLegacy(mensaje);
  }
}

/**
 * Procesa la búsqueda de un producto usando Mistral para detectar el nombre
 * @deprecated Use buscarProductoConIA instead for better functionality
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Promise<Object|null>} - Información del producto o null si no se encuentra
 */
export async function buscarProductoConMistral(mensaje) {
  console.warn('⚠️ buscarProductoConMistral está deprecado, usa buscarProductoConIA');
  return buscarProductoConMistralLegacy(mensaje);
}

/**
 * Versión legacy de búsqueda con JSON local (fallback)
 * Solo se usa si la API no está disponible
 *
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Promise<Object|null>} - Información del producto o null
 */
async function buscarProductoConMistralLegacy(mensaje) {
  try {
    // 1. Usar Mistral para detectar el nombre del producto
    const nombreProducto = await detectarProducto(mensaje);

    if (!nombreProducto) {
      console.log('ℹ️ No se detectó ningún producto en el mensaje (legacy)');
      return null;
    }

    console.log(`🔍 Buscando producto en JSON local: "${nombreProducto}"`);

    // 2. Buscar en la base de datos (JSON)
    const productoInfo = buscarProductoPorNombre(nombreProducto);

    if (!productoInfo) {
      console.log(`⚠️ Producto "${nombreProducto}" no encontrado en JSON local`);
      return {
        encontrado: false,
        nombreBuscado: nombreProducto
      };
    }

    console.log(`✅ Producto encontrado en JSON local:`, productoInfo);

    return {
      encontrado: true,
      ...productoInfo
    };

  } catch (error) {
    console.error('❌ Error en buscarProductoConMistralLegacy:', error.message);
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
