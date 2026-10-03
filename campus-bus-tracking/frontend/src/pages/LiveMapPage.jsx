import { useEffect, useState } from 'react'
import L from 'leaflet'
import { useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import DemoBadge from '../components/DemoBadge.jsx'
import { UNIVERSITY } from '../config/university.js'
import { getBuses, getRouteDetails, getRoutes } from '../services/busService.js'
import { getPlaces } from '../services/placeService.js'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const BUS_MARKER_CLASSES = {
  ON_TIME: 'bg-success',
  DELAYED: 'bg-danger',
  IN_TRANSIT: 'bg-primary',
  OFFLINE: 'bg-secondary',
}

const PLACE_MARKER_CLASSES = {
  GATE: 'bg-dark',
  HOSTEL: 'bg-warning',
  ACADEMIC: 'bg-primary',
  LIBRARY: 'bg-success',
  AUDITORIUM: 'bg-danger',
  HEALTH: 'bg-info',
  BANK: 'bg-secondary',
  CANTEEN: 'bg-warning',
  SPORTS: 'bg-success',
  GARDEN: 'bg-success',
  MUSEUM: 'bg-danger',
  SCHOOL: 'bg-primary',
  SECURITY: 'bg-dark',
  OTHER: 'bg-secondary',
}

const DEMO_ROUTE_NAME = 'Campus Circle Route (DEMO)'

function busIcon(status) {
  const color = BUS_MARKER_CLASSES[status] || 'bg-secondary'
  return L.divIcon({
    className: '',
    html: `<span class="d-block rounded-circle border border-2 border-white shadow ${color}" style="width: 20px; height: 20px"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })
}

function placeIcon(category) {
  const color = PLACE_MARKER_CLASSES[category] || 'bg-secondary'
  return L.divIcon({
    className: '',
    html: `<span class="d-flex align-items-center justify-content-center border border-2 border-white rounded-1 shadow ${color} text-white" style="width: 20px; height: 20px; font-size: 10px">P</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })
}

function hasCoordinates(item) {
  return item.latitude != null
    && item.longitude != null
    && Number.isFinite(Number(item.latitude))
    && Number.isFinite(Number(item.longitude))
}

function MapController({ place }) {
  const map = useMap()

  useEffect(() => {
    if (place && hasCoordinates(place)) {
      map.flyTo([Number(place.latitude), Number(place.longitude)], 17, { duration: 0.8 })
    }
  }, [map, place])

  return null
}

function LiveMapPage() {
  const [searchParams] = useSearchParams()
  const [buses, setBuses] = useState([])
  const [places, setPlaces] = useState([])
  const [stops, setStops] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [placesError, setPlacesError] = useState('')
  const [stopsError, setStopsError] = useState('')
  const [showStops, setShowStops] = useState(false)
  const [showPlaces, setShowPlaces] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let isCurrent = true
    let refreshInProgress = false
    const refreshBuses = async () => {
      if (refreshInProgress) return
      refreshInProgress = true
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
        refreshInProgress = false
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

  useEffect(() => {
    let isCurrent = true
    getPlaces()
      .then((data) => {
        if (isCurrent) setPlaces(data)
      })
      .catch(() => {
        if (isCurrent) setPlacesError('Unable to load campus places.')
      })
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    getRoutes()
      .then((routes) => Promise.all(routes.map((route) => getRouteDetails(route.id))))
      .then((routes) => {
        if (isCurrent) {
          setStops(routes.flatMap((route) => route.stops.map((stop) => ({
            ...stop,
            route_name: route.route_name,
          }))))
        }
      })
      .catch(() => {
        if (isCurrent) setStopsError('Unable to load route stops.')
      })
    return () => {
      isCurrent = false
    }
  }, [])

  const mappedBuses = buses.filter(hasCoordinates)
  const mappedPlaces = places.filter(hasCoordinates)
  const mappedStops = stops.filter(hasCoordinates)
  const routePositions = mappedStops
    .filter((stop) => stop.route_name === DEMO_ROUTE_NAME)
    .map((stop) => [Number(stop.latitude), Number(stop.longitude)])
  const selectedPlaceId = searchParams.get('place')
  const selectedPlace = mappedPlaces.find((place) => String(place.id) === selectedPlaceId)

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

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            id="show-stops"
            type="checkbox"
            checked={showStops}
            onChange={(event) => setShowStops(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="show-stops">Stops</label>
        </div>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            id="show-places"
            type="checkbox"
            checked={showPlaces}
            onChange={(event) => setShowPlaces(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="show-places">Campus places</label>
        </div>
        <DemoBadge isVerified={0} />
        {placesError && <span className="small text-danger">{placesError}</span>}
        {stopsError && <span className="small text-danger">{stopsError}</span>}
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
              center={UNIVERSITY.MAP_CENTER}
              zoom={UNIVERSITY.MAP_ZOOM}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController place={selectedPlace} />
              {routePositions.length > 1 && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{ color: '#d9480f', weight: 6, opacity: 0.9 }}
                />
              )}
              {mappedBuses.map((bus) => (
                <Marker
                  key={bus.id}
                  position={[Number(bus.latitude), Number(bus.longitude)]}
                  icon={busIcon(bus.status)}
                >
                  <Popup>
                    <div className="d-grid gap-1">
                      <strong>{bus.bus_number}</strong>
                      <span>{bus.route_name || 'Unassigned route'}</span>
                      <StatusBadge status={bus.status} />
                      <DemoBadge isVerified={bus.is_verified} />
                    </div>
                  </Popup>
                </Marker>
              ))}
              {showStops && mappedStops.map((stop) => (
                <CircleMarker
                  key={`stop-${stop.id}`}
                  center={[Number(stop.latitude), Number(stop.longitude)]}
                  radius={6}
                  pathOptions={{ color: '#664d03', fillColor: '#ffc107', fillOpacity: 0.9 }}
                >
                  <Popup>
                    <div className="d-grid gap-1">
                      <strong>{stop.stop_name}</strong>
                      <span>{stop.route_name}</span>
                      <DemoBadge isVerified={stop.is_verified} />
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {showPlaces && mappedPlaces.map((place) => (
                <Marker
                  key={`place-${place.id}`}
                  position={[Number(place.latitude), Number(place.longitude)]}
                  icon={placeIcon(place.category)}
                >
                  <Popup>
                    <div className="d-grid gap-1">
                      <strong>{place.name}</strong>
                      <span>{place.category}</span>
                      <DemoBadge isVerified={place.is_verified} />
                      <span className="small">{place.notes}</span>
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