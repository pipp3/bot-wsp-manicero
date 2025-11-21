// Detector de preguntas frecuentes
export class FAQDetector {
  constructor() {
    // Patrones para detectar diferentes tipos de preguntas
    this.faqPatterns = {
      // Horarios de apertura/cierre
      horarios: {
        keywords: [
          'hora', 'horario', 'horarios', 'abren', 'abre', 'cierran', 'cierra',
          'atienden', 'atiende', 'funcionan', 'funciona', 'trabajan', 'trabaja',
          'abierto', 'abiertos', 'cerrado', 'cerrados', 'disponible', 'disponibles'
        ],
        phrases: [
          'a que hora',
          'a qué hora',
          'que hora',
          'qué hora',
          'hasta que hora',
          'hasta qué hora',
          'desde que hora',
          'desde qué hora',
          'horario de atencion',
          'horario de atención',
          'horarios de trabajo',
          'cuando abren',
          'cuándo abren',
          'cuando cierran',
          'cuándo cierran'
        ],
        type: 'horarios'
      },

      // Ubicación del local
      ubicacion: {
        keywords: [
          'donde', 'dónde', 'ubicacion', 'ubicación', 'direccion', 'dirección',
          'local', 'tienda', 'negocio', 'establecimiento', 'sede', 'sucursal',
          'llegar', 'ir', 'voy', 'encuentro', 'queda', 'esta', 'está'
        ],
        phrases: [
          'donde esta',
          'dónde está',
          'donde queda',
          'dónde queda',
          'donde se encuentra',
          'dónde se encuentra',
          'como llegar',
          'cómo llegar',
          'como llego',
          'cómo llego',
          'cual es la direccion',
          'cuál es la dirección',
          'donde los encuentro',
          'dónde los encuentro'
        ],
        type: 'ubicacion'
      },

      // Pedidos y entregas
      pedidos: {
        keywords: [
          'pedido', 'pedidos', 'entregar', 'entrega', 'entregas', 'domicilio',
          'delivery', 'envio', 'envío', 'envios', 'envíos', 'despacho', 'despachos',
          'llevar', 'traer', 'mandar', 'enviar'
        ],
        phrases: [
          'hacen pedidos',
          'toman pedidos',
          'reciben pedidos',
          'hacen entregas',
          'entregan a domicilio',
          'llevan a domicilio',
          'hacen delivery',
          'tienen delivery',
          'envian a domicilio',
          'envían a domicilio',
          'como pedir',
          'cómo pedir',
          'como hacer pedido',
          'cómo hacer pedido'
        ],
        type: 'pedidos'
      },

      // Empresas de despacho
      despacho: {
        keywords: [
          'despachan', 'despacho', 'empresa', 'empresas', 'compania', 'compañia',
          'companias', 'compañías', 'servicio', 'servicios', 'transportan',
          'transporte', 'courier', 'mensajeria', 'mensajería'
        ],
        phrases: [
          'por cual empresa',
          'por cuál empresa',
          'que empresa',
          'qué empresa',
          'cuales empresas',
          'cuáles empresas',
          'con que empresa',
          'con qué empresa',
          'quien despacha',
          'quién despacha',
          'como despachan',
          'cómo despachan',
          'por donde despachan',
          'por dónde despachan'
        ],
        type: 'despacho'
      },

      // Formas de pago
      pago: {
        keywords: [
          'pago', 'pagos', 'pagar', 'cobran', 'cobra', 'cuesta', 'precio',
          'efectivo', 'tarjeta', 'tarjetas', 'transferencia', 'transferencias',
          'movil', 'móvil', 'debito', 'débito', 'credito', 'crédito'
        ],
        phrases: [
          'como pagar',
          'cómo pagar',
          'formas de pago',
          'metodos de pago',
          'métodos de pago',
          'como se paga',
          'cómo se paga',
          'que formas de pago',
          'qué formas de pago',
          'aceptan tarjeta',
          'reciben tarjeta',
          'pago con tarjeta',
          'pago movil',
          'pago móvil'
        ],
        type: 'pago'
      }
    };
  }

  /**
   * Detecta si un mensaje contiene una pregunta frecuente
   * @param {string} message - El mensaje a analizar
   * @returns {string|null} - Tipo de FAQ detectado o null
   */
  detectFAQ(message) {
    if (!message || typeof message !== 'string') {
      return null;
    }

    const normalizedMessage = this.normalizeMessage(message);

    // Verificar cada categoría de FAQ
    for (const [category, patterns] of Object.entries(this.faqPatterns)) {
      // Verificar frases específicas primero (más precisas)
      for (const phrase of patterns.phrases) {
        if (normalizedMessage.includes(phrase.toLowerCase())) {
          return patterns.type;
        }
      }

      // Verificar palabras clave (menos precisas, requieren más coincidencias)
      let keywordMatches = 0;
      for (const keyword of patterns.keywords) {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }

      // Si hay suficientes coincidencias de palabras clave, considerar como match
      if (keywordMatches >= 2 || (keywordMatches >= 1 && normalizedMessage.length <= 20)) {
        return patterns.type;
      }
    }

    return null;
  }

  /**
   * Normaliza el mensaje para mejor detección
   * @param {string} message - Mensaje original
   * @returns {string} - Mensaje normalizado
   */
  normalizeMessage(message) {
    return message
      .toLowerCase()
      .trim()
      // Remover emojis y caracteres especiales
      .replace(/[^\w\sáéíóúñü¿?¡!]/g, ' ')
      // Normalizar espacios múltiples
      .replace(/\s+/g, ' ')
      // Remover acentos para mejor matching
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Obtiene una respuesta automática para la FAQ detectada
   * @param {string} faqType - Tipo de FAQ detectado
   * @returns {string} - Respuesta automática
   */
  getAutoResponse(faqType) {
    const responses = {
      horarios: `🕒 *Horarios de Atención*

Nuestros horarios son:
• *Lunes a Viernes:* 7:30 AM - 16:30 PM
• *Sábados:* 7:30 AM - 14:00 PM  
• *Domingos:* Cerrado

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

      ubicacion: `📍 *Ubicación del Local*

Nos encontramos en:
*Dirección:* Pasaje Rosas 842 Local 5, Recoleta
*Referencia:* Avenida La Paz 271
*Ciudad:* Santiago

*¿Cómo llegar?*
• En transporte público: Línea 2 metros Puente Cal y Canto o Patronatro
• En vehículo: Hay estacionamiento dentro de La Vega Central o en Avenida La Paz

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

      pedidos: `📦 *Pedidos y Entregas*

¡Sí! Realizamos entregas a domicilio:

*Condiciones:*
• Despachos sobre compras mayores a $50.000
• Despachos solo a Regiones
• Horario de despachos: 9:00 AM - 15:00 PM

*¿Cómo hacer un pedido?*
• Por WhatsApp (este chat)
• Llamada telefónica: +1234567890

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

      despacho: `🚚 *Empresas de Despacho*

Trabajamos con las siguientes empresas de confianza:

• *Starken*
• *Varmontt* 
• *Chevalier*
• *Pullman Cargo*

*Tiempos de entrega:*
• Regiones: 1-5 días hábiles

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`,

      pago: `💳 *Formas de Pago*

Aceptamos múltiples formas de pago:

*En el local:*
• Efectivo
• Tarjetas débito
• Transferencias bancarias

*Para entregas:*
• Pago contra entrega (efectivo o débito)
• Transferencia previa

¿Necesitas algo más? Escribe *"menu"* para ver todas las opciones.`
    };

    return responses[faqType] || null;
  }
}

// Instancia singleton del detector
export const faqDetector = new FAQDetector();