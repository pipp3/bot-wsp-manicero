import { sendMessage } from './messageService.js';

// Servicio de gestión de sesiones con expiración automática
export class SessionService {
  constructor() {
    // Almacén de sesiones en memoria con timestamps
    this.sessions = new Map();

    // Duración de la sesión en milisegundos (15 minutos)
    this.SESSION_DURATION = 15 * 60 * 1000; // 15 minutos

    // Tiempo para advertencia (12 minutos)
    this.WARNING_TIME = 12 * 60 * 1000; // 12 minutos

    // Tiempo para reinicio de contexto (8 minutos)
    this.CONTEXT_RESET_TIME = 8 * 60 * 1000; // 8 minutos

    // Intervalo de verificación de sesiones (cada 1 minuto)
    this.CHECK_INTERVAL = 1 * 60 * 1000; // 1 minuto

    // Iniciar monitoreo automático
    this.startSessionMonitoring();
  }

  /**
   * Actualiza el timestamp de la última actividad de una sesión
   * @param {string} userId - ID del usuario
   */
  updateSession(userId) {
    if (!userId) return;

    const now = Date.now();
    const existingSession = this.sessions.get(userId);

    this.sessions.set(userId, {
      lastActivity: now,
      createdAt: existingSession?.createdAt || now,
      warningShown: false,
      finishMessageShown: false,
      contextResetShown: false
    });

    console.log(`📱 Sesión actualizada para ${userId} - ${new Date(now).toLocaleTimeString()}`);
  }

  /**
   * Verifica activamente todas las sesiones para detectar expiraciones y advertencias
   */
  async checkActiveSessions() {
    const now = Date.now();

    // Importar dinámicamente para evitar dependencias circulares
    const { cartService } = await import('./cartService.js');
    const { mostrarMenuPrincipal } = await import('../flows/menuFlow.js');

    for (const [userId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now - session.lastActivity;

      // 1. Verificar si debe finalizar automáticamente (15 minutos)
      if (timeSinceLastActivity >= this.SESSION_DURATION) {
        if (!session.finishMessageShown) {
          console.log(`🔚 Finalizando sesión automáticamente para ${userId} - Inactivo por ${Math.round(timeSinceLastActivity / 1000 / 60)} minutos`);

          // Marcar como notificado
          session.finishMessageShown = true;
          this.sessions.set(userId, session);

          // Verificar si tenía un carrito activo
          const cart = cartService.getCart(userId);
          const hadCart = cart && cart.items && cart.items.length > 0;

          let mensajeFinal = `🔚 *Conversación Finalizada*

Tu sesión ha sido finalizada automáticamente por inactividad.`;

          if (hadCart) {
            mensajeFinal += `\n\n⚠️ *Nota:* Tu carrito de compras ha sido eliminado por inactividad.`;
          }

          mensajeFinal += `\n\n¡Gracias por contactarnos! Si necesitas ayuda nuevamente, simplemente envía un mensaje.`;

          await sendMessage(userId, mensajeFinal);

          // Reiniciar la sesión completamente
          this.resetSession(userId);
        }
        continue; // Pasar a la siguiente sesión
      }

      // 2. Verificar advertencia (12 minutos)
      if (timeSinceLastActivity >= this.WARNING_TIME && !session.warningShown) {
        console.log(`⚠️ Enviando advertencia a ${userId} - Inactivo por ${Math.round(timeSinceLastActivity / 1000 / 60)} minutos`);

        session.warningShown = true;
        this.sessions.set(userId, session);

        await sendMessage(userId, `⚠️ *Advertencia de Sesión*

Tu conversación será finalizada automáticamente en *3 minutos* por inactividad.

Si deseas continuar, simplemente envía cualquier mensaje.`);
        continue;
      }

      // 3. Verificar reinicio de contexto (8 minutos)
      if (timeSinceLastActivity >= this.CONTEXT_RESET_TIME && !session.contextResetShown) {
        console.log(`🔄 Reiniciando contexto para ${userId} - Inactivo por ${Math.round(timeSinceLastActivity / 1000 / 60)} minutos`);

        session.contextResetShown = true;
        this.sessions.set(userId, session);

        await sendMessage(userId, `⏳ *Reinicio por Inactividad*
    
Por inactividad (8 min), hemos vuelto al menú principal.
Tu sesión sigue activa y tu carrito (si tienes uno) se mantiene guardado.`);

        // Reiniciar contexto (estado) pero mantener sesión y carrito
        // NO actualizamos la actividad para que el tiempo siga corriendo hacia la expiración
        this.resetContext(userId, false);
        await mostrarMenuPrincipal(userId);
      }
    }
  }

  /**
   * Inicia el monitoreo automático de sesiones
   */
  startSessionMonitoring() {
    // Limpiar intervalo anterior si existe
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.checkActiveSessions();
    }, this.CHECK_INTERVAL);

    console.log(`🔄 Monitoreo de sesiones iniciado - cada ${this.CHECK_INTERVAL / 1000 / 60} minuto(s)`);
  }

  /**
   * Verifica si una sesión ha expirado
   * @param {string} userId - ID del usuario
   * @returns {boolean} - true si la sesión existe y ha expirado
   */
  isSessionExpired(userId) {
    if (!userId) return false;

    const session = this.sessions.get(userId);
    // Si no existe sesión, no está expirada (es nueva)
    if (!session) return false;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;
    const isExpired = timeSinceLastActivity > this.SESSION_DURATION;

    if (isExpired) {
      console.log(`⏰ Sesión expirada para ${userId} - Inactivo por ${Math.round(timeSinceLastActivity / 1000 / 60)} minutos`);
    }

    return isExpired;
  }

  /**
   * Obtiene información de la sesión
   * @param {string} userId - ID del usuario
   * @returns {object|null} - Información de la sesión o null si no existe
   */
  getSessionInfo(userId) {
    if (!userId) return null;

    const session = this.sessions.get(userId);
    if (!session) return null;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;
    const timeUntilExpiration = this.SESSION_DURATION - timeSinceLastActivity;

    return {
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      timeSinceLastActivity,
      timeUntilExpiration: Math.max(0, timeUntilExpiration),
      isExpired: this.isSessionExpired(userId),
      minutesRemaining: Math.max(0, Math.round(timeUntilExpiration / 1000 / 60))
    };
  }

  /**
   * Elimina una sesión específica
   * @param {string} userId - ID del usuario
   */
  removeSession(userId) {
    if (!userId) return;

    const removed = this.sessions.delete(userId);
    if (removed) {
      console.log(`🗑️ Sesión eliminada para ${userId}`);
    }
    return removed;
  }

  /**
   * Obtiene estadísticas de las sesiones activas
   * @returns {object} - Estadísticas de sesiones
   */
  getSessionStats() {
    const now = Date.now();
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const [userId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now - session.lastActivity;
      if (timeSinceLastActivity > this.SESSION_DURATION) {
        expiredSessions++;
      } else {
        activeSessions++;
      }
    }

    return {
      total: this.sessions.size,
      active: activeSessions,
      expired: expiredSessions,
      sessionDurationMinutes: this.SESSION_DURATION / 1000 / 60,
      checkIntervalMinutes: this.CHECK_INTERVAL / 1000 / 60
    };
  }

  /**
   * Configura la duración de la sesión
   * @param {number} minutes - Duración en minutos
   */
  setSessionDuration(minutes) {
    if (minutes > 0) {
      this.SESSION_DURATION = minutes * 60 * 1000;
      console.log(`⚙️ Duración de sesión configurada a ${minutes} minutos`);
    }
  }

  /**
   * Reinicia una sesión específica (elimina estado, datos temporales y datos del cliente)
   * @param {string} userId - ID del usuario
   */
  resetSession(userId) {
    if (!userId) return;

    // Eliminar la sesión del servicio de sesiones
    this.removeSession(userId);

    // Importar y limpiar estado de conversación, datos del cliente, y datos de pedido
    import('./conversationStateService.js').then(({ clearState, clearTempData, clearClientData, clearOrderData }) => {
      clearState(userId);
      clearTempData(userId);
      clearClientData(userId);
      clearOrderData(userId);
      console.log(`🔄 Sesión reiniciada completamente para ${userId}`);
    });

    // Limpiar carrito
    import('./cartService.js').then(({ cartService }) => {
      cartService.clearCart(userId);
      console.log(`🛒 Carrito limpiado para ${userId}`);
    });
  }

  /**
   * Verifica si una sesión necesita advertencia (12 minutos de inactividad)
   * @param {string} userId - ID del usuario
   * @returns {boolean} - true si necesita advertencia
   */
  needsWarning(userId) {
    if (!userId) return false;

    const session = this.sessions.get(userId);
    if (!session) return false;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;
    const needsWarning = timeSinceLastActivity >= this.WARNING_TIME && timeSinceLastActivity < this.SESSION_DURATION;

    // Verificar si ya se envió la advertencia
    if (needsWarning && !session.warningShown) {
      session.warningShown = true;
      this.sessions.set(userId, session);
      console.log(`⚠️ Advertencia de sesión para ${userId} - ${Math.round(timeSinceLastActivity / 1000 / 60)} minutos inactivo`);
      return true;
    }

    return false;
  }

  /**
   * Verifica si una sesión debe finalizar automáticamente
   * @param {string} userId - ID del usuario
   * @returns {boolean} - true si debe finalizar
   */
  shouldAutoFinish(userId) {
    if (!userId) return false;

    const session = this.sessions.get(userId);
    if (!session) return false;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;
    const shouldFinish = timeSinceLastActivity >= this.SESSION_DURATION;

    // Verificar si ya se envió el mensaje de finalización
    if (shouldFinish && !session.finishMessageShown) {
      session.finishMessageShown = true;
      this.sessions.set(userId, session);
      console.log(`🔚 Finalizando sesión automáticamente para ${userId} - ${Math.round(timeSinceLastActivity / 1000 / 60)} minutos inactivo`);
      return true;
    }

    return false;
  }

  /**
   * Verifica si se debe reiniciar el contexto por inactividad (8 minutos)
   * @param {string} userId - ID del usuario
   * @returns {boolean} - true si se debe reiniciar el contexto
   */
  shouldResetContext(userId) {
    if (!userId) return false;

    const session = this.sessions.get(userId);
    if (!session) return false;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;

    // Debe ser mayor al tiempo de reset de contexto pero menor al tiempo de expiración total
    const shouldReset = timeSinceLastActivity >= this.CONTEXT_RESET_TIME &&
      timeSinceLastActivity < this.SESSION_DURATION;

    if (shouldReset && !session.contextResetShown) {
      session.contextResetShown = true;
      this.sessions.set(userId, session);
      console.log(`🔄 Reinicio de contexto sugerido para ${userId} - ${Math.round(timeSinceLastActivity / 1000 / 60)} minutos inactivo`);
      return true;
    }

    return false;
  }

  /**
   * Reinicia el contexto de la sesión (estado) pero MANTIENE la sesión y el carrito
   * @param {string} userId - ID del usuario
   * @param {boolean} updateActivity - Si se debe actualizar el timestamp de actividad
   */
  resetContext(userId, updateActivity = true) {
    if (!userId) return;

    // Solo limpiamos el estado conversacional y datos temporales de flujo
    // NO limpiamos el carrito ni la sesión en sí
    import('./conversationStateService.js').then(({ clearState, clearTempData }) => {
      clearState(userId);
      clearTempData(userId);
      console.log(`🧠 Contexto reiniciado para ${userId} (Sesión y Carrito mantenidos)`);
    });

    // Actualizamos la actividad para que no expire inmediatamente después
    if (updateActivity) {
      this.updateSession(userId);
    }
  }

  /**
   * Finaliza manualmente una sesión (por despedida del usuario)
   * @param {string} userId - ID del usuario
   */
  finishSession(userId) {
    if (!userId) return;

    console.log(`👋 Finalizando sesión manualmente para ${userId} - Despedida detectada`);

    // Reiniciar la sesión completamente
    this.resetSession(userId);
  }
}

// Instancia singleton del servicio de sesiones
export const sessionService = new SessionService();

// Exportar también como default para compatibilidad
export default sessionService;