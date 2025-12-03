/**
 * Product Formatter Service
 *
 * Este servicio se encarga de formatear mensajes relacionados con productos
 * para enviar a los usuarios de WhatsApp.
 *
 * Responsabilidades:
 * - Formatear listas de productos con múltiples opciones
 * - Formatear detalles de un producto individual
 * - Formatear mensajes de error (sin resultados, API no disponible, etc.)
 * - Aplicar formato consistente con precios chilenos y emojis
 */

// Constantes para formateo
const EMOJI = {
  SEARCH: '🔍',
  PRODUCT: '🛍️',
  PRICE: '💰',
  PRICE_TAG: '💵',
  WHOLESALE: '📦',
  STOCK: '📊',
  AVAILABLE: '✅',
  LOW_STOCK: '⚠️',
  NO_STOCK: '❌',
  ERROR: '❌',
  INFO: 'ℹ️',
  NUMBERS: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
};

// Umbral para considerar stock bajo
const LOW_STOCK_THRESHOLD = 10;

// Cantidad mínima para precio por mayor
const WHOLESALE_MIN_QUANTITY = 5;

/**
 * Formatea un número como precio chileno
 *
 * @param {number|string} precio - El precio a formatear (puede ser number o string)
 * @returns {string} - Precio formateado (ej: "$5.990")
 *
 * @example
 * formatChileanPrice(5990) // "$5.990"
 * formatChileanPrice("12500") // "$12.500"
 * formatChileanPrice("12500.50") // "$12.500"
 */
export function formatChileanPrice(precio) {
  // Convertir a número si es string
  const precioNumerico = typeof precio === 'string' ? parseFloat(precio) : precio;

  if (typeof precioNumerico !== 'number' || isNaN(precioNumerico)) {
    return '$0';
  }

  // Redondear para quitar decimales (precios chilenos no usan decimales)
  const precioRedondeado = Math.round(precioNumerico);

  return `$${precioRedondeado.toLocaleString('es-CL')}`;
}

/**
 * Obtiene el emoji de stock según la disponibilidad
 *
 * @param {number} stock - Cantidad de stock disponible
 * @returns {string} - Emoji correspondiente
 */
function getStockEmoji(stock) {
  if (stock === 0) return EMOJI.NO_STOCK;
  if (stock <= LOW_STOCK_THRESHOLD) return EMOJI.LOW_STOCK;
  return EMOJI.AVAILABLE;
}

/**
 * Obtiene el mensaje de stock según la disponibilidad
 *
 * @param {number} stock - Cantidad de stock disponible
 * @returns {string} - Mensaje de stock formateado
 */
function getStockMessage(stock) {
  if (stock === 0) return '*Sin stock*';
  if (stock <= LOW_STOCK_THRESHOLD) return `*Stock bajo* (${stock} disponibles)`;
  return `*Disponible* (${stock} en stock)`;
}

/**
 * Formatea una lista de productos como opciones para que el usuario seleccione
 *
 * @param {Array} productos - Array de productos encontrados
 * @param {string} searchTerm - Término de búsqueda original
 * @returns {string} - Mensaje formateado con la lista de productos
 *
 * @example
 * formatProductList([
 *   { id_producto: 1, nombre: "Almendras Premium", precio_unitario: 5990, stock_actual: 50 },
 *   { id_producto: 2, nombre: "Almendras Naturales", precio_unitario: 4500, stock_actual: 3 }
 * ], "almendras")
 */
export function formatProductList(productos, searchTerm) {
  if (!Array.isArray(productos) || productos.length === 0) {
    console.error('❌ formatProductList: productos debe ser un array no vacío');
    return formatNoResults(searchTerm);
  }

  // Limitar a máximo 10 productos (por el límite de emojis numéricos)
  const productosLimitados = productos.slice(0, 10);

  let mensaje = `${EMOJI.SEARCH} *Productos encontrados para "${searchTerm}":*\n\n`;

  productosLimitados.forEach((producto, index) => {
    const numeroEmoji = EMOJI.NUMBERS[index] || `${index + 1}.`;
    const stockEmoji = getStockEmoji(producto.stock_actual);
    const precioFormateado = formatChileanPrice(producto.precio_unitario);

    mensaje += `${numeroEmoji} *${producto.nombre}*\n`;
    mensaje += `   ${EMOJI.PRICE} ${precioFormateado}`;

    // Convertir precio_por_mayor a número y validar
    const precioMayorNumerico = typeof producto.precio_por_mayor === 'string'
      ? parseFloat(producto.precio_por_mayor)
      : producto.precio_por_mayor;

    const precioUnitarioNumerico = typeof producto.precio_unitario === 'string'
      ? parseFloat(producto.precio_unitario)
      : producto.precio_unitario;

    // Mostrar precio por mayor SOLO si es > 0 y menor que el precio unitario
    if (precioMayorNumerico > 0 && precioMayorNumerico < precioUnitarioNumerico) {
      const precioMayorFormateado = formatChileanPrice(precioMayorNumerico);
      mensaje += ` | ${EMOJI.WHOLESALE} ${precioMayorFormateado} (${WHOLESALE_MIN_QUANTITY}+ unidades)`;
    }

    mensaje += `\n   ${stockEmoji} ${getStockMessage(producto.stock_actual)}\n\n`;
  });

  mensaje += `${EMOJI.INFO} *¿Cuál te interesa?*\n`;
  mensaje += `Responde con el *número* (1-${productosLimitados.length}) para ver más detalles.`;

  return mensaje;
}

/**
 * Formatea los detalles completos de un producto individual
 *
 * @param {Object} producto - Objeto del producto
 * @param {number} producto.id_producto - ID del producto
 * @param {string} producto.nombre - Nombre del producto
 * @param {number} producto.precio_unitario - Precio por unidad
 * @param {number} producto.precio_por_mayor - Precio por mayor
 * @param {number} producto.stock_actual - Stock disponible
 * @returns {string} - Mensaje formateado con detalles del producto
 *
 * @example
 * formatProductDetails({
 *   id_producto: 1,
 *   nombre: "Almendras Premium",
 *   precio_unitario: 5990,
 *   precio_por_mayor: 5500,
 *   stock_actual: 50
 * })
 */
export function formatProductDetails(producto) {
  if (!producto || typeof producto !== 'object') {
    console.error('❌ formatProductDetails: producto inválido');
    return `${EMOJI.ERROR} Error al mostrar detalles del producto.`;
  }

  const stockEmoji = getStockEmoji(producto.stock_actual);
  const precioUnitarioFormateado = formatChileanPrice(producto.precio_unitario);

  let mensaje = `${EMOJI.PRODUCT} *${producto.nombre}*\n\n`;

  // Precios
  mensaje += `${EMOJI.PRICE_TAG} *Precios:*\n`;
  mensaje += `• Precio unitario: *${precioUnitarioFormateado}*\n`;

  // Convertir precio_por_mayor a número y validar
  const precioMayorNumerico = typeof producto.precio_por_mayor === 'string'
    ? parseFloat(producto.precio_por_mayor)
    : producto.precio_por_mayor;

  const precioUnitarioNumerico = typeof producto.precio_unitario === 'string'
    ? parseFloat(producto.precio_unitario)
    : producto.precio_unitario;

  // Precio por mayor SOLO si es > 0 y menor que el precio unitario
  if (precioMayorNumerico > 0 && precioMayorNumerico < precioUnitarioNumerico) {
    const precioMayorFormateado = formatChileanPrice(precioMayorNumerico);
    const descuento = Math.round(((precioUnitarioNumerico - precioMayorNumerico) / precioUnitarioNumerico) * 100);
    mensaje += `• Por mayor (${WHOLESALE_MIN_QUANTITY}+ unidades): *${precioMayorFormateado}* ${EMOJI.WHOLESALE}\n`;
    mensaje += `  _¡Ahorra ${descuento}% comprando al por mayor!_\n`;
  }

  // Stock
  mensaje += `\n${EMOJI.STOCK} *Disponibilidad:*\n`;
  mensaje += `${stockEmoji} ${getStockMessage(producto.stock_actual)}\n`;

  // Mensaje especial si hay stock bajo
  if (producto.stock_actual > 0 && producto.stock_actual <= LOW_STOCK_THRESHOLD) {
    mensaje += `\n${EMOJI.LOW_STOCK} _¡Últimas unidades disponibles!_\n`;
  }

  // Call to action
  if (producto.stock_actual > 0) {
    mensaje += `\n${EMOJI.INFO} *¿Deseas agregar este producto a tu pedido?*\n`;
    mensaje += `Responde *"sí"* para continuar o *"menú"* para ver otras opciones.`;
  } else {
    mensaje += `\n${EMOJI.INFO} *Producto sin stock actualmente.*\n`;
    mensaje += `¿Te gustaría buscar otro producto? Escribe *"menú"* para ver opciones.`;
  }

  return mensaje;
}

/**
 * Formatea mensaje cuando no se encuentran resultados
 *
 * @param {string} searchTerm - Término de búsqueda que no dio resultados
 * @returns {string} - Mensaje formateado
 *
 * @example
 * formatNoResults("pistachos") // "❌ No encontré productos para 'pistachos'..."
 */
export function formatNoResults(searchTerm) {
  let mensaje = `${EMOJI.ERROR} *No encontré productos para "${searchTerm}"*\n\n`;
  mensaje += `${EMOJI.INFO} *Sugerencias:*\n`;
  mensaje += `• Verifica la ortografía\n`;
  mensaje += `• Intenta con un término más general\n`;
  mensaje += `• Escribe *"menú"* para ver todas las opciones\n`;
  mensaje += `• Describe el producto de otra forma\n\n`;
  mensaje += `*Ejemplo:* "almendras", "nueces", "maní", "mix", etc.`;

  return mensaje;
}

/**
 * Formatea mensaje de error cuando la API no está disponible
 *
 * @returns {string} - Mensaje de error formateado
 */
export function formatApiError() {
  let mensaje = `${EMOJI.ERROR} *Lo siento, no puedo buscar productos en este momento*\n\n`;
  mensaje += `${EMOJI.INFO} Estamos experimentando problemas técnicos temporales.\n\n`;
  mensaje += `Por favor:\n`;
  mensaje += `• Intenta nuevamente en unos momentos\n`;
  mensaje += `• Escribe *"menú"* para ver otras opciones\n`;
  mensaje += `• Contacta directamente a nuestro equipo\n\n`;
  mensaje += `Disculpa las molestias.`;

  return mensaje;
}

/**
 * Formatea mensaje cuando el usuario hace una selección inválida
 *
 * @param {number} maxOptions - Número máximo de opciones disponibles
 * @returns {string} - Mensaje de error formateado
 */
export function formatInvalidSelection(maxOptions) {
  let mensaje = `${EMOJI.ERROR} *Selección no válida*\n\n`;
  mensaje += `Por favor, responde con un *número entre 1 y ${maxOptions}* para seleccionar un producto.\n\n`;
  mensaje += `O escribe *"menú"* para volver al menú principal.`;

  return mensaje;
}

/**
 * Formatea mensaje de confirmación de producto agregado al carrito
 *
 * @param {Object} producto - Producto agregado
 * @param {number} cantidad - Cantidad agregada
 * @returns {string} - Mensaje de confirmación
 */
export function formatProductAdded(producto, cantidad = 1) {
  // Convertir precios a números
  const precioMayorNumerico = typeof producto.precio_por_mayor === 'string'
    ? parseFloat(producto.precio_por_mayor)
    : producto.precio_por_mayor;

  const precioUnitarioNumerico = typeof producto.precio_unitario === 'string'
    ? parseFloat(producto.precio_unitario)
    : producto.precio_unitario;

  // Calcular total usando precio por mayor solo si es > 0 y se cumplen las condiciones
  const precioTotal = cantidad >= WHOLESALE_MIN_QUANTITY && precioMayorNumerico > 0
    ? precioMayorNumerico * cantidad
    : precioUnitarioNumerico * cantidad;

  let mensaje = `${EMOJI.AVAILABLE} *Producto agregado al carrito*\n\n`;
  mensaje += `${EMOJI.PRODUCT} ${producto.nombre}\n`;
  mensaje += `${EMOJI.STOCK} Cantidad: ${cantidad}\n`;
  mensaje += `${EMOJI.PRICE} Total: ${formatChileanPrice(precioTotal)}\n\n`;
  mensaje += `¿Deseas agregar más productos o finalizar tu pedido?\n`;
  mensaje += `Escribe *"menú"* para ver opciones.`;

  return mensaje;
}

/**
 * Formatea mensaje cuando Mistral no puede extraer un producto
 *
 * @param {string} mensaje - Mensaje original del usuario
 * @returns {string} - Mensaje de ayuda
 */
export function formatCannotIdentifyProduct(mensaje) {
  let respuesta = `${EMOJI.INFO} *No pude identificar el producto que buscas*\n\n`;
  respuesta += `¿Podrías ser más específico?\n\n`;
  respuesta += `*Ejemplos de búsqueda:*\n`;
  respuesta += `• "Quiero ver almendras"\n`;
  respuesta += `• "Cuánto cuestan las nueces?"\n`;
  respuesta += `• "Tienen maní con sal?"\n`;
  respuesta += `• "Precio de los pistachos"\n\n`;
  respuesta += `O escribe *"menú"* para ver todas las opciones.`;

  return respuesta;
}

/**
 * Formatea mensaje de bienvenida a la búsqueda de productos
 *
 * @returns {string} - Mensaje de bienvenida
 */
export function formatProductSearchWelcome() {
  let mensaje = `${EMOJI.PRODUCT} *Búsqueda de Productos*\n\n`;
  mensaje += `¡Perfecto! Estoy aquí para ayudarte a encontrar lo que necesitas.\n\n`;
  mensaje += `${EMOJI.INFO} *¿Cómo buscar?*\n`;
  mensaje += `Simplemente escribe el nombre del producto que te interesa.\n\n`;
  mensaje += `*Ejemplos:*\n`;
  mensaje += `• "almendras"\n`;
  mensaje += `• "nueces"\n`;
  mensaje += `• "maní con sal"\n`;
  mensaje += `• "mix de frutos secos"\n\n`;
  mensaje += `¿Qué producto estás buscando?`;

  return mensaje;
}

// Exportar todas las funciones como default también
export default {
  formatChileanPrice,
  formatProductList,
  formatProductDetails,
  formatNoResults,
  formatApiError,
  formatInvalidSelection,
  formatProductAdded,
  formatCannotIdentifyProduct,
  formatProductSearchWelcome
};
