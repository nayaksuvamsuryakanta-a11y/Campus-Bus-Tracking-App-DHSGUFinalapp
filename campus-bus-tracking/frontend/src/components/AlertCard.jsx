function AlertCard({ alert }) {
  const isActive = Boolean(alert.is_active)
  const typeStyle = {
    DELAY: 'danger',
    ROUTE_CHANGE: 'warning text-dark',
    CANCELLATION: 'danger',
    GENERAL: 'info text-dark',
  }[alert.alert_type] || 'secondary'

  return (
    <article className={`card h-100 ${isActive ? 'border-warning' : 'border-secondary-subtle'}`}>
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <h2 className="h5 card-title mb-0">{alert.title}</h2>
          <span className={`badge bg-${isActive ? 'success' : 'secondary'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="card-text">{alert.message}</p>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <span className={`badge bg-${typeStyle}`}>{alert.alert_type.replaceAll('_', ' ')}</span>
          <time className="small text-body-secondary" dateTime={alert.created_at}>
            {new Date(alert.created_at.replace(' ', 'T')).toLocaleString()}
          </time>
        </div>
      </div>
    </article>
  )
}

export default AlertCard