import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { getBuses } from '../services/busService.js'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const CAMPUS_CENTER = [23.84, 78.75]

function LiveMapPage() {
  const [buses, setBuses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let isCurrent = true
    const refreshBuses = async () => {
      try {
        const data = await getBuses()
        if (isCurrent) {
          setBuses(data)
          setLastUpdated(new Date())
          setError('')
        }
      } catch {
        if (isCurrent) {
          setError('Unable to refresh bus locations. Check that the backend is running.')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    refreshBuses()
    const intervalId = window.setInterval(refreshBuses, 10000)
    return () => {
      isCurrent = false
      window.clearInterval(intervalId)
    }
  }, [])

  const mappedBuses = buses.filter(
    (bus) => Number.isFinite(Number(bus.latitude)) && Number.isFinite(Number(bus.longitude)),
  )

  return (
    <main className="container mt-4 mb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h1 className="h2 mb-1">Live bus map</h1>
          <p className="text-body-secondary mb-0">Bus locations refresh every 10 seconds.</p>
        </div>
        <p className="small text-body-secondary mb-1" aria-live="polite">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting for data'}
        </p>
      </div>

      {isLoading && <Loader label="Loading bus locations" />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && (
        <>
          {mappedBuses.length === 0 && !error && (
            <p className="text-body-secondary">No bus locations are available.</p>
          )}
          <div className="border rounded overflow-hidden" style={{ height: 'min(68vh, 680px)', minHeight: 360 }}>
            <MapContainer
              center={CAMPUS_CENTER}
              zoom={14}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mappedBuses.map((bus) => (
                <Marker
                  key={bus.id}
                  position={[Number(bus.latitude), Number(bus.longitude)]}
                >
                  <Popup>
                    <div className="d-grid gap-1">
                      <strong>{bus.bus_number}</strong>
                      <span>{bus.route_name || 'Unassigned route'}</span>
                      <StatusBadge status={bus.status} />
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </>
      )}
    </main>
  )
}

export default LiveMapPage