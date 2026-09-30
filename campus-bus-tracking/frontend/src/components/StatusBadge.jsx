const statusStyles = {
  ON_TIME: 'success',
  DELAYED: 'danger',
  IN_TRANSIT: 'primary',
  OFFLINE: 'secondary',
}

function StatusBadge({ status }) {
  const label = status ? status.replaceAll('_', ' ') : 'Unknown'
  const variant = statusStyles[status] || 'secondary'

  return <span className={`badge bg-${variant}`}>{label}</span>
}

export default StatusBadge