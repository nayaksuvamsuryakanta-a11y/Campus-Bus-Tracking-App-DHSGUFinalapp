import DemoBadge from './DemoBadge.jsx'
import { formatRelativeTime, getAlertMeta } from '../services/alertMeta.js'

function AlertCard({ alert }) {
  const isActive = Boolean(alert.is_active)
  const meta = getAlertMeta(alert.alert_type)
  const createdAt = typeof alert.created_at === 'string'
    ? new Date(alert.created_at.includes('T') ? alert.created_at : `${alert.created_at.replace(' ', 'T')}Z`)
    : null
  const hasValidCreatedAt = createdAt && Number.isFinite(createdAt.getTime())

  return (
    <article
      className={`card h-100 ${isActive ? 'border-warning' : 'border-secondary-subtle'}`}
      style={{ borderLeft: `5px solid ${meta.borderColor}` }}
    >
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <h2 className="h5 card-title mb-0">{alert.title}</h2>
          <span className={`badge bg-${isActive ? 'success' : 'secondary'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="card-text">{alert.message}</p>
        {alert.alert_type === 'EMERGENCY' && (
          <p className="small fw-semibold">
            Emergency? Call Campus Security Control Room:{' '}
            <a href="tel:+917582265810">07582-265810</a>
          </p>
        )}
        {Boolean(alert.is_demo) && <div className="mb-2"><DemoBadge isVerified={0} /></div>}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <span
            className={meta.badgeClass}
            style={alert.alert_type === 'GENERAL'
              ? { backgroundColor: meta.borderColor, color: '#fff' }
              : undefined}
          >
            <span aria-hidden="true">{meta.icon}</span>{' '}
            {alert.alert_type.replaceAll('_', ' ')}
          </span>
          <time
            className="small text-body-secondary"
            dateTime={hasValidCreatedAt ? createdAt.toISOString() : undefined}
          >
            {formatRelativeTime(alert.created_at)}
          </time>
        </div>
      </div>
    </article>
  )
}

export default AlertCard