import { flujoBienvenida } from "../flows/flujoBienvenida.js";
import { manejarMenu, mostrarMenuPrincipal, manejarFAQEspecifica, manejarOpcionPedidos } from "../flows/menuFlow.js";
import {
  iniciarBusquedaProductos,
  procesarConsultaBusqueda,
  procesarSeleccionProducto,
  procesarAccionDetalles,
  busquedaRapidaProducto
} from "../flows/productSearchFlow.js";
import {
  iniciarPedido,
  procesarListaProductos,
  procesarSeleccionAmbigua,
  procesarAgregarMas,
  procesarModalidadEnvio,
  procesarDireccion,
  procesarCiudad,
  procesarComuna,
  procesarCourier,
  procesarConfirmacion
} from "../flows/orderFlow.js";
import { getState, setState, clearState, STATES } from "../services/conversationStateService.js";
import { GreetingDetector } from "../utils/greetingDetector.js";
import { FAQDetector } from "../utils/faqDetector.js";
import { FarewellDetector } from "../utils/farewellDetector.js";
import { productQueryDetector } from "../utils/productQueryDetector.js";
import { sendMessage } from "../services/messageService.js";
import { sessionService } from "../services/sessionService.js";
import { nlpService } from "../services/nlpService.js";
import { buscarProductoConMistral, formatearRespuestaProducto } from "../services/productService.js";
import { cartService } from "../services/cartService.js";

const greetingDetector = new GreetingDetector();
const faqDetector = new FAQDetector();
const farewellDetector = new FarewellDetector();

// Estados donde NO debemos usar NLP/Mistral (flujo del menú y selecciones específicas)
const ESTADOS_FLUJO_MENU = [
  STATES.MENU,
  STATES.WAITING_NAME,
  STATES.WAITING_LASTNAME,
  STATES.PRODUCT_SEARCH_WAITING_SELECTION, // Esperando selección numérica

  // Estados de pedidos - NO usar NLP/Mistral aquí
  STATES.ORDER_REQUESTING_PRODUCTS,        // Usuario escribe lista de productos
  STATES.ORDER_SELECTING_AMBIGUOUS,        // Usuario selecciona productos ambiguos
  STATES.ORDER_ADDING_MORE,                // Usuario decide si agregar más
  STATES.ORDER_DELIVERY_METHOD,            // Usuario selecciona modalidad
  STATES.ORDER_DELIVERY_ADDRESS,           // Usuario ingresa dirección
  STATES.ORDER_DELIVERY_CITY,              // Usuario ingresa ciudad
  STATES.ORDER_DELIVERY_COMUNA,            // Usuario ingresa comuna
  STATES.ORDER_COURIER_SELECTION,          // Usuario selecciona courier
  STATES.ORDER_CONFIRMING                  // Usuario confirma pedido
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

  // Detectar si es consulta de producto (se usa en múltiples lugares)
  const esConsultaProducto = productQueryDetector.isProductQuery(message);

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
    // IMPORTANTE: No detectar como ayuda si es una consulta de producto
    const isHelpRequest = await nlpService.isHelpRequest(message);

    // Estados donde el usuario está en contexto de productos y NO debe tratarse como ayuda
    const estadosContextoProducto = [
      STATES.PRODUCTOS,
      STATES.PRODUCT_SEARCH_WAITING_QUERY,
      STATES.PRODUCT_SEARCH_WAITING_SELECTION,
      STATES.PRODUCT_SEARCH_SHOWING_DETAILS,

      // Estados de pedidos - contexto de producto activo
      STATES.ORDER_REQUESTING_PRODUCTS,
      STATES.ORDER_SELECTING_AMBIGUOUS,
      STATES.ORDER_ADDING_MORE
    ];

    if (isHelpRequest && nlpAnalysis.nlp.confidence > 0.7 &&
      !esConsultaProducto &&
      !estadosContextoProducto.includes(currentState)) {
      console.log(`🆘 Solicitud de ayuda detectada de ${from}`);
      await sendMessage(from, "Por supuesto, estoy aquí para ayudarte. 😊\n\nEscribe *menú* para ver todas las opciones disponibles o dime específicamente qué necesitas.");
      await mostrarMenuPrincipal(from);
      return;
    }

    // 🤖 ANÁLISIS DE SENTIMIENTO - Responder a mensajes negativos
    // No responder por sentimiento negativo si es consulta de producto o está en contexto de productos
    if (nlpAnalysis.nlp.sentiment &&
      nlpAnalysis.nlp.sentiment.score < -0.5 &&
      !esConsultaProducto &&
      !estadosContextoProducto.includes(currentState)) {
      console.log(`😔 Sentimiento negativo detectado de ${from} (score: ${nlpAnalysis.nlp.sentiment.score})`);
      await sendMessage(from, "Entiendo que puedas estar frustrado. 😔\n\nEstoy aquí para ayudarte de la mejor manera posible. ¿Podrías decirme específicamente en qué puedo asistirte?\n\nEscribe *menú* para ver todas las opciones disponibles.");
      return;
    }
  }

  // ============================================
  // DETECCIÓN DE CONSULTAS DE PRODUCTOS - CONTEXT-AWARE
  // ============================================
  // Solo detectar productos fuera de flujos específicos de menú/selección
  const estadosQueNoPermiteBusquedaRapida = [
    STATES.PRODUCTOS, // Ya está en la sección de productos (se maneja en switch-case)
    STATES.PEDIDOS,
    STATES.FAQ, // Ya está en la sección de FAQ
    STATES.PRODUCT_SEARCH_WAITING_QUERY,
    STATES.PRODUCT_SEARCH_WAITING_SELECTION,
    STATES.PRODUCT_SEARCH_SHOWING_DETAILS
  ];

  // Usar la detección que ya se hizo arriba (para evitar duplicados)
  if (debeUsarIA && esConsultaProducto && !estadosQueNoPermiteBusquedaRapida.includes(currentState)) {
    console.log(`🛍️ Consulta de producto detectada: "${message}"`);
    const seProcesoProducto = await busquedaRapidaProducto(from, message);
    if (seProcesoProducto) {
      console.log(`✅ Búsqueda rápida de producto procesada para ${from}`);
      return;
    }
  }

  // ============================================
  // DETECCIÓN DE FAQs - SOLO EN CONTEXTO DE FAQ
  // ============================================
  // Solo detectar FAQs cuando el usuario está en el menú de FAQ
  if (currentState === STATES.FAQ) {
    const faqType = faqDetector.detectFAQ(message);
    if (faqType) {
      const faqResponse = faqDetector.getAutoResponse(faqType);
      if (faqResponse) {
        console.log(`❓ FAQ detectada en menú FAQ: ${faqType}`);
        await sendMessage(from, faqResponse);
        return;
      }
    }
  }

  // ============================================
  // COMANDO ESPECIAL PARA VOLVER AL MENÚ Y ENRUTAMIENTO POR PALABRAS CLAVE
  // ============================================
  if (messageText === "menu" || messageText === "menú") {
    await mostrarMenuPrincipal(from);
    return;
  }

  // Enrutamiento directo a PEDIDOS
  // IMPORTANTE: No activar si el usuario dice "confirmar pedido" o si ya está en un flujo de pedido activo
  const isOrderState = currentState.startsWith('order_');
  if ((messageText.includes("pedido") || messageText.includes("crear pedido") || messageText.includes("quiero hacer un pedido")) && !messageText.includes("confirmar") && !isOrderState) {
    console.log(`📦 Palabra clave 'pedido' detectada - Iniciando flujo de pedido`);
    await iniciarPedido(from);
    return;
  }

  // Enrutamiento directo a CARRITO
  if (messageText.includes("carrito") || messageText.includes("canasta") || messageText.includes("ver pedido")) {
    console.log(`🛒 Palabra clave 'carrito' detectada - Mostrando resumen`);
    const resumen = cartService.getFormattedSummary(from);
    await sendMessage(from, resumen);
    return;
  }

  // Enrutamiento directo a PRECIOS / CONSULTAS
  if (messageText.includes("precio") || messageText.includes("consultar") || messageText.includes("valor") || messageText.includes("costo")) {
    console.log(`💰 Palabra clave de precios/consulta detectada - Iniciando búsqueda`);
    await iniciarBusquedaProductos(from);
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
      await manejarOpcionPedidos(from, message);
      break;

    case STATES.FAQ:
      await manejarPreguntasFAQ(from, message);
      break;

    // ============================================
    // ESTADOS DE BÚSQUEDA DE PRODUCTOS
    // ============================================
    case STATES.PRODUCT_SEARCH_WAITING_QUERY:
      // Usuario está en el flujo de búsqueda y escribe qué busca
      await procesarConsultaBusqueda(from, message);
      break;

    case STATES.PRODUCT_SEARCH_WAITING_SELECTION:
      // Usuario está seleccionando un producto de la lista (número)
      await procesarSeleccionProducto(from, message);
      break;

    case STATES.PRODUCT_SEARCH_SHOWING_DETAILS:
      // Usuario está viendo detalles y puede agregar al carrito o buscar otro
      await procesarAccionDetalles(from, message);
      break;

    // ============================================
    // ESTADOS DEL FLUJO DE PEDIDOS (CARRITO)
    // ============================================
    case STATES.ORDER_REQUESTING_PRODUCTS:
      // Usuario está escribiendo su lista de productos
      await procesarListaProductos(from, message);
      break;

    case STATES.ORDER_SELECTING_AMBIGUOUS:
      // Usuario está seleccionando productos de opciones ambiguas
      await procesarSeleccionAmbigua(from, message);
      break;

    case STATES.ORDER_ADDING_MORE:
      // Usuario decide si agregar más productos o finalizar
      await procesarAgregarMas(from, message);
      break;

    case STATES.ORDER_DELIVERY_METHOD:
      // Usuario selecciona modalidad de envío (retiro o domicilio)
      await procesarModalidadEnvio(from, message);
      break;

    case STATES.ORDER_DELIVERY_ADDRESS:
      // Usuario ingresa dirección de envío
      await procesarDireccion(from, message);
      break;

    case STATES.ORDER_DELIVERY_CITY:
      // Usuario ingresa ciudad
      await procesarCiudad(from, message);
      break;

    case STATES.ORDER_DELIVERY_COMUNA:
      // Usuario ingresa comuna
      await procesarComuna(from, message);
      break;

    case STATES.ORDER_COURIER_SELECTION:
      // Usuario selecciona courier
      await procesarCourier(from, message);
      break;

    case STATES.ORDER_CONFIRMING:
      // Usuario confirma o cancela el pedido
      await procesarConfirmacion(from, message);
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

  // Si está en la sección de productos, procesar directamente como consulta de búsqueda
  if (seccion === 'productos') {
    console.log(`🔍 Procesando mensaje en sección PRODUCTOS para ${from}: "${message}"`);

    // Verificar si es una consulta de producto
    const esConsultaProducto = productQueryDetector.isProductQuery(message);

    if (esConsultaProducto) {
      // Procesar directamente como consulta de búsqueda
      console.log(`✅ Consulta de producto detectada en sección PRODUCTOS`);
      await procesarConsultaBusqueda(from, message);
    } else {
      // Si no es consulta de producto, iniciar flujo de búsqueda
      console.log(`ℹ️ No es consulta de producto, mostrando mensaje de bienvenida`);
      await iniciarBusquedaProductos(from);
    }
    return;
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
