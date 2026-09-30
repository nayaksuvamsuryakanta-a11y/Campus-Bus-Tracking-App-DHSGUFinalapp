import { useEffect, useState } from 'react'
import AlertCard from '../components/AlertCard.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import { getAlerts } from '../services/alertService.js'

function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    getAlerts()
      .then((data) => {
        if (isCurrent) setAlerts(data)
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError.response?.data?.error ||
              'Unable to load alerts. Check that the backend is running.',
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const sortedAlerts = [...alerts].sort(
    (first, second) => Number(Boolean(second.is_active)) - Number(Boolean(first.is_active)),
  )

  return (
    <main className="container mt-4 mb-5">
      <header className="mb-4">
        <h1 className="h2 mb-1">Service alerts</h1>
        <p className="text-body-secondary mb-0">Current and previous campus transit updates.</p>
      </header>
      {isLoading && <Loader label="Loading alerts" />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && sortedAlerts.length === 0 && (
        <p className="text-body-secondary">There are no alerts to display.</p>
      )}
      {!isLoading && !error && sortedAlerts.length > 0 && (
        <div className="row g-3">
          {sortedAlerts.map((alert) => (
            <div className="col-12 col-md-6" key={alert.id}>
              <AlertCard alert={alert} />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default AlertsPage