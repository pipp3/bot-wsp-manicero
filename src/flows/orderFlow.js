/**
 * Flujo de Pedidos con Carrito de Compras
 *
 * Este flujo maneja todo el proceso de creación de pedidos:
 * 1. Agregar productos al carrito (extracción múltiple con Mistral AI)
 * 2. Manejar productos ambiguos (múltiples opciones)
 * 3. Seleccionar modalidad de envío (retiro o domicilio)
 * 4. Capturar datos de envío si es necesario
 * 5. Confirmar y crear el pedido en el backend
 */

import { sendMessage } from '../services/messageService.js';
import { getState, setState, STATES, setOrderData, getOrderData, clearOrderData, getClienteId } from '../services/conversationStateService.js';
import { extractMultipleProductsWithQuantities } from '../services/mistralService.js';
import { buscarProductos, crearPedidoCompleto } from '../services/apiService.js';
import { cartService } from '../services/cartService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Inicia el flujo de pedidos
 * @param {string} from - Número de teléfono del usuario
 */
export async function iniciarPedido(from) {
  try {
    console.log(`📦 Iniciando flujo de pedidos para ${from}`);

    // Limpiar carrito anterior y datos de pedido
    cartService.clearCart(from);
    clearOrderData(from);

    const mensaje = `🛒 *¡Hagamos tu pedido!*

Estoy aquí para ayudarte a crear tu pedido de forma rápida y sencilla.

*¿Cómo funciona?*
• Escribe la lista de productos que deseas
• Puedes incluir cantidades (ej: "3 almendras, 2 nueces")
• Si no mencionas cantidad, asumo que quieres 1 unidad
• Puedes separarlos por comas o saltos de línea

*Ejemplos:*
_"Quiero 3 almendras, 2 nueces y té verde"_
_"almendras
nueces
pistachos"_
_"5 kilos de pasas, canela"_

📝 *Escribe tu lista de productos:*

O escribe *"cancelar"* para volver al menú principal.`;

    await sendMessage(from, mensaje);
    setState(from, STATES.ORDER_REQUESTING_PRODUCTS);

    console.log(`✅ Mensaje de inicio de pedido enviado a ${from}`);

  } catch (error) {
    console.error('❌ Error en iniciarPedido:', error.message);
    await sendMessage(from, '❌ Hubo un error al iniciar el pedido. Por favor, intenta nuevamente.');
  }
}

/**
 * Procesa la lista de productos enviada por el usuario
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Mensaje con lista de productos
 */
export async function procesarListaProductos(from, mensaje) {
  try {
    console.log(`📋 [PEDIDOS] Procesando lista de productos para ${from}`);
    console.log(`📋 [PEDIDOS] Mensaje recibido: "${mensaje}"`);
    console.log(`📋 [PEDIDOS] Estado actual: ${getState(from)}`);

    // Verificar cancelación
    if (mensaje.toLowerCase().trim() === 'cancelar') {
      cartService.clearCart(from);
      clearOrderData(from);
      await sendMessage(from, '❌ Pedido cancelado. Volviendo al menú...');

      const { mostrarMenuPrincipal } = await import('./menuFlow.js');
      await mostrarMenuPrincipal(from);
      return;
    }

    // Extraer productos con Mistral AI
    console.log(`🤖 [PEDIDOS] Llamando a Mistral AI para extraer productos...`);

    let productosExtraidos = [];
    try {
      productosExtraidos = await extractMultipleProductsWithQuantities(mensaje);
      console.log(`✅ [PEDIDOS] Mistral AI retornó ${productosExtraidos.length} productos`);
    } catch (mistralError) {
      console.error('❌ [PEDIDOS] Error en Mistral AI:', mistralError.message);
      console.error('Stack trace:', mistralError.stack);

      await sendMessage(from, `⚠️ *Servicio de IA temporalmente no disponible*

Por favor, intenta nuevamente en unos segundos o reformula tu lista de forma más simple.

Ejemplo: _"2 almendras, 1 nuez, 3 pistachos"_

O escribe *"cancelar"* para volver al menú.`);
      return;
    }

    if (productosExtraidos.length === 0) {
      await sendMessage(from, `⚠️ *No pude identificar productos en tu mensaje*

Por favor, reformula tu lista. Recuerda incluir nombres de productos como:
• Frutos secos: almendras, nueces, maní, pistachos
• Tés: té verde, té negro, té rojo
• Especias: canela, jengibre, cúrcuma
• Y muchos más...

*Ejemplo:*
_"Quiero 3 almendras y 2 nueces"_

Escribe tu lista nuevamente:`);
      return;
    }

    console.log(`🔍 Productos extraídos: ${productosExtraidos.length}`);

    // Categorizar productos: exactos, ambiguos, no encontrados
    const productosExactos = [];
    const productosAmbiguos = [];
    const productosNoEncontrados = [];

    // Procesar cada producto extraído
    for (const prodExtraido of productosExtraidos) {
      console.log(`🔍 Buscando: ${prodExtraido.nombre} (cantidad: ${prodExtraido.cantidad})`);

      const resultados = await buscarProductos(prodExtraido.nombre, 3);

      if (resultados.length === 0) {
        // No encontrado
        productosNoEncontrados.push(prodExtraido);
      } else if (resultados.length === 1) {
        // Exacto - agregar directo al carrito
        const producto = resultados[0];
        const resultadoCarrito = cartService.addToCart(from, producto, prodExtraido.cantidad);

        if (resultadoCarrito.success) {
          productosExactos.push({
            nombre: prodExtraido.nombre,
            producto: producto,
            cantidad: prodExtraido.cantidad,
            mensaje: resultadoCarrito.message
          });
        } else {
          // Error al agregar (probablemente stock insuficiente)
          productosNoEncontrados.push({
            ...prodExtraido,
            error: resultadoCarrito.message
          });
        }
      } else {
        // Múltiples opciones - guardar para selección
        productosAmbiguos.push({
          nombre: prodExtraido.nombre,
          cantidad: prodExtraido.cantidad,
          opciones: resultados
        });
      }
    }

    // Construir mensaje de resumen
    let resumen = `📊 *Resumen del procesamiento:*\n\n`;

    // Productos agregados exitosamente
    if (productosExactos.length > 0) {
      resumen += `✅ *Agregados al carrito (${productosExactos.length}):*\n`;
      productosExactos.forEach((p, index) => {
        resumen += `${index + 1}. ${p.producto.nombre} x${p.cantidad}\n`;
      });
      resumen += `\n`;
    }

    // Productos con múltiples opciones
    if (productosAmbiguos.length > 0) {
      resumen += `⚠️ *Productos con múltiples opciones (${productosAmbiguos.length}):*\n`;
      resumen += `Por favor, selecciona cuál deseas:\n\n`;

      let opcionNumero = 1;
      const opcionesMap = [];

      productosAmbiguos.forEach(prod => {
        resumen += `🔸 *${prod.nombre}* (${prod.cantidad} unidad${prod.cantidad > 1 ? 'es' : ''}):\n`;
        prod.opciones.forEach((opcion, idx) => {
          const stockIcon = opcion.stock_actual > 0 ? '✅' : '❌';
          resumen += `   ${opcionNumero}. ${stockIcon} ${opcion.nombre}\n`;
          resumen += `      $${opcion.precio_unitario.toLocaleString('es-CL')} (Stock: ${opcion.stock_actual})\n`;

          opcionesMap.push({
            numero: opcionNumero,
            nombreBuscado: prod.nombre,
            cantidad: prod.cantidad,
            producto: opcion
          });

          opcionNumero++;
        });
        resumen += `\n`;
      });

      // Guardar opciones en orderData para referencia
      setOrderData(from, {
        ambiguousProducts: productosAmbiguos,
        opcionesMap: opcionesMap
      });
    }

    // Productos no encontrados
    if (productosNoEncontrados.length > 0) {
      resumen += `❌ *No encontrados o sin stock (${productosNoEncontrados.length}):*\n`;
      productosNoEncontrados.forEach((p, index) => {
        resumen += `${index + 1}. ${p.nombre}`;
        if (p.error) {
          resumen += ` - ${p.error}`;
        }
        resumen += `\n`;
      });
      resumen += `\n`;
    }

    // Enviar resumen
    await sendMessage(from, resumen);

    // Determinar siguiente paso
    if (productosAmbiguos.length > 0) {
      // Hay productos ambiguos - pedir selección
      const instrucciones = `📝 *¿Cómo seleccionar?*

Escribe el número de cada producto que deseas, separados por comas.

*Ejemplos:*
_"1"_ - Solo el producto 1
_"1, 3, 5"_ - Productos 1, 3 y 5
_"2"_ - Solo el producto 2

Si quieres cambiar la cantidad, escríbelo así:
_"1: 5"_ - 5 unidades del producto 1
_"2: 3, 4: 2"_ - 3 del producto 2 y 2 del producto 4

Escribe tu selección:`;

      await sendMessage(from, instrucciones);
      setState(from, STATES.ORDER_SELECTING_AMBIGUOUS);

    } else if (productosExactos.length > 0) {
      // No hay ambiguos, pero sí productos agregados - preguntar si quiere más
      await preguntarAgregarMas(from);

    } else {
      // No se agregó nada - volver a pedir lista
      await sendMessage(from, `❌ No se pudo agregar ningún producto.

Por favor, intenta con otros productos o reformula tu lista.

Escribe tu lista de productos:`);
    }

  } catch (error) {
    console.error('❌ [PEDIDOS] Error en procesarListaProductos:', error);
    console.error('Stack trace:', error.stack);
    console.error('Estado del usuario:', getState(from));

    await sendMessage(from, `❌ *Error al procesar tu lista*

Hubo un problema técnico al procesar tu pedido.

Por favor:
1. Intenta reformular tu lista
2. Asegúrate de incluir cantidades (ej: "2 almendras")
3. O escribe *"cancelar"* para volver al menú

Si el problema persiste, contacta a soporte.

_Detalles técnicos: ${error.message}_`);
  }
}

/**
 * Procesa la selección de productos ambiguos
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Selecciones del usuario
 */
export async function procesarSeleccionAmbigua(from, mensaje) {
  try {
    console.log(`🎯 Procesando selección ambigua para ${from}: "${mensaje}"`);

    // Obtener opciones guardadas
    const orderDataActual = getOrderData(from);
    if (!orderDataActual || !orderDataActual.opcionesMap) {
      await sendMessage(from, '❌ Error: No se encontraron opciones guardadas. Por favor, vuelve a enviar tu lista de productos.');
      setState(from, STATES.ORDER_REQUESTING_PRODUCTS);
      return;
    }

    const opcionesMap = orderDataActual.opcionesMap;

    // Parsear selecciones del usuario
    // Formatos soportados: "1", "1, 2, 3", "1: 5", "1: 5, 2: 3"
    const selecciones = parsearSelecciones(mensaje);

    if (selecciones.length === 0) {
      await sendMessage(from, `⚠️ No pude entender tu selección.

Por favor, escribe los números de los productos que deseas.

*Ejemplos válidos:*
_"1"_ - Solo el producto 1
_"1, 2, 3"_ - Productos 1, 2 y 3
_"1: 5"_ - 5 unidades del producto 1
_"1: 5, 2: 3"_ - 5 del producto 1 y 3 del producto 2

Escribe tu selección nuevamente:`);
      return;
    }

    // Procesar cada selección
    const productosAgregados = [];
    const errores = [];

    for (const sel of selecciones) {
      const opcion = opcionesMap.find(o => o.numero === sel.numero);

      if (!opcion) {
        errores.push(`Número ${sel.numero} no es válido`);
        continue;
      }

      // Determinar cantidad (si el usuario especificó, usar esa; sino, usar la original)
      const cantidad = sel.cantidad || opcion.cantidad;

      // Agregar al carrito
      const resultado = cartService.addToCart(from, opcion.producto, cantidad);

      if (resultado.success) {
        productosAgregados.push({
          numero: sel.numero,
          nombre: opcion.producto.nombre,
          cantidad: cantidad
        });
      } else {
        errores.push(`${opcion.producto.nombre}: ${resultado.message}`);
      }
    }

    // Construir mensaje de resultado
    let resultadoMsg = `📊 *Resultado de la selección:*\n\n`;

    if (productosAgregados.length > 0) {
      resultadoMsg += `✅ *Agregados al carrito:*\n`;
      productosAgregados.forEach(p => {
        resultadoMsg += `• ${p.nombre} x${p.cantidad}\n`;
      });
      resultadoMsg += `\n`;
    }

    if (errores.length > 0) {
      resultadoMsg += `❌ *Errores:*\n`;
      errores.forEach(e => {
        resultadoMsg += `• ${e}\n`;
      });
      resultadoMsg += `\n`;
    }

    await sendMessage(from, resultadoMsg);

    // Limpiar opciones ambiguas de orderData
    setOrderData(from, { ambiguousProducts: null, opcionesMap: null });

    // Preguntar si quiere agregar más productos
    await preguntarAgregarMas(from);

  } catch (error) {
    console.error('❌ Error en procesarSeleccionAmbigua:', error.message);
    await sendMessage(from, '❌ Hubo un error al procesar tu selección. Por favor, intenta nuevamente.');
  }
}

/**
 * Parsea las selecciones del usuario
 * Soporta formatos: "1", "1, 2", "1: 5", "1: 5, 2: 3"
 * @param {string} mensaje - Mensaje del usuario
 * @returns {Array<{numero: number, cantidad: number|null}>}
 */
function parsearSelecciones(mensaje) {
  const selecciones = [];
  const mensajeLimpio = mensaje.trim();

  // Dividir por comas
  const partes = mensajeLimpio.split(',');

  for (const parte of partes) {
    const parteLimpia = parte.trim();

    // Verificar si tiene formato "numero: cantidad"
    const match = parteLimpia.match(/^(\d+)\s*[::-]\s*(\d+)$/);

    if (match) {
      // Formato con cantidad especificada
      const numero = parseInt(match[1]);
      const cantidad = parseInt(match[2]);

      if (numero > 0 && cantidad > 0) {
        selecciones.push({ numero, cantidad });
      }
    } else {
      // Formato solo número
      const numero = parseInt(parteLimpia);
      if (!isNaN(numero) && numero > 0) {
        selecciones.push({ numero, cantidad: null });
      }
    }
  }

  return selecciones;
}

/**
 * Pregunta si quiere agregar más productos
 * @param {string} from - Número de teléfono del usuario
 */
async function preguntarAgregarMas(from) {
  // Mostrar resumen del carrito actual
  const resumenCarrito = cartService.getFormattedSummary(from);

  const mensaje = `${resumenCarrito}

━━━━━━━━━━━━━━━━━━━━

¿Deseas hacer algo más?

*1* - Agregar más productos
*2* - Finalizar y elegir modalidad de envío

Escribe el número de tu opción:`;

  await sendMessage(from, mensaje);
  setState(from, STATES.ORDER_ADDING_MORE);
}

/**
 * Procesa si quiere agregar más productos o finalizar
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Respuesta del usuario
 */
export async function procesarAgregarMas(from, mensaje) {
  try {
    const mensajeLower = mensaje.toLowerCase().trim();

    if (mensajeLower === '2' || mensajeLower.includes('finalizar')) {
      // Finalizar - ir a modalidad de envío
      await solicitarModalidadEnvio(from);

    } else if (mensajeLower === '1' || mensajeLower.includes('agregar') || mensajeLower.includes('mas') || mensajeLower.includes('más')) {
      // Agregar más - volver a pedir lista
      await sendMessage(from, `📝 *Perfecto, agreguemos más productos*

Escribe la lista de productos adicionales que deseas:

O escribe *"finalizar"* si ya no quieres agregar más.`);
      setState(from, STATES.ORDER_REQUESTING_PRODUCTS);

    } else {
      // No entendió - volver a preguntar
      await sendMessage(from, `⚠️ No entendí tu respuesta.

Por favor, selecciona una opción:

*1* - Agregar más productos
*2* - Finalizar y elegir modalidad de envío

Escribe el número:`);
    }

  } catch (error) {
    console.error('❌ Error en procesarAgregarMas:', error.message);
    await sendMessage(from, '❌ Hubo un error. Por favor, intenta nuevamente.');
  }
}

/**
 * Solicita la modalidad de envío
 * @param {string} from - Número de teléfono del usuario
 */
export async function solicitarModalidadEnvio(from) {
  try {
    // Verificar que hay productos en el carrito
    if (!cartService.hasItems(from)) {
      await sendMessage(from, '❌ Tu carrito está vacío. No puedes finalizar un pedido sin productos.');

      const { mostrarMenuPrincipal } = await import('./menuFlow.js');
      await mostrarMenuPrincipal(from);
      return;
    }

    // Mostrar resumen del carrito
    const resumenCarrito = cartService.getFormattedSummary(from);

    const mensaje = `${resumenCarrito}

━━━━━━━━━━━━━━━━━━━━

🚚 *¿Cómo quieres recibir tu pedido?*

*1* 🏪 Retiro en tienda
     _Pasaje Rosas 842 Local 5, Recoleta_
     _Horario: Lun-Vie 7:30-16:30, Sáb 7:30-14:00_

*2* 📦 Envío a domicilio
     _Despachos sobre $50.000_
     _Solo a Regiones_

Escribe el número de tu opción (1 o 2):`;

    await sendMessage(from, mensaje);
    setState(from, STATES.ORDER_DELIVERY_METHOD);

  } catch (error) {
    console.error('❌ Error en solicitarModalidadEnvio:', error.message);
    await sendMessage(from, '❌ Hubo un error. Por favor, intenta nuevamente.');
  }
}

/**
 * Procesa la modalidad de envío seleccionada
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Selección del usuario
 */
export async function procesarModalidadEnvio(from, mensaje) {
  try {
    const mensajeLower = mensaje.toLowerCase().trim();

    if (mensajeLower === '1' || mensajeLower.includes('retiro') || mensajeLower.includes('tienda')) {
      // Retiro en tienda
      setOrderData(from, {
        modalidad: 'retiro',
        direccion_envio: 'Retiro en tienda',
        ciudad: null,
        comuna: null,
        courier: 'presencial'
      });

      await sendMessage(from, `✅ *Retiro en tienda seleccionado*

Retirarás tu pedido en:
📍 Pasaje Rosas 842 Local 5, Recoleta
🕒 Horario: Lun-Vie 7:30-16:30, Sáb 7:30-14:00

Te notificaremos cuando tu pedido esté listo para retirar.`);

      // Ir directo a confirmación final
      await solicitarConfirmacionFinal(from);

    } else if (mensajeLower === '2' || mensajeLower.includes('domicilio') || mensajeLower.includes('envio') || mensajeLower.includes('envío')) {
      // Envío a domicilio
      setOrderData(from, { modalidad: 'domicilio' });

      const totales = cartService.getCartTotals(from);

      // Verificar monto mínimo para envío
      if (totales.total < 50000) {
        await sendMessage(from, `⚠️ *Monto mínimo no alcanzado*

Para envíos a domicilio, el pedido debe ser mayor a $50.000.

Tu pedido actual: $${totales.total.toLocaleString('es-CL')}
Falta: $${(50000 - totales.total).toLocaleString('es-CL')}

¿Deseas agregar más productos o cambiar a retiro en tienda?

*1* - Agregar más productos
*2* - Cambiar a retiro en tienda
*3* - Cancelar pedido`);

        setState(from, STATES.ORDER_ADDING_MORE);
        return;
      }

      await sendMessage(from, `✅ *Envío a domicilio seleccionado*

📦 Despachos solo a Regiones
⏰ Horario de despacho: 9:00 AM - 3:00 PM
🚚 Tiempo estimado: 1-5 días hábiles

Por favor, proporciona tu *dirección de envío completa*:

_Ejemplo: Avenida Principal 123, Departamento 4B_`);

      setState(from, STATES.ORDER_DELIVERY_ADDRESS);

    } else {
      // No entendió
      await sendMessage(from, `⚠️ Opción no válida.

Por favor, selecciona:

*1* - Retiro en tienda
*2* - Envío a domicilio

Escribe el número (1 o 2):`);
    }

  } catch (error) {
    console.error('❌ Error en procesarModalidadEnvio:', error.message);
    await sendMessage(from, '❌ Hubo un error. Por favor, intenta nuevamente.');
  }
}

/**
 * Procesa la dirección de envío
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Dirección ingresada
 */
export async function procesarDireccion(from, mensaje) {
  try {
    const direccion = mensaje.trim();

    if (direccion.length < 5) {
      await sendMessage(from, `⚠️ La dirección parece muy corta.

Por favor, proporciona una dirección completa:

_Ejemplo: Avenida Principal 123, Departamento 4B_`);
      return;
    }

    setOrderData(from, { direccion_envio: direccion, direccion });

    await sendMessage(from, `✅ Dirección guardada: ${direccion}

Ahora, ingresa tu *ciudad*:

_Ejemplo: Santiago, Valparaíso, Concepción_`);

    setState(from, STATES.ORDER_DELIVERY_CITY);

  } catch (error) {
    console.error('❌ Error en procesarDireccion:', error.message);
    await sendMessage(from, '❌ Hubo un error. Por favor, intenta nuevamente.');
  }
}

/**
 * Procesa la ciudad de envío
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Ciudad ingresada
 */
export async function procesarCiudad(from, mensaje) {
  try {
    const ciudad = mensaje.trim();

    if (ciudad.length < 3) {
      await sendMessage(from, `⚠️ El nombre de la ciudad parece muy corto.

Por favor, ingresa tu ciudad nuevamente:`);
      return;
    }

    setOrderData(from, { ciudad });

    await sendMessage(from, `✅ Ciudad guardada: ${ciudad}

Ahora, ingresa tu *comuna*:

_Ejemplo: Las Condes, Providencia, Ñuñoa_`);

    setState(from, STATES.ORDER_DELIVERY_COMUNA);

  } catch (error) {
    console.error('❌ Error en procesarCiudad:', error.message);
    await sendMessage(from, '❌ Hubo un error. Por favor, intenta nuevamente.');
  }
}

/**
 * Procesa la comuna de envío
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Comuna ingresada
 */
export async function procesarComuna(from, mensaje) {
  try {
    const comuna = mensaje.trim();

    if (comuna.length < 3) {
      await sendMessage(from, `⚠️ El nombre de la comuna parece muy corto.

Por favor, ingresa tu comuna nuevamente:`);
      return;
    }

    setOrderData(from, { comuna });

    const mensajeCourier = `✅ Comuna guardada: ${comuna}

🚚 *Selecciona la empresa de despacho de tu preferencia:*

*1* Starken
*2* Chevalier
*3* Varmontt

Todas tienen cobertura nacional con tiempos de entrega de 1-5 días hábiles.

Escribe el número de tu opción (1, 2 o 3):`;

    await sendMessage(from, mensajeCourier);
    setState(from, STATES.ORDER_COURIER_SELECTION);

  } catch (error) {
    console.error('❌ Error en procesarComuna:', error.message);
    await sendMessage(from, '❌ Hubo un error. Por favor, intenta nuevamente.');
  }
}

/**
 * Procesa la selección de courier
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Opción seleccionada
 */
export async function procesarCourier(from, mensaje) {
  try {
    const mensajeLower = mensaje.toLowerCase().trim();
    let courier = null;
    let courierDisplay = null;

    if (mensajeLower === '1' || mensajeLower.includes('starken')) {
      courier = 'starken';
      courierDisplay = 'Starken';
    } else if (mensajeLower === '2' || mensajeLower.includes('chevalier')) {
      courier = 'chevalier';
      courierDisplay = 'Chevalier';
    } else if (mensajeLower === '3' || mensajeLower.includes('varmontt')) {
      courier = 'varmontt';
      courierDisplay = 'Varmontt';
    } else {
      await sendMessage(from, `⚠️ Opción no válida.

Por favor, selecciona una empresa de despacho:

*1* Starken
*2* Chevalier
*3* Varmontt

Escribe el número (1, 2 o 3):`);
      return;
    }

    setOrderData(from, { courier });

    await sendMessage(from, `✅ Empresa de despacho seleccionada: *${courierDisplay}*

Perfecto, ya tenemos todos los datos de envío.`);

    // Ir a confirmación final del pedido
    await solicitarConfirmacionFinal(from);

  } catch (error) {
    console.error('❌ Error en procesarCourier:', error.message);
    await sendMessage(from, '❌ Hubo un error. Por favor, intenta nuevamente.');
  }
}

/**
 * Muestra el resumen completo del pedido y solicita confirmación final
 * @param {string} from - Número de teléfono del usuario
 */
export async function solicitarConfirmacionFinal(from) {
  try {
    // Obtener datos del pedido
    const orderDataActual = getOrderData(from);
    const totales = cartService.getCartTotals(from);
    const cart = cartService.getCart(from);

    if (cart.length === 0) {
      await sendMessage(from, '❌ Tu carrito está vacío. No puedes confirmar un pedido vacío.');

      const { mostrarMenuPrincipal } = await import('./menuFlow.js');
      await mostrarMenuPrincipal(from);
      return;
    }

    // Construir resumen completo
    let resumen = `📋 *RESUMEN COMPLETO DE TU PEDIDO*\n\n`;

    // Productos
    resumen += `🛒 *Productos:*\n`;
    cart.forEach((item, index) => {
      const descuentoIcon = item.aplicaPrecioMayor ? '🔥 ' : '';
      resumen += `${index + 1}. ${descuentoIcon}${item.nombre}\n`;
      resumen += `   ${item.cantidad} x $${item.precio_aplicado.toLocaleString('es-CL')} = $${item.subtotal.toLocaleString('es-CL')}\n`;
    });

    resumen += `\n━━━━━━━━━━━━━━━━━━━━\n`;

    // Totales
    if (totales.descuento > 0) {
      resumen += `*Subtotal:* $${totales.subtotal.toLocaleString('es-CL')}\n`;
      resumen += `*Descuento (precio por mayor):* -$${totales.descuento.toLocaleString('es-CL')} 🔥\n`;
    }
    resumen += `*TOTAL:* $${totales.total.toLocaleString('es-CL')}\n\n`;

    // Modalidad de envío
    resumen += `📦 *Modalidad de entrega:*\n`;
    if (orderDataActual.modalidad === 'retiro') {
      resumen += `🏪 Retiro en tienda\n`;
      resumen += `📍 Pasaje Rosas 842 Local 5, Recoleta\n`;
    } else {
      resumen += `🚚 Envío a domicilio\n`;
      resumen += `📍 *Dirección:* ${orderDataActual.direccion || orderDataActual.direccion_envio}\n`;
      resumen += `🏙️ *Ciudad:* ${orderDataActual.ciudad}\n`;
      resumen += `📮 *Comuna:* ${orderDataActual.comuna}\n`;

      // Mostrar courier con formato capitalizado
      const courierDisplay = orderDataActual.courier ?
        orderDataActual.courier.charAt(0).toUpperCase() + orderDataActual.courier.slice(1) :
        'No especificado';
      resumen += `🚛 *Courier:* ${courierDisplay}\n`;
    }

    resumen += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    resumen += `Para confirmar tu pedido, escribe:\n`;
    resumen += `*confirmar*\n\n`;
    resumen += `Para cancelar, escribe:\n`;
    resumen += `*cancelar*\n\n`;
    resumen += `Escribe tu respuesta:`;

    await sendMessage(from, resumen);
    setState(from, STATES.ORDER_CONFIRMING);

  } catch (error) {
    console.error('❌ Error en solicitarConfirmacionFinal:', error.message);
    await sendMessage(from, '❌ Hubo un error al generar el resumen. Por favor, intenta nuevamente.');
  }
}

/**
 * Procesa la confirmación del pedido
 * @param {string} from - Número de teléfono del usuario
 * @param {string} mensaje - Respuesta del usuario
 */
export async function procesarConfirmacion(from, mensaje) {
  try {
    const mensajeLower = mensaje.toLowerCase().trim();

    // Verificar si contiene "confirmar pedido"
    if (mensajeLower.includes('confirmar pedido') || mensajeLower.includes('confirmar')) {

      await sendMessage(from, '⏳ Procesando tu pedido, por favor espera...');

      // Obtener id_cliente de la sesión
      const idCliente = getClienteId(from);

      if (!idCliente) {
        console.error(`❌ No se encontró id_cliente para ${from}`);
        await sendMessage(from, `❌ *Error de sesión*

No se pudo identificar tu cuenta de cliente. Por favor, vuelve al menú principal e inicia sesión nuevamente.`);

        // Limpiar datos y volver al menú
        cartService.clearCart(from);
        clearOrderData(from);

        const { mostrarMenuPrincipal } = await import('./menuFlow.js');
        await mostrarMenuPrincipal(from);
        return;
      }

      // Preparar datos para el backend
      const orderDataActual = getOrderData(from);
      const detalles = cartService.prepareOrderDetails(from);

      // Construir dirección completa
      let direccionCompleta = orderDataActual.direccion_envio || orderDataActual.direccion || 'Retiro en tienda';
      if (orderDataActual.modalidad === 'domicilio') {
        direccionCompleta = `${orderDataActual.direccion || orderDataActual.direccion_envio}, ${orderDataActual.comuna}, ${orderDataActual.ciudad}`;
      }

      // Determinar courier (asegurar minúsculas)
      let courier = orderDataActual.courier ? orderDataActual.courier.toLowerCase() : 'presencial';

      // Validar consistencia entre modalidad y courier
      if (orderDataActual.modalidad === 'retiro') {
        courier = 'presencial';
        direccionCompleta = 'Retiro en tienda';
      }

      const payload = {
        id_cliente: idCliente,
        direccion_envio: direccionCompleta,
        courier: courier,
        canal: 'whatsapp',
        metodo_pago: 'transferencia',  // Todos los pedidos del bot son por transferencia
        detalles: detalles,
        descuento_manual: 0
      };

      console.log('📤 Enviando pedido al backend:', payload);

      // Llamar al nuevo endpoint usando la función de apiService
      const response = await crearPedidoCompleto(payload);

      console.log('✅ Respuesta del backend:', response);

      // Pedido creado exitosamente
      const pedidoId = response.pedido?.id_pedido || response.id_pedido || 'N/A';
      // Calcular total desde el carrito local ya que el backend no lo devuelve
      const totales = cartService.getCartTotals(from);
      const totalPedido = totales.total || 0;

      // Formatear courier para mostrar
      const courierDisplay = courier === 'presencial' ? 'Retiro en tienda' :
        courier.charAt(0).toUpperCase() + courier.slice(1);

      const mensajeExito = `✅ *¡Pedido creado exitosamente!*

🎉 Tu pedido ha sido registrado en nuestro sistema.

📋 *Número de pedido:* #${pedidoId}
💰 *Total:* $${totalPedido.toLocaleString('es-CL')}

━━━━━━━━━━━━━━━━━━━━

💳 *INSTRUCCIONES DE PAGO:*

1️⃣ Realiza una transferencia bancaria por el monto total
2️⃣ Envía el comprobante al correo:
   📧 *elamanicerolucas@gmail.com*
3️⃣ En el asunto del correo escribe:
   *Pedido #${pedidoId}*

⚠️ *Importante:* Tu pedido será procesado una vez confirmemos el pago.

━━━━━━━━━━━━━━━━━━━━

${orderDataActual.modalidad === 'retiro'
          ? '🏪 *Retiro en tienda:*\n📍 Pasaje Rosas 842 Local 5, Recoleta\n🕒 Lun-Vie 7:30-16:30, Sáb 7:30-14:00'
          : `🚚 *Envío a domicilio:*\n🚛 Courier: ${courierDisplay}\n⏰ Tiempo estimado: 1-5 días hábiles`
        }

¡Gracias por tu compra! 😊`;

      await sendMessage(from, mensajeExito);

      // Limpiar carrito y datos de pedido
      cartService.clearCart(from);
      clearOrderData(from);

      // Volver al menú principal
      const { mostrarMenuPrincipal } = await import('./menuFlow.js');
      await mostrarMenuPrincipal(from);

    } else if (mensajeLower === 'cancelar' || mensajeLower === 'no') {

      await sendMessage(from, `❌ *Pedido cancelado*

Tu pedido ha sido cancelado y el carrito ha sido vaciado.

Si cambias de opinión, puedes iniciar un nuevo pedido desde el menú principal.`);

      // Limpiar carrito y datos
      cartService.clearCart(from);
      clearOrderData(from);

      // Volver al menú principal
      const { mostrarMenuPrincipal } = await import('./menuFlow.js');
      await mostrarMenuPrincipal(from);

    } else {
      // No entendió
      await sendMessage(from, `⚠️ No entendí tu respuesta.

Para confirmar tu pedido, escribe:
*confirmar pedido*

Para cancelar, escribe:
*cancelar*

Escribe tu respuesta:`);
    }

  } catch (error) {
    console.error('❌ Error en procesarConfirmacion:', error.message);

    let mensajeError = '❌ *Error al crear el pedido*\n\n';

    // El error ya viene formateado desde apiService
    mensajeError += `Detalles: ${error.message}\n\n`;

    mensajeError += `Tu carrito sigue guardado. ¿Deseas intentar nuevamente?

Para reintentar, escribe: *confirmar pedido*
Para cancelar, escribe: *cancelar*

Escribe tu respuesta:`;

    await sendMessage(from, mensajeError);
  }
}
