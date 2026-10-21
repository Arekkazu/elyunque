/**
 * Notificación de cambios de estado al cliente.
 * Por ahora registra el evento en logs; se puede reemplazar por email/WhatsApp.
 */
function notificarCambioEstado(solicitudId, estado) {
  if (process.env.NODE_ENV !== 'test') {
    console.info(`[notificación] Solicitud #${solicitudId} cambió a estado "${estado}"`);
  }
}

module.exports = { notificarCambioEstado };
