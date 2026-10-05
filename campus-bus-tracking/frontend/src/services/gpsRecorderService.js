const MAX_ACCURACY_METRES = 30
const MIN_POINT_DISTANCE_METRES = 10
const MAX_RECORDED_POINTS = 2000
const EARTH_RADIUS_METRES = 6371000
const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000,
}

let watchId = null
let activeSession = 0
let isRecording = false
let points = []
let distanceMetres = 0

function distanceBetween(start, end) {
  const radians = Math.PI / 180
  const latitude1 = start[0] * radians
  const latitude2 = end[0] * radians
  const latitudeDelta = (end[0] - start[0]) * radians
  const longitudeDelta = (end[1] - start[1]) * radians
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return EARTH_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function clearActiveWatch() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

function locationErrorMessage(error) {
  const messages = {
    1: 'Location permission was denied. Allow location access and try again.',
    2: 'GPS location is unavailable. Check the device location settings and try again.',
    3: 'GPS location timed out. Waiting for another update.',
  }
  return messages[Number(error?.code)] || 'Unable to read GPS location. Try again.'
}

export function start(onPoint, onError = () => {}) {
  clearActiveWatch()
  activeSession += 1
  const session = activeSession
  points = []
  distanceMetres = 0
  isRecording = true

  if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) {
    isRecording = false
    onError('Location is unavailable in this browser.', true)
    return false
  }

  try {
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (!isRecording || session !== activeSession || points.length >= MAX_RECORDED_POINTS) return
        const latitude = Number(coords.latitude)
        const longitude = Number(coords.longitude)
        const accuracy = Number(coords.accuracy)
        if (
          !Number.isFinite(latitude)
          || !Number.isFinite(longitude)
          || !Number.isFinite(accuracy)
          || accuracy < 0
          || accuracy > MAX_ACCURACY_METRES
        ) {
          return
        }

        const point = [latitude, longitude]
        const previous = points.at(-1)
        if (previous) {
          const segmentDistance = distanceBetween(previous, point)
          if (segmentDistance < MIN_POINT_DISTANCE_METRES) return
          distanceMetres += segmentDistance
        }

        points.push(point)
        onPoint({ latitude, longitude })
        if (points.length >= MAX_RECORDED_POINTS) clearActiveWatch()
      },
      (error) => {
        if (!isRecording || session !== activeSession) return
        const isFatal = Number(error?.code) === 1 || Number(error?.code) === 2
        if (isFatal) {
          isRecording = false
          activeSession += 1
          clearActiveWatch()
        }
        onError(locationErrorMessage(error), isFatal)
      },
      WATCH_OPTIONS,
    )
    return true
  } catch (error) {
    isRecording = false
    activeSession += 1
    clearActiveWatch()
    onError(locationErrorMessage(error), true)
    return false
  }
}

export function stop() {
  isRecording = false
  activeSession += 1
  clearActiveWatch()
  return points.map(([latitude, longitude]) => [
    Number(latitude.toFixed(6)),
    Number(longitude.toFixed(6)),
  ])
}

export function totalDistanceMetres() {
  return distanceMetres
}