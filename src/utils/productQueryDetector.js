/**
 * Detector de consultas sobre productos
 *
 * Identifica cuando un usuario está preguntando por productos, precios,
 * disponibilidad, stock, etc. Debe usarse SOLO en el contexto del menú
 * de productos para evitar falsos positivos.
 */
export class ProductQueryDetector {
  constructor() {
    // Patrones de preguntas sobre productos
    this.queryPatterns = [
      // Disponibilidad
      /tienen\s+(.+)/i,
      /hay\s+(.+)/i,
      /venden\s+(.+)/i,
      /manejan\s+(.+)/i,
      /trabajan\s+con\s+(.+)/i,

      // Precios
      /cuanto\s+(cuesta|vale|sale|cobran)\s+(.+)/i,
      /cu[aá]nto\s+(cuesta|vale|sale|cobran)\s+(.+)/i,
      /precio\s+(de|del)\s+(.+)/i,
      /valor\s+(de|del)\s+(.+)/i,
      /costo\s+(de|del)\s+(.+)/i,

      // Búsqueda/Interés
      /quiero\s+(.+)/i,
      /me\s+interesa\s+(.+)/i,
      /busco\s+(.+)/i,
      /necesito\s+(.+)/i,
      /estoy\s+buscando\s+(.+)/i,

      // Consultas directas
      /donde\s+encuentro\s+(.+)/i,
      /d[oó]nde\s+encuentro\s+(.+)/i,
      /como\s+consigo\s+(.+)/i,
      /c[oó]mo\s+consigo\s+(.+)/i,

      // Stock
      /stock\s+(de|del)\s+(.+)/i,
      /disponibilidad\s+(de|del)\s+(.+)/i,
      /en\s+stock\s+(.+)/i,

      // Variantes
      /qui[eé]nes?\s+(tienen|venden|manejan)\s+(.+)/i,
      /d[oó]nde\s+(tienen|venden|consigo)\s+(.+)/i
    ];

    // Palabras clave de contexto de producto (cualquiera de estas sugiere producto)
    this.productContextKeywords = [
      // Frutos secos
      'almendra', 'almendras', 'nuez', 'nueces', 'maní', 'mani',
      'pistacho', 'pistachos', 'castaña', 'castañas', 'avellana', 'avellanas',
      'cashew', 'cashews', 'anacardo', 'anacardos',

      // Chocolates y cacao
      'cacao', 'chocolate', 'cocoa', 'chocolates',

      // Hierbas
      'hierba', 'hierbas', 'menta', 'albahaca', 'romero', 'tomillo',
      'cilantro', 'salvia', 'laurel', 'eneldo', 'mejorana',

      // Tés e infusiones
      'té', 'te', 'tes', 'infusion', 'infusión', 'infusiones', 'tisana', 'tisanas',

      // Condimentos
      'oregano', 'orégano', 'comino', 'pimienta', 'pimenton', 'pimentón',
      'ajo', 'cebolla', 'perejil', 'paprika', 'merkén', 'merken',

      // Especias
      'canela', 'clavo', 'clavos', 'jengibre', 'curcuma', 'cúrcuma',
      'curry', 'cardamomo', 'azafran', 'azafrán', 'nuez moscada',
      'anis', 'anís', 'mostaza',

      // Frutas deshidratadas
      'mango', 'mangos', 'piña', 'pina', 'piñas', 'pinas',
      'durazno', 'duraznos', 'damasco', 'damascos', 'higo', 'higos',
      'ciruela', 'ciruelas', 'papaya', 'papayas', 'platano', 'plátano',
      'frutilla', 'frutillas', 'frambuesa', 'frambuesas',
      'arandano', 'arándano', 'arandanos', 'arándanos',
      'cranberry', 'cranberries', 'mora', 'moras',
      'pasas', 'pasa', 'uva', 'uvas',

      // Dulces y gomitas
      'gomita', 'gomitas', 'dulce', 'dulces', 'caramelo', 'caramelos',
      'goma', 'gomas', 'gelatina', 'gelatinas', 'chicle', 'chicles',

      // Semillas
      'semilla', 'semillas', 'chia', 'chía', 'linaza', 'sesamo', 'sésamo',
      'girasol', 'calabaza', 'zapallo',

      // Genéricos
      'mix', 'mixto', 'mixta', 'mezcla', 'surtido'
    ];
  }

  /**
   * Verifica si un mensaje es una consulta sobre productos
   * @param {string} message - El mensaje a analizar
   * @returns {boolean} - true si es consulta de producto
   */
  isProductQuery(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }

    const normalizedMessage = this.normalizeMessage(message);

    // 1. Verificar patrones específicos de consulta
    const hasQueryPattern = this.queryPatterns.some(pattern =>
      pattern.test(normalizedMessage)
    );

    // 2. Verificar palabras clave de contexto de producto
    const hasProductContext = this.productContextKeywords.some(keyword =>
      normalizedMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    // Es consulta de producto si:
    // - Tiene patrón de consulta (tienen, hay, precio, etc.)
    // - O tiene contexto de producto directo
    return hasQueryPattern || hasProductContext;
  }

  /**
   * Extrae el término de búsqueda del mensaje
   * Útil para detectar qué producto menciona el usuario
   * @param {string} message - El mensaje del usuario
   * @returns {string|null} - El término extraído o null
   */
  extractSearchTerm(message) {
    if (!message || typeof message !== 'string') {
      return null;
    }

    const normalizedMessage = this.normalizeMessage(message);

    // Intentar extraer con los patrones que capturan grupos
    for (const pattern of this.queryPatterns) {
      const match = normalizedMessage.match(pattern);
      if (match && match.length > 1) {
        // Retornar el primer grupo capturado (el término de búsqueda)
        const term = match[match.length - 1].trim();
        if (term.length > 2) {
          return term;
        }
      }
    }

    // Si no se pudo extraer con patrones, buscar keywords directas
    for (const keyword of this.productContextKeywords) {
      if (normalizedMessage.toLowerCase().includes(keyword.toLowerCase())) {
        return keyword;
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
      .trim()
      // Remover emojis y caracteres especiales
      .replace(/[^\w\sáéíóúñü¿?¡!]/g, ' ')
      // Normalizar espacios múltiples
      .replace(/\s+/g, ' ');
  }
}

// Instancia singleton del detector
export const productQueryDetector = new ProductQueryDetector();
