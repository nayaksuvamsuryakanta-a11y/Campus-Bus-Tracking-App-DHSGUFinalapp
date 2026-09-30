export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is unavailable in this browser. Enter coordinates manually.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({ latitude: coords.latitude, longitude: coords.longitude })
      },
      (error) => {
        const messages = {
          1: 'Location permission was denied. Enter coordinates manually.',
          2: 'Your location could not be determined. Enter coordinates manually.',
          3: 'Location request timed out. Enter coordinates manually.',
        }
        reject(new Error(messages[error.code] || 'Unable to get your location. Enter coordinates manually.'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}