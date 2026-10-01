import { describe, expect, it } from 'vitest'
import {
  mockGeolocationPermissionDenied,
  mockGeolocationSuccess,
} from './helpers.js'
import { getCurrentPosition } from '../services/geolocationService.js'

describe('geolocationService', () => {
  it('resolves latitude and longitude from browser coordinates', async () => {
    const getCurrentPositionMock = mockGeolocationSuccess({
      latitude: 23.85,
      longitude: 78.76,
    })

    await expect(getCurrentPosition()).resolves.toEqual({
      latitude: 23.85,
      longitude: 78.76,
    })
    expect(getCurrentPositionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })

  it('rejects with a friendly message when permission is denied', async () => {
    mockGeolocationPermissionDenied()

    await expect(getCurrentPosition()).rejects.toThrow(
      'Location permission was denied. Enter coordinates manually.',
    )
  })
})