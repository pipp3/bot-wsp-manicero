// Servicio de gestión de sesiones con expiración automática
export class SessionService {
  constructor() {
    // Almacén de sesiones en memoria con timestamps
    this.sessions = new Map();
    
    // Duración de la sesión en milisegundos (15 minutos)
    this.SESSION_DURATION = 15 * 60 * 1000; // 15 minutos
    
    // Tiempo para advertencia (12 minutos)
    this.WARNING_TIME = 12 * 60 * 1000; // 12 minutos
    
    // Intervalo de limpieza automática (cada 5 minutos)
    this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos
    
    // Iniciar limpieza automática
    this.startAutoCleanup();
  }

  /**
   * Actualiza el timestamp de la última actividad de una sesión
   * @param {string} userId - ID del usuario
   */
  updateSession(userId) {
    if (!userId) return;
    
    const now = Date.now();
    this.sessions.set(userId, {
      lastActivity: now,
      createdAt: this.sessions.get(userId)?.createdAt || now
    });
    
    console.log(`📱 Sesión actualizada para ${userId} - ${new Date(now).toLocaleTimeString()}`);
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
   * Limpia todas las sesiones expiradas
   * @returns {number} - Número de sesiones eliminadas
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [userId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now - session.lastActivity;
      if (timeSinceLastActivity > this.SESSION_DURATION) {
        this.sessions.delete(userId);
        cleanedCount++;
        console.log(`🧹 Sesión expirada eliminada: ${userId}`);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Limpieza completada: ${cleanedCount} sesiones eliminadas`);
    }
    
    return cleanedCount;
  }

  /**
   * Inicia la limpieza automática de sesiones expiradas
   */
  startAutoCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
    
    console.log(`🔄 Limpieza automática iniciada - cada ${this.CLEANUP_INTERVAL / 1000 / 60} minutos`);
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
      cleanupIntervalMinutes: this.CLEANUP_INTERVAL / 1000 / 60
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
   * Reinicia una sesión específica (elimina estado y datos temporales)
   * @param {string} userId - ID del usuario
   */
  resetSession(userId) {
    if (!userId) return;
    
    // Eliminar la sesión del servicio de sesiones
    this.removeSession(userId);
    
    // Importar y limpiar estado de conversación
    import('./conversationStateService.js').then(({ clearState, clearTempData }) => {
      clearState(userId);
      clearTempData(userId);
      console.log(`🔄 Sesión reiniciada completamente para ${userId}`);
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