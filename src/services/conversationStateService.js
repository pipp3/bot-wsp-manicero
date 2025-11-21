// Servicio para manejar estados de conversación
const conversationStates = new Map();

// Estados posibles
export const STATES = {
  INITIAL: 'initial',
  WAITING_NAME: 'waiting_name',
  WAITING_LASTNAME: 'waiting_lastname',
  MENU: 'menu',
  PRODUCTOS: 'productos',
  PEDIDOS: 'pedidos',
  FAQ: 'faq'
};

// Obtener estado actual del usuario
export function getState(telefono) {
  return conversationStates.get(telefono) || STATES.INITIAL;
}

// Establecer estado del usuario
export function setState(telefono, state) {
  conversationStates.set(telefono, state);
  console.log(`🔄 Estado actualizado para ${telefono}: ${state}`);
}

// Limpiar estado del usuario
export function clearState(telefono) {
  conversationStates.delete(telefono);
  console.log(`🧹 Estado limpiado para ${telefono}`);
}

// Datos temporales del registro
const tempRegistrationData = new Map();

// Guardar datos temporales del registro
export function setTempData(telefono, data) {
  tempRegistrationData.set(telefono, data);
}

// Obtener datos temporales del registro
export function getTempData(telefono) {
  return tempRegistrationData.get(telefono) || {};
}

// Limpiar datos temporales del registro
export function clearTempData(telefono) {
  tempRegistrationData.delete(telefono);
}