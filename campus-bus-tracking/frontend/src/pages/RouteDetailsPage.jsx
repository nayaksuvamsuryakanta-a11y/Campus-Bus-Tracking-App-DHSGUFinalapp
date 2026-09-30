import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import { getRouteDetails } from '../services/busService.js'

function RouteDetailsPage() {
  const { routeId } = useParams()
  const [result, setResult] = useState({ routeId: null, route: null, error: '' })
  const isLoading = result.routeId !== routeId
  const route = result.routeId === routeId ? result.route : null
  const error = result.routeId === routeId ? result.error : ''

  useEffect(() => {
    let isCurrent = true
    getRouteDetails(routeId)
      .then((data) => {
        if (isCurrent) setResult({ routeId, route: data, error: '' })
      })
      .catch((requestError) => {
        if (isCurrent) {
          setResult({
            routeId,
            route: null,
            error:
              requestError.response?.data?.error ||
              'Unable to load route details. Check that the backend is running.',
          })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [routeId])

  return (
    <main className="container mt-4 mb-5">
      {isLoading && <Loader label="Loading route details" />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && route && (
        <>
          <header className="mb-4">
            <p className="text-uppercase small fw-semibold text-primary mb-1">Route schedule</p>
            <h1 className="h2 mb-2">{route.route_name}</h1>
            <p className="text-body-secondary">{route.description}</p>
            <p className="mb-0">
              <strong>Service hours:</strong> {route.start_time}–{route.end_time}
            </p>
          </header>
          <section aria-labelledby="stops-title">
            <h2 className="h4 mb-3" id="stops-title">Stops</h2>
            {route.stops.length === 0 ? (
              <p className="text-body-secondary">No stops are listed for this route.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Stop</th>
                      <th scope="col">Arrival</th>
                      <th scope="col">Departure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {route.stops.map((stop) => (
                      <tr key={stop.id}>
                        <th scope="row">{stop.stop_name}</th>
                        <td>{stop.arrival_time || '—'}</td>
                        <td>{stop.departure_time || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default RouteDetailsPage