/**
 * Servicio para manejar estados de conversación y datos de clientes
 *
 * Este servicio mantiene el estado de las conversaciones en memoria,
 * incluyendo estados de flujo, datos temporales de registro,
 * y datos de clientes validados desde el backend.
 */

// Servicio para manejar estados de conversación
const conversationStates = new Map();

// Estados posibles
export const STATES = {
  INITIAL: 'initial',
  WAITING_NAME: 'waiting_name',
  WAITING_LASTNAME: 'waiting_lastname',
  MENU: 'menu',
  PRODUCTOS: 'productos',
  PEDIDOS: 'pedidos',
  FAQ: 'faq',
  // Estados para búsqueda de productos
  PRODUCT_SEARCH_WAITING_QUERY: 'product_search_waiting_query',
  PRODUCT_SEARCH_SHOWING_RESULTS: 'product_search_showing_results',
  PRODUCT_SEARCH_WAITING_SELECTION: 'product_search_waiting_selection',
  PRODUCT_SEARCH_SHOWING_DETAILS: 'product_search_showing_details',
  // Estados para flujo de pedidos (carrito)
  ORDER_REQUESTING_PRODUCTS: 'order_requesting_products',
  ORDER_SELECTING_AMBIGUOUS: 'order_selecting_ambiguous',
  ORDER_CONFIRM_ADD_PRODUCT: 'order_confirm_add_product',
  ORDER_QUANTITY_INPUT: 'order_quantity_input',
  ORDER_SELECTING_NUMBER: 'order_selecting_number',
  ORDER_ADDING_MORE: 'order_adding_more',
  ORDER_DELIVERY_METHOD: 'order_delivery_method',
  ORDER_DELIVERY_ADDRESS: 'order_delivery_address',
  ORDER_DELIVERY_CITY: 'order_delivery_city',
  ORDER_DELIVERY_COMUNA: 'order_delivery_comuna',
  ORDER_COURIER_SELECTION: 'order_courier_selection',
  ORDER_CONFIRMING: 'order_confirming'
};

/**
 * Obtener estado actual del usuario
 * @param {string} telefono - Número de teléfono del usuario
 * @returns {string} - Estado actual del usuario (default: INITIAL)
 */
export function getState(telefono) {
  return conversationStates.get(telefono) || STATES.INITIAL;
}

/**
 * Establecer estado del usuario
 * @param {string} telefono - Número de teléfono del usuario
 * @param {string} state - Nuevo estado (debe ser uno de STATES)
 */
export function setState(telefono, state) {
  conversationStates.set(telefono, state);
  console.log(`🔄 Estado actualizado para ${telefono}: ${state}`);
}

/**
 * Limpiar estado del usuario
 * @param {string} telefono - Número de teléfono del usuario
 */
export function clearState(telefono) {
  conversationStates.delete(telefono);
  console.log(`🧹 Estado limpiado para ${telefono}`);
}

// ============================================
// DATOS TEMPORALES DEL REGISTRO
// ============================================

// Almacén de datos temporales durante el proceso de registro
const tempRegistrationData = new Map();

/**
 * Guardar datos temporales del registro
 * @param {string} telefono - Número de teléfono del usuario
 * @param {Object} data - Datos temporales a guardar
 */
export function setTempData(telefono, data) {
  tempRegistrationData.set(telefono, data);
}

/**
 * Obtener datos temporales del registro
 * @param {string} telefono - Número de teléfono del usuario
 * @returns {Object} - Datos temporales del registro (vacío si no existen)
 */
export function getTempData(telefono) {
  return tempRegistrationData.get(telefono) || {};
}

/**
 * Limpiar datos temporales del registro
 * @param {string} telefono - Número de teléfono del usuario
 */
export function clearTempData(telefono) {
  tempRegistrationData.delete(telefono);
}

// ============================================
// DATOS DE CLIENTES VALIDADOS
// ============================================

/**
 * Almacén de datos de clientes validados desde el backend
 *
 * Estructura de datos:
 * {
 *   telefono: string,
 *   datos: {
 *     id: number,
 *     nombre: string,
 *     telefono: string,
 *     email: string | null
 *   }
 * }
 */
const clientDataStore = new Map();

/**
 * Guardar datos del cliente validado desde el backend
 *
 * @param {string} telefono - Número de teléfono del cliente
 * @param {Object} clientData - Datos del cliente desde el backend
 * @param {number} clientData.id - ID del cliente en la base de datos
 * @param {string} clientData.nombre - Nombre completo del cliente
 * @param {string} clientData.telefono - Teléfono del cliente
 * @param {string|null} clientData.email - Email del cliente (opcional)
 */
export function setClientData(telefono, clientData) {
  // Validar que tenga algún tipo de ID
  const hasId = clientData && (clientData.id || clientData.id_usuario || clientData.id_cliente);

  if (!clientData || !hasId) {
    console.error(`❌ Datos de cliente inválidos para ${telefono} (Falta ID):`, clientData);
    return;
  }

  // Normalizar ID: asegurar que clientData.id exista
  if (!clientData.id) {
    clientData.id = clientData.id_usuario || clientData.id_cliente;
  }

  clientDataStore.set(telefono, {
    ...clientData,
    timestamp: Date.now() // Agregar timestamp para futuras implementaciones de cache
  });

  console.log(`💾 Datos de cliente guardados para ${telefono}: ${clientData.nombre || 'Sin nombre'} (ID: ${clientData.id})`);
}

/**
 * Obtener datos del cliente guardados en memoria
 *
 * @param {string} telefono - Número de teléfono del cliente
 * @returns {Object|null} - Datos del cliente o null si no existen
 */
export function getClientData(telefono) {
  const data = clientDataStore.get(telefono);
  if (data) {
    console.log(`📖 Datos de cliente recuperados de memoria para ${telefono}: ${data.nombre}`);
  }
  return data || null;
}

/**
 * Limpiar datos del cliente de la memoria
 *
 * @param {string} telefono - Número de teléfono del cliente
 */
export function clearClientData(telefono) {
  const deleted = clientDataStore.delete(telefono);
  if (deleted) {
    console.log(`🗑️ Datos de cliente eliminados para ${telefono}`);
  }
}

/**
 * Verificar si existen datos del cliente en memoria
 *
 * @param {string} telefono - Número de teléfono del cliente
 * @returns {boolean} - true si existen datos, false en caso contrario
 */
export function hasClientData(telefono) {
  return clientDataStore.has(telefono);
}

/**
 * Guardar el ID del cliente en la sesión
 *
 * @param {string} telefono - Número de teléfono del cliente
 * @param {number} id_cliente - ID del cliente en la base de datos
 */
export function setClienteId(telefono, id_cliente) {
  if (!telefono || !id_cliente) {
    console.error(`❌ setClienteId: telefono o id_cliente no proporcionado`);
    return;
  }

  const clientData = getClientData(telefono);
  if (clientData) {
    // Actualizar id_cliente en los datos existentes
    clientData.id_cliente = id_cliente;
    setClientData(telefono, clientData);
  } else {
    // Crear nuevo registro solo con id_cliente
    setClientData(telefono, { id_cliente, id: id_cliente });
  }

  console.log(`💾 ID de cliente guardado para ${telefono}: ${id_cliente}`);
}

/**
 * Obtener el ID del cliente desde la sesión
 *
 * @param {string} telefono - Número de teléfono del cliente
 * @returns {number|null} - ID del cliente o null si no existe
 */
export function getClienteId(telefono) {
  const clientData = getClientData(telefono);
  if (clientData) {
    // Buscar id_cliente o id (compatibilidad con ambos campos)
    const id = clientData.id_cliente || clientData.id || clientData.id_usuario;
    if (id) {
      console.log(`📖 ID de cliente recuperado para ${telefono}: ${id}`);
      return id;
    }
  }

  console.warn(`⚠️ No se encontró ID de cliente para ${telefono}`);
  return null;
}

/**
 * Limpiar todos los datos del cliente (estado, datos temporales y datos del cliente)
 * Útil cuando se cierra una sesión o se reinicia el bot
 *
 * @param {string} telefono - Número de teléfono del cliente
 */
export function clearAllClientData(telefono) {
  clearState(telefono);
  clearTempData(telefono);
  clearClientData(telefono);
  console.log(`🧹 Todos los datos limpiados para ${telefono}`);
}

// ============================================
// DATOS DE BÚSQUEDA DE PRODUCTOS
// ============================================

/**
 * Almacén de datos temporales de búsqueda de productos
 */
const productSearchData = new Map();

/**
 * Guardar datos de búsqueda de productos
 *
 * @param {string} telefono - Número de teléfono del usuario
 * @param {Object} searchData - Datos de la búsqueda
 */
export function setProductSearchData(telefono, searchData) {
  if (!searchData || typeof searchData !== 'object') {
    console.error(`❌ Datos de búsqueda inválidos para ${telefono}:`, searchData);
    return;
  }

  productSearchData.set(telefono, {
    ...searchData,
    timestamp: Date.now()
  });

  console.log(`🔍 Datos de búsqueda guardados para ${telefono}: "${searchData.searchTerm}" (${searchData.foundProducts?.length || 0} productos)`);
}

/**
 * Obtener datos de búsqueda de productos
 *
 * @param {string} telefono - Número de teléfono del usuario
 * @returns {Object|null} - Datos de la búsqueda o null si no existen
 */
export function getProductSearchData(telefono) {
  const data = productSearchData.get(telefono);
  if (data) {
    console.log(`📖 Datos de búsqueda recuperados para ${telefono}: "${data.searchTerm}"`);
  }
  return data || null;
}

/**
 * Limpiar datos de búsqueda de productos
 *
 * @param {string} telefono - Número de teléfono del usuario
 */
export function clearProductSearchData(telefono) {
  const deleted = productSearchData.delete(telefono);
  if (deleted) {
    console.log(`🗑️ Datos de búsqueda eliminados para ${telefono}`);
  }
}

/**
 * Actualizar producto seleccionado en los datos de búsqueda
 *
 * @param {string} telefono - Número de teléfono del usuario
 * @param {Object} producto - Producto seleccionado
 */
export function setSelectedProduct(telefono, producto) {
  const searchData = getProductSearchData(telefono);
  if (searchData) {
    searchData.selectedProduct = producto;
    searchData.timestamp = Date.now();
    productSearchData.set(telefono, searchData);
    console.log(`✅ Producto seleccionado actualizado para ${telefono}: ${producto.nombre}`);
  } else {
    console.warn(`⚠️ No hay datos de búsqueda para ${telefono}, no se puede actualizar producto seleccionado`);
  }
}

// ============================================
// DATOS DEL PEDIDO EN PROGRESO
// ============================================

/**
 * Almacén de datos del pedido en progreso
 */
const orderData = new Map();

/**
 * Guardar datos del pedido en progreso
 *
 * @param {string} telefono - Número de teléfono del usuario
 * @param {Object} data - Datos del pedido a guardar/actualizar
 */
export function setOrderData(telefono, data) {
  if (!telefono || !data || typeof data !== 'object') {
    console.error(`❌ Datos de pedido inválidos para ${telefono}:`, data);
    return;
  }

  // Obtener datos existentes o crear nuevo objeto
  const existingData = orderData.get(telefono) || {};

  // Actualizar datos (merge)
  const updatedData = {
    ...existingData,
    ...data,
    timestamp: Date.now()
  };

  orderData.set(telefono, updatedData);

  console.log(`💾 Datos de pedido guardados/actualizados para ${telefono}:`, Object.keys(data));
}

/**
 * Obtener datos del pedido en progreso
 *
 * @param {string} telefono - Número de teléfono del usuario
 * @returns {Object|null} - Datos del pedido o null si no existen
 */
export function getOrderData(telefono) {
  const data = orderData.get(telefono);
  if (data) {
    console.log(`📖 Datos de pedido recuperados para ${telefono}`);
  }
  return data || null;
}

/**
 * Limpiar datos del pedido en progreso
 *
 * @param {string} telefono - Número de teléfono del usuario
 */
export function clearOrderData(telefono) {
  const deleted = orderData.delete(telefono);
  if (deleted) {
    console.log(`🗑️ Datos de pedido eliminados para ${telefono}`);
  }
}

/**
 * Verificar si existen datos del pedido en progreso
 *
 * @param {string} telefono - Número de teléfono del usuario
 * @returns {boolean} - true si existen datos, false en caso contrario
 */
export function hasOrderData(telefono) {
  return orderData.has(telefono);
}

/**
 * Obtener estadísticas del servicio de estado
 * Útil para monitoring y debugging
 *
 * @returns {Object} - Estadísticas del servicio
 */
export function getStateStats() {
  return {
    conversationStates: conversationStates.size,
    tempRegistrationData: tempRegistrationData.size,
    clientDataStore: clientDataStore.size,
    productSearchData: productSearchData.size,
    orderData: orderData.size,
    timestamp: new Date().toISOString()
  };
}