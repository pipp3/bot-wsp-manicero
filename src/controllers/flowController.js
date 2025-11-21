import { flujoBienvenida } from "../flows/flujoBienvenida.js";
import { manejarMenu, mostrarMenuPrincipal, manejarFAQEspecifica } from "../flows/menuFlow.js";
import { getState, setState, clearState, STATES } from "../services/conversationStateService.js";
import { GreetingDetector } from "../utils/greetingDetector.js";
import { FAQDetector } from "../utils/faqDetector.js";
import { FarewellDetector } from "../utils/farewellDetector.js";
import { sendMessage } from "../services/messageService.js";
import { sessionService } from "../services/sessionService.js";
import { nlpService } from "../services/nlpService.js";
import { buscarProductoConMistral, formatearRespuestaProducto } from "../services/productService.js";

const greetingDetector = new GreetingDetector();
const faqDetector = new FAQDetector();
const farewellDetector = new FarewellDetector();

// Estados donde NO debemos usar NLP/Mistral (flujo del menú)
const ESTADOS_FLUJO_MENU = [
  STATES.MENU,
  STATES.WAITING_NAME,
  STATES.WAITING_LASTNAME
];

// Función para determinar si debemos analizar con NLP/Mistral
function debeAnalizarConIA(estado, mensaje) {
  // No analizar si está en flujo de menú
  if (ESTADOS_FLUJO_MENU.includes(estado)) {
    return false;
  }
  
  // No analizar si es una opción numérica simple (1-9)
  if (/^\d$/.test(mensaje.trim())) {
    return false;
  }
  
  // Sí analizar en otros casos
  return true;
}

export async function procesarMensaje(from, message) {
  const currentState = getState(from);
  const messageText = message.toLowerCase().trim();
  
  console.log(`📩 Mensaje de ${from}: ${message}`);
  console.log(`📍 Estado actual: ${currentState}`);

  // ============================================
  // ANÁLISIS CON IA (NLP/Mistral) - SOLO CUANDO CORRESPONDA
  // ============================================
  let nlpAnalysis = null;
  let debeUsarIA = debeAnalizarConIA(currentState, message);
  
  if (debeUsarIA) {
    // 🤖 PROCESAMIENTO NLP - Analizar intención del mensaje
    nlpAnalysis = await nlpService.enhancedDetection(message);
    console.log(`🧠 NLP Analysis para ${from}:`, {
      intent: nlpAnalysis.nlp.intent,
      confidence: nlpAnalysis.nlp.confidence,
      sentiment: nlpAnalysis.nlp.sentiment
    });
  } else {
    console.log(`⏭️ Mensaje en flujo de menú - NLP/Mistral omitido`);
  }

  // Verificar si es un mensaje de despedida (combinando NLP y detector existente)
  const isNlpFarewell = debeUsarIA ? await nlpService.isFarewell(message) : false;
  const isDetectorFarewell = farewellDetector.isFarewell(message);
  
  if (isNlpFarewell || isDetectorFarewell) {
    console.log(`👋 Despedida detectada de ${from}: "${message}" (NLP: ${isNlpFarewell}, Detector: ${isDetectorFarewell})`);
    
    // Priorizar respuesta de NLP si tiene alta confianza
    let farewellResponse;
    if (isNlpFarewell && nlpAnalysis.nlp.confidence > 0.8 && nlpAnalysis.nlp.answer) {
      farewellResponse = nlpAnalysis.nlp.answer;
    } else {
      farewellResponse = farewellDetector.getFarewellResponse(message);
    }
    
    // Enviar mensaje de despedida
    await sendMessage(from, farewellResponse);
    
    // Finalizar sesión manualmente
    sessionService.finishSession(from);
    
    return;
  }

  // Verificar si es un usuario completamente nuevo (sin sesión)
  const hasExistingSession = sessionService.sessions.has(from);
  
  if (!hasExistingSession) {
    console.log(`🆕 Usuario nuevo detectado: ${from} - Iniciando flujo de bienvenida`);
    
    // Crear nueva sesión
    sessionService.updateSession(from);
    
    // Iniciar flujo de bienvenida directamente
    await flujoBienvenida(from);
    return;
  }

  // Verificar si necesita advertencia de finalización (12 minutos)
  if (sessionService.needsWarning(from)) {
    await sendMessage(from, `⚠️ *Advertencia de Sesión*

Tu conversación será finalizada automáticamente en *3 minutos* por inactividad.

Si deseas continuar, simplemente envía cualquier mensaje.`);
  }
  
  // Verificar si debe finalizar automáticamente (15 minutos)
  if (sessionService.shouldAutoFinish(from)) {
    await sendMessage(from, `🔚 *Conversación Finalizada*

Tu sesión ha sido finalizada automáticamente por inactividad.

¡Gracias por contactarnos! Si necesitas ayuda nuevamente, simplemente envía un mensaje.`);
    
    // Reiniciar la sesión completamente
    sessionService.resetSession(from);
    return;
  }
  
  // Verificar si la sesión ha expirado (verificación adicional para sesiones existentes)
  if (sessionService.isSessionExpired(from)) {
    console.log(`⏰ Sesión expirada para ${from} - Reiniciando conversación`);
    
    // Reiniciar la sesión completamente
    sessionService.resetSession(from);
    
    // Enviar mensaje de bienvenida por sesión expirada
     await sendMessage(from, `⏰ *Sesión Expirada*

Tu sesión ha expirado por inactividad (15 minutos).

¡Hola de nuevo! 👋 Empecemos una nueva conversación.`);
    
    // Iniciar flujo de bienvenida
    await flujoBienvenida(from);
    
    // Actualizar sesión con nueva actividad
    sessionService.updateSession(from);
    return;
  }
  
  // Actualizar timestamp de actividad de la sesión
  sessionService.updateSession(from);

  // ============================================
  // ANÁLISIS INTELIGENTE - SOLO CUANDO CORRESPONDA
  // ============================================
  
  if (debeUsarIA && nlpAnalysis) {
    // 🤖 RESPUESTA AUTOMÁTICA NLP - Verificar si NLP puede responder directamente
    const automaticResponse = await nlpService.getAutomaticResponse(message);
    if (automaticResponse.hasResponse && automaticResponse.confidence > 0.85) {
      console.log(`🎯 Respuesta automática NLP para ${from} (confianza: ${automaticResponse.confidence})`);
      await sendMessage(from, automaticResponse.response);
      return;
    }
    
    // 🤖 DETECCIÓN DE SALUDOS MEJORADA - Combinar NLP y detector existente
    const isNlpGreeting = await nlpService.isGreeting(message);
    const isDetectorGreeting = greetingDetector.isGreeting(message);
    
    if ((isNlpGreeting || isDetectorGreeting) && 
        [STATES.INITIAL, STATES.PRODUCTOS, STATES.PEDIDOS, STATES.FAQ].includes(currentState)) {
      console.log(`👋 Saludo detectado de ${from} (NLP: ${isNlpGreeting}, Detector: ${isDetectorGreeting})`);
      await flujoBienvenida(from);
      return;
    }

    // 🤖 DETECCIÓN DE SOLICITUDES DE AYUDA
    const isHelpRequest = await nlpService.isHelpRequest(message);
    if (isHelpRequest && nlpAnalysis.nlp.confidence > 0.7) {
      console.log(`🆘 Solicitud de ayuda detectada de ${from}`);
      await sendMessage(from, "Por supuesto, estoy aquí para ayudarte. 😊\n\nEscribe *menú* para ver todas las opciones disponibles o dime específicamente qué necesitas.");
      await mostrarMenuPrincipal(from);
      return;
    }

    // 🤖 ANÁLISIS DE SENTIMIENTO - Responder a mensajes negativos
    if (nlpAnalysis.nlp.sentiment && nlpAnalysis.nlp.sentiment.score < -0.5) {
      console.log(`😔 Sentimiento negativo detectado de ${from} (score: ${nlpAnalysis.nlp.sentiment.score})`);
      await sendMessage(from, "Entiendo que puedas estar frustrado. 😔\n\nEstoy aquí para ayudarte de la mejor manera posible. ¿Podrías decirme específicamente en qué puedo asistirte?\n\nEscribe *menú* para ver todas las opciones disponibles.");
      return;
    }
  }
  
  // ============================================
  // DETECCIÓN DE FAQs - SIEMPRE ACTIVA
  // ============================================
  const faqType = faqDetector.detectFAQ(message);
  if (faqType) {
    const faqResponse = faqDetector.getAutoResponse(faqType);
    if (faqResponse) {
      console.log(`❓ FAQ detectada: ${faqType}`);
      await sendMessage(from, faqResponse);
      return;
    }
  }
  
  // ============================================
  // BÚSQUEDA DE PRODUCTOS CON MISTRAL - SOLO FUERA DEL FLUJO DE MENÚ
  // ============================================
  if (debeUsarIA && currentState !== STATES.PRODUCTOS && currentState !== STATES.PEDIDOS) {
    const productoInfo = await buscarProductoConMistral(message);
    if (productoInfo) {
      console.log(`🛍️ Búsqueda de producto detectada de ${from} (fuera del flujo)`);
      const respuesta = formatearRespuestaProducto(productoInfo);
      await sendMessage(from, respuesta);
      return;
    }
  }

  // ============================================
  // COMANDO ESPECIAL PARA VOLVER AL MENÚ
  // ============================================
  if (messageText === "menu" || messageText === "menú") {
    await mostrarMenuPrincipal(from);
    return;
  }
  
  // Manejar estados de conversación
  switch (currentState) {
    case STATES.INITIAL:
      await flujoBienvenida(from);
      break;
      
    case STATES.WAITING_NAME:
      await flujoBienvenida(from, message, 'nombre');
      break;
      
    case STATES.WAITING_LASTNAME:
      await flujoBienvenida(from, message, 'apellido');
      break;
      
    case STATES.MENU:
      await manejarMenu(from, message);
      break;
      
    case STATES.PRODUCTOS:
      await manejarSeccionEspecifica(from, message, 'productos');
      break;
      
    case STATES.PEDIDOS:
      await manejarSeccionEspecifica(from, message, 'pedidos');
      break;
      
    case STATES.FAQ:
      await manejarPreguntasFAQ(from, message);
      break;
      
    default:
      await flujoBienvenida(from);
      break;
  }
}

async function manejarSeccionEspecifica(from, message, seccion) {
  const messageText = message.toLowerCase().trim();
  
  if (messageText === "menu" || messageText === "menú") {
    await mostrarMenuPrincipal(from);
    return;
  }
  
  // Si está en la sección de productos, buscar con Mistral
  if (seccion === 'productos') {
    console.log(`🔍 Buscando producto en sección PRODUCTOS para ${from}`);
    const productoInfo = await buscarProductoConMistral(message);
    
    if (productoInfo && productoInfo.encontrado) {
      const respuesta = formatearRespuestaProducto(productoInfo);
      await sendMessage(from, respuesta + '\n\n¿Deseas buscar otro producto? Escribe el nombre o *"menú"* para volver al menú principal.');
      return;
    } else if (productoInfo && !productoInfo.encontrado) {
      await sendMessage(from, `❌ No encontré información sobre "${productoInfo.nombreBuscado}" en nuestro catálogo.

¿Deseas buscar otro producto? Escribe el nombre o *"menú"* para volver al menú principal.`);
      return;
    } else {
      await sendMessage(from, `❌ No pude identificar el producto que buscas.

Por favor, escribe el nombre del producto que deseas consultar o *"menú"* para volver al menú principal.`);
      return;
    }
  }
  
  // Aquí puedes agregar lógica específica para cada sección
  const respuesta = `Mensaje recibido en sección ${seccion}: "${message}"
  
Un representante revisará tu consulta y te responderá pronto.

Escribe *"menu"* para volver al menú principal.`;
  
  await sendMessage(from, respuesta);
}

async function manejarPreguntasFAQ(from, message) {
  const messageText = message.toLowerCase().trim();
  
  if (messageText === "menu" || messageText === "menú") {
    await mostrarMenuPrincipal(from);
    return;
  }
  
  // Verificar si es un número del 1 al 6 para las preguntas específicas
  const opcionNum = parseInt(messageText);
  if (opcionNum >= 1 && opcionNum <= 6) {
    await manejarFAQEspecifica(from, messageText);
    return;
  }
  
  // Si no es un número válido, tratar como consulta general
  const respuesta = `❓ Pregunta recibida: "${message}"

Un representante revisará tu consulta y te responderá pronto.

¿Algo más? Escribe *"menu"* para volver al menú principal.`;
  
  await sendMessage(from, respuesta);
}
