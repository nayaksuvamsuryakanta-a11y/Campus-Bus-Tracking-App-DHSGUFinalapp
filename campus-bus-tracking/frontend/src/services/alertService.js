import api from './api.js'

export async function getAlerts() {
  const { data } = await api.get('/api/alerts')
  return data
}

export async function createAlert(title, message, alertType, isActive) {
  const { data } = await api.post('/api/alerts', {
    title,
    message,
    alert_type: alertType,
    is_active: isActive,
  })
  return data
}

export async function updateAlertStatus(alertId, isActive) {
  const { data } = await api.patch(`/api/alerts/${alertId}`, {
    is_active: isActive,
  })
  return data
}