import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetGeolocationMock } from './helpers.js'
import { start, stop, totalDistanceMetres } from '../services/gpsRecorderService.js'

const EARTH_RADIUS_METRES = 6371000

function positionAtMetres(metres, accuracy = 5) {
  return {
    coords: {
      latitude: (metres / EARTH_RADIUS_METRES) * (180 / Math.PI),
      longitude: 0,
      accuracy,
    },
  }
}

describe('gpsRecorderService', () => {
  let onPosition
  let onLocationError
  let clearWatch

  beforeEach(() => {
    onPosition = null
    onLocationError = null
    clearWatch = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((success, failure) => {
          onPosition = success
          onLocationError = failure
          return 42
        }),
        clearWatch,
      },
    })
  })

  afterEach(() => {
    stop()
    resetGeolocationMock()
  })

  it('uses high-accuracy watching and filters fixes by accuracy and distance', () => {
    const onPoint = vi.fn()
    expect(start(onPoint)).toBe(true)
    expect(navigator.geolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    )

    onPosition(positionAtMetres(0, 30))
    onPosition(positionAtMetres(9.9, 5))
    onPosition(positionAtMetres(10, 30))
    onPosition(positionAtMetres(20, 30.01))

    expect(onPoint).toHaveBeenCalledTimes(2)
    expect(totalDistanceMetres()).toBeCloseTo(10, 1)
  })

  it('caps the trace at 2000 kept points', () => {
    const onPoint = vi.fn()
    start(onPoint)
    for (let index = 0; index <= 2000; index += 1) {
      onPosition(positionAtMetres(index * 11))
    }

    expect(onPoint).toHaveBeenCalledTimes(2000)
    expect(stop()).toHaveLength(2000)
    expect(totalDistanceMetres()).toBeCloseTo(1999 * 11, 1)
    expect(clearWatch).toHaveBeenCalledWith(42)
  })

  it('returns coordinates rounded to six decimals when stopped', () => {
    start(vi.fn())
    onPosition({ coords: { latitude: 23.12345678, longitude: 78.12345678, accuracy: 3 } })
    onPosition({ coords: { latitude: 23.1236, longitude: 78.12345678, accuracy: 3 } })

    expect(stop()).toEqual([
      [23.123457, 78.123457],
      [23.1236, 78.123457],
    ])
    expect(totalDistanceMetres()).toBeGreaterThan(0)
  })

  it('reports permission and unavailable errors through the callback', () => {
    const onError = vi.fn()
    start(vi.fn(), onError)
    onLocationError({ code: 1 })

    expect(onError).toHaveBeenCalledWith(
      'Location permission was denied. Allow location access and try again.',
      true,
    )
    expect(clearWatch).toHaveBeenCalledWith(42)
  })
})