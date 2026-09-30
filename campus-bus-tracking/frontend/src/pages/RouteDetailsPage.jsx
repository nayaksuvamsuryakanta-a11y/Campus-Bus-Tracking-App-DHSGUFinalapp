import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import DemoBadge from '../components/DemoBadge.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import { UNIVERSITY } from '../config/university.js'
import { getRouteDetails } from '../services/busService.js'

function RouteDetailsPage() {
  const { routeId } = useParams()
  const [result, setResult] = useState({ routeId: null, route: null, error: '' })
  const isLoading = result.routeId !== routeId
  const route = result.routeId === routeId ? result.route : null
  const error = result.routeId === routeId ? result.error : ''
  const mappedStops = route?.stops.filter((stop) => (
    stop.latitude != null
      && stop.longitude != null
      && Number.isFinite(Number(stop.latitude))
      && Number.isFinite(Number(stop.longitude))
  )) || []
  const mapCenter = mappedStops.length > 0
    ? [
      mappedStops.reduce((sum, stop) => sum + Number(stop.latitude), 0) / mappedStops.length,
      mappedStops.reduce((sum, stop) => sum + Number(stop.longitude), 0) / mappedStops.length,
    ]
    : UNIVERSITY.MAP_CENTER

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
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h1 className="h2 mb-0">{route.route_name}</h1>
              <DemoBadge isVerified={route.is_verified} />
            </div>
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
                        <th scope="row">
                          <span className="d-block">{stop.stop_name}</span>
                          <DemoBadge isVerified={stop.is_verified} />
                        </th>
                        <td>{stop.arrival_time || '—'}</td>
                        <td>{stop.departure_time || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {mappedStops.length > 0 && (
            <section className="mt-4" aria-labelledby="route-map-title">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <h2 className="h4 mb-0" id="route-map-title">Stop map</h2>
                <DemoBadge isVerified={route.is_verified} />
              </div>
              <div className="border rounded overflow-hidden" style={{ height: 280 }}>
                <MapContainer
                  key={route.id}
                  center={mapCenter}
                  zoom={UNIVERSITY.MAP_ZOOM}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mappedStops.map((stop) => (
                    <CircleMarker
                      key={stop.id}
                      center={[Number(stop.latitude), Number(stop.longitude)]}
                      radius={7}
                      pathOptions={{ color: '#664d03', fillColor: '#ffc107', fillOpacity: 0.9 }}
                    >
                      <Popup>
                        <div className="d-grid gap-1">
                          <strong>{stop.stop_name}</strong>
                          <span>{stop.arrival_time} arrival</span>
                          <DemoBadge isVerified={stop.is_verified} />
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default RouteDetailsPage