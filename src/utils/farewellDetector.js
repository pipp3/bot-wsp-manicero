// Detector de mensajes de despedida y gratitud
export class FarewellDetector {
  constructor() {
    // Patrones de despedida y gratitud en español
    this.farewellPatterns = [
      // Gratitud básica
      'gracias',
      'muchas gracias',
      'mil gracias',
      'te agradezco',
      'agradezco',
      'thank you',
      'thanks',
      
      // Despedidas básicas
      'adiós',
      'adios',
      'chao',
      'chau',
      'bye',
      'hasta luego',
      'hasta la vista',
      'nos vemos',
      'hasta pronto',
      'que tengas buen día',
      'que tengas buena tarde',
      'que tengas buena noche',
      'buen día',
      'buena tarde',
      'buena noche',
      
      // Despedidas con gratitud
      'gracias por todo',
      'gracias por la ayuda',
      'gracias por la información',
      'muchas gracias por todo',
      'te agradezco mucho',
      'muy agradecido',
      'muy agradecida',
      
      // Finalizaciones de conversación
      'eso es todo',
      'es todo por ahora',
      'no necesito más',
      'ya no necesito nada',
      'perfecto gracias',
      'excelente gracias',
      'listo gracias',
      'ok gracias',
      'está bien gracias',
      'muy bien gracias',
      
      // Despedidas formales
      'que tenga buen día',
      'que tenga buena tarde',
      'que tenga buena noche',
      'saludos',
      'cordiales saludos',
      'hasta otra oportunidad',
      'nos estaremos comunicando',
      
      // Despedidas informales
      'nos vemos luego',
      'hablamos después',
      'cuídate',
      'cuidate',
      'que estés bien',
      'que estes bien'
    ];
    
    // Expresiones regulares para patrones más complejos
    this.regexPatterns = [
      /^(muchas\s+)?gracias(\s+(por\s+todo|por\s+la\s+ayuda|por\s+la\s+información))?$/i,
      /^(muy\s+)?(agradecid[oa]|agradezco)(\s+mucho)?$/i,
      /^(adiós|adios|chao|chau|bye)(\s+y\s+gracias)?$/i,
      /^hasta\s+(luego|pronto|la\s+vista|otra\s+oportunidad)$/i,
      /^que\s+(tengas?|tenga)\s+(buen|buena)\s+(día|tarde|noche)$/i,
      /^(eso\s+es\s+todo|es\s+todo\s+por\s+ahora)(\s+gracias)?$/i,
      /^(ya\s+)?no\s+necesito\s+(más|nada)(\s+gracias)?$/i,
      /^(perfecto|excelente|listo|ok|está\s+bien|muy\s+bien)\s+gracias$/i,
      /^nos\s+(vemos|estaremos\s+comunicando)(\s+(luego|después))?$/i
    ];
  }

  /**
   * Detecta si un mensaje es de despedida o gratitud
   * @param {string} message - Mensaje a analizar
   * @returns {boolean} - true si es mensaje de despedida
   */
  isFarewell(message) {
    if (!message || typeof message !== 'string') return false;
    
    const normalizedMessage = this.normalizeMessage(message);
    
    // Verificar patrones exactos
    if (this.farewellPatterns.includes(normalizedMessage)) {
      return true;
    }
    
    // Verificar expresiones regulares
    for (const regex of this.regexPatterns) {
      if (regex.test(normalizedMessage)) {
        return true;
      }
    }
    
    // Verificar si el mensaje es muy corto y contiene palabras clave
    if (normalizedMessage.length <= 20) {
      const keywords = ['gracias', 'chao', 'bye', 'adiós', 'adios', 'hasta'];
      return keywords.some(keyword => normalizedMessage.includes(keyword));
    }
    
    return false;
  }

  /**
   * Normaliza el mensaje para comparación
   * @param {string} message - Mensaje original
   * @returns {string} - Mensaje normalizado
   */
  normalizeMessage(message) {
    return message
      .toLowerCase()
      .trim()
      .replace(/[¡!¿?.,;:()]/g, '') // Remover signos de puntuación
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Obtiene el tipo de despedida detectada
   * @param {string} message - Mensaje a analizar
   * @returns {string|null} - Tipo de despedida o null
   */
  getFarewellType(message) {
    if (!this.isFarewell(message)) return null;
    
    const normalizedMessage = this.normalizeMessage(message);
    
    // Clasificar tipos de despedida
    if (normalizedMessage.includes('gracias') || normalizedMessage.includes('agradezco')) {
      return 'gratitud';
    }
    
    if (normalizedMessage.includes('adiós') || normalizedMessage.includes('adios') || 
        normalizedMessage.includes('chao') || normalizedMessage.includes('bye')) {
      return 'despedida';
    }
    
    if (normalizedMessage.includes('hasta')) {
      return 'despedida_temporal';
    }
    
    if (normalizedMessage.includes('buen') || normalizedMessage.includes('buena')) {
      return 'buenos_deseos';
    }
    
    if (normalizedMessage.includes('todo') || normalizedMessage.includes('necesito')) {
      return 'finalizacion';
    }
    
    return 'despedida_general';
  }

  /**
   * Genera mensaje de respuesta personalizado según el tipo de despedida
   * @param {string} farewellType - Tipo de despedida detectada
   * @returns {string} - Mensaje de respuesta
   */
  getFarewellResponse(farewellType) {
    const responses = {
      'gratitud': `¡De nada! 😊 Fue un placer ayudarte.

¡Que tengas un excelente día! Si necesitas algo más en el futuro, no dudes en contactarnos.`,

      'despedida': `¡Hasta luego! 👋 

Gracias por contactarnos. ¡Que tengas un día maravilloso!`,

      'despedida_temporal': `¡Hasta pronto! 😊

Estaremos aquí cuando nos necesites. ¡Cuídate mucho!`,

      'buenos_deseos': `¡Igualmente! 🌟

Que tengas un día lleno de bendiciones. ¡Hasta la próxima!`,

      'finalizacion': `¡Perfecto! ✅

Me alegra haber podido ayudarte. ¡Que tengas un excelente día!`,

      'despedida_general': `¡Hasta luego! 👋

Fue un gusto atenderte. ¡Que tengas un día fantástico!`
    };

    return responses[farewellType] || responses['despedida_general'];
  }
}

// Exportar instancia singleton
export const farewellDetector = new FarewellDetector();

// Exportar también como default para compatibilidad
export default farewellDetector;