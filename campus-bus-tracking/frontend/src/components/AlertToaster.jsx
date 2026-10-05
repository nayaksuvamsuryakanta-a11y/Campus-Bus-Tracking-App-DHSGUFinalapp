import { useEffect, useRef, useState } from 'react'
import { getAlerts } from '../services/alertService.js'
import { getAlertMeta } from '../services/alertMeta.js'
import './AlertToaster.css'

const ALERT_POLL_INTERVAL_MS = 30000
const ALERT_TOAST_DURATION_MS = 8000

function AlertToaster() {
  const [toasts, setToasts] = useState([])
  const seenActiveIds = useRef(new Set())
  const hasInitialSnapshot = useRef(false)
  const timeoutIds = useRef(new Map())

  function dismissToast(alertId) {
    const timeoutId = timeoutIds.current.get(alertId)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      timeoutIds.current.delete(alertId)
    }
    setToasts((current) => current.filter((alert) => String(alert.id) !== alertId))
  }

  useEffect(() => {
    let isCurrent = true
    let pollInProgress = false

    const pollAlerts = async () => {
      if (pollInProgress) return
      pollInProgress = true
      try {
        const alerts = await getAlerts()
        if (!isCurrent) return
        const activeAlerts = alerts.filter((alert) => Boolean(alert.is_active))

        if (!hasInitialSnapshot.current) {
          activeAlerts.forEach((alert) => seenActiveIds.current.add(String(alert.id)))
          hasInitialSnapshot.current = true
          return
        }

        const newlyActive = activeAlerts.filter((alert) => (
          !seenActiveIds.current.has(String(alert.id))
        ))
        if (newlyActive.length === 0) return

        newlyActive.forEach((alert) => {
          const alertId = String(alert.id)
          seenActiveIds.current.add(alertId)
          if (alert.alert_type !== 'EMERGENCY') {
            timeoutIds.current.set(
              alertId,
              window.setTimeout(() => dismissToast(alertId), ALERT_TOAST_DURATION_MS),
            )
          }
        })
        setToasts((current) => [...current, ...newlyActive])
      } catch {
        // Polling errors do not interrupt the rest of the app.
      } finally {
        pollInProgress = false
      }
    }

    pollAlerts()
    const intervalId = window.setInterval(pollAlerts, ALERT_POLL_INTERVAL_MS)
    return () => {
      isCurrent = false
      window.clearInterval(intervalId)
      timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeoutIds.current.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <aside className="alert-toaster" aria-label="Live alert notifications">
      {toasts.map((alert) => {
        const meta = getAlertMeta(alert.alert_type)
        return (
          <section
            className="alert-toaster-item"
            key={alert.id}
            role="alert"
            style={{ borderLeftColor: meta.borderColor }}
          >
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div className="d-grid gap-2">
                <span
                  className={meta.badgeClass}
                  style={alert.alert_type === 'GENERAL'
                    ? { backgroundColor: meta.borderColor, color: '#fff' }
                    : undefined}
                >
                  <span aria-hidden="true">{meta.icon}</span>{' '}
                  {alert.alert_type.replaceAll('_', ' ')}
                </span>
                <strong>{alert.title}</strong>
                {alert.alert_type === 'EMERGENCY' && (
                  <span className="small">
                    Emergency? Call Campus Security Control Room:{' '}
                    <a href="tel:+917582265810">07582-265810</a>
                  </span>
                )}
              </div>
              <button
                className="btn-close"
                type="button"
                aria-label={`Dismiss ${alert.title}`}
                onClick={() => dismissToast(String(alert.id))}
              />
            </div>
          </section>
        )
      })}
    </aside>
  )
}

export default AlertToaster