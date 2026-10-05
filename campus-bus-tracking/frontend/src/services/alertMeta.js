const ALERT_META = {
  DELAY: {
    badgeClass: 'badge bg-warning text-dark',
    borderColor: '#f9ab00',
    icon: '⏱',
  },
  ROUTE_CHANGE: {
    badgeClass: 'badge bg-primary',
    borderColor: '#1a73e8',
    icon: '↔',
  },
  EMERGENCY: {
    badgeClass: 'badge bg-danger',
    borderColor: '#d93025',
    icon: '!',
  },
  GENERAL: {
    badgeClass: 'badge alert-type-teal',
    borderColor: '#0f9d8a',
    icon: 'i',
  },
}

export const ALERT_TYPES = Object.keys(ALERT_META)

export function getAlertMeta(type) {
  return ALERT_META[type] || ALERT_META.GENERAL
}

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return 'Time unavailable'

  const timestamp = typeof value === 'string'
    ? new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
    : new Date(value)
  if (!Number.isFinite(timestamp.getTime())) return 'Time unavailable'

  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp.getTime()) / 60000))
  if (elapsedMinutes === 0) return 'just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours} h ago`

  return timestamp.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}