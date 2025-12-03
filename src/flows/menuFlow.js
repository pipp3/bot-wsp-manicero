import { sendMessage } from "../services/messageService.js";
import { setState, STATES } from "../services/conversationStateService.js";
import { iniciarPedido } from "./orderFlow.js";
import { obtenerMisPedidos, validarTelefono } from "../services/apiService.js";
import { getClienteId, setClienteId } from "../services/conversationStateService.js";

export async function manejarMenu(from, opcion) {
  const opcionNum = parseInt(opcion.trim());

  switch (opcionNum) {
    case 1:
      await manejarConsultasProductos(from);
      setState(from, STATES.PRODUCTOS);
      break;

    case 2:
      await manejarSubmenuPedidos(from);
      // setState(from, STATES.PEDIDOS); // Removed to prevent state overwrite
      break;

    case 3:
      await manejarPreguntasFrecuentes(from);
      setState(from, STATES.FAQ);
      break;

    default:
      await sendMessage(from, `❌ Opción no válida. 

Por favor, selecciona una opción válida:
*1* - Consultas sobre productos
*2* - Pedidos  
*3* - Preguntas frecuentes

Escribe solo el número (1, 2 o 3):`);
      break;
  }
}

async function manejarConsultasProductos(from) {
  const mensaje = `🛍️ *Consultas sobre Productos*

¡Perfecto! Estamos aquí para ayudarte con información sobre nuestros productos.

Puedes preguntarnos sobre:
• Catálogo de productos disponibles
• Precios y promociones
• Características y especificaciones
• Disponibilidad en stock

¿Qué te gustaría saber sobre nuestros productos? 

Escribe tu consulta o *"menu"* para volver al menú principal.`;

  await sendMessage(from, mensaje);
}

async function manejarSubmenuPedidos(from) {
  const mensaje = `📦 *Sección de Pedidos*

Selecciona una opción:

*1* - Crear nuevo pedido
*2* - Mis pedidos en curso

Escribe el número de la opción (1 o 2).
O escribe *"menu"* para volver al menú principal.`;

  await sendMessage(from, mensaje);
  setState(from, STATES.PEDIDOS);
}

export async function manejarOpcionPedidos(from, opcion) {
  const opcionNum = parseInt(opcion.trim());

  if (opcionNum === 1) {
    // Crear nuevo pedido
    console.log(`📦 Usuario ${from} seleccionó Crear Pedido - Iniciando flujo de carrito`);
    await iniciarPedido(from);
  } else if (opcionNum === 2) {
    // Ver mis pedidos
    console.log(`📦 Usuario ${from} seleccionó Mis Pedidos`);
    await manejarMisPedidos(from);
  } else {
    await sendMessage(from, `⚠️ Opción no válida.

Por favor, selecciona:
*1* - Crear nuevo pedido
*2* - Mis pedidos en curso

Escribe el número (1 o 2):`);
  }
}

async function manejarMisPedidos(from) {
  try {
    await sendMessage(from, "🔍 Buscando tus pedidos en curso...");

    // 1. Intentar obtener ID de la sesión primero
    let idCliente = getClienteId(from);

    // 2. Si no hay ID en sesión, validar con el backend
    if (!idCliente) {
      console.log(`⚠️ ID no encontrado en sesión para ${from}, validando con backend...`);
      const datosCliente = await validarTelefono(from);

      if (!datosCliente.registrado || !datosCliente.cliente) {
        await sendMessage(from, "❌ No pudimos encontrar tu registro de cliente. Por favor, intenta registrarte primero.");
        return;
      }

      // 3. Extraer ID robustamente (puede venir como id, id_cliente o id_usuario)
      const cliente = datosCliente.cliente;
      idCliente = cliente.id || cliente.id_cliente || cliente.id_usuario;

      if (idCliente) {
        // Guardar para futuras consultas
        setClienteId(from, idCliente);
      } else {
        console.error(`❌ Cliente validado pero sin ID legible:`, cliente);
        await sendMessage(from, "❌ Error interno: No pudimos recuperar tu identificación de cliente.");
        return;
      }
    }

    const pedidos = await obtenerMisPedidos(idCliente);

    if (!pedidos || pedidos.length === 0) {
      await sendMessage(from, `ℹ️ *No tienes pedidos en curso actualmente.*

¿Deseas realizar uno nuevo?
Escribe *"crear pedido"* o selecciona la opción 1 del menú de pedidos.`);
      return;
    }

    let mensaje = `📦 *Tus Pedidos en Curso*\n\n`;

    pedidos.forEach((pedido, index) => {
      // Usar fecha_pedido si existe, o fecha_creacion como fallback
      const fechaStr = pedido.fecha_pedido || pedido.fecha_creacion;
      let fecha = 'Fecha desconocida';

      if (fechaStr) {
        try {
          const dateObj = new Date(fechaStr);
          if (!isNaN(dateObj.getTime())) {
            fecha = dateObj.toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (e) {
          console.error('Error al formatear fecha:', e);
        }
      }

      mensaje += `*Pedido #${pedido.id_pedido}* (${fecha})\n`;
      mensaje += `Estado: *${pedido.estado.toUpperCase()}*\n`;

      // Agregar estado de pago si existe
      if (pedido.pago_estado) {
        mensaje += `Pago: *${pedido.pago_estado.toUpperCase()}*\n`;
      }

      mensaje += `Total: $${pedido.total.toLocaleString('es-CL')}\n`;

      if (pedido.detalles && pedido.detalles.length > 0) {
        const resumenProductos = pedido.detalles.map(d => `${d.cantidad}x ${d.nombre_producto}`).join(', ');
        mensaje += `Productos: ${resumenProductos}\n`;
      }

      mensaje += `\n-------------------\n`;
    });

    mensaje += `\nSi necesitas ayuda con algún pedido, contacta a soporte.`;

    await sendMessage(from, mensaje);

  } catch (error) {
    console.error(`❌ Error al obtener mis pedidos para ${from}:`, error);
    await sendMessage(from, "❌ Hubo un error al consultar tus pedidos. Por favor, intenta nuevamente más tarde.");
  }
}

async function manejarPreguntasFrecuentes(from) {
  const mensaje = `❓ *Preguntas Frecuentes*

Selecciona el tema que te interesa:

*1.* 🕒 Horarios de atención
*2.* 📍 Ubicación y cómo llegar
*3.* 📦 Pedidos y entregas a domicilio
*4.* 🚚 Empresas de despacho
*5.* 💳 Formas de pago
*6.* 📞 Contactar soporte

Escribe el número de la pregunta que te interesa, o escribe tu propia consulta.

También puedes escribir *"menu"* para volver al menú principal.`;

  await sendMessage(from, mensaje);
}

export async function manejarFAQEspecifica(from, opcion) {
  const respuestasFAQ = {
    '1': `🕒 *Horarios de Atención*

Nuestros horarios son:
• *Lunes a Viernes:* 7:30 AM - 16:30 PM
• *Sábados:* 7:30 AM - 14:00 PM  
• *Domingos:* Cerrado

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

    '2': `📍 *Ubicación del Local*

Nos encontramos en:
*Dirección:* Pasaje Rosas 842 Local 5, Recoleta
*Referencia:* Avenida La Paz 271
*Ciudad:* Santiago

*¿Cómo llegar?*
• En transporte público: Línea 2 metros Puente Cal y Canto o Patronatro
• En vehículo: Hay estacionamiento dentro de La Vega Central o en Avenida La Paz

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

    '3': `📦 *Pedidos y Entregas*

¡Sí! Realizamos entregas a domicilio:

*Condiciones:*
• Despachos sobre compras mayores a $50.000
• Despachos solo a Regiones
• Horario de despachos: 9:00 AM - 15:00 PM

*¿Cómo hacer un pedido?*
• Por WhatsApp (este chat)
• Llamada telefónica: +1234567890

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

    '4': `🚚 *Empresas de Despacho*

Trabajamos con las siguientes empresas de confianza:

• *Starken*
• *Varmontt* 
• *Chevalier*
• *Pullman Cargo*

*Tiempos de entrega:*
• Regiones: 1-5 días hábiles

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

    '5': `💳 *Formas de Pago*

Aceptamos múltiples formas de pago:

*En el local:*
• Efectivo
• Tarjetas débito
• Transferencias bancarias

*Para entregas:*
• Pago contra entrega (efectivo o débito)
• Transferencia previa

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

    '6': `📞 *Contactar Soporte*

Puedes contactarnos:
• WhatsApp: Este mismo chat
• Teléfono: +1234567890
• Email: soporte@elmanicero.com

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`
  };

  const respuesta = respuestasFAQ[opcion] || `❓ Pregunta recibida: "${opcion}"

Un representante revisará tu consulta y te responderá pronto.

¿Algo más? Escribe *"menu"* para volver al menú principal.`;

  await sendMessage(from, respuesta);
}

export async function mostrarMenuPrincipal(from) {
  const mensaje = `📋 *Menú Principal*

Por favor, selecciona una opción:
*1* - Consultas sobre productos
*2* - Pedidos  
*3* - Preguntas frecuentes

Escribe el número de la opción que necesites.`;

  await sendMessage(from, mensaje);
  setState(from, STATES.MENU);
}