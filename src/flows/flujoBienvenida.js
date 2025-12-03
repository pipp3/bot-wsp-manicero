import { sendMessage } from "../services/messageService.js";
import { validarTelefono, registrarCliente } from "../services/apiService.js";
import {
  getState,
  setState,
  clearState,
  STATES,
  getTempData,
  setTempData,
  clearTempData,
  getClientData,
  setClientData,
  setClienteId
} from "../services/conversationStateService.js";

/**
 * Flujo de bienvenida para el bot de WhatsApp
 *
 * Este flujo maneja dos escenarios principales:
 * 1. Cliente registrado: Valida el teléfono con el backend y muestra menú directamente
 * 2. Cliente nuevo: Solicita nombre y apellido, registra en el backend y muestra menú
 *
 * @param {string} from - Número de teléfono del cliente (formato WhatsApp)
 * @param {string} message - Mensaje del cliente (usado para capturar nombre y apellido)
 */
export async function flujoBienvenida(from, message) {
  const currentState = getState(from);

  // ============================================
  // PASO 1: VALIDAR SI EL CLIENTE YA ESTÁ REGISTRADO
  // ============================================

  // Verificar si ya tenemos datos del cliente en memoria
  let clienteData = getClientData(from);

  // Si no tenemos datos en memoria y estamos en estado inicial, validar con el backend
  if (!clienteData && currentState === STATES.INITIAL) {
    try {
      console.log(`🔍 Validando teléfono ${from} con el backend...`);
      const validacionResult = await validarTelefono(from);

      if (validacionResult.registrado) {
        // Cliente registrado: guardar datos en memoria
        clienteData = validacionResult.cliente;
        setClientData(from, clienteData);

        // Guardar id_cliente en la sesión (soporta id_usuario, id_cliente, o id)
        const idCliente = clienteData.id_usuario || clienteData.id_cliente || clienteData.id;
        if (idCliente) {
          setClienteId(from, idCliente);
          console.log(`✅ Cliente registrado encontrado: ${clienteData.nombre} (ID: ${idCliente})`);
        } else {
          console.warn(`⚠️ Cliente registrado sin ID: ${clienteData.nombre}`);
        }

        // Mostrar mensaje de bienvenida para cliente recurrente
        const mensajeRecurrente = `¡Hola de nuevo, ${clienteData.nombre}! 👋

¡Qué gusto verte por aquí otra vez! 😊

¿En qué podemos ayudarte hoy?

Por favor, selecciona una opción:
*1* - Consultas sobre productos
*2* - Pedidos
*3* - Preguntas frecuentes

Escribe el número de la opción que necesites. 💬`;

        await sendMessage(from, mensajeRecurrente);
        setState(from, STATES.MENU);
        return;
      } else {
        // Cliente no registrado: iniciar flujo de registro
        console.log(`🆕 Cliente no registrado: ${from}`);
      }
    } catch (error) {
      // Error al validar con el backend
      console.error(`❌ Error al validar teléfono ${from}:`, error.message);

      // Enviar mensaje de error al cliente
      await sendMessage(from, `⚠️ Lo siento, estamos teniendo problemas técnicos temporales.

Por favor, intenta nuevamente en unos momentos.

Si el problema persiste, contacta con soporte.`);

      // No continuar con el flujo
      return;
    }
  }

  // Si ya existe clienteData (cliente recurrente que ya fue validado anteriormente)
  if (clienteData && currentState === STATES.INITIAL) {
    console.log(`👋 Cliente existente (datos en memoria): ${clienteData.nombre}`);
    const mensajeRecurrente = `¡Hola de nuevo, ${clienteData.nombre}! 👋

¡Qué gusto verte por aquí otra vez! 😊

¿En qué podemos ayudarte hoy?

Por favor, selecciona una opción:
*1* - Consultas sobre productos
*2* - Pedidos
*3* - Preguntas frecuentes

Escribe el número de la opción que necesites. 💬`;

    await sendMessage(from, mensajeRecurrente);
    setState(from, STATES.MENU);
    return;
  }

  // ============================================
  // PASO 2: FLUJO DE REGISTRO PARA USUARIOS NUEVOS
  // ============================================

  if (!clienteData) {
    switch (currentState) {
      case STATES.INITIAL:
        console.log(`🆕 Nuevo usuario detectado: ${from} - Iniciando flujo de registro`);
        const mensajeBienvenida = `¡Hola! 👋

¡Bienvenido/a! Somos El Manicero Lucas y estamos aquí para ayudarte.

Para brindarte un mejor servicio, necesitamos registrarte.

Por favor, escribe tu *nombre* y *apellido*:`;

        await sendMessage(from, mensajeBienvenida);
        setState(from, STATES.WAITING_NAME);
        break;

      case STATES.WAITING_NAME:
        const nombreYApellido = message.trim();
        const nombreYApellidoArray = nombreYApellido.split(' ');

        // Validar formato: nombre y apellido separados por espacio
        if (nombreYApellidoArray.length < 2) {
          await sendMessage(from, "Por favor, ingresa tu *nombre* y *apellido* separados por un espacio:");
          return;
        }

        // Extraer nombre y apellido
        const nombre = nombreYApellidoArray[0];
        const apellido = nombreYApellidoArray.slice(1).join(' '); // Soporta apellidos compuestos

        // Validar longitud del nombre
        if (nombre.length < 2) {
          await sendMessage(from, "Por favor, ingresa un nombre válido (mínimo 2 caracteres):");
          return;
        }

        // Validar longitud del apellido
        if (apellido.length < 2) {
          await sendMessage(from, "Por favor, ingresa un apellido válido (mínimo 2 caracteres):");
          return;
        }

        // Registrar cliente en el backend
        try {
          const nombreCompleto = `${nombre} ${apellido}`;
          console.log(`📝 Registrando cliente en backend: ${nombreCompleto} - ${from}`);

          const nuevoCliente = await registrarCliente(from, nombreCompleto);

          // Guardar datos del cliente en memoria
          setClientData(from, nuevoCliente);
          clearTempData(from);

          // Guardar id_cliente en la sesión (soporta id_usuario, id_cliente, o id)
          const idCliente = nuevoCliente.id_usuario || nuevoCliente.id_cliente || nuevoCliente.id;
          if (idCliente) {
            setClienteId(from, idCliente);
            console.log(`✅ Cliente registrado exitosamente: ${nuevoCliente.nombre} (ID: ${idCliente})`);
          } else {
            console.warn(`⚠️ Cliente registrado sin ID: ${nuevoCliente.nombre}`);
          }

          const mensajeRegistroCompleto = `¡Excelente, ${nuevoCliente.nombre}! ✅

Tu registro ha sido completado exitosamente.

¿En qué podemos ayudarte hoy?

Por favor, selecciona una opción:
*1* - Consultas sobre productos
*2* - Pedidos
*3* - Preguntas frecuentes

Escribe el número de la opción que necesites. 💬`;

          await sendMessage(from, mensajeRegistroCompleto);
          setState(from, STATES.MENU);
        } catch (error) {
          // Error al registrar en el backend
          console.error(`❌ Error al registrar cliente ${from}:`, error.message);

          // Enviar mensaje de error al cliente
          await sendMessage(from, `⚠️ Lo siento, no pudimos completar tu registro.

${error.message}

Por favor, intenta nuevamente o contacta con soporte.`);

          // Volver al estado inicial para que pueda intentar de nuevo
          setState(from, STATES.INITIAL);
        }
        break;
    }
  }
}
