import { useEffect, useState } from 'react'
import ErrorMessage from '../components/ErrorMessage.jsx'
import DemoBadge from '../components/DemoBadge.jsx'
import Loader from '../components/Loader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { createAlert } from '../services/alertService.js'
import {
  getBuses,
  updateBusLocation,
  updateBusStatus,
} from '../services/busService.js'
import { getCurrentPosition } from '../services/geolocationService.js'

const BUS_STATUSES = ['ON_TIME', 'DELAYED', 'IN_TRANSIT', 'OFFLINE']
const ALERT_TYPES = ['DELAY', 'ROUTE_CHANGE', 'CANCELLATION', 'GENERAL']

function FeedbackMessage({ feedback }) {
  if (!feedback) return null

  return (
    <div className={`alert alert-${feedback.variant} py-2 mb-0`} role="status">
      {feedback.message}
    </div>
  )
}

function formatCoordinate(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(5) : 'Unavailable'
}

function DriverPanelPage() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => window.sessionStorage.getItem('dhsgu-driver-unlocked') === 'true',
  )
  const [driverPin, setDriverPin] = useState(
    () => window.sessionStorage.getItem('dhsgu-driver-pin') || '',
  )
  const [buses, setBuses] = useState([])
  const [selectedBusId, setSelectedBusId] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [status, setStatus] = useState('ON_TIME')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [alertType, setAlertType] = useState('DELAY')
  const [isActive, setIsActive] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  const [savingSection, setSavingSection] = useState('')
  const [error, setError] = useState('')
  const [locationFeedback, setLocationFeedback] = useState(null)
  const [statusFeedback, setStatusFeedback] = useState(null)
  const [alertFeedback, setAlertFeedback] = useState(null)

  useEffect(() => {
    if (!isUnlocked) return undefined

    let isCurrent = true
    getBuses()
      .then((data) => {
        if (!isCurrent) return
        setBuses(data)
        if (data.length > 0) {
          const firstBus = data[0]
          setSelectedBusId(String(firstBus.id))
          setLatitude(firstBus.latitude == null ? '' : String(firstBus.latitude))
          setLongitude(firstBus.longitude == null ? '' : String(firstBus.longitude))
          setStatus(firstBus.status)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError('Unable to load buses. Check that the backend is running.')
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [isUnlocked])

  const selectedBus = buses.find((bus) => String(bus.id) === selectedBusId)

  function handleUnlock(event) {
    event.preventDefault()
    if (driverPin) {
      window.sessionStorage.setItem('dhsgu-driver-pin', driverPin)
    } else {
      window.sessionStorage.removeItem('dhsgu-driver-pin')
    }
    window.sessionStorage.setItem('dhsgu-driver-unlocked', 'true')
    setIsUnlocked(true)
  }

  function handleBusSelection(event) {
    const busId = event.target.value
    const bus = buses.find((item) => String(item.id) === busId)
    setSelectedBusId(busId)
    setLatitude(bus?.latitude == null ? '' : String(bus.latitude))
    setLongitude(bus?.longitude == null ? '' : String(bus.longitude))
    if (bus) setStatus(bus.status)
    setLocationFeedback(null)
    setStatusFeedback(null)
  }

  async function handleUseLocation() {
    setIsLocating(true)
    setLocationFeedback(null)
    try {
      const position = await getCurrentPosition()
      setLatitude(String(position.latitude))
      setLongitude(String(position.longitude))
      setLocationFeedback({ variant: 'success', message: 'Current coordinates filled in.' })
    } catch (locationError) {
      setLocationFeedback({ variant: 'danger', message: locationError.message })
    } finally {
      setIsLocating(false)
    }
  }

  async function handleUpdateLocation(event) {
    event.preventDefault()
    if (!selectedBus) return
    setSavingSection('location')
    setLocationFeedback(null)
    try {
      const result = await updateBusLocation(
        selectedBus.id,
        Number(latitude),
        Number(longitude),
      )
      setBuses((currentBuses) => currentBuses.map((bus) => (
        bus.id === selectedBus.id
          ? { ...bus, latitude: result.latitude, longitude: result.longitude, updated_at: result.updated_at }
          : bus
      )))
      setLocationFeedback({ variant: 'success', message: result.message })
    } catch (requestError) {
      setLocationFeedback({
        variant: 'danger',
        message: requestError.response?.data?.error || 'Unable to update this bus location.',
      })
    } finally {
      setSavingSection('')
    }
  }

  async function handleUpdateStatus(event) {
    event.preventDefault()
    if (!selectedBus) return
    setSavingSection('status')
    setStatusFeedback(null)
    try {
      const result = await updateBusStatus(selectedBus.id, status)
      setBuses((currentBuses) => currentBuses.map((bus) => (
        bus.id === selectedBus.id ? { ...bus, status: result.status } : bus
      )))
      setStatusFeedback({ variant: 'success', message: result.message })
    } catch (requestError) {
      setStatusFeedback({
        variant: 'danger',
        message: requestError.response?.data?.error || 'Unable to update this bus status.',
      })
    } finally {
      setSavingSection('')
    }
  }

  async function handleCreateAlert(event) {
    event.preventDefault()
    setSavingSection('alert')
    setAlertFeedback(null)
    try {
      const result = await createAlert(title, message, alertType, isActive)
      setAlertFeedback({ variant: 'success', message: result.message })
      setTitle('')
      setMessage('')
    } catch (requestError) {
      setAlertFeedback({
        variant: 'danger',
        message: requestError.response?.data?.error || 'Unable to broadcast this alert.',
      })
    } finally {
      setSavingSection('')
    }
  }

  if (!isUnlocked) {
    return (
      <main className="container mt-4 mb-5">
        <section className="card mx-auto" style={{ maxWidth: 480 }}>
          <div className="card-body">
            <h1 className="h4 mb-3">Driver panel access</h1>
            <form onSubmit={handleUnlock}>
              <label className="form-label" htmlFor="driver-pin">Driver PIN</label>
              <input
                className="form-control mb-2"
                id="driver-pin"
                type="password"
                autoComplete="current-password"
                value={driverPin}
                onChange={(event) => setDriverPin(event.target.value)}
              />
              <p className="small text-body-secondary">
                Enter the configured backend PIN. If DRIVER_PIN is unset, use the demo PIN dhsgu2026. This is not real authentication.
              </p>
              <button className="btn btn-primary" type="submit">Continue</button>
            </form>
          </div>
        </section>
      </main>
    )
  }

  if (isLoading) {
    return <main className="container mt-4"><Loader label="Loading buses" /></main>
  }

  return (
    <main className="container mt-4 mb-5">
      <header className="mb-4">
        <h1 className="h2 mb-1">Driver panel</h1>
        <p className="text-body-secondary mb-0">Update a bus location, status, or service alert.</p>
      </header>

      {error && <ErrorMessage message={error} />}
      {!error && buses.length === 0 && (
        <ErrorMessage message="No buses are available to update." />
      )}
      {selectedBus && (
        <>
          <section className="card mb-3" aria-labelledby="selected-bus-title">
            <div className="card-body">
              <div className="row align-items-end g-3">
                <div className="col-12 col-md-5">
                  <label className="form-label" htmlFor="bus-select">Select bus</label>
                  <select
                    className="form-select"
                    id="bus-select"
                    value={selectedBusId}
                    onChange={handleBusSelection}
                  >
                    {buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>{bus.bus_number}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-7">
                  <h2 className="h6 mb-2" id="selected-bus-title">Current bus details</h2>
                  <div className="d-flex flex-wrap align-items-center gap-3 small">
                    <span>{selectedBus.route_name || 'Unassigned route'}</span>
                    <StatusBadge status={selectedBus.status} />
                    <DemoBadge isVerified={selectedBus.is_verified} />
                    <span>
                      {formatCoordinate(selectedBus.latitude)}, {formatCoordinate(selectedBus.longitude)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="row g-3">
            <div className="col-12 col-xl-6">
              <section className="card h-100" aria-labelledby="location-title">
                <div className="card-body">
                  <h2 className="h5 mb-3" id="location-title">Location update</h2>
                  <form onSubmit={handleUpdateLocation}>
                    <div className="mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleUseLocation}
                        disabled={isLocating || savingSection !== ''}
                      >
                        {isLocating ? 'Getting location…' : 'Use My Current Location'}
                      </button>
                    </div>
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-sm-6">
                        <label className="form-label" htmlFor="latitude">Latitude</label>
                        <input
                          className="form-control"
                          id="latitude"
                          type="number"
                          min="-90"
                          max="90"
                          step="any"
                          required
                          value={latitude}
                          onChange={(event) => setLatitude(event.target.value)}
                        />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label" htmlFor="longitude">Longitude</label>
                        <input
                          className="form-control"
                          id="longitude"
                          type="number"
                          min="-180"
                          max="180"
                          step="any"
                          required
                          value={longitude}
                          onChange={(event) => setLongitude(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={savingSection !== '' || !selectedBus}
                      >
                        {savingSection === 'location' ? 'Updating…' : 'Update Location'}
                      </button>
                      <FeedbackMessage feedback={locationFeedback} />
                    </div>
                  </form>
                </div>
              </section>
            </div>

            <div className="col-12 col-xl-6">
              <section className="card h-100" aria-labelledby="status-title">
                <div className="card-body">
                  <h2 className="h5 mb-3" id="status-title">Status update</h2>
                  <form onSubmit={handleUpdateStatus}>
                    <label className="form-label" htmlFor="bus-status">Bus status</label>
                    <select
                      className="form-select mb-3"
                      id="bus-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                    >
                      {BUS_STATUSES.map((busStatus) => (
                        <option key={busStatus} value={busStatus}>{busStatus.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={savingSection !== '' || !selectedBus}
                      >
                        {savingSection === 'status' ? 'Updating…' : 'Update Status'}
                      </button>
                      <FeedbackMessage feedback={statusFeedback} />
                    </div>
                  </form>
                </div>
              </section>
            </div>

            <div className="col-12">
              <section className="card" aria-labelledby="create-alert-title">
                <div className="card-body">
                  <h2 className="h5 mb-3" id="create-alert-title">Create alert</h2>
                  <form onSubmit={handleCreateAlert}>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label" htmlFor="alert-title">Title</label>
                        <input
                          className="form-control"
                          id="alert-title"
                          required
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label" htmlFor="alert-type">Alert type</label>
                        <select
                          className="form-select"
                          id="alert-type"
                          value={alertType}
                          onChange={(event) => setAlertType(event.target.value)}
                        >
                          {ALERT_TYPES.map((type) => (
                            <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label" htmlFor="alert-message">Message</label>
                        <textarea
                          className="form-control"
                          id="alert-message"
                          rows="3"
                          required
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                        />
                      </div>
                      <div className="col-12 d-flex flex-wrap align-items-center gap-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            id="alert-active"
                            type="checkbox"
                            checked={isActive}
                            onChange={(event) => setIsActive(event.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="alert-active">
                            Is Active
                          </label>
                        </div>
                        <button
                          className="btn btn-primary"
                          type="submit"
                          disabled={savingSection !== ''}
                        >
                          {savingSection === 'alert' ? 'Broadcasting…' : 'Broadcast Alert'}
                        </button>
                        <FeedbackMessage feedback={alertFeedback} />
                      </div>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

export default DriverPanelPage