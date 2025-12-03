import axios from 'axios';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * API Service para comunicación con el backend FastAPI (api-manicero-lucas)
 *
 * Este servicio encapsula todas las llamadas HTTP al backend API,
 * proporcionando una capa de abstracción con manejo de errores,
 * logging y configuración centralizada.
 */

// Configuración del cliente API
const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.API_TIMEOUT) || 5000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Crear instancia de axios configurada
const apiClient = axios.create(API_CONFIG);

// Interceptor para logging de requests
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Interceptor para logging de responses
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    const errorMsg = error.response?.data?.detail || error.message;
    console.error(`❌ API Response Error: ${error.config?.url} - ${errorMsg}`);
    return Promise.reject(error);
  }
);

/**
 * Valida si un número de teléfono está registrado en el sistema
 *
 * @param {string} telefono - Número de teléfono del cliente (formato WhatsApp: 54XXXXXXXXXX)
 * @returns {Promise<Object>} - Objeto con información de validación
 * @returns {boolean} .registrado - Indica si el teléfono está registrado
 * @returns {Object|null} .cliente - Datos del cliente si está registrado, null en caso contrario
 * @returns {number} .cliente.id - ID del cliente
 * @returns {string} .cliente.nombre - Nombre completo del cliente
 * @returns {string} .cliente.telefono - Teléfono del cliente
 * @returns {string} .cliente.email - Email del cliente (puede ser null)
 *
 * @throws {Error} Si hay un error de red o el servidor no responde
 *
 * @example
 * const resultado = await validarTelefono('5491112345678');
 * if (resultado.registrado) {
 *   console.log(`Cliente encontrado: ${resultado.cliente.nombre}`);
 * } else {
 *   console.log('Cliente no registrado');
 * }
 */
export async function validarTelefono(telefono) {
  try {
    console.log(`📞 Validando teléfono: ${telefono}`);

    const response = await apiClient.get(`/api/v1/bot/validar-telefono/${telefono}`);

    if (response.data.registrado) {
      console.log(`✅ Cliente registrado encontrado: ${response.data.cliente.nombre}`);
    } else {
      console.log(`ℹ️ Cliente no registrado: ${telefono}`);
    }

    return response.data;
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error.response) {
      // El servidor respondió con un código de error
      const statusCode = error.response.status;
      const errorDetail = error.response.data?.detail || 'Error desconocido';

      console.error(`❌ Error en validación de teléfono (${statusCode}): ${errorDetail}`);

      // Si es un error 404, el cliente no existe (responder como no registrado)
      if (statusCode === 404) {
        return {
          registrado: false,
          cliente: null
        };
      }

      throw new Error(`Error del servidor: ${errorDetail}`);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('❌ Sin respuesta del servidor API:', error.message);
      throw new Error('No se pudo conectar con el servidor. Por favor, intenta más tarde.');
    } else {
      // Error al configurar la petición
      console.error('❌ Error al configurar petición:', error.message);
      throw new Error('Error interno al procesar la solicitud.');
    }
  }
}

/**
 * Registra un nuevo cliente en el sistema
 *
 * @param {string} telefono - Número de teléfono del cliente (formato WhatsApp: 54XXXXXXXXXX)
 * @param {string} nombre - Nombre completo del cliente (nombre y apellido)
 * @returns {Promise<Object>} - Objeto con información del cliente registrado
 * @returns {number} .id - ID del cliente registrado
 * @returns {string} .nombre - Nombre completo del cliente
 * @returns {string} .telefono - Teléfono del cliente
 * @returns {string} .email - Email del cliente (null si no se proporcionó)
 * @returns {string} .mensaje - Mensaje de confirmación del registro
 *
 * @throws {Error} Si hay un error de red, el servidor no responde, o los datos son inválidos
 *
 * @example
 * const cliente = await registrarCliente('5491112345678', 'Juan Pérez');
 * console.log(`Cliente registrado con ID: ${cliente.id}`);
 */
export async function registrarCliente(telefono, nombre) {
  try {
    console.log(`📝 Registrando cliente: ${nombre} - ${telefono}`);

    // Validar inputs
    if (!telefono || !nombre) {
      throw new Error('Teléfono y nombre son obligatorios');
    }

    if (nombre.trim().length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres');
    }

    // Payload para el registro
    const payload = {
      telefono: telefono,
      nombre: nombre.trim(),
      email: null // Email opcional, se puede agregar en el futuro
    };

    const response = await apiClient.post('/api/v1/bot/registrar-cliente', payload);

    console.log(`✅ Cliente registrado exitosamente: ${response.data.nombre} (ID: ${response.data.id})`);

    return response.data;
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error.response) {
      // El servidor respondió con un código de error
      const statusCode = error.response.status;
      const errorDetail = error.response.data?.detail || 'Error desconocido';

      console.error(`❌ Error en registro de cliente (${statusCode}): ${errorDetail}`);

      // Errores específicos del negocio
      if (statusCode === 400) {
        throw new Error(`Datos inválidos: ${errorDetail}`);
      } else if (statusCode === 409) {
        throw new Error('El cliente ya está registrado en el sistema.');
      }

      throw new Error(`Error del servidor: ${errorDetail}`);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('❌ Sin respuesta del servidor API:', error.message);
      throw new Error('No se pudo conectar con el servidor. Por favor, intenta más tarde.');
    } else {
      // Error de validación local o al configurar la petición
      console.error('❌ Error en registro:', error.message);
      throw error;
    }
  }
}

/**
 * Busca productos por nombre en el backend
 *
 * @param {string} nombre - Término de búsqueda (nombre del producto o palabra clave)
 * @param {number} limit - Número máximo de resultados (default: 3)
 * @returns {Promise<Array>} - Array de productos encontrados
 * @returns {number} [].id_producto - ID del producto
 * @returns {string} [].nombre - Nombre del producto
 * @returns {number} [].precio_unitario - Precio por unidad
 * @returns {number} [].precio_por_mayor - Precio por mayor (5+ unidades)
 * @returns {number} [].stock_actual - Stock disponible
 *
 * @throws {Error} Si hay un error de red o el servidor no responde
 *
 * @example
 * const productos = await buscarProductos('almendras', 3);
 * if (productos.length > 0) {
 *   console.log(`Se encontraron ${productos.length} productos`);
 *   productos.forEach(p => console.log(`- ${p.nombre}: $${p.precio_unitario}`));
 * }
 */
export async function buscarProductos(nombre, limit = 3) {
  try {
    console.log(`🔍 Buscando productos con término: "${nombre}" (límite: ${limit})`);

    // Validar inputs
    if (!nombre || typeof nombre !== 'string') {
      throw new Error('El término de búsqueda debe ser un string válido');
    }

    if (nombre.trim().length < 2) {
      throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
    }

    // Validar límite
    const validLimit = Math.max(1, Math.min(limit, 10)); // Entre 1 y 10

    // Construir URL con parámetros de búsqueda
    const params = new URLSearchParams({
      nombre: nombre.trim(),
      limit: validLimit.toString()
    });

    const response = await apiClient.get(`/api/v1/bot/buscar-productos?${params.toString()}`);

    const productos = response.data || [];

    console.log(`✅ Búsqueda completada: ${productos.length} producto(s) encontrado(s) para "${nombre}"`);

    if (productos.length > 0) {
      console.log('📦 Productos encontrados:');
      productos.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.nombre} - $${p.precio_unitario.toLocaleString('es-CL')} (Stock: ${p.stock_actual})`);
      });
    }

    return productos;
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error.response) {
      // El servidor respondió con un código de error
      const statusCode = error.response.status;
      const errorDetail = error.response.data?.detail || 'Error desconocido';

      console.error(`❌ Error en búsqueda de productos (${statusCode}): ${errorDetail}`);

      // Si es un error 404, no se encontraron productos (retornar array vacío)
      if (statusCode === 404) {
        console.log(`ℹ️ No se encontraron productos para: "${nombre}"`);
        return [];
      }

      throw new Error(`Error del servidor: ${errorDetail}`);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('❌ Sin respuesta del servidor API:', error.message);
      throw new Error('No se pudo conectar con el servidor. Por favor, intenta más tarde.');
    } else {
      // Error de validación local o al configurar la petición
      console.error('❌ Error en búsqueda de productos:', error.message);
      throw error;
    }
  }
}

/**
 * Crea un pedido completo con todos los detalles
 *
 * @param {Object} payload - Datos del pedido completo
 * @param {number} payload.id_cliente - ID del cliente que realiza el pedido
 * @param {string} payload.direccion_envio - Dirección de envío completa o "Retiro en tienda"
 * @param {string} payload.courier - Courier seleccionado (starken, chevalier, varmontt, presencial)
 * @param {string} payload.canal - Canal de venta (whatsapp, web)
 * @param {string} payload.metodo_pago - Método de pago (pendiente, transferencia, efectivo, etc.)
 * @param {Array<Object>} payload.detalles - Array de productos del pedido
 * @param {number} payload.detalles[].id_producto - ID del producto
 * @param {number} payload.detalles[].cantidad - Cantidad del producto
 * @param {number} [payload.descuento_manual=0] - Descuento manual opcional
 * @returns {Promise<Object>} - Objeto con información del pedido creado
 * @returns {Object} .pedido - Datos del pedido creado
 * @returns {number} .pedido.id_pedido - ID del pedido generado
 * @returns {number} .pedido.total - Total del pedido
 * @returns {string} .pedido.estado - Estado del pedido
 * @returns {string} .mensaje - Mensaje de confirmación
 *
 * @throws {Error} Si hay un error de red, el servidor no responde, o los datos son inválidos
 *
 * @example
 * const payload = {
 *   id_cliente: 123,
 *   direccion_envio: "Calle Principal 123, Providencia, Santiago (Courier: Starken)",
 *   courier: "starken",
 *   canal: "whatsapp",
 *   metodo_pago: "pendiente",
 *   detalles: [
 *     { id_producto: 1, cantidad: 5 },
 *     { id_producto: 2, cantidad: 3 }
 *   ],
 *   descuento_manual: 0
 * };
 * const pedido = await crearPedidoCompleto(payload);
 * console.log(`Pedido creado con ID: ${pedido.pedido.id_pedido}`);
 */
export async function crearPedidoCompleto(payload) {
  try {
    console.log(`📦 Creando pedido completo para cliente ${payload.id_cliente}`);

    // Validar inputs
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload inválido: debe ser un objeto');
    }

    if (!payload.id_cliente || typeof payload.id_cliente !== 'number') {
      throw new Error('id_cliente es obligatorio y debe ser un número');
    }

    if (!payload.direccion_envio || typeof payload.direccion_envio !== 'string') {
      throw new Error('direccion_envio es obligatorio y debe ser un string');
    }

    if (!payload.courier || typeof payload.courier !== 'string') {
      throw new Error('courier es obligatorio y debe ser un string');
    }

    if (!payload.detalles || !Array.isArray(payload.detalles) || payload.detalles.length === 0) {
      throw new Error('detalles es obligatorio y debe ser un array con al menos un producto');
    }

    // Validar cada detalle
    payload.detalles.forEach((detalle, index) => {
      if (!detalle.id_producto || typeof detalle.id_producto !== 'number') {
        throw new Error(`detalles[${index}]: id_producto es obligatorio y debe ser un número`);
      }
      if (!detalle.cantidad || typeof detalle.cantidad !== 'number' || detalle.cantidad <= 0) {
        throw new Error(`detalles[${index}]: cantidad es obligatorio y debe ser un número positivo`);
      }
    });

    // Payload completo para el backend
    const requestPayload = {
      id_cliente: payload.id_cliente,
      direccion_envio: payload.direccion_envio,
      courier: payload.courier.toLowerCase(), // Asegurar minúsculas
      canal: payload.canal || 'whatsapp',
      metodo_pago: payload.metodo_pago || 'pendiente',
      detalles: payload.detalles,
      descuento_manual: payload.descuento_manual || 0
    };

    console.log(`📤 Enviando pedido al backend:`, {
      id_cliente: requestPayload.id_cliente,
      productos: requestPayload.detalles.length,
      courier: requestPayload.courier,
      direccion: requestPayload.direccion_envio
    });

    const response = await apiClient.post('/api/v1/bot/crear-pedido-completo', requestPayload);

    console.log(`✅ Pedido creado exitosamente: ID ${response.data.pedido?.id_pedido || response.data.id_pedido}`);

    return response.data;
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error.response) {
      // El servidor respondió con un código de error
      const statusCode = error.response.status;
      const errorDetail = error.response.data?.detail || error.response.data?.message || 'Error desconocido';

      console.error(`❌ Error al crear pedido (${statusCode}): ${errorDetail}`);

      // Errores específicos del negocio
      if (statusCode === 400) {
        throw new Error(`Datos inválidos: ${errorDetail}`);
      } else if (statusCode === 404) {
        throw new Error(`Cliente o producto no encontrado: ${errorDetail}`);
      } else if (statusCode === 409) {
        throw new Error(`Conflicto: ${errorDetail}`);
      } else if (statusCode === 422) {
        throw new Error(`Validación fallida: ${errorDetail}`);
      }

      throw new Error(`Error del servidor: ${errorDetail}`);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('❌ Sin respuesta del servidor API:', error.message);
      throw new Error('No se pudo conectar con el servidor. Por favor, intenta más tarde.');
    } else {
      // Error de validación local o al configurar la petición
      console.error('❌ Error al crear pedido:', error.message);
      throw error;
    }
  }
}

/**
 * Obtiene los pedidos activos de un cliente
 *
 * @param {number} idCliente - ID del cliente
 * @returns {Promise<Array>} - Lista de pedidos activos (máximo 3)
 */
export async function obtenerMisPedidos(idCliente) {
  try {
    console.log(`📦 Obteniendo pedidos para cliente ID: ${idCliente}`);

    const response = await apiClient.get(`/api/v1/bot/mis-pedidos/?id_cliente=${idCliente}`);

    console.log(`✅ Pedidos obtenidos: ${response.data.length}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener mis pedidos:', error.message);
    // Si es 404, retornar lista vacía
    if (error.response && error.response.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Verifica el estado del servidor API
 *
 * @returns {Promise<boolean>} - true si el servidor está disponible, false en caso contrario
 *
 * @example
 * const disponible = await verificarEstadoAPI();
 * if (disponible) {
 *   console.log('API disponible');
 * }
 */
export async function verificarEstadoAPI() {
  try {
    const response = await apiClient.get('/health', { timeout: 2000 });
    console.log('✅ API está disponible');
    return response.status === 200;
  } catch (error) {
    console.error('❌ API no disponible:', error.message);
    return false;
  }
}

/**
 * Configuración del servicio API
 */
export const API_SERVICE_CONFIG = {
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout
};

// Exportar también como default para compatibilidad
export default {
  validarTelefono,
  registrarCliente,
  buscarProductos,
  crearPedidoCompleto,
  obtenerMisPedidos,
  verificarEstadoAPI,
  config: API_SERVICE_CONFIG
};
