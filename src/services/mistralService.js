import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({ apiKey: apiKey });

/**
 * Extrae el término de búsqueda de producto del mensaje del usuario
 *
 * Esta función usa Mistral AI para detectar de forma inteligente el término
 * de búsqueda de producto en mensajes naturales del usuario, manejando:
 * - Diferentes formas de preguntar (precio, disponibilidad, información)
 * - Variaciones ortográficas y errores de escritura
 * - Singular y plural
 * - Sinónimos y nombres comunes
 *
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Promise<string|null>} - El término de búsqueda extraído o null si no hay producto mencionado
 *
 * @example
 * await extractProductSearchTerm("Cuánto cuestan las almendras?") // "almendras"
 * await extractProductSearchTerm("Tienen nueces disponibles?") // "nueces"
 * await extractProductSearchTerm("Precio del maní con sal") // "maní con sal"
 * await extractProductSearchTerm("Hola, cómo están?") // null
 */
export async function extractProductSearchTerm(mensaje) {
  try {
    const prompt = `Eres un asistente experto en identificar términos de búsqueda de productos en mensajes de clientes de "El Manicero", una tienda especializada.

PRODUCTOS QUE VENDEMOS (ejemplos, no limitativo):
- Frutos secos: almendras, nueces, maní, pistachos, castañas, avellanas, etc.
- Hierbas: menta, albahaca, romero, tomillo, cilantro, orégano, etc.
- Tés e infusiones: té verde, té negro, té rojo, tisanas, etc.
- Condimentos: comino, pimienta, pimentón, ajo, cebolla, etc.
- Especias: canela, clavo, jengibre, cúrcuma, curry, cardamomo, etc.
- Frutas deshidratadas: mango, piña, durazno, arándanos, pasas, higos, etc.
- Dulces y gomitas: gomitas, caramelos, dulces, etc.
- Chocolates y cacao: cacao, chocolate, cocoa, etc.
- Semillas: chía, linaza, sésamo, girasol, etc.
- Y muchos otros productos relacionados

Tu tarea es EXTRAER el término de búsqueda del producto mencionado en el mensaje del cliente.

REGLAS IMPORTANTES:
1. Extrae solo el NOMBRE o TÉRMINO DE BÚSQUEDA del producto mencionado
2. NO inventes productos que no están en el mensaje
3. Ignora palabras de consulta como "tienen", "hay", "venden" - enfócate solo en el PRODUCTO
4. Maneja variaciones: singular/plural, con/sin tildes, errores ortográficos
5. Si el cliente menciona un producto genérico (ej: "cacao", "té verde"), extrae ese término
6. Si menciona una variación específica (ej: "cacao amargo", "té verde orgánico"), extrae el término completo
7. Si NO se menciona ningún producto, devuelve exactamente: null
8. NO agregues explicaciones ni contexto adicional

EJEMPLOS:
- "Tienen cacao amargo?" → cacao amargo
- "Hay té verde disponible?" → té verde
- "Cuánto cuestan las almendras?" → almendras
- "Precio de los pistachos" → pistachos
- "Quiero gomitas de frambuesa" → gomitas de frambuesa
- "Venden canela en polvo?" → canela en polvo
- "Me interesa el jengibre" → jengibre
- "Hola, cómo están?" → null
- "Cuál es el horario?" → null
- "Gracias" → null

Mensaje del cliente: "${mensaje}"

Responde ÚNICAMENTE con el término de búsqueda del producto (en minúsculas, sin comillas, sin puntos) o "null" si no hay producto mencionado.`;

    const chatResponse = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      maxTokens: 30
    });

    const respuesta = chatResponse.choices[0].message.content.trim().toLowerCase();

    console.log(`🤖 Mistral extrajo término de búsqueda: "${respuesta}" del mensaje: "${mensaje}"`);

    // Si la respuesta es "null", retornar null
    if (respuesta === 'null') {
      console.log(`ℹ️ No se detectó ningún producto en el mensaje`);
      return null;
    }

    // Validar que la respuesta no sea demasiado larga (probablemente un error)
    if (respuesta.length > 50) {
      console.warn(`⚠️ Término de búsqueda demasiado largo, probablemente un error: "${respuesta}"`);
      return null;
    }

    return respuesta;

  } catch (error) {
    console.error('❌ Error en extractProductSearchTerm:', error.message);

    // En caso de error de Mistral, intentar fallback básico
    return fallbackProductExtraction(mensaje);
  }
}

/**
 * Fallback de extracción de producto cuando Mistral no está disponible
 * Usa detección simple basada en palabras clave comunes
 *
 * @param {string} mensaje - El mensaje del usuario
 * @returns {string|null} - Término de búsqueda básico o null
 */
function fallbackProductExtraction(mensaje) {
  console.log('⚠️ Usando fallback de extracción de producto (Mistral no disponible)');

  const mensajeLower = mensaje.toLowerCase().trim();

  // Lista de palabras clave comunes de productos
  const productKeywords = [
    'almendra', 'almendras',
    'nuez', 'nueces',
    'maní', 'mani',
    'pistacho', 'pistachos',
    'cashew', 'cashews', 'castaña', 'castañas',
    'avellana', 'avellanas',
    'arándano', 'arándanos', 'arandano', 'arandanos',
    'pasas', 'pasa',
    'mixto', 'mix',
    'semilla', 'semillas'
  ];

  // Buscar palabras clave en el mensaje
  for (const keyword of productKeywords) {
    if (mensajeLower.includes(keyword)) {
      console.log(`✅ Fallback detectó: "${keyword}"`);
      return keyword;
    }
  }

  console.log('ℹ️ Fallback no encontró productos en el mensaje');
  return null;
}

/**
 * Extrae múltiples productos con sus cantidades del mensaje del usuario
 *
 * Esta función usa Mistral AI para detectar TODOS los productos mencionados
 * en un mensaje y sus cantidades asociadas. Útil para agregar varios productos
 * al carrito en una sola operación.
 *
 * @param {string} mensaje - El mensaje del usuario con múltiples productos
 * @returns {Promise<Array<{nombre: string, cantidad: number}>>} - Array de productos con cantidades
 *
 * @example
 * await extractMultipleProductsWithQuantities("Quiero 3 almendras, 2 nueces\nté verde\n1 kilo de maní")
 * // Retorna: [
 * //   { nombre: "almendras", cantidad: 3 },
 * //   { nombre: "nueces", cantidad: 2 },
 * //   { nombre: "té verde", cantidad: 1 },
 * //   { nombre: "maní", cantidad: 1 }
 * // ]
 */
export async function extractMultipleProductsWithQuantities(mensaje) {
  try {
    const prompt = `Eres un asistente experto en extraer productos y cantidades de mensajes de clientes de "El Manicero".

PRODUCTOS QUE VENDEMOS (ejemplos):
- Frutos secos: almendras, nueces, maní, pistachos, castañas, avellanas, etc.
- Hierbas: menta, albahaca, romero, tomillo, cilantro, orégano, etc.
- Tés e infusiones: té verde, té negro, té rojo, tisanas, etc.
- Condimentos: comino, pimienta, pimentón, ajo, cebolla, etc.
- Especias: canela, clavo, jengibre, cúrcuma, curry, cardamomo, etc.
- Frutas deshidratadas: mango, piña, durazno, arándanos, pasas, higos, etc.
- Dulces y gomitas: gomitas, caramelos, dulces, etc.
- Chocolates y cacao: cacao, chocolate, cocoa, etc.
- Semillas: chía, linaza, sésamo, girasol, etc.

Tu tarea es EXTRAER TODOS los productos mencionados con sus cantidades.

REGLAS IMPORTANTES:
1. Extrae TODOS los productos mencionados en el mensaje, no solo el primero
2. Detecta las cantidades asociadas a cada producto (números antes o después del nombre)
3. Si NO se menciona cantidad, asume cantidad = 1
4. Ignora palabras como "quiero", "necesito", "dame" - enfócate solo en productos y cantidades
5. Maneja separadores: comas, saltos de línea, "y", "también", "además"
6. Si el número está seguido de "kilo", "kg", "gramos", etc., considera ese número como cantidad
7. Si NO se menciona ningún producto, devuelve EXACTAMENTE: []
8. Responde ÚNICAMENTE en formato JSON válido

FORMATO DE RESPUESTA (JSON):
[
  {"nombre": "producto1", "cantidad": X},
  {"nombre": "producto2", "cantidad": Y}
]

EJEMPLOS:

Mensaje: "Quiero 3 almendras, 2 nueces y té verde"
Respuesta: [{"nombre": "almendras", "cantidad": 3}, {"nombre": "nueces", "cantidad": 2}, {"nombre": "té verde", "cantidad": 1}]

Mensaje: "Necesito maní con sal"
Respuesta: [{"nombre": "maní con sal", "cantidad": 1}]

Mensaje: "Dame 5 kilos de pasas, canela y 2 paquetes de chocolate"
Respuesta: [{"nombre": "pasas", "cantidad": 5}, {"nombre": "canela", "cantidad": 1}, {"nombre": "chocolate", "cantidad": 2}]

Mensaje: "almendras
nueces
pistachos"
Respuesta: [{"nombre": "almendras", "cantidad": 1}, {"nombre": "nueces", "cantidad": 1}, {"nombre": "pistachos", "cantidad": 1}]

Mensaje: "Hola, cómo están?"
Respuesta: []

Mensaje del cliente: """
${mensaje}
"""

Responde ÚNICAMENTE con el JSON (sin markdown, sin comillas externas, sin explicaciones):`;

    const chatResponse = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      maxTokens: 500
    });

    const respuesta = chatResponse.choices[0].message.content.trim();

    console.log(`🤖 Mistral extrajo productos múltiples:`, respuesta);

    // Limpiar la respuesta (remover posibles markdown code blocks)
    let cleanedResponse = respuesta
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    // Parsear JSON
    let productos = [];
    try {
      productos = JSON.parse(cleanedResponse);

      // Validar que sea un array
      if (!Array.isArray(productos)) {
        console.warn('⚠️ La respuesta de Mistral no es un array, retornando array vacío');
        return [];
      }

      // Validar estructura de cada producto
      productos = productos.filter(p => {
        if (!p.nombre || typeof p.nombre !== 'string') {
          console.warn('⚠️ Producto sin nombre válido, omitiendo:', p);
          return false;
        }
        if (!p.cantidad || typeof p.cantidad !== 'number' || p.cantidad <= 0) {
          console.warn('⚠️ Producto con cantidad inválida, asignando cantidad 1:', p);
          p.cantidad = 1;
        }
        return true;
      });

      // Normalizar nombres a minúsculas
      productos = productos.map(p => ({
        nombre: p.nombre.toLowerCase().trim(),
        cantidad: Math.floor(p.cantidad) // Asegurar que sea entero
      }));

      console.log(`✅ Productos extraídos exitosamente: ${productos.length} producto(s)`);
      productos.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.nombre} - Cantidad: ${p.cantidad}`);
      });

      return productos;

    } catch (parseError) {
      console.error('❌ Error al parsear JSON de Mistral:', parseError.message);
      console.error('Respuesta recibida:', cleanedResponse);

      // Fallback: intentar extracción básica
      return fallbackMultipleProductExtraction(mensaje);
    }

  } catch (error) {
    console.error('❌ Error en extractMultipleProductsWithQuantities:', error.message);

    // Fallback en caso de error de Mistral
    return fallbackMultipleProductExtraction(mensaje);
  }
}

/**
 * Fallback de extracción múltiple de productos cuando Mistral no está disponible
 * Usa detección simple basada en palabras clave y patrones
 *
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Array<{nombre: string, cantidad: number}>} - Array de productos con cantidades
 */
function fallbackMultipleProductExtraction(mensaje) {
  console.log('⚠️ Usando fallback de extracción múltiple (Mistral no disponible)');

  const mensajeLower = mensaje.toLowerCase().trim();
  const productos = [];

  // Lista de palabras clave comunes de productos
  const productKeywords = [
    'almendra', 'almendras',
    'nuez', 'nueces',
    'maní', 'mani',
    'pistacho', 'pistachos',
    'cashew', 'cashews', 'castaña', 'castañas',
    'avellana', 'avellanas',
    'arándano', 'arándanos', 'arandano', 'arandanos',
    'pasas', 'pasa',
    'té verde', 'te verde',
    'té negro', 'te negro',
    'canela',
    'cacao',
    'chocolate',
    'gomitas',
    'mixto', 'mix'
  ];

  // Patrón para detectar cantidad + producto: "3 almendras", "2 kilos de maní"
  const patronCantidadProducto = /(\d+)\s*(kilos?|kg|gramos?|gr|paquetes?|unidades?)?\s*(de\s+)?(\w+)/gi;

  let match;
  const productosEncontrados = new Set();

  while ((match = patronCantidadProducto.exec(mensajeLower)) !== null) {
    const cantidad = parseInt(match[1]);
    const nombreProducto = match[4];

    // Verificar si es un keyword conocido
    const keywordEncontrado = productKeywords.find(k => nombreProducto.includes(k) || k.includes(nombreProducto));

    if (keywordEncontrado && !productosEncontrados.has(keywordEncontrado)) {
      productos.push({
        nombre: keywordEncontrado,
        cantidad: cantidad
      });
      productosEncontrados.add(keywordEncontrado);
      console.log(`✅ Fallback detectó: ${keywordEncontrado} x${cantidad}`);
    }
  }

  // Si no se encontraron productos con cantidad, buscar solo keywords
  if (productos.length === 0) {
    for (const keyword of productKeywords) {
      if (mensajeLower.includes(keyword) && !productosEncontrados.has(keyword)) {
        productos.push({
          nombre: keyword,
          cantidad: 1
        });
        productosEncontrados.add(keyword);
        console.log(`✅ Fallback detectó: ${keyword} (cantidad por defecto: 1)`);
      }
    }
  }

  console.log(`ℹ️ Fallback encontró ${productos.length} producto(s)`);
  return productos;
}

/**
 * Detecta el nombre del producto que el usuario está buscando
 * @deprecated Use extractProductSearchTerm instead for better accuracy
 * @param {string} mensaje - El mensaje del usuario
 * @returns {Promise<string|null>} - El nombre del producto detectado o null
 */
export async function detectarProducto(mensaje) {
  console.warn('⚠️ detectarProducto está deprecado, usa extractProductSearchTerm');
  return extractProductSearchTerm(mensaje);
}
