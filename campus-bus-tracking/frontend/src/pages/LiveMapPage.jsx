import { useEffect, useState } from 'react'
import L from 'leaflet'
import { useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './LiveMapPage.css'
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

function haversineDistanceKm(stops) {
  let distance = 0
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1]
    const current = stops[index]
    const radians = Math.PI / 180
    const latitudeDelta = (Number(current.latitude) - Number(previous.latitude)) * radians
    const longitudeDelta = (Number(current.longitude) - Number(previous.longitude)) * radians
    const latitude1 = Number(previous.latitude) * radians
    const latitude2 = Number(current.latitude) * radians
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
    distance += 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  }
  return distance
}

function waypointMarkerOptions(index, total) {
  if (index === 0) {
    return { radius: 6, pathOptions: { color: '#fff', weight: 2, fillColor: '#1a73e8', fillOpacity: 1 } }
  }
  if (index === total - 1) {
    return { radius: 7, pathOptions: { color: '#fff', weight: 2, fillColor: '#ea4335', fillOpacity: 1 } }
  }
  return { radius: 5, pathOptions: { color: '#80868b', weight: 2, fillColor: '#fff', fillOpacity: 1 } }
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
  const [isItineraryOpen, setIsItineraryOpen] = useState(false)
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
  const routeStops = mappedStops.filter((stop) => stop.route_name === DEMO_ROUTE_NAME)
  const routePositions = routeStops
    .map((stop) => [Number(stop.latitude), Number(stop.longitude)])
  const routeDistanceKm = haversineDistanceKm(routeStops)
  const routeMinutes = Math.round((routeDistanceKm / 20) * 60)
  const routeSummary = routeStops.length > 1
    ? `≈ ${routeDistanceKm.toFixed(1)} km • ~${routeMinutes} min`
    : 'Loading route details'
  const routeName = routeStops[0]?.route_name || DEMO_ROUTE_NAME
  const selectedPlaceId = searchParams.get('place')
  const selectedPlace = mappedPlaces.find((place) => String(place.id) === selectedPlaceId)

  return (
    <main className="live-map-page">
      <header className="live-map-toolbar">
        <div>
          <h1>Live bus map</h1>
          <p>Bus locations refresh every 10 seconds.</p>
        </div>
        <p className="live-map-updated" aria-live="polite">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting for data'}
        </p>
      </header>

      <div className="live-map-stage">
        <MapContainer
          center={UNIVERSITY.MAP_CENTER}
          zoom={UNIVERSITY.MAP_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <MapController place={selectedPlace} />
          {routePositions.length > 1 && (
            <>
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: '#0b57d0',
                  weight: 9,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: '#1a73e8',
                  weight: 6,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
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
          {showStops && mappedStops.map((stop) => {
            const routeIndex = routeStops.findIndex((routeStop) => routeStop.id === stop.id)
            const markerOptions = routeIndex >= 0
              ? waypointMarkerOptions(routeIndex, routeStops.length)
              : { radius: 6, pathOptions: { color: '#664d03', fillColor: '#ffc107', fillOpacity: 0.9 } }
            return (
              <CircleMarker
                key={`stop-${stop.id}`}
                center={[Number(stop.latitude), Number(stop.longitude)]}
                radius={markerOptions.radius}
                pathOptions={markerOptions.pathOptions}
              >
                <Popup>
                  <div className="d-grid gap-1">
                    <strong>{stop.stop_name}</strong>
                    <span>{stop.route_name}</span>
                    <DemoBadge isVerified={stop.is_verified} />
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
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

        <div className="live-map-controls" role="group" aria-label="Map layers">
          <label className={`live-map-chip${showStops ? ' is-selected' : ''}`}>
            <input
              id="show-stops"
              type="checkbox"
              checked={showStops}
              onChange={(event) => setShowStops(event.target.checked)}
            />
            <span className="live-map-chip-icon live-map-chip-stops" aria-hidden="true" />
            <span>Stops</span>
          </label>
          <label className={`live-map-chip${showPlaces ? ' is-selected' : ''}`}>
            <input
              id="show-places"
              type="checkbox"
              checked={showPlaces}
              onChange={(event) => setShowPlaces(event.target.checked)}
            />
            <span className="live-map-chip-icon live-map-chip-places" aria-hidden="true" />
            <span>Campus places</span>
          </label>
        </div>

        <aside
          className={`live-map-itinerary${isItineraryOpen ? ' is-expanded' : ''}`}
          data-testid="route-itinerary"
          aria-label="Route itinerary"
          aria-expanded={isItineraryOpen}
        >
          <header className="live-map-itinerary-header">
            <div>
              <h2>{routeName}</h2>
              <p data-testid="route-summary">{routeSummary}</p>
            </div>
            <button
              className="live-map-sheet-toggle"
              type="button"
              aria-controls="live-map-itinerary-list"
              aria-expanded={isItineraryOpen}
              aria-label={isItineraryOpen ? 'Collapse route details' : 'Expand route details'}
              onClick={() => setIsItineraryOpen((isOpen) => !isOpen)}
            />
          </header>
          <ol className="live-map-itinerary-list" id="live-map-itinerary-list">
            {routeStops.map((stop, index) => {
              const waypointClass = index === 0
                ? 'is-start'
                : index === routeStops.length - 1 ? 'is-destination' : 'is-intermediate'
              return (
                <li className={`live-map-itinerary-stop ${waypointClass}`} key={stop.id}>
                  <span className="live-map-itinerary-dot" aria-hidden="true" />
                  <span className="live-map-itinerary-copy">
                    <span className="live-map-stop-name">{stop.stop_name}</span>
                    <span className="live-map-stop-coordinates">
                      {Number(stop.latitude)}, {Number(stop.longitude)}
                    </span>
                  </span>
                </li>
              )
            })}
            {routeStops.length === 0 && (
              <li className="live-map-itinerary-empty">Route stops are unavailable.</li>
            )}
          </ol>
          <div className="live-map-itinerary-footer"><DemoBadge isVerified={0} /></div>
        </aside>

        {(placesError || stopsError) && (
          <div className="live-map-data-errors" role="status">
            {placesError && <span>{placesError}</span>}
            {stopsError && <span>{stopsError}</span>}
          </div>
        )}
        {isLoading && (
          <div className="live-map-loading"><Loader label="Loading bus locations" /></div>
        )}
        {error && <div className="live-map-error"><ErrorMessage message={error} /></div>}
        {!isLoading && mappedBuses.length === 0 && !error && (
          <p className="live-map-empty">No bus locations are available.</p>
        )}
      </div>
    </main>
  )
}

export default LiveMapPage