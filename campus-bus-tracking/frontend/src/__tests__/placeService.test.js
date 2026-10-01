import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/api.js', () => ({
  default: { get: vi.fn() },
}))

import api from '../services/api.js'
import { getPlace, getPlaces } from '../services/placeService.js'

describe('placeService', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: [] })
  })

  it('gets all places, filtered places, and a place by id', async () => {
    await getPlaces()
    await getPlaces('LIBRARY')
    await getPlace(24)

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/places', { params: undefined })
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/places', {
      params: { category: 'LIBRARY' },
    })
    expect(api.get).toHaveBeenNthCalledWith(3, '/api/places/24')
  })

  it('propagates request failures for the page to handle', async () => {
    const failure = new Error('API unavailable')
    api.get.mockRejectedValue(failure)

    await expect(getPlaces()).rejects.toBe(failure)
  })
})