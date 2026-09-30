import { useState } from 'react'

function AlertBanner({ title, message }) {
  const [isVisible, setIsVisible] = useState(true)
  const variant = title?.toLowerCase().includes('delay') ? 'danger' : 'warning'

  if (!isVisible) {
    return null
  }

  return (
    <div className={`alert alert-${variant} alert-dismissible`} role="alert">
      <strong className="d-block">{title}</strong>
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