import { useEffect, useState } from 'react'
import AlertCard from '../components/AlertCard.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import { getAlerts } from '../services/alertService.js'
import { ALERT_TYPES } from '../services/alertMeta.js'

const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
]

function emptyMessage(statusFilter) {
  if (statusFilter === 'past') return 'There are no past alerts.'
  if (statusFilter === 'all') return 'There are no alerts to display.'
  return 'There are no active alerts.'
}

function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [typeFilter, setTypeFilter] = useState('ALL')

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

  const filteredAlerts = alerts
    .filter((alert) => (
      statusFilter === 'all'
      || (statusFilter === 'active' && Boolean(alert.is_active))
      || (statusFilter === 'past' && !Boolean(alert.is_active))
    ))
    .filter((alert) => typeFilter === 'ALL' || alert.alert_type === typeFilter)
    .sort((first, second) => String(second.created_at || '').localeCompare(String(first.created_at || '')))

  return (
    <main className="container mt-4 mb-5">
      <header className="mb-4">
        <h1 className="h2 mb-1">Service alerts</h1>
        <p className="text-body-secondary mb-0">Current and previous campus transit updates.</p>
      </header>
      {isLoading && <Loader label="Loading alerts" />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Alert status">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className={`btn btn-sm ${statusFilter === filter.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                type="button"
                role="tab"
                aria-selected={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter alerts by type">
            <button
              className={`btn btn-sm ${typeFilter === 'ALL' ? 'btn-dark' : 'btn-outline-dark'}`}
              type="button"
              aria-pressed={typeFilter === 'ALL'}
              onClick={() => setTypeFilter('ALL')}
            >
              All types
            </button>
            {ALERT_TYPES.map((type) => (
              <button
                key={type}
                className={`btn btn-sm ${typeFilter === type ? 'btn-dark' : 'btn-outline-dark'}`}
                type="button"
                aria-pressed={typeFilter === type}
                onClick={() => setTypeFilter(type)}
              >
                {type.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
          {filteredAlerts.length === 0 && (
            <p className="text-body-secondary" role="status">{emptyMessage(statusFilter)}</p>
          )}
          {filteredAlerts.length > 0 && (
            <div className="row g-3">
              {filteredAlerts.map((alert) => (
            <div className="col-12 col-md-6" key={alert.id}>
              <AlertCard alert={alert} />
            </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}

export default AlertsPage