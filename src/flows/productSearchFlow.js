/**
 * Product Search Flow
 *
 * Este módulo maneja el flujo completo de búsqueda de productos:
 * 1. Usuario consulta sobre un producto
 * 2. Mistral AI extrae el término de búsqueda
 * 3. Se llama a la API para buscar productos
 * 4. Se muestran resultados (1, 2-3, o ninguno)
 * 5. Usuario selecciona un producto
 * 6. Se muestran detalles completos
 * 7. Usuario puede agregar al carrito o buscar de nuevo
 *
 * Estados del flujo:
 * - PRODUCT_SEARCH_WAITING_QUERY: Esperando que el usuario escriba qué busca
 * - PRODUCT_SEARCH_SHOWING_RESULTS: Mostrando lista de productos encontrados
 * - PRODUCT_SEARCH_WAITING_SELECTION: Esperando que el usuario seleccione un producto
 * - PRODUCT_SEARCH_SHOWING_DETAILS: Mostrando detalles de un producto específico
 */

import { sendMessage } from '../services/messageService.js';
import { setState, getState, STATES } from '../services/conversationStateService.js';
import {
  setProductSearchData,
  getProductSearchData,
  clearProductSearchData,
  setSelectedProduct
} from '../services/conversationStateService.js';
import { extractProductSearchTerm } from '../services/mistralService.js';
import { buscarProductos } from '../services/apiService.js';
import {
  formatProductList,
  formatProductDetails,
  formatNoResults,
  formatApiError,
  formatInvalidSelection,
  formatCannotIdentifyProduct,
  formatProductSearchWelcome
} from '../services/productFormatterService.js';

/**
 * Iniciar el flujo de búsqueda de productos
 * Muestra mensaje de bienvenida y espera consulta del usuario
 *
 * @param {string} from - Número de teléfono del usuario
 */
export async function iniciarBusquedaProductos(from) {
  console.log(`🔍 Iniciando flujo de búsqueda de productos para ${from}`);

  // Limpiar datos de búsqueda anteriores
  clearProductSearchData(from);

  // Enviar mensaje de bienvenida
  const mensaje = formatProductSearchWelcome();
  await sendMessage(from, mensaje);

  // Establecer estado
  setState(from, STATES.PRODUCT_SEARCH_WAITING_QUERY);
}

/**
 * Procesar consulta de búsqueda del usuario
 * Extrae término con Mistral y busca en la API
 *
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Mensaje del usuario con la consulta
 */
export async function procesarConsultaBusqueda(from, mensaje) {
  console.log(`🔍 Procesando consulta de búsqueda de ${from}: "${mensaje}"`);

  try {
    // 1. Extraer término de búsqueda con Mistral AI
    const searchTerm = await extractProductSearchTerm(mensaje);

    if (!searchTerm) {
      // No se pudo identificar un producto
      console.log(`⚠️ No se identificó producto en: "${mensaje}"`);
      const respuesta = formatCannotIdentifyProduct(mensaje);
      await sendMessage(from, respuesta);
      // Mantener en el mismo estado para que intente de nuevo
      return;
    }

    console.log(`✅ Término de búsqueda extraído: "${searchTerm}"`);

    // 2. Buscar productos en la API
    const productos = await buscarProductos(searchTerm, 3);

    // 3. Manejar diferentes escenarios de resultados
    await manejarResultadosBusqueda(from, searchTerm, productos);

  } catch (error) {
    console.error(`❌ Error en procesarConsultaBusqueda para ${from}:`, error.message);

    // Error de API - mostrar mensaje amigable
    const mensajeError = formatApiError();
    await sendMessage(from, mensajeError);

    // Volver al estado anterior para que pueda intentar de nuevo
    setState(from, STATES.PRODUCT_SEARCH_WAITING_QUERY);
  }
}

/**
 * Manejar resultados de búsqueda según la cantidad encontrada
 *
 * @param {string} from - Número de teléfono del usuario
 * @param {string} searchTerm - Término de búsqueda usado
 * @param {Array} productos - Array de productos encontrados
 */
async function manejarResultadosBusqueda(from, searchTerm, productos) {
  console.log(`📊 Manejando resultados de búsqueda: ${productos.length} producto(s) encontrado(s)`);

  // Guardar datos de búsqueda
  setProductSearchData(from, {
    searchTerm,
    foundProducts: productos,
    selectedProduct: null
  });

  if (productos.length === 0) {
    // CASO 1: No se encontraron productos
    console.log(`❌ Sin resultados para "${searchTerm}"`);
    const mensaje = formatNoResults(searchTerm);
    await sendMessage(from, mensaje);
    setState(from, STATES.PRODUCT_SEARCH_WAITING_QUERY);

  } else if (productos.length === 1) {
    // CASO 2: Un solo producto encontrado - mostrar detalles directamente
    console.log(`✅ Un producto encontrado: ${productos[0].nombre}`);
    setSelectedProduct(from, productos[0]);
    const mensaje = formatProductDetails(productos[0]);
    await sendMessage(from, mensaje);
    setState(from, STATES.PRODUCT_SEARCH_SHOWING_DETAILS);

  } else {
    // CASO 3: Múltiples productos - mostrar lista para selección
    console.log(`✅ ${productos.length} productos encontrados, mostrando lista`);
    const mensaje = formatProductList(productos, searchTerm);
    await sendMessage(from, mensaje);
    setState(from, STATES.PRODUCT_SEARCH_WAITING_SELECTION);
  }
}

/**
 * Procesar selección de producto de la lista
 *
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Mensaje del usuario (debería ser un número)
 */
export async function procesarSeleccionProducto(from, mensaje) {
  console.log(`🔢 Procesando selección de producto de ${from}: "${mensaje}"`);

  // Obtener datos de búsqueda
  const searchData = getProductSearchData(from);

  if (!searchData || !searchData.foundProducts || searchData.foundProducts.length === 0) {
    console.error(`❌ No hay datos de búsqueda para ${from}`);
    await sendMessage(from, 'Lo siento, hubo un error. Por favor, intenta buscar de nuevo.\n\nEscribe *"menú"* para volver al menú principal.');
    setState(from, STATES.PRODUCTOS);
    return;
  }

  // Validar que el mensaje sea un número
  const seleccion = parseInt(mensaje.trim());

  if (isNaN(seleccion) || seleccion < 1 || seleccion > searchData.foundProducts.length) {
    // Selección inválida
    console.log(`⚠️ Selección inválida: "${mensaje}" (esperado: 1-${searchData.foundProducts.length})`);
    const mensajeError = formatInvalidSelection(searchData.foundProducts.length);
    await sendMessage(from, mensajeError);
    // Mantener en el mismo estado
    return;
  }

  // Obtener producto seleccionado (índice - 1 porque el usuario cuenta desde 1)
  const productoSeleccionado = searchData.foundProducts[seleccion - 1];

  console.log(`✅ Producto seleccionado: ${productoSeleccionado.nombre}`);

  // Actualizar producto seleccionado en los datos
  setSelectedProduct(from, productoSeleccionado);

  // Mostrar detalles del producto
  const mensajeDetalles = formatProductDetails(productoSeleccionado);
  await sendMessage(from, mensajeDetalles);

  // Cambiar estado
  setState(from, STATES.PRODUCT_SEARCH_SHOWING_DETAILS);
}

/**
 * Procesar acción en vista de detalles de producto
 * (agregar a carrito, buscar otro, etc.)
 *
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Mensaje del usuario
 */
export async function procesarAccionDetalles(from, mensaje) {
  console.log(`🛍️ Procesando acción en detalles de producto de ${from}: "${mensaje}"`);

  const mensajeLower = mensaje.toLowerCase().trim();

  // Obtener producto seleccionado
  const searchData = getProductSearchData(from);
  const producto = searchData?.selectedProduct;

  if (!producto) {
    console.error(`❌ No hay producto seleccionado para ${from}`);
    await sendMessage(from, 'Lo siento, hubo un error. Escribe *"menú"* para volver al menú principal.');
    setState(from, STATES.PRODUCTOS);
    return;
  }

  // Detectar intenciones del usuario
  if (mensajeLower === 'si' || mensajeLower === 'sí' || mensajeLower === 'agregar' || mensajeLower === 'comprar') {
    // Usuario quiere agregar al carrito
    await agregarProductoCarrito(from, producto);

  } else if (mensajeLower === 'no' || mensajeLower === 'buscar otro' || mensajeLower === 'otro') {
    // Usuario quiere buscar otro producto
    await iniciarBusquedaProductos(from);

  } else if (mensajeLower === 'menu' || mensajeLower === 'menú') {
    // Ya se maneja en el flowController, pero por completitud
    console.log(`🔙 Usuario ${from} vuelve al menú principal`);

  } else {
    // Mensaje no reconocido - dar opciones
    await sendMessage(from, `No entendí tu respuesta.\n\n¿Deseas agregar *"${producto.nombre}"* a tu pedido?\n\nResponde:\n• *"sí"* para agregar al carrito\n• *"no"* para buscar otro producto\n• *"menú"* para volver al menú principal`);
  }
}

/**
 * Agregar producto al carrito (placeholder - implementar en el futuro)
 *
 * @param {string} from - Número de teléfono del usuario
 * @param {Object} producto - Producto a agregar
 */
async function agregarProductoCarrito(from, producto) {
  console.log(`🛒 Agregando producto al carrito de ${from}: ${producto.nombre}`);

  // TODO: Implementar lógica de carrito de compras
  // Por ahora, solo confirmamos
  await sendMessage(from, `✅ *Producto agregado al carrito*\n\n🛍️ ${producto.nombre}\n\n_Funcionalidad de carrito próximamente disponible._\n\n¿Deseas buscar otro producto?\nEscribe el nombre o *"menú"* para ver opciones.`);

  // Limpiar búsqueda y volver a estado de productos
  clearProductSearchData(from);
  setState(from, STATES.PRODUCTOS);
}

/**
 * Manejar búsqueda rápida de producto (sin entrar al flujo completo)
 * Se usa cuando el usuario pregunta por un producto en cualquier momento
 *
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Mensaje del usuario
 * @returns {boolean} - true si se encontró y procesó un producto, false en caso contrario
 */
export async function busquedaRapidaProducto(from, mensaje) {
  console.log(`⚡ Búsqueda rápida de producto para ${from}: "${mensaje}"`);

  try {
    // 1. Extraer término de búsqueda
    const searchTerm = await extractProductSearchTerm(mensaje);

    if (!searchTerm) {
      // No hay producto mencionado
      return false;
    }

    console.log(`✅ Término extraído en búsqueda rápida: "${searchTerm}"`);

    // 2. Buscar en API
    const productos = await buscarProductos(searchTerm, 3);

    if (productos.length === 0) {
      // No se encontraron productos
      const mensajeRespuesta = formatNoResults(searchTerm);
      await sendMessage(from, mensajeRespuesta);
      return true; // Se procesó la búsqueda, aunque sin resultados
    }

    // 3. Guardar datos de búsqueda
    setProductSearchData(from, {
      searchTerm,
      foundProducts: productos,
      selectedProduct: null
    });

    if (productos.length === 1) {
      // Un solo producto - mostrar detalles
      setSelectedProduct(from, productos[0]);
      const mensajeRespuesta = formatProductDetails(productos[0]);
      await sendMessage(from, mensajeRespuesta);
      setState(from, STATES.PRODUCT_SEARCH_SHOWING_DETAILS);
    } else {
      // Múltiples productos - mostrar lista
      const mensajeRespuesta = formatProductList(productos, searchTerm);
      await sendMessage(from, mensajeRespuesta);
      setState(from, STATES.PRODUCT_SEARCH_WAITING_SELECTION);
    }

    return true; // Se procesó exitosamente

  } catch (error) {
    console.error(`❌ Error en búsqueda rápida para ${from}:`, error.message);
    // No mostrar error al usuario, simplemente indicar que no se pudo procesar
    return false;
  }
}

// Exportar funciones principales
export default {
  iniciarBusquedaProductos,
  procesarConsultaBusqueda,
  procesarSeleccionProducto,
  procesarAccionDetalles,
  busquedaRapidaProducto
};
