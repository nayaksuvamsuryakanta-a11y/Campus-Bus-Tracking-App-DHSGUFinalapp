import { useState } from 'react'
import DemoBadge from './DemoBadge.jsx'

function AlertBanner({ title, message, alertType, isDemo = false }) {
  const [isVisible, setIsVisible] = useState(true)
  const variant = {
    DELAY: 'danger',
    CANCELLATION: 'danger',
    ROUTE_CHANGE: 'warning',
    GENERAL: 'info',
  }[alertType] || 'warning'

  if (!isVisible) {
    return null
  }

  return (
    <div className={`alert alert-${variant} alert-dismissible`} role="alert">
      <strong className="d-block mb-1">{title}</strong>
      {isDemo && <span className="d-block mb-1"><DemoBadge isVerified={0} /></span>}
      <span>{message}</span>
      <button
        type="button"
        className="btn-close"
        aria-label="Dismiss alert"
        onClick={() => setIsVisible(false)}
      />
    </div>
  )
}

export default AlertBanner