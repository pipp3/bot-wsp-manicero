// Detector de saludos en español
export class GreetingDetector {
  constructor() {
    // Palabras y frases de saludo comunes
    this.greetingPatterns = [
      // Saludos básicos
      'hola',
      'hello',
      'hi',
      'hey',
      'ey',
      
      // Saludos por tiempo del día
      'buen día',
      'buenos días',
      'buenas tardes',
      'buenas noches',
      'buena tarde',
      'buena noche',
      
      // Saludos formales
      'saludos',
      'cordial saludo',
      'un saludo',
      
      // Expresiones de inicio de conversación
      'qué tal',
      'como estas',
      'cómo estás',
      'como está',
      'cómo está',
      'que tal',
      'como andas',
      'cómo andas',
      
      // Saludos informales
      'ola',
      'holaa',
      'holaaa',
      'holi',
      'holiii',
      
      // Expresiones de cortesía
      'disculpe',
      'disculpa',
      'perdón',
      'con permiso',
      
      // Inicio de consulta
      'necesito',
      'quiero',
      'quisiera',
      'me gustaría',
      'podría',
      'podrías',
      'pueden',
      'ayuda',
      'información',
      'consulta'
    ];
    
    // Patrones de regex para detectar variaciones
    this.regexPatterns = [
      /^ho+la+$/i,           // hola, hoola, hooola, etc.
      /^bu+en+\s*d[ií]a+$/i, // buen día y variaciones
      /^bu+en+as?\s*(tardes?|noches?)$/i, // buenas tardes/noches
      /^qu[eé]\s*tal/i,      // qué tal
      /^c[oó]mo\s*(est[aá]s?|and[aá]s?)/i, // cómo estás/andas
    ];
  }
  
  /**
   * Detecta si un mensaje contiene un saludo
   * @param {string} message - El mensaje a analizar
   * @returns {boolean} - True si contiene un saludo
   */
  isGreeting(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }
    
    const normalizedMessage = this.normalizeMessage(message);
    
    // Verificar patrones exactos
    for (const pattern of this.greetingPatterns) {
      if (normalizedMessage.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    
    // Verificar patrones regex
    for (const regex of this.regexPatterns) {
      if (regex.test(normalizedMessage)) {
        return true;
      }
    }
    
    // Verificar si el mensaje es muy corto y podría ser un saludo
    if (normalizedMessage.length <= 15) {
      const shortGreetings = ['hola', 'hi', 'hello', 'hey', 'ola', 'buenas'];
      return shortGreetings.some(greeting => 
        normalizedMessage.includes(greeting)
      );
    }
    
    return false;
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
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      // Normalizar espacios múltiples
      .replace(/\s+/g, ' ')
      // Remover acentos para mejor matching
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  
  /**
   * Obtiene el tipo de saludo detectado
   * @param {string} message - El mensaje a analizar
   * @returns {string|null} - Tipo de saludo o null si no es saludo
   */
  getGreetingType(message) {
    if (!this.isGreeting(message)) {
      return null;
    }
    
    const normalizedMessage = this.normalizeMessage(message);
    
    // Determinar el tipo de saludo
    if (normalizedMessage.includes('buenos dias') || normalizedMessage.includes('buen dia')) {
      return 'morning';
    }
    
    if (normalizedMessage.includes('buenas tardes') || normalizedMessage.includes('buena tarde')) {
      return 'afternoon';
    }
    
    if (normalizedMessage.includes('buenas noches') || normalizedMessage.includes('buena noche')) {
      return 'evening';
    }
    
    if (normalizedMessage.includes('que tal') || normalizedMessage.includes('como estas') || 
        normalizedMessage.includes('como andas')) {
      return 'casual';
    }
    
    return 'general';
  }
}

// Instancia singleton del detector
export const greetingDetector = new GreetingDetector();