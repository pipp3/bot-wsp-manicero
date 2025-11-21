import { sendMessage } from "../services/messageService.js";
import { buscarUsuarioPorTelefono, registrarUsuario } from "../services/staticDataService.js";
import { 
  getState, 
  setState, 
  clearState, 
  STATES, 
  getTempData, 
  setTempData, 
  clearTempData 
} from "../services/conversationStateService.js";

export async function flujoBienvenida(from, message) {
  const usuario = buscarUsuarioPorTelefono(from);
  const currentState = getState(from);
  
  // Si el usuario ya existe, mostrar menú directamente
  if (usuario && currentState === STATES.INITIAL) {
    console.log(`👋 Cliente existente: ${usuario.nombre}`);
    const mensajeRecurrente = `¡Hola de nuevo, ${usuario.nombre}! 👋

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
  
  // Flujo para usuarios nuevos
  if (!usuario) {
    switch (currentState) {
      case STATES.INITIAL:
        console.log(`🆕 Nuevo usuario detectado: ${from}`);
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
        
        if (nombreYApellidoArray.length !== 2) {
          await sendMessage(from, "Por favor, ingresa tu *nombre* y *apellido* separados por un espacio:");
          return;
        }
        
        const [nombre] = nombreYApellidoArray;
        
       
        if (nombre.length < 2) {
          await sendMessage(from, "Por favor, ingresa un nombre válido (mínimo 2 caracteres):");
          return;
        }
        
        const [apellido] = nombreYApellidoArray;
        if (apellido.length < 2) {
          await sendMessage(from, "Por favor, ingresa un apellido válido (mínimo 2 caracteres):");
          return;
        }
        
        const nuevoUsuario = registrarUsuario(from, nombre, apellido);
        clearTempData(from);
        
        const mensajeRegistroCompleto = `¡Excelente, ${nuevoUsuario.nombre}! ✅

Tu registro ha sido completado exitosamente.

¿En qué podemos ayudarte hoy?

Por favor, selecciona una opción:
*1* - Consultas sobre productos
*2* - Pedidos  
*3* - Preguntas frecuentes

Escribe el número de la opción que necesites. 💬`;

        await sendMessage(from, mensajeRegistroCompleto);
        setState(from, STATES.MENU);
        break;
    }
  }
}
