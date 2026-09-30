import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AlertBanner from '../components/AlertBanner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import { UNIVERSITY } from '../config/university.js'
import { getAlerts } from '../services/alertService.js'
import { getBuses, getRoutes } from '../services/busService.js'

const navigationCards = [
  { title: 'Routes', description: 'Browse campus bus routes and schedules.', to: '/routes' },
  { title: 'Live Map', description: 'See current bus locations and status.', to: '/live-map' },
  { title: 'Places', description: 'Browse university landmarks and facilities.', to: '/places' },
  { title: 'About DHSGU', description: 'University facts and travel distances.', to: '/about' },
  { title: 'Alerts', description: 'Review active service updates.', to: '/alerts' },
  { title: 'Driver Panel', description: 'Update a bus for demonstration.', to: '/driver-panel' },
]

function HomePage() {
  const [summary, setSummary] = useState({ routes: [], buses: [], alerts: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    Promise.all([getRoutes(), getBuses(), getAlerts()])
      .then(([routes, buses, alerts]) => {
        if (isCurrent) {
          setSummary({ routes, buses, alerts })
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError.response?.data?.error ||
              'Unable to reach the campus bus API. Check that the backend is running.',
          )
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  if (isLoading) {
    return <main className="container mt-4"><Loader /></main>
  }

  if (error) {
    return <main className="container mt-4"><ErrorMessage message={error} /></main>
  }

  const activeAlerts = summary.alerts.filter((alert) => Boolean(alert.is_active))
  const metrics = [
    { label: 'Total Routes', value: summary.routes.length, tone: 'primary' },
    { label: 'Total Buses', value: summary.buses.length, tone: 'success' },
    { label: 'Active Alerts', value: activeAlerts.length, tone: 'warning' },
    {
      label: 'Delayed Buses',
      value: summary.buses.filter((bus) => bus.status === 'DELAYED').length,
      tone: 'danger',
    },
  ]

  return (
    <main className="container mt-4 mb-5">
      <header className="mb-4">
        <p className="text-uppercase small fw-semibold text-primary mb-1">{UNIVERSITY.shortName} · University transit</p>
        <h1 className="h2 mb-2">{UNIVERSITY.englishName}</h1>
        <p className="text-body-secondary mb-0">Routes, schedules, and service updates in one place.</p>
      </header>

      {activeAlerts.length > 0 && (
        <section aria-label="Active service alert" className="mb-4">
          <AlertBanner
            title={activeAlerts[0].title}
            message={activeAlerts[0].message}
            alertType={activeAlerts[0].alert_type}
            isDemo={activeAlerts[0].is_demo}
          />
        </section>
      )}

      <section className="mb-5" aria-label="Transit summary">
        <div className="row g-3">
          {metrics.map((metric) => (
            <div className="col-12 col-sm-6 col-xl-3" key={metric.label}>
              <div className={`card h-100 border-start border-4 border-${metric.tone}`}>
                <div className="card-body">
                  <p className="small text-body-secondary mb-2">{metric.label}</p>
                  <p className="h2 mb-0">{metric.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-links-title">
        <h2 className="h4 mb-3" id="quick-links-title">Quick links</h2>
        <div className="row g-3">
          {navigationCards.map((card) => (
            <div className="col-12 col-sm-6 col-xl-3" key={card.to}>
              <Link className="card h-100 text-decoration-none text-reset" to={card.to}>
                <div className="card-body">
                  <h3 className="h5 card-title">{card.title}</h3>
                  <p className="card-text text-body-secondary">{card.description}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default HomePage