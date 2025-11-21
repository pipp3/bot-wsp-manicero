import { sendMessage } from "../services/messageService.js";
import { setState, STATES } from "../services/conversationStateService.js";

export async function manejarMenu(from, opcion) {
  const opcionNum = parseInt(opcion.trim());
  
  switch (opcionNum) {
    case 1:
      await manejarConsultasProductos(from);
      setState(from, STATES.PRODUCTOS);
      break;
      
    case 2:
      await manejarPedidos(from);
      setState(from, STATES.PEDIDOS);
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

async function manejarPedidos(from) {
  const mensaje = `📦 *Pedidos*

¡Excelente elección! Te ayudamos con tu pedido.

Puedes:
• Realizar un nuevo pedido
• Consultar el estado de un pedido existente
• Modificar un pedido pendiente
• Información sobre entregas

¿Qué necesitas hacer con tu pedido?

Escribe tu solicitud o *"menu"* para volver al menú principal.`;

  await sendMessage(from, mensaje);
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