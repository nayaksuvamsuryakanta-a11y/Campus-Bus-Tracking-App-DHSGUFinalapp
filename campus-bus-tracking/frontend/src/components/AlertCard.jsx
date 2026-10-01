import DemoBadge from './DemoBadge.jsx'

function AlertCard({ alert }) {
  const isActive = Boolean(alert.is_active)
  const createdAt = typeof alert.created_at === 'string'
    ? new Date(`${alert.created_at.replace(' ', 'T')}Z`)
    : null
  const hasValidCreatedAt = createdAt && Number.isFinite(createdAt.getTime())
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
        {Boolean(alert.is_demo) && <div className="mb-2"><DemoBadge isVerified={0} /></div>}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <span className={`badge bg-${typeStyle}`}>{alert.alert_type.replaceAll('_', ' ')}</span>
          <time
            className="small text-body-secondary"
            dateTime={hasValidCreatedAt ? createdAt.toISOString() : undefined}
          >
            {hasValidCreatedAt
              ? createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
              : 'Time unavailable'}
          </time>
        </div>
      </div>
    </article>
  )
}

export default AlertCard