import pkg from 'node-nlp';
const {NlpManager} = pkg;
import {faqDetector} from '../utils/faqDetector.js';

class NLPService {
    constructor() {
        // Configurar NlpManager para español
        this.manager = new NlpManager({ 
            languages: ['es'], 
            forceNER: true,
            nlu: { log: false }
        });
        
        this.isTrained = false;
        this.initializeIntents();
    }

    // Inicializar intenciones básicas del bot
    initializeIntents() {
        // Intención: Saludo
        this.manager.addDocument('es', 'hola', 'saludo');
        this.manager.addDocument('es', 'buenos días', 'saludo');
        this.manager.addDocument('es', 'buenas tardes', 'saludo');
        this.manager.addDocument('es', 'buenas noches', 'saludo');
        this.manager.addDocument('es', 'qué tal', 'saludo');
        this.manager.addDocument('es', 'cómo estás', 'saludo');
        this.manager.addDocument('es', 'hey', 'saludo');
        this.manager.addDocument('es', 'saludos', 'saludo');

        // Intención: Despedida
        this.manager.addDocument('es', 'adiós', 'despedida');
        this.manager.addDocument('es', 'hasta luego', 'despedida');
        this.manager.addDocument('es', 'nos vemos', 'despedida');
        this.manager.addDocument('es', 'chau', 'despedida');
        this.manager.addDocument('es', 'bye', 'despedida');
        this.manager.addDocument('es', 'hasta pronto', 'despedida');
        this.manager.addDocument('es', 'me voy', 'despedida');
        this.manager.addDocument('es', 'gracias por todo', 'despedida');

        // Intención: Agradecimiento
        this.manager.addDocument('es', 'gracias', 'agradecimiento');
        this.manager.addDocument('es', 'muchas gracias', 'agradecimiento');
        this.manager.addDocument('es', 'te agradezco', 'agradecimiento');
        this.manager.addDocument('es', 'muy amable', 'agradecimiento');
        this.manager.addDocument('es', 'perfecto gracias', 'agradecimiento');
        this.manager.addDocument('es', 'excelente', 'agradecimiento');

        // Intención: Consulta de información
        this.manager.addDocument('es', 'qué servicios ofrecen', 'consulta_servicios');
        this.manager.addDocument('es', 'cuáles son sus servicios', 'consulta_servicios');
        this.manager.addDocument('es', 'qué hacen', 'consulta_servicios');
        this.manager.addDocument('es', 'información sobre servicios', 'consulta_servicios');

        // Intención: Solicitar ayuda
        this.manager.addDocument('es', 'ayuda', 'solicitar_ayuda');
        this.manager.addDocument('es', 'necesito ayuda', 'solicitar_ayuda');
        this.manager.addDocument('es', 'puedes ayudarme', 'solicitar_ayuda');
        this.manager.addDocument('es', 'no entiendo', 'solicitar_ayuda');
        this.manager.addDocument('es', 'estoy perdido', 'solicitar_ayuda');
        this.manager.addDocument('es', 'qué opciones tengo', 'solicitar_ayuda');

        // Intención: Consulta de horarios
        this.manager.addDocument('es', 'qué horarios tienen', 'consulta_horarios');
        this.manager.addDocument('es', 'cuándo están abiertos', 'consulta_horarios');
        this.manager.addDocument('es', 'horarios de atención', 'consulta_horarios');
        this.manager.addDocument('es', 'a qué hora abren', 'consulta_horarios');

        // Intención: Contacto
        this.manager.addDocument('es', 'cómo los contacto', 'contacto');
        this.manager.addDocument('es', 'número de teléfono', 'contacto');
        this.manager.addDocument('es', 'dirección', 'contacto');
        this.manager.addDocument('es', 'dónde están ubicados', 'contacto');
        this.manager.addDocument('es', 'email', 'contacto');

        // Respuestas para cada intención
        this.manager.addAnswer('es', 'saludo', '¡Hola! 👋 ¿En qué puedo ayudarte hoy?');
        this.manager.addAnswer('es', 'despedida', '¡Hasta luego! 👋 Que tengas un excelente día.');
        this.manager.addAnswer('es', 'agradecimiento', '¡De nada! 😊 Estoy aquí para ayudarte cuando lo necesites.');
        this.manager.addAnswer('es', 'consulta_servicios', 'Te puedo ayudar con información sobre nuestros servicios. Escribe "menú" para ver todas las opciones disponibles.');
        this.manager.addAnswer('es', 'solicitar_ayuda', 'Por supuesto, estoy aquí para ayudarte. Escribe "menú" para ver las opciones o dime específicamente qué necesitas.');
        this.manager.addAnswer('es', 'consulta_horarios', 'Nuestros horarios de atención son de lunes a viernes de 7:30 AM a 16:30 PM.');
        this.manager.addAnswer('es', 'contacto', 'Puedes contactarnos por WhatsApp o escribir "contacto" para ver toda la información.');
    }

    // Entrenar el modelo
    async trainModel() {
        if (!this.isTrained) {
            console.log('🤖 Entrenando modelo de NLP...');
            await this.manager.train();
            this.isTrained = true;
            console.log('✅ Modelo de NLP entrenado correctamente');
        }
    }

    // Procesar mensaje y obtener intención
    async processMessage(message) {
        if (!this.isTrained) {
            await this.trainModel();
        }

        try {
            const result = await this.manager.process('es', message.toLowerCase());
            
            return {
                intent: result.intent || 'none',
                confidence: result.score || 0,
                answer: result.answer || null,
                entities: result.entities || [],
                sentiment: result.sentiment || null
            };
        } catch (error) {
            console.error('Error procesando mensaje con NLP:', error);
            return {
                intent: 'none',
                confidence: 0,
                answer: null,
                entities: [],
                sentiment: null
            };
        }
    }

    // Verificar si es un saludo usando NLP
    async isGreeting(message) {
        const result = await this.processMessage(message);
        return result.intent === 'saludo' && result.confidence > 0.7;
    }

    // Verificar si es una despedida usando NLP
    async isFarewell(message) {
        const result = await this.processMessage(message);
        return (result.intent === 'despedida' || result.intent === 'agradecimiento') && result.confidence > 0.7;
    }

    // Verificar si es una solicitud de ayuda
    async isHelpRequest(message) {
        const result = await this.processMessage(message);
        return result.intent === 'solicitar_ayuda' && result.confidence > 0.7;
    }

    // Obtener respuesta automática basada en intención
    async getAutomaticResponse(message) {
        const result = await this.processMessage(message);
        
        if (result.confidence > 0.8 && result.answer) {
            return {
                hasResponse: true,
                response: result.answer,
                intent: result.intent,
                confidence: result.confidence
            };
        }

        return {
            hasResponse: false,
            response: null,
            intent: result.intent,
            confidence: result.confidence
        };
    }

    // Combinar con detectores existentes para mayor precisión
    async enhancedDetection(message) {
        const nlpResult = await this.processMessage(message);
        
        // Usar detectores existentes como respaldo
        const faqResult = faqDetector.detectFAQ(message);
        
        // Crear objeto de resultado FAQ con estructura consistente
        const faqResultObj = faqResult ? {
            type: faqResult,
            confidence: 0.9 // Alta confianza para FAQs detectadas
        } : {
            type: null,
            confidence: 0
        };
        
        return {
            nlp: nlpResult,
            faq: faqResultObj,
            // Combinar resultados para mayor precisión
            finalIntent: nlpResult.confidence > 0.8 ? nlpResult.intent : (faqResult ? 'faq' : 'unknown'),
            confidence: Math.max(nlpResult.confidence || 0, faqResultObj.confidence)
        };
    }
}

// Crear instancia singleton
const nlpService = new NLPService();

export { nlpService };